import { customContent, items, worldEvents, type DbOrTx } from '@realms/db';
import {
  customIdFor,
  setCustomContent,
  validateCustomAbility,
  validateCustomItem,
} from '@realms/game-core';
import { publishControl } from '@realms/server-kit';
import {
  customAbilityInputSchema,
  customItemInputSchema,
  type CustomAbilityDto,
  type CustomAbilityInput,
  type CustomContentDto,
  type CustomItemDto,
  type CustomItemInput,
} from '@realms/shared';
import { and, asc, eq, isNotNull, notInArray } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import type { AppContext } from '../../context.js';
import { errors } from '../../lib/errors.js';

type Kind = 'item' | 'ability';

/**
 * Admin-made items and abilities (request #41). The database is the source of
 * truth; this service keeps the game-core content registry of this process in
 * sync and tells the other server instances to reload.
 */
export class CustomContentService {
  private current: CustomContentDto = { items: [], abilities: [] };

  constructor(
    private readonly ctx: AppContext,
    private readonly log: FastifyBaseLogger,
  ) {}

  /** What every client loads into its registry. */
  snapshot(): CustomContentDto {
    return this.current;
  }

  /** Load every definition from the database into the registry. */
  async reload(): Promise<void> {
    const rows = await this.ctx.db
      .select()
      .from(customContent)
      .orderBy(asc(customContent.createdAt));
    const next: CustomContentDto = { items: [], abilities: [] };
    for (const row of rows) {
      const schema = row.kind === 'item' ? customItemInputSchema : customAbilityInputSchema;
      const parsed = schema.safeParse(row.definition);
      if (!parsed.success) {
        this.log.warn({ id: row.id }, 'skipping invalid custom content');
        continue;
      }
      if (row.kind === 'item') next.items.push({ ...(parsed.data as CustomItemInput), id: row.id });
      else next.abilities.push({ ...(parsed.data as CustomAbilityInput), id: row.id });
    }
    this.current = next;
    setCustomContent(next);
  }

  async createItem(adminId: string, input: CustomItemInput): Promise<CustomItemDto> {
    const value = this.checkItem(input);
    const id = customIdFor(value.name, randomBytes(3).toString('hex'));
    await this.save(adminId, 'item', id, value, true);
    return { ...value, id };
  }

  async updateItem(adminId: string, id: string, input: CustomItemInput): Promise<CustomItemDto> {
    const value = this.checkItem(input);
    await this.save(adminId, 'item', id, value, false, async (tx) => {
      // Owned copies equipped in a slot the item no longer allows go back to the inventory.
      await tx
        .update(items)
        .set({ equippedSlot: null })
        .where(
          and(
            eq(items.itemDefId, id),
            isNotNull(items.equippedSlot),
            notInArray(items.equippedSlot, value.slots),
          ),
        );
    });
    return { ...value, id };
  }

  async createAbility(adminId: string, input: CustomAbilityInput): Promise<CustomAbilityDto> {
    const value = this.checkAbility(input);
    const id = customIdFor(value.name, randomBytes(3).toString('hex'));
    await this.save(adminId, 'ability', id, value, true);
    return { ...value, id };
  }

  async updateAbility(
    adminId: string,
    id: string,
    input: CustomAbilityInput,
  ): Promise<CustomAbilityDto> {
    const value = this.checkAbility(input);
    await this.save(adminId, 'ability', id, value, false);
    return { ...value, id };
  }

  private checkItem(input: CustomItemInput): CustomItemInput {
    const res = validateCustomItem(input);
    if (!res.ok) throw errors.validation(res.reason);
    return res.value;
  }

  private checkAbility(input: CustomAbilityInput): CustomAbilityInput {
    const res = validateCustomAbility(input);
    if (!res.ok) throw errors.validation(res.reason);
    return res.value;
  }

  private async save(
    adminId: string,
    kind: Kind,
    id: string,
    definition: CustomItemInput | CustomAbilityInput,
    create: boolean,
    extra?: (tx: DbOrTx) => Promise<void>,
  ): Promise<void> {
    await this.ctx.db.transaction(async (tx) => {
      if (create) {
        await tx.insert(customContent).values({ id, kind, definition, createdBy: adminId });
      } else {
        const [row] = await tx
          .update(customContent)
          .set({ definition, updatedAt: new Date() })
          .where(and(eq(customContent.id, id), eq(customContent.kind, kind)))
          .returning({ id: customContent.id });
        if (!row) throw errors.notFound(kind === 'item' ? 'Custom item' : 'Custom ability');
      }
      await extra?.(tx);
      await tx.insert(worldEvents).values({
        worldId: this.ctx.world.id,
        type: create ? `admin.${kind}_created` : `admin.${kind}_updated`,
        actorAccountId: adminId,
        payload: { id, name: definition.name },
      });
    });
    await this.reload();
    await publishControl(this.ctx.redis, { kind: 'content.changed' });
  }
}
