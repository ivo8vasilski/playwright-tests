import { test, expect } from '@playwright/test';

test.describe('Sauce Demo - Пълен поток', () => {

  // ТЕСТ ЗА ГРЕШКА (тук не ползваме автоматичен логин, защото тестваме самия отказ)
  test('Неуспешен вход с locked_out_user', async ({ page }) => {
    await page.goto('https://www.saucedemo.com/');
    await page.locator('[data-test="username"]').fill('locked_out_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Epic sadface: Sorry, this user has been locked out.');
  });

  // ПОДГРУПА ЗА УСПЕШНИ ТЕСТОВЕ (тук ползваме автоматичен логин)
  test.describe('Действия след успешен вход', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('https://www.saucedemo.com/');
      await page.locator('[data-test="username"]').fill('standard_user');
      await page.locator('[data-test="password"]').fill('secret_sauce');
      await page.locator('[data-test="login-button"]').click();
      // Проверка, че сме влезли успешно преди всеки следващ тест
      await expect(page).toHaveURL(/.*inventory.html/);
    });

    test('Успешен преглед на страницата с продукти', async ({ page }) => {
      const pageTitle = page.locator('.title');
      await expect(pageTitle).toHaveText('Products');
    });

    test('Добавяне и премахване на раница от количката', async ({ page }) => {
      // 1. Добавяне
      await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
      const cartBadge = page.locator('.shopping_cart_badge');
      await expect(cartBadge).toHaveText('1');

      // 2. Премахване
      await page.locator('[data-test="remove-sauce-labs-backpack"]').click();
      await expect(cartBadge).not.toBeVisible();
    });

    test('Добавяне на няколко продукта в количката', async ({ page }) => {
      await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
      await page.locator('[data-test="add-to-cart-sauce-labs-bike-light"]').click();
      
      const cartBadge = page.locator('.shopping_cart_badge');
      await expect(cartBadge).toHaveText('2');
    });
  });
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

