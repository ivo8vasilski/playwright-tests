import { test, expect } from '@playwright/test';

test('Успешна регистрация на потребител с валидни данни', async ({ page }) => {
  // 1. Отваряме страницата за регистрация
  await page.goto('https://exampractices.com/register');

  // ТРИК: Генерираме уникален имейл, за да може тестът да се пуска многократно без грешка 

  // 2. Попълваме полетата (използвайки новите, по-стабилни локатори по атрибути)
  await page.locator('input[type="email"]').fill(`Ivo_test_1@abv.bg`);
  await page.locator('input[name="first_name"]').fill('Ivo');
  await page.locator('input[name="last_name"]').fill('Vasilski');
  await page.locator('input[name="password"]').fill('123Ivo123');
  await page.locator('input[name="password_confirm"]').fill('123Ivo123');

  // 3. Кликаме бутона за създаване на акаунт
  await page.getByRole('button', { name: 'Create Account' }).click();

  // 4. Проверка (Асърт)
  // Проверяваме дали след успешна регистрация ни пренасочва към страницата за вход
  await expect(page).toHaveURL(/.*login/i); 
});