import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
// Use .env.test for test environment if available
const envPath = process.env.NODE_ENV === 'test' 
  ? path.join(__dirname, '.env.test')
  : path.join(__dirname, '../.env')
dotenv.config({ path: envPath })

/**
 * Playwright Configuration for FairCredit Testing
 * 
 * This configuration sets up Playwright to test the FairCredit application
 * with development wallet integration for Solana testing.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.spec.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Enable test environment variables */
    extraHTTPHeaders: {
      'X-Test-Mode': process.env.PLAYWRIGHT_TEST_MODE || 'false'
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    
    /* Special project for Phantom wallet tests */
    {
      name: 'with-phantom',
      testMatch: '**/*.phantom.e2e.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Extensions require headed mode
        headless: false,
        // Slower actions for wallet interactions
        actionTimeout: 30000,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
