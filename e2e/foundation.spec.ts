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

test('character system: point-buy, starting weapon, sheet and equipment', async ({ page }) => {
  await register(page, `e2e-sheet-${unique()}@example.com`);
  const name = randomName('Archer');
  await page.getByLabel('Name').fill(name);

  // Spend points: DEX 8 → 15 (9 points), CON 8 → 14 (7 points).
  for (let i = 0; i < 7; i++)
    await page.getByRole('button', { name: 'Increase Dexterity' }).click();
  for (let i = 0; i < 6; i++)
    await page.getByRole('button', { name: 'Increase Constitution' }).click();
  await expect(page.getByTestId('attr-dex')).toContainText('15');
  await expect(page.getByTestId('points-remaining')).toContainText('11 / 27');
  await expect(page.getByRole('button', { name: 'Increase Dexterity' })).toBeDisabled();

  await page.getByRole('button', { name: /Hunting Bow/ }).click();
  await page.screenshot({ path: 'test-results/screens/05-create-attributes.png', fullPage: true });
  await page.getByRole('button', { name: 'Create and enter the world' }).click();
  await expect(page.getByTestId('self-name')).toHaveText(name);

  await page.getByRole('link', { name: 'Character' }).click();
  await expect(page.getByTestId('sheet-name')).toHaveText(name);
  await expect(page.getByTestId('sheet-attr-dex')).toHaveText('15');
  await expect(page.getByTestId('stat-hp')).toHaveText(String(20 + 2 * 14));
  await expect(page.getByTestId('abilities')).toContainText('Aimed Shot');
  await page.screenshot({ path: 'test-results/screens/06-sheet.png', fullPage: true });

  await page.getByRole('button', { name: 'Unequip Hunting Bow' }).click();
  await expect(page.getByTestId('abilities')).toContainText('Unarmed Strike');
  await page.getByRole('button', { name: 'Equip Hunting Bow' }).click();
  await expect(page.getByTestId('abilities')).toContainText('Aimed Shot');
});

test('Rift combat: enter solo, attack, end turn, abandon', async ({ page }) => {
  await register(page, `e2e-rift-${unique()}@example.com`);
  await page.getByLabel('Name').fill(randomName('Raider'));
  for (let i = 0; i < 7; i++) await page.getByRole('button', { name: 'Increase Strength' }).click();
  for (let i = 0; i < 7; i++)
    await page.getByRole('button', { name: 'Increase Constitution' }).click();
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

  // Slash: choose the ability, then a highlighted target.
  await page.getByRole('button', { name: /^Slash/ }).click();
  await page
    .getByRole('button', { name: /Rift Husk \(target\)/ })
    .first()
    .click();
  await expect(page.getByTestId('my-focus')).toHaveText('2');
  await expect(page.getByTestId('combat-log')).toContainText('uses Slash on Rift Husk');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'test-results/screens/07-combat.png' });

  await page.getByRole('button', { name: 'End turn' }).click();
  // The enemy phase plays out on the canvas first (the text log keeps pace with it);
  // the controls come back when it is over.
  await expect(page.getByTestId('combat-log')).toContainText('Round 2', { timeout: 20_000 });
  await expect(page.getByTestId('my-focus')).toHaveText('5', { timeout: 20_000 }); // 2 carried over + 3

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Abandon' }).click();
  await expect(page.getByTestId('run-result')).toContainText('You fled the Rift');
  await expect(page.getByTestId('run-result')).toContainText('quality 75');
});
