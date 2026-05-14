import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test('Task 3: Create Test with 1 min timeout, link-only and verify no answer on timeout', async ({ page, request }) => {

    test.setTimeout(180_000); // 3 минути глобален таймаут за този тест

    // ── Config ────────────────────────────────────────────────────────────────
    const password = process.env.TEST_USER_PASSWORD;
    if (!password) {
        throw new Error('ГРЕШКА: TEST_USER_PASSWORD не е дефинирана в .env файла!');
    }

    const host      = 'https://exampractices.com';
    const baseUrl   = `${host}/api`;
    
    // Генерираме максимално прост имейл и имена за новия user
    const uniqueId  = Date.now();
    const userEmail = `task3user_${uniqueId}@test.com`;
    const testTitle = `Auto Test Task 3 - ${uniqueId}`;
    
    let   accessToken: string | null = '';
    let   shareLink = ''; 

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 – Регистрация чрез API (Създаване на нов user)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 1: Register new user via API', async () => {
        const response = await request.post(`${baseUrl}/auth/register/`, {
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            data: {
                email:            userEmail,
                first_name:       'Test',
                last_name:        'User',
                password,
                password_confirm: password,
            },
        });

        // Ако не върне 201 Created, искаме да видим защо
        if (response.status() !== 201) {
            const errorText = await response.text();
            console.error('ГРЕШКА ПРИ СЪЗДАВАНЕ НА USER:', errorText);
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

        expect(accessToken, 'Не бе намерен access токен в Storage или Cookies').not.toBeNull();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3 – Навигация към Create Test
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 3: Navigate to Create Test', async () => {
        const createTestBtn = page.getByRole('link', { name: /Create Test/i })
            .or(page.getByRole('button', { name: /Create Test/i }));

        if (await createTestBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
            await createTestBtn.click();
        } else {
            await page.goto(`${host}/create-test`, { waitUntil: 'domcontentloaded' });
        }

        await expect(page.getByRole('heading', { name: 'Create New Test' })).toBeVisible({ timeout: 15_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4 & 5 – Попълване на формата (Time Limit = 1, Visibility = Link Only)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 4 & 5: Fill form with 1 min limit and Link Only', async () => {
        await page.locator('input[type="text"]').fill(testTitle);
        await page.locator('textarea').fill('Testing 1 min timeout and Link Only feature');
        
        // Избираме Visibility - точния текст от падащото меню
        await page.getByRole('combobox').selectOption({ label: 'Link Only - Only those with link' });
        
        // Слагаме Time Limit 1 минута
        await page.getByPlaceholder('No limit').fill('1'); 
        
        await page.getByRole('button', { name: 'Create & Add Questions' }).click();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6 – Добавяне на 1 въпрос
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 6: Add 1 question', async () => {
        await page.waitForLoadState('networkidle');

        await page.getByRole('button', { name: 'Add your first question' }).click();

        const questionInput = page.locator('textarea').first();
        await expect(questionInput).toBeVisible({ timeout: 10_000 });
        await questionInput.fill('What is 2 + 2?');

        // Използваме работещия локатор от Задача 2
        await page.locator('select').first().selectOption('multi_select');
        await page.getByRole('textbox', { name: 'Answer 1' }).fill('4');
        await page.getByRole('textbox', { name: 'Answer 2' }).fill('2');
        await page.locator('input[type="checkbox"]').first().check({ force: true });

        await page.getByRole('button', { name: 'Save Question' }).click();
        await page.waitForLoadState('networkidle');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7 – Извличане на линка и достъпване на теста
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 7: Extract link and access the test', async () => {
        // Търсим input полето, което съдържа линка (започва с http и има /t/ в него)
        const linkInput = page.locator('input[value*="/t/"]').first();
        await expect(linkInput).toBeVisible({ timeout: 10_000 });
        
        // Взимаме текста (URL-а) от полето
        shareLink = await linkInput.inputValue();
        console.log(`Извлечен линк: ${shareLink}`);

        // Отиваме на извлечения линк
        await page.goto(shareLink);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.getByText(testTitle)).toBeVisible({ timeout: 15_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8 – Стартиране и изчакване на 1 минута таймаут
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 8: Start test and wait for time to run out', async () => {
        // Попълваме името и стартираме
        const usernameInput = page.getByLabel(/username|name/i)
            .or(page.getByPlaceholder(/username|name/i))
            .or(page.locator('input[type="text"]').first());
        await usernameInput.fill('TimeoutTester');

        const startBtn = page.getByRole('button', { name: /Start|Старт/i });
        await startBtn.click();

        // Чакаме страницата с въпроса да зареди (очакваме да видим въпроса)
        await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 10_000 });

        // ⏱ ИЗЧАКВАМЕ ВРЕМЕТО ДА ИЗТЕЧЕ (60 секунди + 5 секунди буфер)
        console.log('Чакаме 65 секунди времето да изтече...');
        await page.waitForTimeout(65_000); 

        // Очакваме тестът да се затвори сам/да изпише съобщение за край на времето
        await page.waitForLoadState('networkidle');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9 – Отиване в Dashboard и отваряне на Results
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 9: Open Results from Dashboard', async () => {
        await page.goto(`${host}/dashboard`);
        await page.waitForLoadState('networkidle');

        // Намираме реда (tr), който съдържа заглавието на нашия тест
        const testRow = page.locator('tr').filter({ hasText: testTitle }).first();
        
        // Кликаме на текста "Results" в този конкретен ред
        await testRow.getByText('Results', { exact: true }).click();
        
        // Изчакваме страницата с резултатите да зареди
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { name: 'Test Results' })).toBeVisible({ timeout: 10_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 10 – Проверка в Analytics (НЕ трябва да има подаден отговор)
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 10: Verify NO answers in Analytics', async () => {
        // Кликаме на таба "Analytics"
        await page.getByText('Analytics', { exact: true }).click();
        await page.waitForLoadState('networkidle');

        // Търсим точно текста, който е заграден в червено на снимката
        const noAnswersText = page.getByText('0 / 0 answered correctly');
            
        // Проверяваме дали този текст се визуализира успешно
        await expect(noAnswersText).toBeVisible({ timeout: 10_000 });
    });
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 11 – Изтриване на теста
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 11: Delete test', async () => {
        await page.goto(`${host}/dashboard`);
        await page.waitForLoadState('networkidle');

        page.once('dialog', async dialog => {
            await dialog.accept();
        });

        // Кликаме първия Delete бутон (този на самия тест в списъка)
        await page.getByRole('button', { name: 'Delete' }).first().click();

        // Обработваме HTML модален прозорец (ако сайтът ползва такъв)
        const confirmBtn = page.getByRole('button', { name: 'Delete', exact: true }).last()
            .or(page.getByRole('button', { name: 'Yes' }))
            .or(page.getByRole('button', { name: 'Confirm' }));

        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await confirmBtn.click();
        }

        await page.waitForLoadState('networkidle');
        await expect(page.getByText(testTitle)).toBeHidden({ timeout: 10_000 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 12 – Изтриване на потребителя чрез API
    // ─────────────────────────────────────────────────────────────────────────
    await test.step('Step 12: Delete user via API', async () => {
        const response = await request.delete(`${baseUrl}/auth/me/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept':        'application/json',
            },
        });
        expect(response.status()).toBe(204);
    });
});