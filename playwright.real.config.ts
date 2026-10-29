import { defineConfig, devices } from "@playwright/test";

// Отдельный opt-in: этот набор пишет только в проверенный локальный DEV backend.
export default defineConfig({
  testDir: "./tests/real",
  testMatch: "**/*.spec.ts",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  outputDir: ".cache/backend-stage12/real-artifacts",
  timeout: 60_000,
  reporter: [["list"], ["json", { outputFile: ".cache/backend-stage12/real-results.json" }]],
  use: { baseURL: "http://localhost:3000", trace: "off", screenshot: "off", video: "off" },
  projects: [{ name: "real-chromium", use: { ...devices["Desktop Chrome"] } }],
});
