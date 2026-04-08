import { test, expect } from '@playwright/test';

test('Търсене на Cursor в Уикипедия', async ({ page }) => {
    // 1. Отиваме на началната страница на българската Уикипедия

    await page.goto('https://www.wikipedia.org/');
    // 2. Намираме полето за търсене и въвеждаме текста "Cursor"
    await page.locator('input[name="search"]').fill('Cursor');

// 3. Намираме бутона за търсене по неговата роля и кликаме на него
    await page.getByRole('button', { name: 'Търсене' }).click();

   const mainHeading = page.locator('#firstHeading');
   await expect(mainHeading).toHaveText('Cursor/i');
});