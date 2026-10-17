import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', workers: 1, timeout: 60000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4177/lab-05/', reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { channel: 'chrome' } },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4177/lab-05/', reuseExistingServer: true, timeout: 15000 },
});
