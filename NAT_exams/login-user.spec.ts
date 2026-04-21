import { test, expect } from '@playwright/test';

test('Успешен вход (Login) с валидни данни', async ({ page }) => {
  // 1. Отваряме страницата за вход
  // Предполагам, че адресът е /login, но ако е /signin, просто го смени
  await page.goto('https://exampractices.com/login');

  // 2. Попълваме имейла и паролата
  // Използваме стабилните локатори по атрибути, както в регистрацията
  const loginEmail = process.env.LOGIN_EMAIL || 'ivo_test_1@abv.bg';
  const loginPassword = process.env.LOGIN_PASSWORD || '123Ivo123';

  await page.locator('input[type="email"]').fill(loginEmail);
  
  // За паролата използваме name="password" или type="password"
  await page.locator('input[type="password"]').fill(loginPassword);

  // 3. Кликаме бутона за вход
  // Използваме регулярен израз, за да хванем бутона, независимо дали пише "Login", "Sign In" или "Log in"
  const loginButton = page.getByRole('button', { name: /login|sign in/i });
  await loginButton.click();

  await page.pause();

  // 4. Проверка (Асърт)
  // Не всички приложения пренасочват към /dashboard. Валидирай, че вече не сме на /login.
  try {
    await expect(page).not.toHaveURL(/\/login\/?$/i, { timeout: 8000 });
  } catch {
    const errorHint = page.locator('[role="alert"], .error, .alert, [data-test="error"]').first();
    const errorText = (await errorHint.textContent().catch(() => null))?.trim();
    throw new Error(
      `Login did not redirect from /login. Check LOGIN_EMAIL/LOGIN_PASSWORD or existing account. ${errorText ? `UI error: ${errorText}` : ''}`
    );
  }
});