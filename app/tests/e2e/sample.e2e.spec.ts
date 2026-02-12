import { test, expect } from "@playwright/test";

test("homepage responds", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/FairCredit|my-v0-project|Next\.js/i);
});
