import { test, expect } from '@playwright/test';

test('Задача 2: Намиране на елемент по текст (Login)', async ({ page }) => {
  // 1. Отваряме началната страница
  await page.goto('https://exampractices.com');

  // 2. Намираме линк или бутон, който съдържа текста "Login"
  // Опция А (Най-добра практика): Търсим елемент по неговата роля и име
  const loginLink = page.getByRole('link', { name: /login/i });
  
  // Опция Б (Алтернатива): Ако не сме сигурни дали е <a> таг (линк) или <button>
  // const loginElement = page.getByText(/login/i).first();

  // 3. Проверяваме дали елементът е видим на екрана
  await expect(loginLink).toBeVisible();
});