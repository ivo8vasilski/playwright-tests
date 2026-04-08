import { test, expect } from '@playwright/test';

test.describe('Negative & Security Testing - Login Form', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.saucedemo.com/');
  });

  test('Вход с празни полета', async ({ page }) => {
    // Просто натискаме Login без да пишем нищо
    await page.locator('[data-test="login-button"]').click();

    const error = page.locator('[data-test="error"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Username is required');
  });

  test('Вход с грешна парола (SQL Injection опит)', async ({ page }) => {
    await page.locator('[data-test="username"]').fill('standard_user');
    // Опитваме се да "излъжем" базата данни с класически SQL код
    await page.locator('[data-test="password"]').fill("' OR '1'='1");
    await page.locator('[data-test="login-button"]').click();

    const error = page.locator('[data-test="error"]');
    await expect(error).toContainText('Username and password do not match');
  });

  test('Вход с много дълъг низ (Stress test)', async ({ page }) => {
    const longString = 'A'.repeat(1000); // Създаваме текст от 1000 символа
    await page.locator('[data-test="username"]').fill(longString);
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    const error = page.locator('[data-test="error"]');
    // Проверяваме дали сайтът все още е "жив" и показва грешка, а не 500 Server Error
    await expect(error).toBeVisible();
  });

  test('Тест за Case Sensitivity (Чувствителност към главни букви)', async ({ page }) => {
    // standard_user е малки букви. Пробваме със STANDARD_USER
    await page.locator('[data-test="username"]').fill('STANDARD_USER');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    await page.locator('[data-test="login-button"]').click();

    const error = page.locator('[data-test="error"]');
    await expect(error).toBeVisible(); // Би трябвало да даде грешка
  });

  test('Бързо многократно кликане (Spamming)', async ({ page }) => {
    await page.locator('[data-test="username"]').fill('standard_user');
    await page.locator('[data-test="password"]').fill('secret_sauce');
    
    // Кликаме бутона 10 пъти много бързо
    const loginBtn = page.locator('[data-test="login-button"]');
    for (let i = 0; i < 10; i++) {
        loginBtn.click(); 
    }
    
    // Проверяваме дали сме влезли или дали системата ни е блокирала за спам
    await expect(page).toHaveURL(/.*inventory.html/);
  });
});