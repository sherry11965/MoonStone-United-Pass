//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: 38-route reachability smoke baseline (public, account, admin, DreamUP surfaces)
//

import { expect, test } from "@playwright/test";
import { E2E_SESSIONS } from "./stub-backend";
import { installSession } from "./support";

/**
 * Reachability smoke for the frozen 38-route topology. Dynamic segments use
 * IDs that exist in the frozen mock data source so detail pages render their
 * real content instead of empty states:
 *
 * - user `usr_01JUP8M8B4Q7R4T6PK1D` (present in the mock `userDetails` AND
 *   `employeeDetails` maps; `usr_02F4PXKQ0EZP5F7B9V3C` is an employee-only
 *   ID and would 404 the user-detail seam), department `dep_identity`,
 *   provider `provider_feishu`, policy `pol_application_manage`,
 *   application `app_workspace` with client `ws_9f3a8b2c1e7d4600`.
 *
 * Session states come from the e2e stub backend: `/account*` needs any valid
 * session (mock data source), `/admin*` needs the full-capability session.
 * The DreamUP surface redirects externally once the gate allows it, so it is
 * probed without following redirects.
 */

const PUBLIC_ROUTES = [
  // "/" is NOT in this list: the frozen landing route issues a server-side
  // 307 to /login (pages/index.vue) and gets its own dedicated test below.
  "/login",
  "/register",
  "/authorize",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy",
  "/terms",
  "/spike",
];

const ACCOUNT_ROUTES = [
  "/account",
  "/account/security",
  "/account/sessions",
  "/account/applications",
  "/account/data-export",
  "/account/delete",
];

const ADMIN_ROUTES = [
  "/admin",
  "/admin/audit",
  "/admin/users",
  "/admin/users/usr_01JUP8M8B4Q7R4T6PK1D",
  "/admin/employees",
  "/admin/employees/link",
  "/admin/employees/usr_02F4PXKQ0EZP5F7B9V3C",
  "/admin/departments",
  "/admin/departments/dep_identity",
  "/admin/providers",
  "/admin/providers/provider_feishu",
  "/admin/policies",
  "/admin/policies/new",
  "/admin/policies/pol_application_manage",
  "/admin/applications",
  "/admin/applications/new",
  "/admin/applications/app_workspace",
  "/admin/applications/app_workspace/clients/ws_9f3a8b2c1e7d4600",
];

const DREAMUP_ROUTES = [
  { route: "/admin/dreamup", redirectPrefix: "https://moonstone.org.cn/dreamup/admin/" },
  { route: "/admin/dreamup/evt_demo_001", redirectPrefix: "https://moonstone.org.cn/dreamup/admin/applications/" },
  {
    route: "/admin/dreamup/evt_demo_001/applications/apl_demo_001",
    redirectPrefix: "https://moonstone.org.cn/dreamup/admin/review/",
  },
];

function pathnamePattern(route: string): RegExp {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}$`);
}

test.describe("38 条路由可达性冒烟基线", () => {
  test.describe("公开路由", () => {
    test("/ 服务端 307 重定向到登录页（无公开落地页）", async ({ page }) => {
      // Frozen behavior: `pages/index.vue` has no public content and issues
      // `navigateTo("/login", { redirectCode: 307 })` during SSR. Observe the
      // first hop with maxRedirects: 0 — `page.goto` would surface the final
      // 200 of the redirect chain and hide the frozen 307 itself.
      const redirect = await page.request.fetch("/", { maxRedirects: 0 });
      expect(redirect.status(), "expected the 307 redirect response").toBe(307);
      expect(redirect.headers()["location"] ?? "").toContain("/login");

      // And a real browser visit lands on the login page.
      await page.goto("/");
      await expect(page).toHaveURL(/\/login$/);
    });

    for (const route of PUBLIC_ROUTES) {
      test(`${route} 可达且停留在原路由`, async ({ page }) => {
        const response = await page.goto(route);
        expect(response?.ok(), `${route} answered ${response?.status()}`).toBe(true);
        await expect(page).toHaveURL(pathnamePattern(route));
      });
    }

    test("/logout 可达并在清除提示后回到登录页", async ({ page }) => {
      const response = await page.goto("/logout");
      expect(response?.ok()).toBe(true);
      await expect(page.getByRole("heading", { name: "正在退出登录" })).toBeVisible();
      await page.waitForURL(/\/login$/, { timeout: 15_000 });
    });
  });

  test.describe("账户中心路由", () => {
    test.beforeEach(async ({ context }) => {
      await installSession(context, E2E_SESSIONS.user);
    });

    for (const route of ACCOUNT_ROUTES) {
      test(`${route} 对已登录用户可达`, async ({ page }) => {
        const response = await page.goto(route);
        expect(response?.ok(), `${route} answered ${response?.status()}`).toBe(true);
        await expect(page).toHaveURL(pathnamePattern(route));
      });
    }
  });

  test.describe("管理后台路由", () => {
    test.beforeEach(async ({ context }) => {
      await installSession(context, E2E_SESSIONS.admin);
    });

    for (const route of ADMIN_ROUTES) {
      test(`${route} 对全量权限会话可达`, async ({ page }) => {
        const response = await page.goto(route);
        expect(response?.ok(), `${route} answered ${response?.status()}`).toBe(true);
        await expect(page).toHaveURL(pathnamePattern(route));
      });
    }
  });

  test.describe("DreamUP 路由", () => {
    test.beforeEach(async ({ context }) => {
      await installSession(context, E2E_SESSIONS.dreamup);
    });

    for (const { route, redirectPrefix } of DREAMUP_ROUTES) {
      test(`${route} 通过门禁后重定向到外部 DreamUP 管理站`, async ({ page }) => {
        const response = await page.request.fetch(route, { maxRedirects: 0 });
        expect(response.status(), `${route} answered ${response.status()}`).toBe(307);
        expect(response.headers()["location"] ?? "").toContain(redirectPrefix);
      });
    }
  });
});
