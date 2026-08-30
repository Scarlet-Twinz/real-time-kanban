import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  timeout: 90_000,
  use: {
    headless: true,
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    channel: "chrome",
  },
});
