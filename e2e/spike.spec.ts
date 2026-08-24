//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Naive UI SSR spike smoke test
//

import { expect, test, type Page } from "@playwright/test";

/**
 * Collects browser console errors and uncaught page errors so the spike can
 * assert SSR hydration produced no warnings or failures.
 */
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("Naive UI SSR spike", () => {
  test("renders the form, data table and modal trigger without hydration loss", async ({
    page,
  }) => {
    const consoleErrors = trackConsoleErrors(page);
    await page.goto("/spike");

    await expect(page.getByTestId("spike-page")).toBeVisible();
    // n-form rendered by SSR and preserved through hydration.
    await expect(page.getByTestId("spike-name-input")).toBeVisible();
    // n-data-table rows rendered server-side.
    await expect(page.getByTestId("spike-table-card")).toContainText("n-data-table");
    // n-modal trigger present; opening it verifies client-side interactivity.
    await page.getByTestId("spike-open-modal").click();
    await expect(page.getByTestId("spike-modal")).toBeVisible();

    // No hydration mismatches or runtime failures may have surfaced.
    const hydrationErrors = consoleErrors.filter((text) =>
      /hydrat|mismatch/i.test(text),
    );
    expect(hydrationErrors, `hydration errors: ${hydrationErrors.join(" | ")}`).toHaveLength(0);
    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });

  test("home route redirects to the login page", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);
    // The frozen landing route has no public content: `pages/index.vue`
    // issues a server-side 307 straight to /login (legacy `src/app/page.tsx`).
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });
});
