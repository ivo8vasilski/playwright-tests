import { test, expect } from '@playwright/test';

test.describe('Negative & Security Testing - Login Form', () => {

  test.beforeEach(async ({ page }) => {
    // Отиваме на началната страница преди всеки тест
    await page.goto('https://www.saucedemo.com/');
  });

  test('Вход с празни полета', async ({ page }) => {
    await page.locator('[data-test="login-button"]').click();

    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Username is required');
  });

  test('Вход с грешна парола (SQL Injection опит)', async ({ page }) => {
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill("' OR '1'='1");
    await page.locator('[data-test="login-button"]').click();

    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toContainText('Username and password do not match');
  });

  test('Вход с много дълъг низ (Stress test)', async ({ page }) => {
    const longString = 'A'.repeat(1000); 
    await page.locator('[data-test="username"]').fill(longString);
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible();
  });

  test('Тест за Case Sensitivity', async ({ page }) => {
    await page.locator('[data-test="username"]').fill('STANDARD_USER');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    const errorMessage = page.locator('[data-test="error"]');
    await expect(errorMessage).toBeVisible(); 
  });

  test('Бързо многократно кликане (Spamming)', async ({ page }) => {
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    
    const loginBtn = page.locator('[data-test="login-button"]');
    
    // 1. Кликаме бързо
    for (let i = 0; i < 10; i++) {
        // Не чакаме (без await тук), за да симулираме истински спам
        loginBtn.click().catch(() => {}); 
    }
    
    // 2. ФИКС: Изрично казваме на Playwright да изчака пренасочването
    // Това предотвратява затварянето на браузъра твърде рано
    await page.waitForURL(/.*inventory.html/, { timeout: 5000 });

    // 3. Сега вече проверяваме URL-а
    await expect(page).toHaveURL(/.*inventory.html/);
  });
});