//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Pure administration-gate decision logic (1:1 port of legacy proxy.ts branches)
//

import {
  canAccessAdminConsole,
  isPermissionCapabilities,
} from "@/shared/types/permissions";
import { parseDreamUPEvents } from "@/features/dreamup-admin/api/response-validators";
import { hasDreamUPAdministrationAccess } from "@/features/dreamup-admin/permissions";

/**
 * Pure decision core of the pre-render administration gate.
 *
 * The legacy Next.js `proxy.ts` middleware is reproduced branch-for-branch
 * and in the exact same order here, split from the HTTP transport so every
 * branch can be tested without a live server:
 *
 * 1. no session cookie            → 307 /login (before any permission fetch)
 * 2. authorization fetch fails    → 503 unavailable (fail closed)
 * 3. authorization returns 401    → 307 /login
 * 4. DreamUP surface 403/404      → 403 forbidden (plain text, no-store)
 * 5. any other non-2xx            → 503 unavailable (fail closed)
 * 6. response body not parseable  → 503 unavailable (fail closed)
 * 7. DreamUP: parse events + administration access check (parse error → 503)
 * 8. non-DreamUP: capability shape validation (invalid → 503)
 * 9. no administration capability → 307 /account
 * 10. otherwise                   → allow (page rendering proceeds)
 *
 * Backend handlers remain the authoritative security boundary for every API;
 * this gate only prevents an unauthorized page from starting to render.
 */

/** Frozen legacy matcher `["/admin/:path*"]` semantics. */
export function isAdminSurfacePathname(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Frozen legacy DreamUP detection (`/admin/dreamup` or `/admin/dreamup/…`). */
export function isDreamUPAdministrationPathname(pathname: string): boolean {
  return pathname === "/admin/dreamup" || pathname.startsWith("/admin/dreamup/");
}

/** Frozen legacy authorization path selection. */
export function getAdminAuthorizationPath(pathname: string): string {
  return isDreamUPAdministrationPathname(pathname)
    ? "/admin/dreamup/events"
    : "/me/permissions";
}

/**
 * Outcome of a single authorization lookup, independent of transport.
 * `fetch_failed` mirrors the legacy `catch` around the fetch call;
 * `body_parse_failed` mirrors the legacy `catch` around `response.json()`.
 */
export type AdminAuthorizationSnapshot =
  | { kind: "fetch_failed" }
  | { kind: "body_parse_failed"; status: number }
  | { kind: "response"; status: number; body: unknown };

export type AdminGateDecision =
  | { outcome: "allow" }
  | { outcome: "redirect"; location: "/login" | "/account" }
  | { outcome: "unavailable" }
  | { outcome: "forbidden" };

/**
 * Decides the gate outcome for a resolved authorization snapshot.
 * Branch order matches the legacy `proxy` function exactly.
 */
export function decideAdminGateOutcome(
  pathname: string,
  snapshot: AdminAuthorizationSnapshot,
): AdminGateDecision {
  const isDreamUPAdministration = isDreamUPAdministrationPathname(pathname);

  if (snapshot.kind === "fetch_failed") {
    return { outcome: "unavailable" };
  }

  if (snapshot.status === 401) {
    return { outcome: "redirect", location: "/login" };
  }
  if (isDreamUPAdministration && (snapshot.status === 403 || snapshot.status === 404)) {
    return { outcome: "forbidden" };
  }
  if (snapshot.status < 200 || snapshot.status >= 300) {
    return { outcome: "unavailable" };
  }

  if (snapshot.kind === "body_parse_failed") {
    return { outcome: "unavailable" };
  }

  if (isDreamUPAdministration) {
    try {
      return hasDreamUPAdministrationAccess(parseDreamUPEvents(snapshot.body))
        ? { outcome: "allow" }
        : { outcome: "forbidden" };
    } catch {
      return { outcome: "unavailable" };
    }
  }

  const permissions = snapshot.body;
  if (!isPermissionCapabilities(permissions)) {
    return { outcome: "unavailable" };
  }
  if (!canAccessAdminConsole(permissions)) {
    return { outcome: "redirect", location: "/account" };
  }

  return { outcome: "allow" };
}

/**
 * Full gate flow with the authorization lookup injected, so tests can assert
 * timing (e.g. no fetch happens for a sessionless request). Mirrors the
 * legacy ordering: session check → fetch → status/body decisions.
 */
export async function runAdminGate(input: {
  pathname: string;
  sessionCookie: string | undefined;
  fetchAuthorization: () => Promise<AdminAuthorizationSnapshot>;
}): Promise<AdminGateDecision> {
  if (!input.sessionCookie) {
    return { outcome: "redirect", location: "/login" };
  }
  const snapshot = await input.fetchAuthorization();
  return decideAdminGateOutcome(input.pathname, snapshot);
}
