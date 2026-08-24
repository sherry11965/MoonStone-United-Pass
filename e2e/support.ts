//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Shared e2e helpers (session cookie injection, console error tracking)
//

import type { BrowserContext, Page } from "@playwright/test";

/** Mirrors `SESSION_COOKIE_NAME` in `shared/constants.ts` (e2e never imports product source). */
export const SESSION_COOKIE_NAME = "up_session";

export function e2ePort(): number {
  const port = Number(process.env.UP_E2E_PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("UP_E2E_PORT must be a valid TCP port");
  }
  return port;
}

/**
 * Installs the HttpOnly `up_session` cookie a real backend would have issued
 * after a successful login. The Nuxt stack only ever observes this cookie:
 *
 * - `requireSession()` in `server/utils/server-session.ts` gates `/account/*`;
 * - the Nitro administration gate forwards it to the e2e stub backend
 *   (`e2e/stub-backend.ts`), which derives permissions from its value.
 *
 * Mock mode never creates a real session (see `server/routes/login.post.ts`),
 * so cookie injection is the only product-visible way to establish a
 * signed-in state for the baseline suite.
 */
export async function installSession(context: BrowserContext, cookieValue: string): Promise<void> {
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}

/**
 * Collects browser console errors and uncaught page errors so suites can
 * assert SSR hydration produced no failures (same convention as spike.spec.ts).
 */
export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}
