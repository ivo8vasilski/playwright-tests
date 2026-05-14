import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test('Task 2: Create Test with Max Attempts = 1 and verify retry blocked', async ({ page, request }) => {

    test.setTimeout(120_000);

    // ── Config ────────────────────────────────────────────────────────────────
    const password = process.env.TEST_USER_PASSWORD;
    if (!password) {
        throw new Error('ГРЕШКА: TEST_USER_PASSWORD не е дефинирана в .env файла!');
    }

    const host      = 'https://exampractices.com';
    const baseUrl   = `${host}/api`;
    const userEmail = `thomas.fan.${Date.now()}@example.com`;
    const testTitle = `Auto Test ${Date.now()}`;
    let   accessToken: string | null = '';

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 – Регистрация чрез API
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 1: Register new user via API', async () => {
        const response = await request.post(`${baseUrl}/auth/register/`, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            data: {
                email:            userEmail,
                first_name:       'Thomas',
                last_name:        'Fan',
                password,
                password_confirm: password,
            },
        });

        if (response.status() !== 201) {
            console.error('Register Error:', await response.text());
        }
        expect(response.status()).toBe(201);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2 – Логване през UI + извличане на токен
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 2: Login user via UI', async () => {
        await page.goto(`${host}/login`);

        await page.locator('input[type="email"]').fill(userEmail);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Sign In/i }).click();

        await page.waitForURL(`${host}/dashboard`, { timeout: 30_000 });

        // Извличане на access token
        accessToken = await page.evaluate(() =>
            localStorage.getItem('access')       ||
            localStorage.getItem('token')        ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('jwt')
        );

        if (!accessToken) {
            const cookies = await page.context().cookies();
            const authCookie = cookies.find(c =>
                c.name === 'access' || c.name === 'token' || c.name === 'sessionid'
            );
            if (authCookie) accessToken = authCookie.value;
        }

        expect(accessToken, 'Не бе намерен access токен в Storage или Cookies').not.toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3 – Навигация към Create Test
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 3: Click Create Test button', async () => {
      const createTestBtn = page.getByRole('link', { name: 'Create Test' })
          .or(page.getByRole('button', { name: 'Create Test' }));

      if (await createTestBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await createTestBtn.click();
      } else {
          // Ако бутонът го няма, навигираме директно
          await page.goto(`${host}/create-test`, { waitUntil: 'domcontentloaded' });
      }

      // ✅ Вместо да чакаме URL-а, просто чакаме да се появи заглавието на новата страница
      await expect(page.getByRole('heading', { name: 'Create New Test' })).toBeVisible({ timeout: 15_000 });
  });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4 & 5 – Попълване на формата за създаване (Нови локатори!)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 4 & 5: Fill form (Title, Desc, Visibility, Max Attempts)', async () => {
        
        // 1. Title
        await page.locator('input[type="text"]').fill(testTitle);

        // 2. Description
        await page.locator('textarea').fill('Playwright automation – Task 2');

        // 3. Visibility -> Избираме опцията за Public
        await page.getByRole('combobox').selectOption({ label: 'Public - Anyone can find and take' });

        // 4. Max Attempts -> Вторият spinbutton
        await page.getByRole('spinbutton').nth(1).fill('1');

        // 5. Кликаме бутона за продължаване напред
        await page.getByRole('button', { name: 'Create & Add Questions' }).click();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6 – Добавяне на въпрос
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 6: Add 1 question', async () => {
        // Изчакваме следващата страница да зареди напълно
        await page.waitForLoadState('networkidle');

        // Намираме полето за въпроса
        const questionInput = page.getByLabel(/question/i)
            .or(page.getByPlaceholder(/question/i))
            .or(page.locator('textarea').first());

        await expect(questionInput).toBeVisible({ timeout: 10_000 });
        await questionInput.fill('What is 2 + 2?');

        // Попълваме 2 възможни отговора
        const answerInputs = page.locator('input[type="text"]');
        await answerInputs.nth(0).fill('4');
        await answerInputs.nth(1).fill('5');

        // Маркираме първия отговор като верен
        await page.locator('input[type="radio"]').first().check();

        // Бутон за запазване (ако се казва Publish, Finish или Save)
        const createButton = page.getByRole('button', { name: /Publish|Save|Finish|Create/i }).last();
        await createButton.click();

        // Изчакваме пренасочване към Dashboard или Explore
        await page.waitForURL(/dashboard|explore|test\/\d+/, { timeout: 30_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7 – Търсене на теста в Explore
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 7: Search created test in Explore', async () => {
        await page.goto(`${host}/explore`);
        await page.waitForLoadState('networkidle');

        const searchBox = page.getByRole('textbox', { name: 'Search by title...' });
        await searchBox.waitFor({ state: 'visible' });
        await searchBox.fill(testTitle);
        await searchBox.press('Enter');

        await page.waitForLoadState('networkidle');
        await expect(page.getByText(testTitle)).toBeVisible({ timeout: 20_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8 – Стартиране на теста с username
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 8: Start the test with username', async () => {
        await page.getByText(testTitle).click();
        await page.waitForLoadState('domcontentloaded');

        const usernameInput = page.getByLabel(/username|name/i)
            .or(page.getByPlaceholder(/username|name/i))
            .or(page.locator('input[type="text"]').first());

        await expect(usernameInput).toBeVisible({ timeout: 10_000 });
        await usernameInput.fill('ThomasFan');

        const startBtn = page.getByRole('button', { name: /Start|Старт/i });
        await startBtn.click();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9 – Решаване и събмитване
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 9: Solve and submit the test', async () => {
        const option = page.locator('input[type="radio"], .answer-option').first();
        await expect(option).toBeVisible({ timeout: 10_000 });
        await option.click();

        const submitButton = page.getByRole('button', { name: /Submit|Finish|Предай/i });
        await submitButton.click();
        await page.waitForLoadState('networkidle', { timeout: 15_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEPS 10-11 – Explore → проверка на "Taken 1x"
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Steps 10-11: Verify "Taken 1x" in Explore', async () => {
        await page.goto(`${host}/explore`);
        await page.waitForLoadState('networkidle');

        const searchBox = page.getByRole('textbox', { name: 'Search by title...' });
        await searchBox.fill(testTitle);
        await searchBox.press('Enter');

        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/Taken 1x/i)).toBeVisible({ timeout: 20_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEPS 12-13 – Втори опит → "Maximum attempts reached"
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Steps 12-13: Verify "Maximum attempts reached" on second attempt', async () => {
        await page.getByText(testTitle).click();
        await page.waitForLoadState('domcontentloaded');

        const startBtn = page.getByRole('button', { name: /Start|Старт/i });
        await startBtn.click();

        await expect(page.getByText(/Maximum attempts reached/i)).toBeVisible({ timeout: 15_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 14 – Изтриване на теста от Dashboard
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 14: Delete test from Dashboard', async () => {
        await page.goto(`${host}/dashboard`);
        await page.waitForLoadState('networkidle');

        const testCard = page.locator('article, li, [class*="card"], [class*="item"]')
            .filter({ hasText: testTitle })
            .first();

        const deleteButton = testCard.getByRole('button', { name: /Delete/i });
        await expect(deleteButton).toBeVisible({ timeout: 10_000 });
        await deleteButton.click();

        const confirmButton = page.getByRole('button', { name: /Confirm|Yes|Delete/i });
        if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await confirmButton.click();
        }

        await expect(page.getByText(testTitle)).toBeHidden({ timeout: 10_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 15 – Изтриване на потребителя чрез API
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 15: Delete user via API', async () => {
        const response = await request.delete(`${baseUrl}/auth/me/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept':        'application/json',
            },
        });
        expect(response.status()).toBe(204);
    });
});