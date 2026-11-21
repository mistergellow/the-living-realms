import { expect, test, type Page } from '@playwright/test';

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const PASSWORD = 'correct horse battery';

/** Letters-only random name (names cannot contain digits). */
const randomName = (prefix: string) =>
  prefix +
  Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join(
    '',
  );

async function register(page: Page, email: string) {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/characters\/new$/);
}

async function createCharacter(page: Page, name: string) {
  await page.getByLabel('Name').fill(name);
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

  // The hub: you are online, and its main buttons lead to the world map.
  await expect(page.getByTestId('connection-status')).toContainText('Online');
  await expect(page.getByTestId('activity')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/02-home.png' });
  await page.getByRole('link', { name: 'Explore the world' }).click();
  await expect(page).toHaveURL(/\/world$/);
  await expect(page.getByTestId('player-list')).toContainText(name);
  await expect(page.getByTestId('world-tick')).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/02-world.png' });

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/characters$/);
  await expect(page.getByTestId('character-card')).toContainText(name);
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
  await page.getByLabel('Name').fill(name);

  // Spend points: Agility 5 → 10 (max), Endurance 5 → 9. 3 points left unspent.
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Increase Agility' }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Increase Endurance' }).click();
  await expect(page.getByTestId('attr-agility')).toHaveText('10');
  await expect(page.getByTestId('points-remaining')).toContainText('3 / 12');
  await expect(page.getByRole('button', { name: 'Increase Agility' })).toBeDisabled();

  await page.getByRole('button', { name: /Hunting Bow/ }).click();
  await page.screenshot({ path: 'test-results/screens/05-create-attributes.png', fullPage: true });
  await page.getByRole('button', { name: 'Create and enter the world' }).click();
  await expect(page.getByTestId('self-name')).toHaveText(name);

  await page.getByRole('link', { name: 'Character', exact: true }).click();
  await expect(page.getByTestId('sheet-name')).toHaveText(name);
  await expect(page.getByTestId('sheet-attr-agility')).toHaveText('10');
  await expect(page.getByTestId('stat-hp')).toHaveText(String(40 + 6 * 9));
  await expect(page.getByTestId('abilities')).toContainText('Marking Shot');
  await page.screenshot({ path: 'test-results/screens/06-sheet.png', fullPage: true });

  // The 3 unspent points can be distributed later on the sheet.
  const allocate = page.getByTestId('allocate');
  await expect(allocate).toContainText('3 / 3 points left');
  await allocate.getByRole('button', { name: 'Increase Precision' }).click();
  await page.getByRole('button', { name: 'Confirm attributes' }).click();
  await expect(page.getByTestId('sheet-attr-precision')).toHaveText('6');

  await page.getByRole('button', { name: 'Unequip Hunting Bow' }).click();
  await expect(page.getByTestId('abilities')).toContainText('Unarmed Strike');
  // Item card (request #37): type, base effect and BASE-attribute requirements.
  const card = page.getByTestId('inventory').getByTestId('item-card');
  await expect(card).toHaveAttribute('data-rarity', 'common');
  await expect(card).toContainText('Weapon · Bow');
  await expect(card).toContainText('Requires');
  await expect(card).toContainText('Precision');
  await page.screenshot({ path: 'test-results/screens/06b-item-card.png', fullPage: true });
  await page.getByRole('button', { name: 'Equip Hunting Bow' }).click();
  // Clicking an equipped item opens its card.
  await page.getByRole('button', { name: 'Hunting Bow', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Hunting Bow' })).toContainText('Physical damage');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByTestId('abilities')).toContainText('Aimed Shot');
});

test('Rift: map, live actions, block, end turn, enemy phase, abandon', async ({ page }) => {
  await register(page, `e2e-rift-${unique()}@example.com`);
  await page.getByLabel('Name').fill(randomName('Raider'));
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Increase Might' }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Increase Endurance' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Increase Agility' }).click();
  await page.getByRole('button', { name: 'Wooden Shield' }).click();
  await page.getByRole('button', { name: 'Hair style long' }).click();
  await page.getByRole('button', { name: 'Create and enter the world' }).click();
  await expect(page.getByTestId('self-name')).toBeVisible();

  await page.getByRole('link', { name: 'Rifts', exact: true }).click();
  await expect(page.getByTestId('rift-card')).toContainText('Shattered Breach');
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
  await page.getByRole('button', { name: /^Block/ }).click();
  await expect(page.getByTestId('my-focus')).toHaveText('0');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/screens/07-combat.png' });

  await page.getByRole('button', { name: 'End turn' }).click();
  // The enemy phase plays out on the canvas first (the text log keeps pace with it).
  await expect(page.getByTestId('combat-log')).toContainText('Round 2', { timeout: 20_000 });

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Abandon' }).click();
  await expect(page.getByTestId('run-result')).toContainText('You fled the Rift');
  await expect(page.getByTestId('run-result')).toContainText('Wooden Shield');
});

test('friends + private lobby + group Rift with two players', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  const nameA = randomName('Lead');
  const nameB = randomName('Mate');
  await register(a, `e2e-la-${unique()}@example.com`);
  await createCharacter(a, nameA);
  await register(b, `e2e-lb-${unique()}@example.com`);
  await createCharacter(b, nameB);

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
  await expect(a.getByTestId('combat-log')).toContainText(`${nameB} left the Rift.`);
});

test('professions: practise fishing and gain XP', async ({ page }) => {
  await register(page, `e2e-prof-${unique()}@example.com`);
  await createCharacter(page, randomName('Angler'));
  await page.getByRole('link', { name: 'Professions' }).click();
  await expect(page.getByTestId('profession-fishing')).toContainText('Lv 0');
  await page.getByTestId('profession-fishing').click();
  await page.getByRole('button', { name: 'Fish', exact: true }).click();
  await expect(page.getByTestId('activity-result')).toContainText('XP');
  await expect(page.getByTestId('profession-level')).toContainText('busy');
  await page.screenshot({ path: 'test-results/screens/10-professions.png' });
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
async function expectFitsViewport(page: Page) {
  const box = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  expect(box.sw).toBeLessThanOrEqual(box.w);
  expect(box.sh).toBeLessThanOrEqual(box.h);
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
    ['rifts', () => expect(page.getByTestId('rift-card').first()).toBeVisible()],
    ['professions', () => expect(page.getByTestId('profession-detail')).toBeVisible()],
  ];
  const paths: Record<string, string> = {
    home: '/home',
    world: '/world',
    select: '/characters',
    create: '/characters/new',
    sheet: characterUrl!,
    rifts: '/rifts',
    professions: '/professions',
  };

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const [screen, ready] of screens) {
      await page.goto(paths[screen]!);
      await ready();
      await expectFitsViewport(page);
      await page.screenshot({ path: `test-results/screens/sizes/${vp.name}-${screen}.png` });
    }
  }

  // Combat screen at every size (one run, re-rendered per viewport).
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
