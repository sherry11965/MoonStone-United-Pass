//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Legal-document parity baseline (privacy policy, terms of service)
//

import { expect, test } from "@playwright/test";
import { trackConsoleErrors } from "./support";

/**
 * Both documents ship their own full-bleed renderer (no app layout) and are
 * resolved through the controlled legal-publication seam; without a signed
 * publication they state they are not yet effective.
 */
test.describe("法律文档对等基线", () => {
  test("隐私政策渲染文档标题、摘要与元信息", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);
    await page.goto("/privacy");

    await expect(page.getByText("Privacy")).toBeVisible();
    // `{ exact: true }`: an `<h2>` titled "隐私政策的更新" also starts with
    // 隐私政策, which a non-exact role match would resolve as two elements.
    await expect(page.getByRole("heading", { name: "隐私政策", exact: true })).toBeVisible();
    await expect(page.getByText("我们以最小必要、目的明确和安全可控为原则处理您的个人信息。", { exact: false })).toBeVisible();
    // No signed publication in the baseline environment → not-effective copy.
    await expect(page.getByText("暂未生效（等待法务批准与受控发布）")).toBeVisible();
    // Cross-link to the sibling document.
    await expect(page.getByRole("link", { name: "查看服务条款" })).toBeVisible();

    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });

  test("服务条款渲染文档标题、摘要与元信息", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);
    await page.goto("/terms");

    await expect(page.getByText("Terms")).toBeVisible();
    await expect(page.getByRole("heading", { name: "服务条款" })).toBeVisible();
    await expect(page.getByText("请您在注册或使用本服务前仔细阅读并充分理解本服务条款。", { exact: false })).toBeVisible();
    await expect(page.getByText("暂未生效（等待法务批准与受控发布）")).toBeVisible();

    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });
});
