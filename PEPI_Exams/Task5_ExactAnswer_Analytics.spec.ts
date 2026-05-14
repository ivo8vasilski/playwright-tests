import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test('Task 5: Exact Answer test with 3 questions and analytics check', async ({ page, request }) => {

    test.setTimeout(300_000); // 5 минути таймаут за двата опита и създаването

    // ── Config ────────────────────────────────────────────────────────────────
    const password = process.env.TEST_USER_PASSWORD;
    if (!password) {
        throw new Error('ГРЕШКА: TEST_USER_PASSWORD не е дефинирана в .env файла!');
    }

    const host       = 'https://exampractices.com';
    const baseUrl    = `${host}/api`;
    const uniqueId   = Date.now();
    const userEmail  = `task5user_${uniqueId}@test.com`;
    const testTitle  = `Exact Answer Test - ${uniqueId}`;
    
    let accessToken: string | null = '';

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 – Регистрация
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 1: Register new user', async () => {
        const response = await request.post(`${baseUrl}/auth/register/`, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            data: {
                email:            userEmail,
                first_name:       'Analytic',
                last_name:        'Tester',
                password,
                password_confirm: password,
            },
        });
        expect(response.status()).toBe(201);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2 – Логване (Стабилна логика за взимане на токен)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 2: Login', async () => {
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
    // STEP 3, 4 & 5 – Създаване на тест (Public, Max Attempts 3)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 3-5: Create Test Setup', async () => {
        // Кликаме бутона от навигацията, за да избегнем белия екран
        const createTestBtn = page.getByRole('link', { name: /Create Test/i }).or(page.getByRole('button', { name: /Create Test/i }));
        await createTestBtn.click();
        
        await expect(page.getByRole('heading', { name: 'Create New Test' })).toBeVisible({ timeout: 15_000 });

        await page.locator('input[type="text"]').fill(testTitle);
        
        // Visibility - Public
        await page.locator('select').first().selectOption('public');
        
        // Max Attempts - 3
        await page.getByRole('spinbutton').nth(1).fill('3');
        
        await page.getByRole('button', { name: 'Create & Add Questions' }).click();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6 – Добавяне на 3 въпроса (Exact Answer)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 6: Add 3 Exact Answer questions', async () => {
        const questions = [
            { q: 'What is the capital of Bulgaria?', a: 'Sofia' },
            { q: 'What is 5 + 5?', a: '10' },
            { q: 'What color is the sky?', a: 'Blue' }
        ];

        for (let i = 0; i < questions.length; i++) {
            await page.waitForLoadState('networkidle');
            
            const btnText = (i === 0) ? 'Add your first question' : 'Add Question';
            await page.getByRole('button', { name: btnText }).click();

            await page.locator('textarea').first().fill(questions[i].q);
            
            // Избираме тип Exact Answer
            await page.locator('select').first().selectOption('exact_answer');
            
            // Попълваме верния отговор (използвайки точния placeholder)
            await page.getByPlaceholder('Enter the correct answer').fill(questions[i].a);
            
            await page.getByRole('button', { name: 'Save Question' }).click();
            await page.waitForLoadState('networkidle');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ПОМОЩНА ФУНКЦИЯ ЗА РЕШАВАНЕ (Всички въпроси на една страница)
    // ─────────────────────────────────────────────────────────────────────────
    const solveTest = async (username: string) => {
        await page.waitForLoadState('networkidle');
        
        // 1. Изчакваме категорично полето за име на старт екрана
        const usernameInput = page.getByPlaceholder('Your name (optional)')
            .or(page.locator('input[type="text"]').first());
            
        await expect(usernameInput).toBeVisible({ timeout: 10_000 });
        await usernameInput.fill(username);
        
        // 2. Кликаме бутона "Start Test" (както се казва на твоята снимка)
        await page.getByRole('button', { name: 'Start Test' }).click();

        // 3. Изчакваме същинския тест да зареди и въпросите да се появят
        const answerInputs = page.getByPlaceholder('Type your answer');
        await expect(answerInputs.first()).toBeVisible({ timeout: 15_000 });

        // 4. Попълваме Sofia, 10 и Blue последователно
        await answerInputs.nth(0).fill('Sofia');
        await answerInputs.nth(1).fill('10');
        await answerInputs.nth(2).fill('Blue');
        
        // 5. Натискаме Submit Test
        await page.getByRole('button', { name: /Submit Test/i }).click();
        await page.waitForLoadState('networkidle');
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7-9 – Първо решаване (Attempt 1)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 7-9: First attempt from Explore', async () => {
        await page.goto(`${host}/explore`);
        await page.waitForLoadState('networkidle');

        const searchBox = page.getByPlaceholder('Search by title...');
        await searchBox.fill(testTitle);
        await searchBox.press('Enter');
        await page.waitForLoadState('networkidle'); 
        
        await page.getByText(testTitle, { exact: true }).click();
        await solveTest('UserOne');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 10-11 – Проверка "Taken 1x"
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 10-11: Verify "Taken 1x" in Explore', async () => {
        await page.goto(`${host}/explore`);
        await page.waitForLoadState('networkidle');

        const searchBox = page.getByPlaceholder('Search by title...');
        await searchBox.fill(testTitle);
        await searchBox.press('Enter');
        await page.waitForLoadState('networkidle');
        
        const testRow = page.locator('tr').filter({ hasText: testTitle });
        await expect(testRow.getByText(/Taken 1x/i)).toBeVisible({ timeout: 15_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 12-13 – Второ решаване (Attempt 2)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 12-13: Second attempt', async () => {
        await page.getByText(testTitle, { exact: true }).click();
        await solveTest('UserTwo');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 14-15 – Dashboard -> Results -> Analytics
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 14-15: Check Analytics for 2 responses', async () => {
        await page.goto(`${host}/dashboard`);
        await page.waitForLoadState('networkidle');
        
        const testRow = page.locator('tr').filter({ hasText: testTitle }).first();
        await testRow.getByText('Results', { exact: true }).click();
        
        await page.getByText('Analytics', { exact: true }).click();
        await page.waitForLoadState('networkidle');

        // Проверяваме дали има 2 събмитната резултата (търсим числото 2 в анализите)
        const twoResponsesIndicator = page.getByText('2 / 2 answered correctly').first()
            .or(page.getByText('2 submissions').first())
            .or(page.locator('div').filter({ hasText: /^2$/ }).first());
        
        await expect(twoResponsesIndicator).toBeVisible({ timeout: 15_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 16 – Изтриване на теста
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 16: Delete test', async () => {
        await page.goto(`${host}/dashboard`);
        await page.waitForLoadState('networkidle');

        page.once('dialog', d => d.accept());
        
        const testRow = page.locator('tr').filter({ hasText: testTitle }).first();
        await testRow.getByRole('button', { name: 'Delete' }).click();
        
        const confirmBtn = page.getByRole('button', { name: 'Delete', exact: true }).last()
            .or(page.getByRole('button', { name: 'Yes' }));
        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await confirmBtn.click();
        }
        
        await expect(page.getByText(testTitle)).toBeHidden({ timeout: 10_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 17 – Изтриване на потребителя
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 17: Delete user via API', async () => {
        const response = await request.delete(`${baseUrl}/auth/me/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        expect(response.status()).toBe(204);
    });
});