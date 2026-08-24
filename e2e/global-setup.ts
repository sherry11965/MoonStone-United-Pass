//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: E2E global setup (stub backend startup + webServer readiness + route preheat)
//

import { request, type APIRequestContext } from "@playwright/test";
import { E2E_SESSIONS, SESSION_COOKIE_NAME, startStubBackend } from "./stub-backend";
import { e2ePort } from "./support";

/**
 * Runs once before the whole suite:
 *
 * 1. starts the e2e stub backend (e2e/stub-backend.ts) that answers the
 *    server-side administration authorization lookups; it lives in this
 *    process and is torn down together with the Playwright run;
 * 2. waits until the Nuxt dev webServer answers (Playwright polls the
 *    configured `webServer.url` itself; this is a belt-and-braces guard);
 * 3. preheats every baseline route with the matching session cookie so
 *    `nuxt dev` on-demand compilation happens before the first test runs —
 *    otherwise the first visit of a page pays the compile cost and can blow
 *    the per-test timeout on slow machines.
 *
 * Preheat failures are tolerated: the individual suites still assert the
 * real behavior.
 */

const BASE_URL = `http://localhost:${e2ePort()}`;

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/authorize",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/logout",
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

/** DreamUP routes 307 to the external DreamUP administration site. */
const DREAMUP_ROUTES = [
  "/admin/dreamup",
  "/admin/dreamup/evt_demo_001",
  "/admin/dreamup/evt_demo_001/applications/apl_demo_001",
];

async function waitForWebServer(anonymous: APIRequestContext): Promise<void> {
  const deadline = Date.now() + 180_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await anonymous.fetch("/spike", { timeout: 5_000, maxRedirects: 0 });
      if (response.status() < 500) return;
      lastError = new Error(`webServer answered ${response.status()}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Nuxt webServer never became ready: ${String(lastError)}`);
}

async function preheat(context: APIRequestContext, routes: readonly string[]): Promise<void> {
  await Promise.all(
    routes.map(async (route) => {
      try {
        // maxRedirects: 0 keeps the preheat local — /logout and the DreamUP
        // external redirects must never pull remote hosts into the run.
        await context.fetch(route, { timeout: 60_000, maxRedirects: 0 });
      } catch {
        // Tolerated: the suites assert the real behavior themselves.
      }
    }),
  );
}

async function preheatWithSession(session: string, routes: readonly string[]): Promise<void> {
  const context = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Cookie: `${SESSION_COOKIE_NAME}=${session}` },
  });
  await preheat(context, routes);
  await context.dispose();
}

export default async function globalSetup(): Promise<void> {
  const stub = await startStubBackend();
  // Health probe: fail fast with a clear message when the stub port clashes.
  const probe = await request.newContext();
  const health = await probe.fetch(`http://localhost:${stub.port}/__stub_health`);
  if (!health.ok()) {
    throw new Error(`e2e stub backend unhealthy: HTTP ${health.status()}`);
  }
  await probe.dispose();

  const anonymous = await request.newContext({ baseURL: BASE_URL });
  await waitForWebServer(anonymous);
  await preheat(anonymous, PUBLIC_ROUTES);
  await anonymous.dispose();

  await preheatWithSession(E2E_SESSIONS.user, ACCOUNT_ROUTES);
  await preheatWithSession(E2E_SESSIONS.admin, ADMIN_ROUTES);
  await preheatWithSession(E2E_SESSIONS.dreamup, DREAMUP_ROUTES);
}
