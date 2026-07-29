import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const FIXTURE_API_PORT = Number(
  process.env.PLAYWRIGHT_FIXTURE_API_PORT ?? PORT + 1,
);
const baseURL = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const webServerHealthUrl = new URL("/api/config", baseURL).toString();
const fixtureApiBaseUrl = `http://127.0.0.1:${FIXTURE_API_PORT}`;
const fallbackApiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:9";
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
  `npx next dev --turbopack -p ${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : [
        {
          command: "node scripts/playwright-api-fixture.mjs",
          url: `${fixtureApiBaseUrl}/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
          env: {
            ...process.env,
            PORT: String(FIXTURE_API_PORT),
          },
        },
        {
          command: webServerCommand,
          url: webServerHealthUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          env: {
            ...process.env,
            CLIENT_API_BASE_URL:
              process.env.CLIENT_API_BASE_URL ?? fallbackApiBaseUrl,
            API_BASE_URL:
              process.env.PLAYWRIGHT_API_BASE_URL ?? fixtureApiBaseUrl,
            ALLOW_LOCAL_API_URL: process.env.ALLOW_LOCAL_API_URL ?? "true",
            PORT: String(PORT),
          },
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "**/*.mobile.spec.ts",
    },
    {
      name: "mobile-chromium",
      fullyParallel: false,
      use: { ...devices["Pixel 5"] },
      testMatch: "**/*.mobile.spec.ts",
      retries: 0,
    },
  ],
});
