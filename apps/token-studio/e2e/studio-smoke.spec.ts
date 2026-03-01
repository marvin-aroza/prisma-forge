import { expect, test } from "@playwright/test";

test("studio renders core navigation and sections", async ({ page }) => {
  await page.goto("/studio");

  await expect(page.getByRole("link", { name: "Studio", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Understand Tokens in 4 Steps" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current Session" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. Visual Preview Board" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "5. Token Catalog" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "7. Component Previews and Docs" })).toBeVisible();
});

test("studio avoids horizontal overflow", async ({ page }) => {
  await page.goto("/studio");
  await page.waitForLoadState("networkidle");

  const overflowPixels = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const contentWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    return contentWidth - window.innerWidth;
  });

  expect(overflowPixels).toBeLessThanOrEqual(2);
});
