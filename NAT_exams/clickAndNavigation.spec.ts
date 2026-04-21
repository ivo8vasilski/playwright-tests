import { test, expect } from '@playwright/test';

test('Задача 3: Клик и навигация към Login', async ({ page }) => {
  // 1. Отваряме началната страница
  await page.goto('https://exampractices.com');

  // 2. Намираме линка за вход (използвайки най-добрата практика от Задача 2)
  const loginLink = page.getByRole('link', { name: /login/i });

  // 3. Кликаме върху него
  await loginLink.click();

  // 4. Проверяваме дали URL адресът се е променил правилно
  // Използваме регулярен израз, за да проверим дали адресът завършва на или съдържа "login"
  await expect(page).toHaveURL(/.*login/i);
});