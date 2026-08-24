//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Administration-gate parity baseline (session, capability and DreamUP branches)
//

import { expect, test } from "@playwright/test";
import { E2E_SESSIONS } from "./stub-backend";
import { installSession, trackConsoleErrors } from "./support";

/**
 * Baseline for the pre-render administration gate (Nitro middleware
 * `server/middleware/admin-gate.ts`). The e2e stub backend derives the
 * `/me/permissions` and `/admin/dreamup/events` answers from the injected
 * `up_session` cookie, covering the frozen branch table:
 *
 * - no session cookie                → redirect to /login
 * - backend 401 (expired session)    → gate redirects to /login, but in mock
 *   mode the login page re-validates the cookie through the MOCK data source
 *   (which cannot know the session is expired) and forwards it to /account
 * - zero administration capabilities → redirect to /account
 * - DreamUP surface without events   → 403 forbidden plain text
 * - DreamUP surface with events      → allowed (external redirect seam)
 * - full capabilities                → console renders
 */
test.describe("管理后台门禁对等基线", () => {
  test("未登录访问 /admin 被重定向到登录页", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });

  test("全量权限会话可进入身份管理工作台", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);
    await installSession(page.context(), E2E_SESSIONS.admin);
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "身份管理工作台" })).toBeVisible();
    // Overview dashboard content from the frozen mock dashboard seam.
    await expect(page.getByText("最近安全事件")).toBeVisible();

    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });

  test("零权限会话被重定向到账户中心", async ({ page }) => {
    await installSession(page.context(), E2E_SESSIONS.user);
    await page.goto("/admin");

    // No administration capability → 307 /account, where the mock account
    // center renders for the same signed-in session.
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "你好，知行" })).toBeVisible();
  });

  test("过期会话（后端 401）经登录页被 mock 会话校验送回账户中心", async ({ page }) => {
    await installSession(page.context(), E2E_SESSIONS.expired);
    await page.goto("/admin");
    // Frozen mock-mode behavior chain: the gate sees the stub's 401 and 307s
    // to /login (server/middleware/admin-gate.ts branch 3), but the login
    // page then confirms the still-present cookie via the mock data source —
    // which has no notion of revoked sessions — and redirects to /account
    // (resolveAuthenticatedLoginDestination in server/utils/login-session.ts).
    // With a real backend the second /me call would 401 and the visitor would
    // stay on /login; that divergence is inherent to the mock seam.
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "你好，知行" })).toBeVisible();
  });

  test("无 DreamUP 事件管理权限时 DreamUP 面返回 403 拒绝文案", async ({ page }) => {
    await installSession(page.context(), E2E_SESSIONS.admin);
    const response = await page.goto("/admin/dreamup");

    expect(response?.status()).toBe(403);
    await expect(page.getByText("你没有 MoonStone DreamUP 活动管理权限。")).toBeVisible();
  });

  test("DreamUP 管理员进入 DreamUP 面后被送往外部管理站", async ({ page }) => {
    await installSession(page.context(), E2E_SESSIONS.dreamup);

    // The frozen DreamUP entry is an external redirect seam; probing with
    // maxRedirects: 0 observes the decision without leaving localhost.
    const response = await page.request.fetch("/admin/dreamup", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("https://moonstone.org.cn/dreamup/admin/");
  });
});
