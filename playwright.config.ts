import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    headless: false, // เปิดหน้าต่างเบราว์เซอร์จริงให้ดู
    viewport: { width: 1280, height: 800 },
    video: 'on',
    trace: 'on',
    launchOptions: { slowMo: Number(process.env.SLOW ?? 500) },
  },
  webServer: {
    command: 'npm run dev -- --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
  },
})
