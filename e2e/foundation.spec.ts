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
  await expect(page).toHaveURL(/\/world$/);
  await expect(page.getByTestId('self-name')).toHaveText(name);
}

test('register → create character → enter the world → log out → log in', async ({ page }) => {
  const email = `e2e-${unique()}@example.com`;
  const name = randomName('Hero');

  await register(page, email);
  await page.screenshot({ path: 'test-results/screens/01-create.png' });
  await createCharacter(page, name);

  await expect(page.getByTestId('connection-status')).toContainText('Online');
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
  await second.getByRole('button', { name: 'Play' }).click();
  await expect(second.getByTestId('connection-status')).toContainText('Online');

  await expect(first.getByRole('heading', { name: 'Playing elsewhere' })).toBeVisible();
  await first.screenshot({ path: 'test-results/screens/04-replaced.png' });
  await context.close(); // stop the canvas map rendering in these pages
});

test('character system: attributes, starting weapon, sheet and equipment', async ({ page }) => {
  await register(page, `e2e-sheet-${unique()}@example.com`);
  const name = randomName('Archer');
  await page.getByLabel('Name').fill(name);

  // Spend points: Agility 5 → 10 (max), Vitality 5 → 9. 3 points left unspent.
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Increase Agility' }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Increase Vitality' }).click();
  await expect(page.getByTestId('attr-agility')).toHaveText('10');
  await expect(page.getByTestId('points-remaining')).toContainText('3 / 12');
  await expect(page.getByRole('button', { name: 'Increase Agility' })).toBeDisabled();

  await page.getByRole('button', { name: /Hunting Bow/ }).click();
  await page.screenshot({ path: 'test-results/screens/05-create-attributes.png', fullPage: true });
  await page.getByRole('button', { name: 'Create and enter the world' }).click();
  await expect(page.getByTestId('self-name')).toHaveText(name);

  await page.getByRole('link', { name: 'Character' }).click();
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
  await page.getByRole('button', { name: 'Equip Hunting Bow' }).click();
  await expect(page.getByTestId('abilities')).toContainText('Aimed Shot');
});

test('Rift combat: intents, attack, block, end turn, abandon', async ({ page }) => {
  await register(page, `e2e-rift-${unique()}@example.com`);
  await page.getByLabel('Name').fill(randomName('Raider'));
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Increase Might' }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Increase Vitality' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Increase Agility' }).click();
  await page.getByRole('button', { name: 'Wooden Shield' }).click();
  await page.getByRole('button', { name: 'Hair style long' }).click();
  await page.getByRole('button', { name: 'Create and enter the world' }).click();
  await expect(page.getByTestId('self-name')).toBeVisible();

  await page.getByRole('link', { name: 'Rifts' }).click();
  await expect(page.getByTestId('rift-card')).toContainText('Shattered Breach');
  await page.getByRole('button', { name: 'Enter solo' }).click();
  await expect(page).toHaveURL(/\/rifts\/runs\//);
  await expect(page.getByText('Your turn')).toBeVisible();
  await expect(page.getByTestId('unit-enemies')).toHaveCount(3);
  await expect(page.getByTestId('my-focus')).toHaveText('3');
  // Slay-the-Spire style intents: enemies show what they will do.
  await expect(page.getByTestId('intent').first()).toBeVisible();

  // Only one column is in melee reach (the front), so Slash fires at once.
  await page.getByRole('button', { name: /^Slash/ }).click();
  await expect(page.getByTestId('my-focus')).toHaveText('2');
  // D41: attacks hit the whole column — the Bulwark and the Husk in front.
  await expect(page.getByTestId('combat-log')).toContainText(
    'uses Slash on Rift Bulwark, Rift Husk',
  );
  await expect(page.getByTestId('intent').first()).toContainText('column');

  await page.getByRole('button', { name: /^Raise Shield/ }).click();
  await expect(page.getByTestId('my-focus')).toHaveText('1');
  await expect(page.getByTestId('combat-log')).toContainText('Block');
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

  // A starts: both land in the same fight.
  await a.getByRole('button', { name: 'Enter the Rift' }).click();
  await expect(a).toHaveURL(/\/rifts\/runs\//);
  await expect(b).toHaveURL(/\/rifts\/runs\//);
  await expect(a.getByTestId('unit-party')).toHaveCount(2);
  await expect(b.getByTestId('unit-party')).toHaveCount(2);

  // Whoever acts first ends the turn; the other sees it's now their turn.
  const aFirst = await a.getByText('Your turn').isVisible();
  const [first, second] = aFirst ? [a, b] : [b, a];
  await expect(second.getByTestId('waiting')).toContainText('Waiting for');
  await first.getByRole('button', { name: 'End turn' }).click();
  await expect(second.getByText('Your turn')).toBeVisible({ timeout: 10_000 });
  await second.screenshot({ path: 'test-results/screens/09-group-combat.png' });

  // B leaves; A keeps fighting and sees it in the log.
  b.once('dialog', (d) => d.accept());
  await b.getByRole('button', { name: 'Abandon' }).click();
  await expect(b.getByTestId('run-result')).toContainText('You fled the Rift');
  await expect(a.getByTestId('unit-party').filter({ hasText: nameB })).toContainText('(left)', {
    timeout: 10_000,
  });
  await expect(a.getByTestId('combat-log')).toContainText(`${nameB} left the Rift.`);
});
