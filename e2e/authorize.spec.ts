//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: OAuth consent-page parity baseline (valid/expired/client_not_found resolutions)
//

import { expect, test } from "@playwright/test";
import { trackConsoleErrors } from "./support";

/**
 * Mock mode falls back to the frozen `consent_demo_001` request when no
 * requestId is supplied (server/routes/authorize-context.get.ts); the other
 * demo request IDs cover the non-valid resolution state cards.
 */
test.describe("授权同意页对等基线", () => {
  test("无参数渲染 consent_demo_001 同意卡片（应用、身份、Scope、决定按钮）", async ({
    page,
  }) => {
    const consoleErrors = trackConsoleErrors(page);
    await page.goto("/authorize");

    // Application identity block.
    await expect(page.getByRole("heading", { name: "United Workspace" })).toBeVisible();
    await expect(page.getByText("团队协作与项目管理工作台")).toBeVisible();
    await expect(page.getByText("由 协作产品团队 提供")).toBeVisible();

    // Current identity comes from the frozen mock source (林知行).
    await expect(page.getByText("当前身份")).toBeVisible();
    await expect(page.getByText("林知行")).toBeVisible();

    // Requested scopes.
    await expect(page.getByText("此应用希望：")).toBeVisible();
    await expect(page.getByText("确认你的身份")).toBeVisible();
    await expect(page.getByText("查看基本资料")).toBeVisible();
    await expect(page.getByText("查看邮箱地址")).toBeVisible();

    // Decision buttons (mock copy keeps the frozen Mock suffix).
    await expect(page.getByTestId("consent-allow")).toContainText("允许并继续（Mock）");
    await expect(page.getByTestId("consent-deny")).toContainText("拒绝");

    expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toHaveLength(0);
  });

  test("允许授权后渲染成功结果卡", async ({ page }) => {
    await page.goto("/authorize");
    await page.getByTestId("consent-allow").click();

    // Mock mode keeps the frozen interactive result card instead of
    // navigating to the callback immediately.
    await expect(page.getByRole("heading", { name: "授权成功" })).toBeVisible();
    await expect(page.getByText("你已授权 United Workspace 访问请求的数据。")).toBeVisible();
    await expect(page.getByRole("button", { name: "完成并跳转" })).toBeVisible();
  });

  test("拒绝授权后渲染拒绝结果卡", async ({ page }) => {
    await page.goto("/authorize");
    await page.getByTestId("consent-deny").click();

    await expect(page.getByRole("heading", { name: "已拒绝授权" })).toBeVisible();
    await expect(
      page.getByText("你已拒绝 United Workspace 的授权请求。应用不会获得任何数据访问权限。"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "完成并返回" })).toBeVisible();
  });

  test("过期授权请求渲染过期状态卡", async ({ page }) => {
    await page.goto("/authorize?requestId=consent_demo_002");

    await expect(page.getByRole("heading", { name: "授权请求已过期" })).toBeVisible();
    // The request id is rendered twice (status paragraph + "back" link text),
    // so scope to the descriptive paragraph to keep strict mode happy.
    await expect(
      page.getByRole("paragraph").filter({ hasText: "请求 consent_demo_002" }).getByRole("code"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "返回账户中心" })).toBeVisible();
  });

  test("客户端不存在渲染应用不存在状态卡", async ({ page }) => {
    await page.goto("/authorize?requestId=consent_demo_003");

    await expect(page.getByRole("heading", { name: "应用不存在" })).toBeVisible();
    // Same dual-render note as the expired card above.
    await expect(
      page.getByRole("paragraph").filter({ hasText: "请求 consent_demo_003" }).getByRole("code"),
    ).toBeVisible();
  });
});
