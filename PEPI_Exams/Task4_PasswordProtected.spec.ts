import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test('Task 4: Password protected test with 2 Multiple Select questions', async ({ page, request }) => {

    test.setTimeout(240_000); // 4 минути таймаут

    // ── Config ────────────────────────────────────────────────────────────────
    const password = process.env.TEST_USER_PASSWORD;
    if (!password) {
        throw new Error('ГРЕШКА: TEST_USER_PASSWORD не е дефинирана в .env файла!');
    }

    const host       = 'https://exampractices.com';
    const baseUrl    = `${host}/api`;
    const uniqueId   = Date.now();
    const userEmail  = `task4user_${uniqueId}@test.com`;
    const testTitle  = `Password Test - ${uniqueId}`;
    const testSecret = '123456'; // Паролата за самия тест
    
    let accessToken: string | null = '';
    let shareLink = ''; 

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 – Регистрация чрез API
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 1: Register new user via API', async () => {
        const response = await request.post(`${baseUrl}/auth/register/`, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            data: {
                email:            userEmail,
                first_name:       'Security',
                last_name:        'Fan',
                password,
                password_confirm: password,
            },
        });
        expect(response.status()).toBe(201);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2 – Логване през UI
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 2: Login user via UI', async () => {
        await page.goto(`${host}/login`);
        await page.locator('input[type="email"]').fill(userEmail);
        await page.locator('input[type="password"]').fill(password);
        await page.getByRole('button', { name: /Sign In/i }).click();
        await page.waitForURL(`${host}/dashboard`, { timeout: 30_000 });

        accessToken = await page.evaluate(() =>
            localStorage.getItem('access') || localStorage.getItem('token') || localStorage.getItem('access_token')
        );
        expect(accessToken).not.toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3 – Навигация към Create Test
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 3: Navigate to Create Test', async () => {
        const createBtn = page.getByRole('link', { name: /Create Test/i }).or(page.getByRole('button', { name: /Create Test/i }));
        await createBtn.click();
        await expect(page.getByRole('heading', { name: 'Create New Test' })).toBeVisible();
    });

   // ─────────────────────────────────────────────────────────────────────────
    // STEP 4 & 5 – Time Limit и Password Protected
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 4 & 5: Fill form (Time Limit = 1, Password Protected)', async () => {
        await page.locator('input[type="text"]').fill(testTitle);
        await page.locator('textarea').fill('Testing password protection and multiple questions');
        
        // 👉 ПОПРАВЕНО: Използваме точния value атрибут от твоята снимка
        await page.locator('select').first().selectOption('password_protected');
        
        // След като изберем парола, трябва да се появи поле за нея
        const passwordField = page.getByPlaceholder(/Enter test password/i).or(page.locator('input[type="password"]').last());
        await expect(passwordField).toBeVisible({ timeout: 5_000 });
        await passwordField.fill(testSecret);

        // Time Limit = 1
        await page.getByPlaceholder('No limit').fill('1'); 
        
        await page.getByRole('button', { name: 'Create & Add Questions' }).click();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6 – Добавяне на 2 въпроса (Multiple Select)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 6: Add 2 Multiple Select questions', async () => {
        await page.waitForLoadState('networkidle');

        // --- Въпрос 1 ---
        await page.getByRole('button', { name: 'Add your first question' }).click();
        await page.locator('textarea').first().fill('Question 1: What is 2 + 2?');
        await page.locator('select').first().selectOption('multi_select');
        await page.getByRole('textbox', { name: 'Answer 1' }).fill('4');
        await page.getByRole('textbox', { name: 'Answer 2' }).fill('5');
        await page.locator('input[type="checkbox"]').first().check({ force: true });
        await page.getByRole('button', { name: 'Save Question' }).click();
        await page.waitForLoadState('networkidle');

        // --- Въпрос 2 ---
        await page.getByRole('button', { name: 'Add Question' }).click();
        await page.locator('textarea').first().fill('Question 2: What is 3 + 3?');
        await page.locator('select').first().selectOption('multi_select');
        await page.getByRole('textbox', { name: 'Answer 1' }).fill('6');
        await page.getByRole('textbox', { name: 'Answer 2' }).fill('7');
        await page.locator('input[type="checkbox"]').first().check({ force: true });
        await page.getByRole('button', { name: 'Save Question' }).click();
        await page.waitForLoadState('networkidle');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7 & 8 – Достъп с грешна парола
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 7 & 8: Access via link and enter WRONG password', async () => {
        // Взимаме линка за споделяне
        const linkInput = page.locator('input[value*="/t/"]').first();
        shareLink = await linkInput.inputValue();

        // Отиваме на линка
        await page.goto(shareLink);
        
        // Изчакваме да се зареди страницата с паролата
        await expect(page.getByRole('heading', { name: 'This test is password protected' })).toBeVisible();

        // Намираме полето за парола и попълваме грешна такава
        const testPasswordField = page.locator('input[type="password"]');
        await testPasswordField.fill('wrong_password');
        
        // Кликаме бутона "Continue" (от твоята снимка)
        await page.getByRole('button', { name: 'Continue', exact: true }).click();

        // Проверяваме дали се появява червеният текст "Invalid password"
        const errorMessage = page.getByText('Invalid password', { exact: true });
        await expect(errorMessage).toBeVisible({ timeout: 5_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9, 10 & 11 – Вярна парола, решаване и събмит
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 9, 10 & 11: Correct password, solve and submit', async () => {
        const testPasswordField = page.locator('input[type="password"]');
        
        // Първо изчистваме полето от грешната парола
        await testPasswordField.clear(); 
        
        // Въвеждаме вярната парола
        await testPasswordField.fill(testSecret);
        
        // Кликаме "Continue" отново
        await page.getByRole('button', { name: 'Continue', exact: true }).click();

        // Изчакваме да се появи полето за юзърнейм (това означава, че сме влезли успешно)
        const usernameInput = page.locator('input[type="text"]').first();
        await expect(usernameInput).toBeVisible({ timeout: 10_000 });
        
        // Попълваме име за теста и стартираме
        await usernameInput.fill('SecurityTester');
        await page.getByRole('button', { name: /Start/i }).click();

        // --- Решаваме Въпрос 1 ---
        // Изчакваме чекбокса да стане видим
        await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 10_000 });
        await page.locator('input[type="checkbox"]').first().check({ force: true });
        
        // Кликаме Next или директно Submit (в зависимост как е направен сайта)
        const nextOrSubmitBtn = page.getByRole('button', { name: /Next|Submit/i });
        await nextOrSubmitBtn.click();

        // --- Решаваме Въпрос 2 (ако има втори екран) ---
        // Проверяваме дали сме на втори въпрос чрез изчакване на нов чекбокс
        if (await page.locator('input[type="checkbox"]').first().isVisible().catch(() => false)) {
             await page.locator('input[type="checkbox"]').first().check({ force: true });
             await page.getByRole('button', { name: /Submit|Finish/i }).click();
        }

        // Изчакваме теста да приключи
        await page.waitForLoadState('networkidle');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 12 – Изтриване на теста
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 12: Delete test', async () => {
        await page.goto(`${host}/dashboard`);
        page.once('dialog', d => d.accept());
        await page.locator('tr').filter({ hasText: testTitle }).getByRole('button', { name: 'Delete' }).first().click();
        
        const confirmBtn = page.getByRole('button', { name: 'Delete', exact: true }).last();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        
        await expect(page.getByText(testTitle)).toBeHidden();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 13 – Изтриване на потребителя
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 13: Delete user via API', async () => {
        const response = await request.delete(`${baseUrl}/auth/me/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        expect(response.status()).toBe(204);
    });
});