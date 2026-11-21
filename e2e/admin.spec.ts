import { expect, test, type Page } from '@playwright/test';

/*
 * Admin tools (request #32). The e2e server runs with
 * ADMIN_EMAILS=e2e-admin@example.com (playwright.config.ts). The test database
 * is not reset between runs, so the admin account may already exist.
 */
const ADMIN = 'e2e-admin@example.com';
const PASSWORD = 'correct horse battery';
const letters = (n: number) =>
  Array.from({ length: n }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join(
    '',
  );

async function loginAdmin(page: Page) {
  const reg = await page.request.post('/api/auth/register', {
    data: { email: ADMIN, password: PASSWORD },
  });
  if (reg.status() !== 201) {
    const login = await page.request.post('/api/auth/login', {
      data: { email: ADMIN, password: PASSWORD },
    });
    expect(login.status()).toBe(200);
  }
}

test('admin: create an ability and a weapon, give them to a character', async ({ page }) => {
  await loginAdmin(page);
  const hero = `Admin${letters(6)}`;
  const created = await page.request.post('/api/characters', {
    data: {
      name: hero,
      appearance: { version: 1, color: '#2e86c1', emblem: 'star' },
      attributes: { might: 10, agility: 8, precision: 5, endurance: 9, intellect: 5, will: 5 },
      startingWeapon: 'training_sword',
    },
  });
  // Old runs may have filled the character limit: reuse any character then.
  const characters = (await (await page.request.get('/api/characters')).json()).characters as {
    id: string;
    name: string;
  }[];
  const target =
    created.status() === 201 ? (await created.json()).character : characters[characters.length - 1];

  await page.goto('/characters');
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // A new power.
  const power = `Nova ${letters(5)}`;
  await page.getByRole('tab', { name: 'Abilities' }).click();
  await page.getByLabel('Name').fill(power);
  await page.getByLabel('Mana cost').fill('3');
  await page.getByLabel('Min').fill('20');
  await page.getByLabel('Max').fill('25');
  await expect(page.getByTestId('ability-preview')).toContainText('20–25 physical damage');
  await page.getByRole('button', { name: 'Create ability' }).click();
  await expect(page.getByText(/id: custom_nova_/)).toBeVisible();

  // A new weapon that grants it.
  const blade = `Blade ${letters(5)}`;
  await page.getByRole('tab', { name: 'Items & weapons' }).click();
  await page.getByLabel('Name').fill(blade);
  await page.getByLabel('Weapon type').selectOption('axe');
  await page.getByLabel(power).check();
  await page.getByLabel('+ Might').fill('4');
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(page.getByText(/id: custom_blade_/)).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/20-admin-item.png', fullPage: true });

  // Give it (+2) and teach an ability to the character.
  await page.getByRole('tab', { name: 'Characters' }).click();
  await page.getByLabel('Filter characters').fill(target.name);
  await page.getByRole('button', { name: new RegExp(target.name) }).click();
  await page.getByLabel('Give item').selectOption({ label: blade });
  await page.getByLabel('Upgrade', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Give', exact: true }).click();
  await expect(page.getByRole('button', { name: `Remove ${blade} +2` })).toBeVisible();
  await page.getByLabel('Teach ability').selectOption({ label: 'Firebolt' });
  await page.getByRole('button', { name: 'Teach' }).click();
  await expect(page.getByRole('button', { name: 'Forget firebolt' })).toBeVisible();
  await page.screenshot({ path: 'test-results/screens/21-admin-character.png', fullPage: true });

  // The owner equips it on the sheet and gets the new power.
  await page.goto(`/characters/${target.id}`);
  await page.getByRole('button', { name: `Equip ${blade} +2` }).click();
  await expect(page.getByTestId('abilities')).toContainText(power);
  await expect(page.getByTestId('abilities')).toContainText('Firebolt');
});

test('admin page is closed to other accounts', async ({ page }) => {
  const email = `e2e-noadmin-${Date.now().toString(36)}@example.com`;
  await page.request.post('/api/auth/register', { data: { email, password: PASSWORD } });
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/characters$/);
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  expect((await page.request.get('/api/admin/characters')).status()).toBe(403);
});
