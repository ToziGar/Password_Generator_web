// Playwright configuration for a quick smoke test.
const { devices } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: 'tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  use: {
    headless: true,
    baseURL: 'http://localhost:8000',
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    actionTimeout: 10 * 1000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
};
