import { test, expect } from "@playwright/test";

test("signup -> create board -> create columns -> card drag & drop", async ({ page }) => {
  const base = process.env.E2E_BASE_URL || "http://localhost:3000";
  await page.goto(`${base}/signup`);

  await page.fill("input[placeholder=\"Full name\"]", "E2E User");
  const random = Math.floor(Math.random() * 100000);
  const email = `e2e+${random}@example.com`;
  await page.fill("input[placeholder=\"Email (optional)\"]", email);
  await page.fill("input[placeholder=\"Password (min 6 chars)\"]", "password123");
  await page.click("text=Create account");

  await page.waitForURL("**/boards");

  await page.fill("input[placeholder=\"New board title\"]", "E2E Board");
  await page.click("text=Create board");

  await page.waitForURL("**/boards/**");

  await page.fill("input[placeholder=\"New column title\"]", "To do");
  await page.click("text=Create column");
  await page.fill("input[placeholder=\"New column title\"]", "Done");
  await page.click("text=Create column");

  await page.fill("(//input[@placeholder=\"Card title\"])[1]", "E2E Task");
  await page.fill("(//input[@placeholder=\"Description (optional)\"])[1]", "E2E Description");
  await page.click("(//button[text()=\"Add card\"])[1]");

  await expect(page.locator("text=E2E Task")).toHaveCount(1);
});
