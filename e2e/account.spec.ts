//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Account-center parity baseline (overview, security entry, active sessions)
//

import { expect, test } from "@playwright/test";
import { E2E_SESSIONS } from "./stub-backend";
import { installSession, trackConsoleErrors } from "./support";

/**
 * The account center is gated by the HttpOnly `up_session` cookie; mock mode
 * never issues one, so the baseline injects it exactly like a real backend
 * would have set it after login. All page content comes from the frozen mock
 * data source (`shared/mock/united-pass-data-source.ts`).
 */
test.describe("账户中心对等基线", () => {
  test.beforeEach(async ({ context }) => {
    await installSession(context, E2E_SESSIONS.user);
  });

  test("账户概览渲染当前用户资料", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);
    await page.goto("/account");

    // Frozen mock identity: the mock source always resolves 林知行/知行.
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "你好，知行" })).toBeVisible();
    await expect(page.getByTestId("open-profile-editor")).toBeVisible();
    // `{ exact: true }`: the same address also appears inside the
    // "知行 · zhixing.lin@example.com" identity line (substring match would
    // resolve two elements and trip strict mode).
    await expect(page.getByText("zhixing.lin@example.com", { exact: true })).toBeVisible();

    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });

  test("登录与安全页展示改密入口与验证方式", async ({ page }) => {
    await page.goto("/account/security");

    await expect(page).toHaveURL(/\/account\/security$/);
    await expect(page.getByRole("heading", { name: "登录与安全" })).toBeVisible();
    // Password change entry (frozen testid of SecurityOverview).
    const passwordEntry = page.getByTestId("open-password-modal");
    await expect(passwordEntry).toBeVisible();
    await expect(passwordEntry).toContainText("修改密码");
    // TOTP is enabled in the frozen mock security summary → removal entry.
    await expect(page.getByTestId("open-totp-remove-modal")).toBeVisible();
    // No passkeys enrolled → enrollment entry is offered.
    await expect(page.getByTestId("open-passkey-enroll-modal")).toBeVisible();
  });

  test("活跃会话页列出会话并标注当前设备", async ({ page }) => {
    await page.goto("/account/sessions");

    await expect(page).toHaveURL(/\/account\/sessions$/);
    await expect(page.getByRole("heading", { name: "活跃会话" })).toBeVisible();
    // Frozen mock session list: three devices, the current one cannot be revoked.
    await expect(page.getByText("MacBook Pro")).toBeVisible();
    await expect(page.getByText("iPhone 17")).toBeVisible();
    await expect(page.getByText("当前设备")).toBeVisible();
    await expect(page.getByTestId("revoke-session-ses_mobile")).toBeVisible();
    await expect(page.getByTestId("revoke-session-ses_edge")).toBeVisible();
    await expect(page.getByTestId("revoke-session-ses_current")).toHaveCount(0);
  });
});
