import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test('Task 7: THE GREAT MYSTERY - Comprehensive Integration Test', async ({ page, request }) => {

    test.setTimeout(360_000); // 6 минути

    // ── Config ────────────────────────────────────────────────────────────────
    const password = process.env.TEST_USER_PASSWORD;
    if (!password) {
        throw new Error('ГРЕШКА: TEST_USER_PASSWORD не е дефинирана в .env файла!');
    }

    const host       = 'https://exampractices.com';
    const baseUrl    = `${host}/api`;
    const uniqueId   = Date.now();
    const userEmail  = `mystery_${uniqueId}@test.com`;
    const testTitle  = `The Great Mystery - ${uniqueId}`;
    const testSecret = 'secret123';
    
    let accessToken: string | null = '';
    let shareLink = '';

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 – Регистрация
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 1: Register new user', async () => {
        const response = await request.post(`${baseUrl}/auth/register/`, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            data: {
                email:            userEmail,
                first_name:       'Sherlock',
                last_name:        'Holmes',
                password,
                password_confirm: password,
            },
        });
        expect(response.status()).toBe(201);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2 – Логване и Токен
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 2: Login and extract token', async () => {
        await page.goto(`${host}/login`);
        await page.locator('input[type="email"]').fill(userEmail);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Sign In/i }).click();
        
        await page.waitForURL(`${host}/dashboard`, { timeout: 30_000 });

        accessToken = await page.evaluate(() =>
            localStorage.getItem('access')       ||
            localStorage.getItem('token')        ||
            localStorage.getItem('access_token') ||
            localStorage.getItem('jwt')
        );

        if (!accessToken) {
            const cookies = await page.context().cookies();
            const authCookie = cookies.find(c => c.name === 'access' || c.name === 'token' || c.name === 'sessionid');
            if (authCookie) accessToken = authCookie.value;
        }
        expect(accessToken).not.toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3 – Създаване на тест с парола
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 3: Create Password Protected Test', async () => {
        await page.getByRole('link', { name: /Create Test/i }).or(page.getByRole('button', { name: /Create Test/i })).click();
        await expect(page.getByRole('heading', { name: 'Create New Test' })).toBeVisible({ timeout: 15_000 });

        await page.locator('input[type="text"]').fill(testTitle);
        await page.locator('select').first().selectOption('password_protected');
        
        const passwordField = page.getByPlaceholder(/Enter test password/i).or(page.locator('input[type="password"]').last());
        await passwordField.fill(testSecret);

        await page.getByRole('button', { name: 'Create & Add Questions' }).click();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4 – Добавяне на 3 различни вида въпроси (СЪС СИНХРОНИЗАЦИЯ)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 4: Add 3 types of questions', async () => {
        // --- 1. Single Choice ---
        await page.getByRole('button', { name: /Add your first question/i }).click();
        await expect(page.getByRole('button', { name: 'Save Question' })).toBeVisible({ timeout: 5_000 });
        
        await page.locator('textarea').first().fill('Q1: Single Choice Question');
        await page.locator('select').first().selectOption('multiple_choice');
        await page.getByPlaceholder('Answer 1').fill('Correct');
        await page.getByPlaceholder('Answer 2').fill('Wrong');
        await page.locator('input[type="radio"]').first().check({ force: true });
        
        await page.getByRole('button', { name: 'Save Question' }).click();
        // 👉 ЧАКАМЕ формата да изчезне (успешен запис)
        await expect(page.getByRole('button', { name: 'Save Question' })).toBeHidden({ timeout: 10_000 });
        await expect(page.getByText('Q1: Single Choice Question')).toBeVisible();

        // --- 2. Multiple Select ---
        await page.getByRole('button', { name: 'Add Question' }).click();
        await expect(page.getByRole('button', { name: 'Save Question' })).toBeVisible({ timeout: 5_000 });

        await page.locator('textarea').first().fill('Q2: Multiple Select Question');
        await page.locator('select').first().selectOption('multi_select');
        await page.getByPlaceholder('Answer 1').fill('Correct A');
        await page.getByPlaceholder('Answer 2').fill('Correct B');
        await page.locator('input[type="checkbox"]').nth(0).check({ force: true });
        await page.locator('input[type="checkbox"]').nth(1).check({ force: true });
        
        await page.getByRole('button', { name: 'Save Question' }).click();
        // 👉 ЧАКАМЕ формата да изчезне
        await expect(page.getByRole('button', { name: 'Save Question' })).toBeHidden({ timeout: 10_000 });
        await expect(page.getByText('Q2: Multiple Select Question')).toBeVisible();

        // --- 3. Exact Answer ---
        await page.getByRole('button', { name: 'Add Question' }).click();
        await expect(page.getByRole('button', { name: 'Save Question' })).toBeVisible({ timeout: 5_000 });

        await page.locator('textarea').first().fill('Q3: What is 10 + 10?');
        await page.locator('select').first().selectOption('exact_answer');
        await page.getByPlaceholder('Enter the correct answer').fill('20');
        
        await page.getByRole('button', { name: 'Save Question' }).click();
        // 👉 ЧАКАМЕ формата да изчезне
        await expect(page.getByRole('button', { name: 'Save Question' })).toBeHidden({ timeout: 10_000 });
        await expect(page.getByText('Q3: What is 10 + 10?')).toBeVisible();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5 – Промяна на един от въпросите
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 5: Edit one question', async () => {
        // 👉 ПОПРАВЕНО: Взимаме директно първия бутон "Edit" на екрана!
        await page.getByRole('button', { name: 'Edit', exact: true }).first().click();

        // Изчакваме формата за редакция да се отвори
        const editTextArea = page.locator('textarea:visible').first();
        await expect(editTextArea).toBeVisible({ timeout: 10_000 });
        
        await editTextArea.fill('Q1: EDITED Single Choice Question');
        await page.getByRole('button', { name: /Save|Update/i }).click();
        
        // ЧАКАМЕ формата да се затвори
        await expect(page.getByRole('button', { name: /Save|Update/i })).toBeHidden({ timeout: 10_000 });
        await expect(page.getByText('Q1: EDITED Single Choice Question')).toBeVisible();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6 & 7 – Грешна парола
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 6-7: Link access and Wrong Password', async () => {
        shareLink = await page.locator('input[value*="/t/"]').first().inputValue();
        await page.goto(shareLink);
        
        const testPasswordField = page.locator('input[type="password"]');
        await expect(testPasswordField).toBeVisible({ timeout: 10_000 });
        await testPasswordField.fill('wrong_pass');
        await page.getByRole('button', { name: 'Continue' }).click();

        await expect(page.getByText('Invalid password')).toBeVisible();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8 & 9 – Вярна парола и Изпълнение
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 8-9: Correct Password and Solve Test', async () => {
        const testPasswordField = page.locator('input[type="password"]');
        await testPasswordField.clear();
        await testPasswordField.fill(testSecret);
        await page.getByRole('button', { name: 'Continue' }).click();

        // Старт екран
        const nameInput = page.getByPlaceholder('Your name (optional)');
        await expect(nameInput).toBeVisible({ timeout: 10_000 });
        await nameInput.fill('MysterySolver');
        await page.getByRole('button', { name: 'Start Test' }).click();

        await expect(page.locator('input[type="radio"]').first()).toBeVisible({ timeout: 10_000 });

        const nextBtn = page.getByRole('button', { name: /Next/i });

        // --- Q1: Single Choice ---
        await page.locator('input[type="radio"]').first().check({ force: true });
        if (await nextBtn.isVisible()) await nextBtn.click();

        // --- Q2: Multiple Select ---
        await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 5_000 });
        await page.locator('input[type="checkbox"]').nth(0).check({ force: true });
        await page.locator('input[type="checkbox"]').nth(1).check({ force: true });
        if (await nextBtn.isVisible()) await nextBtn.click();

        // --- Q3: Exact Answer ---
        const exactField = page.getByPlaceholder('Type your answer');
        await expect(exactField).toBeVisible({ timeout: 5_000 });
        await exactField.fill('20');
        
        await page.getByRole('button', { name: /Submit Test|Finish/i }).click();
        await page.waitForLoadState('networkidle');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 10 – Проверка в Analytics
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 10: Verify Analytics', async () => {
        await page.goto(`${host}/dashboard`);
        await page.waitForLoadState('networkidle');
        
        const testRow = page.locator('tr').filter({ hasText: testTitle }).first();
        await testRow.getByText('Results', { exact: true }).click();
        
        await page.getByText('Analytics', { exact: true }).click();
        await page.waitForLoadState('networkidle');
        
        // 👉 ПОПРАВЕНО: Махаме .or() веригата. Търсим само конкретния текст и взимаме първия, 
        // за да избегнем strict mode violation.
        await expect(page.getByText('1 / 1 answered correctly').first()).toBeVisible({ timeout: 15_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 11 – Изтриване на тест
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 11: Delete Test', async () => {
        await page.goto(`${host}/dashboard`);
        page.once('dialog', d => d.accept());
        
        const testRow = page.locator('tr').filter({ hasText: testTitle }).first();
        await testRow.getByRole('button', { name: 'Delete' }).click();
        
        const confirmBtn = page.getByRole('button', { name: 'Delete', exact: true }).last();
        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) await confirmBtn.click();
        
        await expect(page.getByText(testTitle)).toBeHidden({ timeout: 10_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 12 – Изтриване на потребител
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 12: Delete User', async () => {
        const response = await request.delete(`${baseUrl}/auth/me/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        expect(response.status()).toBe(204);
    });
});