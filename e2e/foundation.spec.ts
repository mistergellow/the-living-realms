import { expect, test, type Page } from '@playwright/test';
import { hexDistance, REGIONS, riftSites, worldMapHexes } from '../packages/game-core/src/index.js';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PASSWORD = 'correct horse battery';

/** Letters-only random name (names cannot contain digits). */
const randomName = (prefix: string) =>
  prefix +
  Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join(
    '',
  );

const WEST_CAPITAL = REGIONS.west.capital!.hex;

/**
 * Travel (request #43) through the API to the nearest tier-1 Rift entrance or
 * river from the West capital. The page follows through the world connection.
 */
async function travel(page: Page, name: string, to: 'rift' | 'river') {
  const { characters } = (await (await page.request.get('/api/characters')).json()) as {
    characters: Array<{ id: string; name: string }>;
  };
  const id = characters.find((c) => c.name === name)!.id;
  const candidates =
    to === 'rift'
      ? riftSites().filter((s) => s.rift!.tier === 1)
      : worldMapHexes().filter((h) => h.terrain === 'river');
  const dest = [...candidates].sort(
    (a, b) => hexDistance(WEST_CAPITAL, a) - hexDistance(WEST_CAPITAL, b),
  )[0]!;
  const res = await page.request.post(`/api/characters/${id}/move`, {
    data: { to: { q: dest.q, r: dest.r } },
  });
  expect(res.status()).toBe(200);
  return { q: dest.q, r: dest.r };
}

async function register(page: Page, email: string) {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/characters\/new$/);
}

async function createCharacter(page: Page, name: string, kit = 'Sword') {
  await page.getByLabel('Name').fill(name);
  // Request #43: nation of origin (start in its capital) and a starting kit.
  await page
    .getByTestId('nations')
    .getByRole('button', { name: /Kingdom of the West/ })
    .click();
  await page
    .getByTestId('starter-kits')
    .getByRole('button', { name: new RegExp(`^${kit}`) })
    .click();
  await page.getByRole('button', { name: 'Hair style spiky' }).click();
  await page.getByRole('button', { name: 'Create and enter the world' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByTestId('self-name')).toHaveText(name);
}

test('register → create character → enter the world → log out → log in', async ({ page }) => {
  const email = `e2e-${unique()}@example.com`;
  const name = randomName('Hero');

  await register(page, email);
  await page.screenshot({ path: 'test-results/screens/01-create.png' });
  await createCharacter(page, name);

  // The hex you stand on: the capital of your nation (request #43), its actions and the hex chat.
  await expect(page.getByTestId('connection-status')).toContainText('Online');
  await expect(page.getByTestId('place-name')).toHaveText(REGIONS.west.capital!.name);
  await expect(page.getByTestId('top-ap')).toHaveText('120/120');
  await page.screenshot({ path: 'test-results/screens/02-home.png' });
  await page.getByRole('link', { name: 'Travel', exact: true }).click();
  await expect(page).toHaveURL(/\/world$/);
  await expect(page.getByTestId('player-list')).toContainText(name);
  await expect(page.getByTestId('world-tick')).toBeVisible();
  // The continent: you stand in the West capital (centre of the view).
  const canvas = page.locator('.world-map canvas');
  await expect(async () => {
    await canvas.click(); // the scene may still be loading
    await expect(page.getByTestId('hex-info')).toContainText('West Capital', { timeout: 500 });
  }).toPass();
  await page.screenshot({ path: 'test-results/screens/02-world.png' });
  // Travel (request #43): select a hex to the right and pay AP to go there.
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width / 2 + 140, y: box.height / 2 } });
  await expect(page.getByTestId('travel')).toContainText('AP');
  await page.getByTestId('travel').click();
  await expect(page.getByTestId('hex-info')).toContainText('0 away');
  await expect(page.getByTestId('top-ap')).not.toHaveText('120/120');
  for (let i = 0; i < 8; i++) await page.keyboard.press('-');
  await page.screenshot({ path: 'test-results/screens/02-world-continent.png' });

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  // Straight back in with the last character played, on the hex where it stopped.
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByTestId('self-name')).toHaveText(name);
  // Switching character is a small corner button.
  await page.getByRole('button', { name: 'Switch character' }).click();
  await expect(page).toHaveURL(/\/characters$/);
  await expect(page.getByTestId('character-card')).toContainText(name);
  await expect(page.getByTestId('locked-slot')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/03-select.png' });
});

test('shows validation errors', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill('nope');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm password').fill('different');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
});

test('players see each other in real time', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const nameA = randomName('Alda');
  const nameB = randomName('Brann');

  await register(a, `e2e-a-${unique()}@example.com`);
  await createCharacter(a, nameA);
  await register(b, `e2e-b-${unique()}@example.com`);
  await createCharacter(b, nameB);

  // Hex chat: both stand in the starting town and hear each other.
  await a.getByLabel('Message').fill('Well met!');
  await a.getByRole('button', { name: 'Send' }).click();
  await expect(b.getByTestId('hex-chat-log')).toContainText(`${nameA}Well met!`);
  await expect(a.getByTestId('hex-here')).toContainText(nameB);

  await a.getByRole('link', { name: 'World', exact: true }).click();
  await b.getByRole('link', { name: 'World', exact: true }).click();

  await expect(a.getByTestId('player-list')).toContainText(nameB);
  await expect(b.getByTestId('player-list')).toContainText(nameA);

  await b.close();
  await expect(a.getByTestId('player-list')).not.toContainText(nameB);
  // Close it: an open world page keeps its canvas map rendering during later tests.
  await a.context().close();
  await b.context().close();
});

test('one active character per account: a second tab takes over', async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  await register(first, `e2e-solo-${unique()}@example.com`);
  await createCharacter(first, randomName('Solo'));

  const second = await context.newPage();
  await second.goto('/characters');
  await second.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(second.getByTestId('connection-status')).toContainText('Online');

  await expect(first.getByRole('heading', { name: 'Playing elsewhere' })).toBeVisible();
  await first.screenshot({ path: 'test-results/screens/04-replaced.png' });
  await context.close(); // stop the canvas map rendering in these pages
});

test('character system: attributes, starting weapon, sheet and equipment', async ({ page }) => {
  await register(page, `e2e-sheet-${unique()}@example.com`);
  const name = randomName('Archer');
  await page.screenshot({ path: 'test-results/screens/05-create.png', fullPage: true });
  await createCharacter(page, name, 'Bow');

  await page.getByRole('link', { name: 'Character', exact: true }).click();
  await expect(page.getByTestId('sheet-name')).toHaveText(name);
  // Request #43: creation is short; all 12 points are spent here, on the sheet.
  const allocate = page.getByTestId('allocate');
  await expect(allocate).toContainText('12 / 12 points left');
  for (let i = 0; i < 5; i++)
    await allocate.getByRole('button', { name: 'Increase Agility' }).click();
  for (let i = 0; i < 4; i++)
    await allocate.getByRole('button', { name: 'Increase Endurance' }).click();
  await allocate.getByRole('button', { name: 'Increase Precision' }).click();
  await page.getByRole('button', { name: 'Confirm attributes' }).click();
  await expect(page.getByTestId('sheet-attr-agility')).toHaveText('10');
  await expect(page.getByTestId('sheet-attr-precision')).toHaveText('6');
  await expect(page.getByTestId('stat-hp')).toHaveText(String(40 + 6 * 9));
  await page.screenshot({ path: 'test-results/screens/06-sheet.png', fullPage: true });

  // Abilities tab: weapon abilities and basic actions are always there; no skills learned yet.
  await page.getByRole('tab', { name: /Abilities/ }).click();
  await expect(page.getByTestId('abilities')).toContainText('Marking Shot');
  await expect(page.getByTestId('basic-actions')).toContainText('Swap Position');
  await expect(page.getByTestId('loadout')).toContainText('Empty');
  await expect(page.getByTestId('library-empty')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/06b-abilities.png', fullPage: true });
  await page.getByRole('tab', { name: /Professions/ }).click();
  await expect(page.getByTestId('profession-fishing')).toBeVisible();
  await page.getByRole('tab', { name: /Equipment/ }).click();

  // Drag and drop: the bow goes to the bag and back to the main hand.
  await page
    .getByRole('button', { name: 'Main hand: Hunting Bow' })
    .dragTo(page.getByTestId('inventory'));
  await expect(page.getByLabel('Main hand: empty')).toBeVisible();
  const bow = page.getByTestId('bag-item-hunting_bow');
  await bow.hover();
  await expect(page.getByTestId('item-tooltip')).toContainText('Basic attack');
  // Item card parts (request #37): rarity and BASE-attribute requirements.
  await expect(page.getByTestId('item-tooltip')).toHaveAttribute('data-rarity', 'common');
  await expect(page.getByTestId('item-tooltip')).toContainText('Common');
  await expect(page.getByTestId('item-tooltip')).toContainText('Requires');
  await expect(page.getByTestId('item-tooltip')).toContainText('Precision');
  await page.screenshot({ path: 'test-results/screens/06c-tooltip.png' });
  await bow.dragTo(page.getByTestId('slot-mainHand'));
  await expect(page.getByRole('button', { name: 'Main hand: Hunting Bow' })).toBeVisible();
  await page.getByRole('tab', { name: /Abilities/ }).click();
  await expect(page.getByTestId('abilities')).toContainText('Aimed Shot');
});

test('Rift: map, live actions, block, end turn, enemy phase, abandon', async ({ page }) => {
  await register(page, `e2e-rift-${unique()}@example.com`);
  const raider = randomName('Raider');
  await createCharacter(page, raider);
  // Rifts open on certain hexes (request #43) and there is no Rifts tab
  // (request #50): you go there and enter from the hex.
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Rifts' }),
  ).toHaveCount(0);
  await travel(page, raider, 'rift');
  await page.getByRole('link', { name: /Enter the Rift/ }).click();
  await expect(page.getByTestId('rift-card')).toContainText('Tier 1');
  await expect(page.getByTestId('top-ap')).toHaveText(/^1\d\d\/120$/);
  await page.getByRole('button', { name: 'Enter solo' }).click();
  await expect(page).toHaveURL(/\/rifts\/runs\//);
  // The Rift map: branching paths; the first row is always a fight.
  await expect(page.getByTestId('rift-map')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/06-rift-map.png' });
  await page.getByTestId('room-combat').first().click();

  // PvE turn (Slay the Spire): actions happen at once, then the enemies act.
  await expect(page.getByText('Your turn')).toBeVisible();
  await expect(page.getByTestId('round')).toHaveText('Round 1');
  await expect(page.getByTestId('my-focus')).toHaveText('3');
  // Slay-the-Spire style intents: enemies show what they will do.
  await expect(page.getByTestId('intent').first()).toBeVisible();

  // Only the nearest column is in melee reach, so Slash happens at once.
  await page.getByRole('button', { name: /^Slash/ }).click();
  await expect(page.getByTestId('combat-log')).toContainText('uses Slash');
  // A sword's basic attack costs 2 Focus (heavy weapons 3, daggers 1).
  await expect(page.getByTestId('my-focus')).toHaveText('1');
  await page.getByRole('button', { name: /^Dodge/ }).click();
  await expect(page.getByTestId('my-focus')).toHaveText('0');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/screens/07-combat.png' });

  await page.getByRole('button', { name: 'End turn' }).click();
  // The enemy phase plays out on the canvas first (the text log keeps pace with it).
  await expect(page.getByTestId('combat-log')).toContainText('Round 2', { timeout: 20_000 });

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Abandon' }).click();
  await expect(page.getByTestId('run-result')).toContainText('You fled the Rift');
  // Request #43: a lost Rift costs every equipped item 1–3% durability.
  await expect(page.getByTestId('run-result')).toContainText(/Training Sword: quality 9[789]/);
});

test('friends + private lobby + group Rift with two players', async ({ browser }) => {
  test.setTimeout(90_000); // two players, a lobby and a replayed enemy phase on a software-rendered canvas
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const nameA = randomName('Lead');
  const nameB = randomName('Mate');
  await register(a, `e2e-la-${unique()}@example.com`);
  await createCharacter(a, nameA);
  await register(b, `e2e-lb-${unique()}@example.com`);
  await createCharacter(b, nameB);
  // Both travel to the same Rift entrance (request #43).
  await travel(a, nameA, 'rift');
  await travel(b, nameB, 'rift');

  // A sends a friend request; B accepts.
  await a.getByTestId('friends-link').click();
  await a.getByLabel('Add a friend by character name').fill(nameB);
  await a.getByRole('button', { name: 'Send request' }).click();
  await expect(a.getByText('Sent requests')).toBeVisible();
  await b.goto('/friends');
  await b.getByRole('button', { name: 'Accept' }).click();
  await expect(b.getByTestId('friends')).toContainText(nameA);

  // A creates a private lobby and invites B.
  await a.goto('/rifts');
  await a.getByLabel('Private (invite only)').check();
  await a.getByRole('button', { name: 'Create lobby' }).click();
  await expect(a).toHaveURL(/\/rifts\/lobbies\//);
  await a.getByRole('button', { name: 'Invite' }).click();

  // B accepts the invitation, then gets ready.
  await b.goto('/rifts');
  await expect(b.getByTestId('invites')).toContainText(nameA);
  await b.getByTestId('invites').getByRole('button', { name: 'Join' }).click();
  await expect(b).toHaveURL(/\/rifts\/lobbies\//);
  await expect(a.getByTestId('lobby-member')).toHaveCount(2);
  await b.getByRole('button', { name: "I'm ready" }).click();
  await a.screenshot({ path: 'test-results/screens/08-lobby.png', fullPage: true });

  // A starts: both land on the Rift map and vote for the same first room.
  await a.getByRole('button', { name: 'Enter the Rift' }).click();
  await expect(a).toHaveURL(/\/rifts\/runs\//);
  await expect(b).toHaveURL(/\/rifts\/runs\//);
  await a.getByTestId('room-combat').first().click();
  await expect(a.getByText('Waiting for the others to vote')).toBeVisible();
  await b.getByTestId('room-combat').first().click();
  await expect(a.getByTestId('unit-party')).toHaveCount(2, { timeout: 10_000 });
  await expect(b.getByTestId('unit-party')).toHaveCount(2, { timeout: 10_000 });

  // Both act at the same time; the enemies act once both end their turn.
  await a.getByRole('button', { name: 'End turn' }).click();
  await expect(a.getByTestId('waiting')).toContainText(`Waiting for ${nameB}`);
  await b.getByRole('button', { name: 'End turn' }).click();
  await expect(b.getByTestId('round')).toHaveText('Round 2', { timeout: 20_000 });
  await b.screenshot({ path: 'test-results/screens/09-group-combat.png' });

  // B leaves; A keeps fighting and sees it in the log.
  b.once('dialog', (d) => d.accept());
  await b.getByRole('button', { name: 'Abandon' }).click();
  await expect(b.getByTestId('run-result')).toContainText('You fled the Rift');
  await expect(a.getByTestId('unit-party').filter({ hasText: nameB })).toContainText('(left)', {
    timeout: 10_000,
  });
  // The text log waits for the canvas to finish replaying the enemy phase, and
  // a page in the background barely animates: bring A to the front first.
  await a.bringToFront();
  await expect(a.getByTestId('combat-log')).toContainText(`${nameB} left the Rift.`, {
    timeout: 20_000,
  });
});

test('professions: Mastery sections, fishing with a rod, inspect a profile', async ({ page }) => {
  await register(page, `e2e-prof-${unique()}@example.com`);
  const angler = randomName('Angler');
  await createCharacter(page, angler);
  // Fishing needs a river (request #43).
  await travel(page, angler, 'river');
  await expect(page.getByTestId('place-name')).toContainText('River');
  await page.getByRole('link', { name: 'Professions', exact: true }).click();
  // Request #51: two sections, Novice ranks, the starter rod in the bag.
  await expect(page.getByTestId('section-gathering')).toContainText('Gathering Mastery');
  await expect(page.getByTestId('section-crafting')).toContainText('Crafting Mastery');
  await expect(page.getByTestId('profession-scribing')).toContainText('Novice');
  await expect(page.getByTestId('profession-fishing')).toContainText('Novice');
  await page.getByTestId('profession-fishing').click();
  await expect(page.getByTestId('profession-tool')).toContainText('Fishing Rod');
  // The test travelled through the API, not the UI: reload to see the new AP.
  await page.reload();
  await expect(page.getByTestId('top-ap')).not.toHaveText('120/120');
  const apBefore = Number((await page.getByTestId('top-ap').innerText()).split('/')[0]);
  // Request #52: gathering costs AP and uses the spot's resources.
  await expect(page.getByTestId('profession-node')).toContainText('left');
  await page.getByRole('button', { name: 'Fish', exact: true }).click();
  await expect(page.getByTestId('activity-result')).toContainText('Mastery');
  await expect(page.getByTestId('activity-result')).toContainText('AP');
  await expect(page.getByTestId('profession-stats')).toContainText('1 attempt');
  // Request #56: several attempts at once, paid in AP.
  await page.getByLabel('Attempts of Fish').fill('3');
  await page.getByTestId('job-fish').getByRole('button', { name: /Now · 6 AP/ }).click();
  await expect(page.getByTestId('job-result')).toContainText('Fish × 3');
  // Request #59: the header's AP follows at once (2 for the single fish + 6).
  await expect(page.getByTestId('top-ap')).toContainText(`${apBefore - 8}/`);
  await page.screenshot({ path: 'test-results/screens/10-professions.png' });
  // Crafting: higher recipes are listed as not unlocked yet.
  await page.getByTestId('profession-carpentry').click();
  await expect(page.getByTestId('locked-recipes')).toContainText('unlocks at Apprentice');
  // Inspect a professional profile (here: your own, by name).
  await page.getByLabel('Character to inspect').fill(angler);
  await page.getByRole('button', { name: 'Inspect' }).click();
  await expect(page.getByTestId('profession-profile')).toContainText(angler);
  await expect(page.getByTestId('profile-fishing')).toContainText('4 attempts');
  await page.screenshot({ path: 'test-results/screens/10b-profession-profile.png' });
});

test('city storage: grids, drag and drop, search, sort (requests #52, #59)', async ({ page }) => {
  await register(page, `e2e-store-${unique()}@example.com`);
  await createCharacter(page, randomName('Keeper'));
  // New characters start in their capital, with the four basic tools in the bag.
  await page.goto('/city/storage');
  const bag = page.getByTestId('bag');
  const storage = page.getByTestId('storage');
  await expect(bag.getByTestId('bag-item-fishing_rod')).toBeVisible();
  // Drag the rod onto storage slot 7: it stays there.
  await bag.getByTestId('bag-item-fishing_rod').dragTo(storage.getByTestId('storage-cell-7'));
  await expect(storage.getByTestId('storage-item-fishing_rod')).toHaveAttribute('data-slot', '7');
  await expect(bag.getByTestId('bag-item-fishing_rod')).toHaveCount(0);
  // Search dims what does not match (nothing moves).
  await page.getByLabel('Search the bag and storage').fill('pick');
  await expect(bag.getByTestId('bag-item-felling_axe')).toHaveAttribute('data-dim', 'true');
  await expect(bag.getByTestId('bag-item-pickaxe')).not.toHaveAttribute('data-dim', 'true');
  await page.getByLabel('Search the bag and storage').fill('');
  // Back into the bag, at slot 12; then Sort packs the bag again.
  await storage.getByTestId('storage-item-fishing_rod').dragTo(bag.getByTestId('bag-cell-12'));
  await expect(bag.getByTestId('bag-item-fishing_rod')).toHaveAttribute('data-slot', '12');
  await page.getByRole('button', { name: 'Sort the bag' }).click();
  await expect(bag.getByTestId('bag-cell-12')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/12-storage.png' });
  // Request #59: the store is a grid too.
  await page.getByRole('tab', { name: 'General store' }).click();
  await expect(page.getByTestId('shop-grid')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/12b-shop.png' });
  // Request #54: the blacksmith shows what an upgrade changes.
  await page.getByRole('tab', { name: 'Blacksmith' }).click();
  await page.getByTestId('blacksmith').locator('.city-row > .city-name > strong').first().hover();
  await expect(page.getByTestId('upgrade-compare')).toContainText('→ +1');
  await expect(page.getByTestId('upgrade-compare')).toContainText('After the upgrade');
  await page.screenshot({ path: 'test-results/screens/13-blacksmith-compare.png' });
});

test('guild: the Guild tab offers to found one with an emblem (request #57)', async ({ page }) => {
  await register(page, `e2e-guild-${unique()}@example.com`);
  await createCharacter(page, randomName('Founder'));
  await page.getByTestId('guild-link').click();
  await expect(page.getByTestId('guild-found')).toContainText('Found a guild');
  await page.getByLabel('Guild name').fill('Silver Hawks');
  await page.getByRole('radio', { name: 'eagle' }).click();
  await page.getByRole('radio', { name: '#1565c0' }).click();
  await expect(page.getByRole('radio', { name: 'eagle' })).toHaveAttribute('aria-checked', 'true');
  // A new character has no gold yet: founding (500 gold) is not possible.
  await expect(page.getByRole('button', { name: /Found · 500 gold/ })).toBeDisabled();
  await page.screenshot({ path: 'test-results/screens/14-guild.png' });
});

/** From a phone to a 4K monitor, including ultrawide and a short laptop screen. */
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'fullhd', width: 1920, height: 1080 },
  { name: 'ultrawide', width: 3440, height: 1440 },
  { name: '4k', width: 3840, height: 2160 },
];

/** The page itself must never scroll or overflow: screens fit the viewport. */
async function expectFitsViewport(page: Page, label = '') {
  const box = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  expect(box.sw).toBeLessThanOrEqual(box.w);
  expect(box.sh).toBeLessThanOrEqual(box.h);
  // Request #59: the screen area never scrolls either — only boxes inside it.
  const bodies = await page.evaluate(() =>
    [...document.querySelectorAll('.screen-body')].map((el) => ({
      sh: el.scrollHeight,
      ch: el.clientHeight,
    })),
  );
  for (const b of bodies)
    expect.soft(b.sh, `${label} at ${box.w}×${box.h}: the screen area scrolls`).toBeLessThanOrEqual(
      b.ch + 1,
    );
}

test('screens fit every screen size', async ({ page }) => {
  test.setTimeout(300_000); // 42 screenshots up to 4K, canvas rendered in software on CI
  await register(page, `e2e-sizes-${unique()}@example.com`);
  const name = randomName('Vista');
  await createCharacter(page, name);
  await expect(page.getByTestId('connection-status')).toContainText('Online');
  const characterUrl = await page
    .getByRole('link', { name: 'Character', exact: true })
    .getAttribute('href');

  const screens: Array<[string, () => Promise<unknown>]> = [
    ['home', () => expect(page.getByTestId('self-name')).toHaveText(name)],
    ['world', () => expect(page.getByTestId('self-name')).toHaveText(name)],
    ['select', () => expect(page.getByTestId('character-card')).toContainText(name)],
    ['create', () => expect(page.getByLabel('Name')).toBeVisible()],
    ['sheet', () => expect(page.getByTestId('sheet-name')).toHaveText(name)],
    ['rifts', () => expect(page.getByTestId('rift-sites')).toBeVisible()],
    ['worldboss', () => expect(page.getByTestId('world-boss')).toBeVisible()],
    ['professions', () => expect(page.getByTestId('profession-detail')).toBeVisible()],
    ['storage', () => expect(page.getByTestId('storage')).toBeVisible()],
    ['shop', () => expect(page.getByTestId('shop-grid')).toBeVisible()],
    ['guild', () => expect(page.getByTestId('guild-found')).toBeVisible()],
    ['friends', () => expect(page.getByTestId('friends-link')).toBeVisible()],
  ];
  const paths: Record<string, string> = {
    home: '/home',
    world: '/world',
    select: '/characters',
    create: '/characters/new',
    worldboss: '/world-boss',
    sheet: characterUrl!,
    rifts: '/rifts',
    professions: '/professions',
    storage: '/city/storage',
    shop: '/city/shop',
    guild: '/guild',
    friends: '/friends',
  };

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const [screen, ready] of screens) {
      await page.goto(paths[screen]!);
      await ready();
      await expectFitsViewport(page, screen);
      await page.screenshot({ path: `test-results/screens/sizes/${vp.name}-${screen}.png` });
    }
  }

  // Combat screen at every size (one run, re-rendered per viewport).
  await travel(page, name, 'rift');
  await page.goto('/rifts');
  await page.getByRole('button', { name: 'Enter solo' }).click();
  await expect(page.getByTestId('rift-map')).toBeVisible();
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await expect(page.getByTestId('rift-map')).toBeVisible();
    await expectFitsViewport(page);
    await page.screenshot({ path: `test-results/screens/sizes/${vp.name}-rift-map.png` });
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByTestId('room-combat').first().click();
  await expect(page.getByText('Your turn')).toBeVisible();
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await expect(page.getByTestId('unit-enemies').first()).toBeVisible();
    await expectFitsViewport(page);
    await page.screenshot({ path: `test-results/screens/sizes/${vp.name}-combat.png` });
  }
});
