import { test, expect } from '@playwright/test';

test('Задача 1: Проверка на заглавието на страницата', async ({ page }) => {
  // 1. Отвори адреса
  await page.goto('https://exampractices.com');

  // 2. Провери дали заглавието съдържа думата "Exam"
  // Използваме наклонени черти /Exam/, което е регулярен израз (търси частично съвпадение, а не точно съвпадение на целия текст)
  await expect(page).toHaveTitle(/Exam/);

  // 3. Провери, че има видим heading елемент на страницата
  const headingElement = page.getByRole('heading').first();
  await expect(headingElement).toBeVisible();
});