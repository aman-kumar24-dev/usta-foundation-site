import { defineConfig } from '@playwright/test';

// Same as tests/a11y/playwright.config.js, but uses CHROME_PATH — for machines where Playwright's
// pinned browser build is not installed. Usage:
//   CHROME_PATH=/path/to/chrome A11Y_URL=http://localhost:3000/en/home \
//     npx playwright test --config tools/martech-tests/a11y.playwright.config.mjs
export default defineConfig({
  testDir: '../../tests/a11y',
  testMatch: 'a11y.test.js',
  timeout: 60_000,
  reporter: '../../tests/a11y/a11y.reporter.mjs',
  use: {
    headless: true,
    launchOptions: { executablePath: process.env.CHROME_PATH || undefined },
  },
});
