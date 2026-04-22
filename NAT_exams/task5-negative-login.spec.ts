import { test, expect } from '@playwright/test';

test('Задача 5: Проверка за конкретно съобщение при грешни данни', async ({ page }) => {
  // 1. Отиди на страницата за вход
  await page.goto('https://exampractices.com/login');

  // 2. Попълни полетата според спецификацията (email и password)
  await page.locator('input[type="email"]').fill('non-existent@test.com');
  await page.locator('input[type="password"]').fill('WrongPassword123!');

  // 3. Кликни върху бутона за вход
  await page.click('button[type="submit"]');

  // 4. ТВОЯТ КОД: Изчакване за конкретното съобщение за грешка
  // Увеличаваме timeout-а на 10 секунди (10000ms), за да сме сигурни, че API-то ще отговори
  await expect(page.getByText('No active account found with the given credentials', { exact: true }))
    .toBeVisible();

  // 5. Потвърждение на сигурността
  // Уверяваме се, че сме получили грешка и не сме влезли в системата
  await expect(page).toHaveURL(/.*login/i);
});