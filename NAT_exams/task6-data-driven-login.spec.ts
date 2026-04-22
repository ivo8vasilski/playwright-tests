import { test, expect } from '@playwright/test';

// Генерираме уникален потребител за тази тестова сесия
const uniqueId = Date.now();
const testUser = {
  email: `ivo_automated_${uniqueId}@abv.bg`,
  password: 'Password123!',
  firstName: 'Ivo',
  lastName: 'Vasilski'
};

test.describe('Data-driven Login с автоматична регистрация', () => {

  // ПРЕКЪНДИШЪН: Регистрираме потребителя веднъж преди всички логин тестове
  test.beforeAll(async ({ browser }) => {
    console.log(`[Setup] Регистриране на нов потребител: ${testUser.email}`);
    const page = await browser.newPage();
    await page.goto('https://exampractices.com/register');
    
    // Използваме полетата от спецификацията
    await page.locator('input[type="email"]').fill(testUser.email);
    await page.locator('input[name="first_name"]').fill(testUser.firstName);
    await page.locator('input[name="last_name"]').fill(testUser.lastName);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('input[name="password_confirm"]').fill(testUser.password);
    
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page).toHaveURL(/.*login/i);
    await page.close();
  });

  // Масив със сценарии
  const scenarios = [
    { desc: 'Валиден вход', user: testUser.email, pass: testUser.password, success: true },
    { desc: 'Грешна парола', user: testUser.email, pass: 'Wrong123!', success: false },
    { desc: 'Несъществуващ имейл', user: 'fake@test.com', pass: 'Pass123!', success: false }
  ];

  for (const scenario of scenarios) {
    test(`Сценарий: ${scenario.desc}`, async ({ page }) => {
      await page.goto('https://exampractices.com/login');
      await page.locator('input[type="email"]').fill(scenario.user);
      await page.locator('input[type="password"]').fill(scenario.pass);
      await page.getByRole('button', { name: /login|sign in/i }).click();

      if (scenario.success) {
        // При успех системата трябва да издаде JWT и да ни пренасочи
        await expect(page).toHaveURL(/.*dashboard/i);
      } else {
        // При грешка очакваме съобщението за невалидни данни
        await expect(page.getByText(/no active account|invalid|incorrect/i)).toBeVisible();
        await expect(page).toHaveURL(/.*login/i);
      }
    });
  }
});