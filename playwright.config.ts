import { defineConfig, devices } from "@playwright/test";

// End-to-end tests. They need PostgreSQL + a seeded database and run the
// app with PAYMENT_GATEWAY_MODE=mock so the built-in test gateway is used.
//   npx prisma migrate deploy && npm run db:seed && npm run test:e2e
const PORT = Number(process.env.E2E_PORT || 3100);

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || `http://localhost:${PORT}`,
    locale: "fa-IR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx next dev -p ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
        env: { PAYMENT_GATEWAY_MODE: "mock", SMS_PROVIDER: "mock" },
      },
});
