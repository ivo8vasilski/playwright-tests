import { test, expect } from '@playwright/test';

test.describe('Тестове за логин на Sauce Demo', () => {

  test('Успешен вход със standard_user', async ({ page }) => {
    // 1. Отваряме сайта
    await page.goto('https://www.saucedemo.com/');

    // 2. Попълваме потребителско име и парола
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');

    // 3. Кликаме на бутона за вход
    await page.locator('[data-test="login-button"]').click();

    // 4. Проверяваме дали сме пренасочени към продуктите
    await expect(page).toHaveURL(/.*inventory.html/);
    
    const pageTitle = page.locator('.title');
    await expect(pageTitle).toHaveText('Products');
  });

  test('Неуспешен вход с locked_out_user', async ({ page }) => {
    // 1. Отваряме сайта
    await page.goto('https://www.saucedemo.com/');

    // 2. Попълваме данните на блокирания потребител
    await page.locator('[data-test="username"]').fill('locked_out_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');

    // 3. Кликаме на бутона за вход
    await page.locator('[data-test="login-button"]').click();

    // 4. Проверяваме съобщението за грешка
    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Epic sadface: Sorry, this user has been locked out.');
  });

});