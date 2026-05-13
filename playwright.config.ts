import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const baseURL = process.env.TEST_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const useProductionServer = process.env.PLAYWRIGHT_USE_PRODUCTION_SERVER === "true";
const fallbackApiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:9";
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
  (useProductionServer
    ? `npx next start -p ${PORT}`
    : `npx next dev --turbopack -p ${PORT}`);

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
    : {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          ...process.env,
          CLIENT_API_BASE_URL:
            process.env.CLIENT_API_BASE_URL ?? fallbackApiBaseUrl,
          API_BASE_URL: process.env.API_BASE_URL ?? fallbackApiBaseUrl,
          ALLOW_LOCAL_API_URL: process.env.ALLOW_LOCAL_API_URL ?? "true",
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
