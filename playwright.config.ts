import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Прочитане на .env файла.
 * Това ще направи променливите от .env достъпни чрез process.env
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: '.',
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  
  /* 👉 ГЛОБАЛЕН ТАЙМАУТ: 1 минута (60 000 ms) 👈 */
  timeout: 60_000,
  
  /* Таймаут за проверките (expect) - 15 секунди */
  expect: {
    timeout: 15_000,
  },

  /* Репортери - как да изглежда резултатът */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  /* Основни настройки за браузърите */
  use: {
    // Тук можеш да добавиш baseURL или да скриеш паролите в лога, ако е нужно
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});