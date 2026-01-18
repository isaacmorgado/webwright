import { defineConfig } from '@playwright/test'

/**
 * Playwright E2E Test Configuration for WebWright Desktop
 *
 * This config sets up:
 * - Electron app testing support
 * - Screenshot capture on failure
 * - Trace recording
 * - Multiple test projects for different scenarios
 */

export default defineConfig({
  testDir: './',
  testMatch: '**/*.e2e.ts',

  // Timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000
  },

  // Reporter
  reporter: [
    ['html', { outputFolder: '../../test-results/e2e-report' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record trace on first retry
    trace: 'on-first-retry',

    // Capture video on failure
    video: 'on-first-retry',
  },

  // Output folder for test artifacts
  outputDir: '../../test-results/e2e',

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel execution
  workers: process.env.CI ? 1 : undefined,

  // Projects
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.e2e.ts',
    },
  ],
})
