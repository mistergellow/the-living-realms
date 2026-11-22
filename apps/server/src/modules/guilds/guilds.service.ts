import {
  characters,
  guildInvites,
  guildItems,
  guildMembers,
  guilds,
  items,
  worldEvents,
  type Character,
  type DbOrTx,
  type Item,
} from '@realms/db';
import {
  checkGuildLand,
  checkGuildName,
  getItemDef,
  GUILD_COLORS,
  GUILD_ICONS,
  GUILD_RULES,
  guildRunReputation,
  isStackable,
  mapHexAt,
} from '@realms/game-core';
import { ErrorCode, type GuildDto, type GuildViewDto } from '@realms/shared';
import { and, asc, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { AppContext } from '../../context.js';
import { AppError, errors } from '../../lib/errors.js';
import { assertBagRoom, giveItem } from '../characters/bag.js';
import {
  baseAttributesOf,
  toItemDto,
  type CharacterSheetService,
} from '../characters/sheet.service.js';

type Guild = typeof guilds.$inferSelect;
type Membership = { guild: Guild; role: 'leader' | 'member' };

const guildError = (code: ErrorCode, message: string, status = 409) =>
  new AppError(status, code, message);

/**
 * Guilds (request #57): up to 16 members led by one leader, an emblem (icon +
 * colour), reputation earned in Rifts fought together, a gold bank, shared
 * storage (in a capital or on the guild's land) and a plot of land.
 */
export class GuildsService {
  constructor(
    private readonly ctx: AppContext,
    private readonly sheets: CharacterSheetService,
  ) {}

  // ---------------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------------
  get(accountId: string, characterId: string): Promise<GuildViewDto> {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId);
      return this.view(tx, c, null);
    });
  }

  private async membership(db: DbOrTx, characterId: string): Promise<Membership | null> {
    const [row] = await db
      .select({ guild: guilds, role: guildMembers.role })
      .from(guildMembers)
      .innerJoin(guilds, eq(guilds.id, guildMembers.guildId))
      .where(eq(guildMembers.characterId, characterId));
    return row ? { guild: row.guild, role: row.role === 'leader' ? 'leader' : 'member' } : null;
  }

  private storageHere(c: Character, g: Guild | null): boolean {
    if (!g) return false;
    if (mapHexAt({ q: c.hexQ, r: c.hexR })?.capital) return true;
    return g.landQ === c.hexQ && g.landR === c.hexR;
  }

  private async view(db: DbOrTx, c: Character, message: string | null): Promise<GuildViewDto> {
    const m = await this.membership(db, c.id);
    const base = baseAttributesOf(c);
    const bag = (
      await db
        .select()
        .from(items)
        .where(
          and(eq(items.characterId, c.id), isNull(items.equippedSlot), eq(items.inStorage, false)),
        )
    ).map((i) => toItemDto(i, base));
    const invites = m
      ? []
      : await db
          .select({
            guildId: guilds.id,
            guildName: guilds.name,
            icon: guilds.icon,
            color: guilds.color,
            invitedBy: characters.name,
          })
          .from(guildInvites)
          .innerJoin(guilds, eq(guilds.id, guildInvites.guildId))
          .leftJoin(characters, eq(characters.id, guildInvites.invitedBy))
          .where(eq(guildInvites.characterId, c.id));
    const counts = invites.length
      ? await db
          .select({ guildId: guildMembers.guildId, n: count() })
          .from(guildMembers)
          .where(
            inArray(
              guildMembers.guildId,
              invites.map((i) => i.guildId),
            ),
          )
          .groupBy(guildMembers.guildId)
      : [];
    return {
      guild: m ? await this.guildDto(db, m.guild, base) : null,
      role: m?.role ?? null,
      invites: invites.map((i) => ({
        ...i,
        members: counts.find((x) => x.guildId === i.guildId)?.n ?? 0,
      })),
      storageHere: this.storageHere(c, m?.guild ?? null),
      landHere: checkGuildLand({ q: c.hexQ, r: c.hexR }),
      gold: c.gold,
      bag,
      rules: {
        maxMembers: GUILD_RULES.maxMembers,
        createCost: GUILD_RULES.createCost,
        landCost: GUILD_RULES.landCost,
        storageSlots: GUILD_RULES.storageSlots,
        icons: GUILD_ICONS,
        colors: GUILD_COLORS,
      },
      message,
    };
  }

  private async guildDto(db: DbOrTx, g: Guild, base: ReturnType<typeof baseAttributesOf>) {
    const members = await db
      .select({
        characterId: guildMembers.characterId,
        name: characters.name,
        role: guildMembers.role,
        joinedAt: guildMembers.joinedAt,
      })
      .from(guildMembers)
      .innerJoin(characters, eq(characters.id, guildMembers.characterId))
      .where(eq(guildMembers.guildId, g.id))
      .orderBy(asc(guildMembers.joinedAt));
    const invited = await db
      .select({ characterId: characters.id, name: characters.name })
      .from(guildInvites)
      .innerJoin(characters, eq(characters.id, guildInvites.characterId))
      .where(eq(guildInvites.guildId, g.id));
    const stored = await db.select().from(guildItems).where(eq(guildItems.guildId, g.id));
    const dto: GuildDto = {
      id: g.id,
      name: g.name,
      icon: g.icon,
      color: g.color,
      reputation: g.reputation,
      gold: g.gold,
      members: members.map((x) => ({
        ...x,
        role: x.role === 'leader' ? 'leader' : 'member',
        joinedAt: x.joinedAt.toISOString(),
      })),
      maxMembers: GUILD_RULES.maxMembers,
      land: g.landQ !== null && g.landR !== null ? { q: g.landQ, r: g.landR } : null,
      storage: stored.map((i) => toItemDto(asItem(i), base)),
      storageSlots: GUILD_RULES.storageSlots,
      invited,
    };
    return dto;
  }

  // ---------------------------------------------------------------------------
  // Actions (each in a transaction with the character row locked)
  // ---------------------------------------------------------------------------
  private act(
    accountId: string,
    characterId: string,
    fn: (tx: DbOrTx, c: Character) => Promise<string>,
  ): Promise<GuildViewDto> {
    return this.ctx.db.transaction(async (tx) => {
      const c = await this.sheets.getOwnedCharacter(tx, accountId, characterId, true);
      const message = await fn(tx, c);
      const fresh = await this.sheets.getOwnedCharacter(tx, accountId, characterId);
      return this.view(tx, fresh, message);
    });
  }

  private async event(tx: DbOrTx, c: Character, type: string, payload: Record<string, unknown>) {
    await tx.insert(worldEvents).values({
      worldId: c.worldId,
      type,
      actorAccountId: c.accountId,
      actorCharacterId: c.id,
      payload,
    });
  }

  private async mine(tx: DbOrTx, c: Character, leader = false): Promise<Membership> {
    const m = await this.membership(tx, c.id);
    if (!m) throw guildError(ErrorCode.NOT_IN_GUILD, 'You are not in a guild.');
    if (leader && m.role !== 'leader')
      throw guildError(ErrorCode.NOT_LEADER, 'Only the guild leader can do that.', 403);
    // Lock the guild row: members, bank and storage change together.
    await tx.select({ id: guilds.id }).from(guilds).where(eq(guilds.id, m.guild.id)).for('update');
    return m;
  }

  private checkEmblem(icon?: string, color?: string) {
    if (icon !== undefined && !(GUILD_ICONS as readonly string[]).includes(icon))
      throw errors.validation('Choose one of the guild icons.');
    if (color !== undefined && !(GUILD_COLORS as readonly string[]).includes(color))
      throw errors.validation('Choose one of the guild colours.');
  }

  private async memberCount(tx: DbOrTx, guildId: string): Promise<number> {
    const [row] = await tx
      .select({ n: count() })
      .from(guildMembers)
      .where(eq(guildMembers.guildId, guildId));
    return row?.n ?? 0;
  }

  create(
    accountId: string,
    characterId: string,
    input: { name: string; icon: string; color: string },
  ) {
    return this.act(accountId, characterId, async (tx, c) => {
      if (await this.membership(tx, c.id))
        throw guildError(ErrorCode.ALREADY_IN_GUILD, 'Leave your guild first.');
      const bad = checkGuildName(input.name);
      if (bad) throw errors.validation(bad);
      this.checkEmblem(input.icon, input.color);
      const name = input.name.trim();
      const [taken] = await tx
        .select({ id: guilds.id })
        .from(guilds)
        .where(and(eq(guilds.worldId, c.worldId), sql`lower(${guilds.name}) = lower(${name})`));
      if (taken) throw guildError(ErrorCode.GUILD_NAME_TAKEN, 'That guild name is taken.');
      const [paid] = await tx
        .update(characters)
        .set({ gold: sql`${characters.gold} - ${GUILD_RULES.createCost}` })
        .where(and(eq(characters.id, c.id), sql`${characters.gold} >= ${GUILD_RULES.createCost}`))
        .returning({ id: characters.id });
      if (!paid)
        throw guildError(
          ErrorCode.NOT_ENOUGH_GOLD,
          `Founding a guild costs ${GUILD_RULES.createCost} gold.`,
        );
      const [g] = await tx
        .insert(guilds)
        .values({
          worldId: c.worldId,
          name,
          icon: input.icon,
          color: input.color,
          leaderCharacterId: c.id,
        })
        .returning();
      await tx.insert(guildMembers).values({ guildId: g!.id, characterId: c.id, role: 'leader' });
      await tx.delete(guildInvites).where(eq(guildInvites.characterId, c.id));
      await this.event(tx, c, 'guild.created', { guildId: g!.id, name });
      return `${name} is founded!`;
    });
  }

  update(accountId: string, characterId: string, input: { icon?: string; color?: string }) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild } = await this.mine(tx, c, true);
      this.checkEmblem(input.icon, input.color);
      await tx
        .update(guilds)
        .set({
          ...(input.icon ? { icon: input.icon } : {}),
          ...(input.color ? { color: input.color } : {}),
        })
        .where(eq(guilds.id, guild.id));
      return 'Emblem updated.';
    });
  }

  invite(accountId: string, characterId: string, name: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild } = await this.mine(tx, c, true);
      const [target] = await tx
        .select()
        .from(characters)
        .where(
          and(
            eq(characters.worldId, c.worldId),
            isNull(characters.deletedAt),
            sql`lower(${characters.name}) = lower(${name.trim()})`,
          ),
        );
      if (!target) throw errors.notFound('Character');
      if (await this.membership(tx, target.id))
        throw guildError(ErrorCode.ALREADY_IN_GUILD, `${target.name} is already in a guild.`);
      if ((await this.memberCount(tx, guild.id)) >= GUILD_RULES.maxMembers)
        throw guildError(
          ErrorCode.GUILD_FULL,
          `A guild has at most ${GUILD_RULES.maxMembers} members.`,
        );
      await tx
        .insert(guildInvites)
        .values({ guildId: guild.id, characterId: target.id, invitedBy: c.id })
        .onConflictDoNothing();
      await this.event(tx, c, 'guild.invited', { guildId: guild.id, characterId: target.id });
      return `${target.name} is invited.`;
    });
  }

  answer(accountId: string, characterId: string, guildId: string, accept: boolean) {
    return this.act(accountId, characterId, async (tx, c) => {
      const [inv] = await tx
        .delete(guildInvites)
        .where(and(eq(guildInvites.guildId, guildId), eq(guildInvites.characterId, c.id)))
        .returning();
      if (!inv) throw errors.notFound('Invitation');
      if (!accept) return 'Invitation declined.';
      if (await this.membership(tx, c.id))
        throw guildError(ErrorCode.ALREADY_IN_GUILD, 'Leave your guild first.');
      const [g] = await tx.select().from(guilds).where(eq(guilds.id, guildId)).for('update');
      if (!g) throw errors.notFound('Guild');
      if ((await this.memberCount(tx, g.id)) >= GUILD_RULES.maxMembers)
        throw guildError(ErrorCode.GUILD_FULL, `${g.name} is full.`);
      await tx.insert(guildMembers).values({ guildId: g.id, characterId: c.id, role: 'member' });
      await tx.delete(guildInvites).where(eq(guildInvites.characterId, c.id));
      await this.event(tx, c, 'guild.joined', { guildId: g.id });
      return `Welcome to ${g.name}!`;
    });
  }

  kick(accountId: string, characterId: string, memberId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild } = await this.mine(tx, c, true);
      if (memberId === c.id) throw errors.validation('Leave the guild instead.');
      const [gone] = await tx
        .delete(guildMembers)
        .where(and(eq(guildMembers.guildId, guild.id), eq(guildMembers.characterId, memberId)))
        .returning();
      if (!gone) throw errors.notFound('Member');
      await this.event(tx, c, 'guild.kicked', { guildId: guild.id, characterId: memberId });
      return 'Member removed.';
    });
  }

  /** Leave. A leader passes the lead to the longest-serving member; alone, the guild ends. */
  leave(accountId: string, characterId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild, role } = await this.mine(tx, c);
      await tx.delete(guildMembers).where(eq(guildMembers.characterId, c.id));
      const [next] = await tx
        .select()
        .from(guildMembers)
        .where(eq(guildMembers.guildId, guild.id))
        .orderBy(asc(guildMembers.joinedAt))
        .limit(1);
      if (!next) {
        await tx.delete(guilds).where(eq(guilds.id, guild.id));
        await this.event(tx, c, 'guild.disbanded', { guildId: guild.id, name: guild.name });
        return `${guild.name} is no more.`;
      }
      if (role === 'leader') await this.setLeader(tx, guild.id, next.characterId);
      await this.event(tx, c, 'guild.left', { guildId: guild.id });
      return `You left ${guild.name}.`;
    });
  }

  transfer(accountId: string, characterId: string, memberId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild } = await this.mine(tx, c, true);
      const [m] = await tx
        .select()
        .from(guildMembers)
        .where(and(eq(guildMembers.guildId, guild.id), eq(guildMembers.characterId, memberId)));
      if (!m || memberId === c.id) throw errors.notFound('Member');
      await tx
        .update(guildMembers)
        .set({ role: 'member' })
        .where(eq(guildMembers.characterId, c.id));
      await this.setLeader(tx, guild.id, memberId);
      return 'You passed the lead.';
    });
  }

  private async setLeader(tx: DbOrTx, guildId: string, characterId: string) {
    await tx
      .update(guildMembers)
      .set({ role: 'leader' })
      .where(eq(guildMembers.characterId, characterId));
    await tx.update(guilds).set({ leaderCharacterId: characterId }).where(eq(guilds.id, guildId));
  }

  depositGold(accountId: string, characterId: string, amount: number) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild } = await this.mine(tx, c);
      const [paid] = await tx
        .update(characters)
        .set({ gold: sql`${characters.gold} - ${amount}` })
        .where(and(eq(characters.id, c.id), sql`${characters.gold} >= ${amount}`))
        .returning({ id: characters.id });
      if (!paid) throw guildError(ErrorCode.NOT_ENOUGH_GOLD, `You do not have ${amount} gold.`);
      await tx
        .update(guilds)
        .set({ gold: sql`${guilds.gold} + ${amount}` })
        .where(eq(guilds.id, guild.id));
      await this.event(tx, c, 'guild.gold_deposited', { guildId: guild.id, amount });
      return `${amount} gold added to the guild bank.`;
    });
  }

  /** The leader buys the hex they stand on, with gold from the guild bank. */
  buyLand(accountId: string, characterId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild } = await this.mine(tx, c, true);
      if (guild.landQ !== null) throw errors.validation('Your guild already owns land.');
      const hex = { q: c.hexQ, r: c.hexR };
      const bad = checkGuildLand(hex);
      if (bad) throw errors.validation(bad);
      const [owner] = await tx
        .select({ name: guilds.name })
        .from(guilds)
        .where(
          and(eq(guilds.worldId, c.worldId), eq(guilds.landQ, hex.q), eq(guilds.landR, hex.r)),
        );
      if (owner) throw errors.validation(`${owner.name} already owns this land.`);
      const [paid] = await tx
        .update(guilds)
        .set({ gold: sql`${guilds.gold} - ${GUILD_RULES.landCost}`, landQ: hex.q, landR: hex.r })
        .where(and(eq(guilds.id, guild.id), sql`${guilds.gold} >= ${GUILD_RULES.landCost}`))
        .returning({ id: guilds.id });
      if (!paid)
        throw guildError(
          ErrorCode.NOT_ENOUGH_GOLD,
          `Land costs ${GUILD_RULES.landCost} gold from the guild bank.`,
        );
      await this.event(tx, c, 'guild.land_bought', { guildId: guild.id, ...hex });
      return `This land now belongs to ${guild.name}.`;
    });
  }

  private assertStorage(c: Character, g: Guild) {
    if (!this.storageHere(c, g))
      throw guildError(
        ErrorCode.NOT_HERE,
        'Guild storage is reached from a capital or from your guild’s land.',
      );
  }

  depositItem(accountId: string, characterId: string, itemId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild } = await this.mine(tx, c);
      this.assertStorage(c, guild);
      const [item] = await tx
        .select()
        .from(items)
        .where(and(eq(items.id, itemId), eq(items.characterId, c.id)));
      if (!item) throw errors.notFound('Item');
      if (item.equippedSlot || item.inStorage)
        throw errors.validation('Only items in your bag can go to the guild storage.');
      const name = getItemDef(item.itemDefId)?.name ?? item.itemDefId;
      let joined = false;
      if (isStackable(getItemDef(item.itemDefId))) {
        const [stack] = await tx
          .update(guildItems)
          .set({ quantity: sql`${guildItems.quantity} + ${item.quantity}` })
          .where(
            and(
              eq(guildItems.guildId, guild.id),
              eq(guildItems.itemDefId, item.itemDefId),
              item.grade === null ? isNull(guildItems.grade) : eq(guildItems.grade, item.grade),
            ),
          )
          .returning({ id: guildItems.id });
        joined = !!stack;
      }
      if (!joined) {
        const [row] = await tx
          .select({ n: count() })
          .from(guildItems)
          .where(eq(guildItems.guildId, guild.id));
        if ((row?.n ?? 0) >= GUILD_RULES.storageSlots)
          throw guildError(ErrorCode.BAG_FULL, 'The guild storage is full.');
        await tx.insert(guildItems).values({
          guildId: guild.id,
          itemDefId: item.itemDefId,
          quality: item.quality,
          quantity: item.quantity,
          upgradeLevel: item.upgradeLevel,
          grade: item.grade,
          specials: item.specials,
          runeSlots: item.runeSlots,
          source: item.source,
          depositedBy: c.id,
        });
      }
      await tx.delete(items).where(eq(items.id, item.id));
      await this.event(tx, c, 'guild.item_deposited', {
        guildId: guild.id,
        itemDefId: item.itemDefId,
        quantity: item.quantity,
      });
      return `${name} given to the guild.`;
    });
  }

  withdrawItem(accountId: string, characterId: string, guildItemId: string) {
    return this.act(accountId, characterId, async (tx, c) => {
      const { guild } = await this.mine(tx, c);
      this.assertStorage(c, guild);
      const [gi] = await tx
        .delete(guildItems)
        .where(and(eq(guildItems.id, guildItemId), eq(guildItems.guildId, guild.id)))
        .returning();
      if (!gi) throw errors.notFound('Item');
      const name = getItemDef(gi.itemDefId)?.name ?? gi.itemDefId;
      if (isStackable(getItemDef(gi.itemDefId))) {
        await giveItem(tx, c.id, gi.itemDefId, {
          qty: gi.quantity,
          source: gi.source,
          grade: gi.grade,
          strict: true,
        });
      } else {
        await assertBagRoom(tx, c.id);
        await tx.insert(items).values({
          characterId: c.id,
          itemDefId: gi.itemDefId,
          quality: gi.quality,
          quantity: 1,
          upgradeLevel: gi.upgradeLevel,
          grade: gi.grade,
          specials: gi.specials,
          runeSlots: gi.runeSlots,
          source: gi.source,
        });
      }
      await this.event(tx, c, 'guild.item_withdrawn', {
        guildId: guild.id,
        itemDefId: gi.itemDefId,
        quantity: gi.quantity,
      });
      return `${name} taken from the guild storage.`;
    });
  }
}

/** A guild storage row shaped like an item row, for `toItemDto`. */
function asItem(gi: typeof guildItems.$inferSelect): Item {
  return {
    id: gi.id,
    characterId: '',
    itemDefId: gi.itemDefId,
    quality: gi.quality,
    quantity: gi.quantity,
    equippedSlot: null,
    inStorage: true,
    source: gi.source,
    upgradeLevel: gi.upgradeLevel,
    grade: gi.grade,
    specials: gi.specials,
    runeSlots: gi.runeSlots,
    createdAt: gi.createdAt,
    updatedAt: gi.createdAt,
  };
}

/**
 * Request #57: after a victorious run, each guild with at least two members
 * in the party earns the reputation those members earned.
 */
export async function awardGuildReputation(
  tx: DbOrTx,
  earned: Array<{ characterId: string; reputation: number }>,
): Promise<void> {
  if (earned.length < 2) return;
  const rows = await tx
    .select({ characterId: guildMembers.characterId, guildId: guildMembers.guildId })
    .from(guildMembers)
    .where(
      inArray(
        guildMembers.characterId,
        earned.map((e) => e.characterId),
      ),
    );
  const byGuild = new Map<string, number[]>();
  for (const r of rows) {
    const rep = earned.find((e) => e.characterId === r.characterId)?.reputation ?? 0;
    byGuild.set(r.guildId, [...(byGuild.get(r.guildId) ?? []), rep]);
  }
  for (const [guildId, reps] of byGuild) {
    const gain = guildRunReputation(reps);
    if (gain > 0)
      await tx
        .update(guilds)
        .set({ reputation: sql`${guilds.reputation} + ${gain}` })
        .where(eq(guilds.id, guildId));
  }
}
