import { test, expect } from '@playwright/test';

// Групираме тестовете, които са свързани с Вход в системата
test.describe('Тестове за логин форма', () => {

  test('Успешен вход с валидни данни', async ({ page }) => {
    // 1. Отиваме на тестовия сайт
    await page.goto('https://www.saucedemo.com/');

    // 2. Намираме полето за потребителско име и го попълваме
    // standard_user е позволен тестов потребител за този сайт
    await page.locator('[data-test="username"]').fill('standard_user');

    // 3. Попълваме паролата
    await page.locator('[data-test="password"]').fill('secret_sauce');

    // 4. Кликаме на бутона за вход
    await page.locator('[data-test="login-button"]').click();

    // 5. ПРОВЕРКА: Проверяваме дали сме пренасочени към страницата с продуктите
    await expect(page).toHaveURL(/.*inventory.html/);
    
    // 6. ПРОВЕРКА: Проверяваме дали заглавието на страницата е "Products"
    const title = page.locator('.title');
    await expect(title).toHaveText('Products');
  });

  test('Грешка при грешна парола', async ({ page }) => {
    // 1. Отново отиваме на сайта
    await page.goto('https://www.saucedemo.com/');

    // 2. Попълваме правилно име, но грешна парола
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('greshna_parola_123');

    // 3. Кликаме за вход
    await page.locator('[data-test="login-button"]').click();

    // 4. ПРОВЕРКА: Трябва да се появи съобщение за грешка
    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Username and password do not match');
  });

});