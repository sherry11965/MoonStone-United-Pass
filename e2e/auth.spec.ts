//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Authentication-surface parity baseline (login, logout, session gates, registration flag)
//

import { expect, test } from "@playwright/test";
import { trackConsoleErrors } from "./support";

/**
 * Frozen mock credentials (`shared/mock/mock-auth.ts`); the login panel also
 * displays them in its demo block in mock mode.
 */
const MOCK_USER = { username: "app.user", password: "MockUser123!" };

/**
 * All assertions rely exclusively on user-visible behavior (routes, copy,
 * form fields, redirects) so the same suite passes on the legacy Nuxt stack
 * and the future Vite SPA.
 */
test.describe("认证面对等基线", () => {
  test("登录页渲染凭据表单、Mock 凭据演示与注册入口", async ({ page }) => {
    const consoleErrors = trackConsoleErrors(page);
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
    await expect(page.getByText("MOCK PREVIEW")).toBeVisible();
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "登录（Mock）" })).toBeVisible();
    // The demo credential block is a frozen mock-mode surface.
    await expect(page.getByText("普通用户演示凭据")).toBeVisible();
    // `{ exact: true }`: the demo block also renders `app.user@example.com`,
    // which a substring match would resolve as a second element.
    await expect(page.getByText(MOCK_USER.username, { exact: true })).toBeVisible();
    // Public registration is disabled by default (ADR-0016).
    await expect(page.getByRole("link", { name: "查看注册状态" })).toBeVisible();

    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });

  test("错误凭据在表单内报错且不离开登录页", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[name="identifier"]').fill(MOCK_USER.username);
    await page.locator('input[name="password"]').fill("Wrong-Password-123!");
    await page.getByRole("button", { name: "登录（Mock）" }).click();

    const error = page.locator("#login-form-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("账户名、邮箱或密码错误，请使用页面提供的 Mock 凭据。");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("Mock 凭据登录成功后前往目的地（mock 不建立真实会话，被账户中心送回登录页）", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator('input[name="identifier"]').fill(MOCK_USER.username);
    await page.locator('input[name="password"]').fill(MOCK_USER.password);

    // Observed product behavior (mock mode): the credential panel hard-
    // navigates to the destination (/account) but no session cookie is ever
    // issued, so the account center's session gate sends the browser back to
    // /login without rendering a form error.
    const accountNavigation = page.waitForRequest((request) =>
      new URL(request.url()).pathname.startsWith("/account"),
    );
    await page.getByRole("button", { name: "登录（Mock）" }).click();
    await accountNavigation;

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("#login-form-error")).toHaveCount(0);
  });

  test("注销页提示正在退出并最终回到登录页", async ({ page }) => {
    await page.goto("/logout");
    await expect(page.getByRole("heading", { name: "正在退出登录" })).toBeVisible();
    // Mock mode keeps the frozen 800ms delay, then a hard navigation to /login.
    await page.waitForURL(/\/login$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });

  test("未登录访问账户中心被重定向到登录页", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });

  test("未登录访问管理后台被重定向到登录页", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  });

  test("公开注册关闭时注册页渲染关闭卡片", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByTestId("registration-closed")).toBeVisible();
    await expect(page.getByRole("heading", { name: "注册暂未开放" })).toBeVisible();
    await expect(page.getByRole("link", { name: "返回登录" })).toBeVisible();
  });
});
