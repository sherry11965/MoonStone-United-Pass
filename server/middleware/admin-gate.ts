//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Pre-render administration-console access gate (Nitro server middleware)
//

import {
  defineEventHandler,
  getRequestHeader,
  send,
  sendRedirect,
  setHeader,
  setResponseStatus,
} from "h3";
import { SESSION_COOKIE_NAME } from "@/shared/constants";
import { getAdminAuthorizationSnapshot } from "@/server/utils/admin-authorization";
import {
  getAdminAuthorizationPath,
  isAdminSurfacePathname,
  runAdminGate,
} from "@/features/admin/gate-decision";

/**
 * Vue-migration equivalent of the legacy Next.js `proxy.ts` edge middleware,
 * moved to a Nitro server middleware so it runs before any page rendering
 * begins (there is no Vue route middleware involved at all).
 *
 * Branch behaviour is a 1:1 reproduction of the frozen `proxy.ts`; the
 * decision itself lives in the pure `runAdminGate` core so the whole branch
 * table stays unit-testable. The authorization lookup is memoized on the
 * request event so the dashboard layout reuses it without a second call.
 *
 * Backend handlers remain the authoritative security boundary for every API;
 * this gate only prevents an unauthorized administration page from starting
 * to stream.
 */

const UNAVAILABLE_MESSAGE = "管理后台暂时不可用。";
const DREAMUP_FORBIDDEN_MESSAGE = "你没有 MoonStone DreamUP 活动管理权限。";

/**
 * Reads the `up_session` cookie straight off the middleware event: Nitro
 * server middleware runs outside the unctx request scope, so the shared
 * `getSessionCookie()` (which resolves the event through `useEvent()`) is not
 * available here. Same cookie-parsing contract as server-session.ts.
 */
function readSessionCookie(event: Parameters<typeof getRequestHeader>[0]): string | undefined {
  const raw = getRequestHeader(event, "cookie");
  const cookieHeader = Array.isArray(raw) ? raw.join("; ") : raw;
  if (!cookieHeader) return undefined;

  const prefix = `${SESSION_COOKIE_NAME}=`;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  return match?.slice(prefix.length);
}

export default defineEventHandler(async (event) => {
  const pathname = (event.path ?? "/").split("?")[0];
  if (!isAdminSurfacePathname(pathname)) return;

  const sessionCookie = readSessionCookie(event);
  const decision = await runAdminGate({
    pathname,
    sessionCookie,
    fetchAuthorization: () =>
      getAdminAuthorizationSnapshot(event, getAdminAuthorizationPath(pathname)),
  });

  if (decision.outcome === "allow") return;

  if (decision.outcome === "redirect") {
    // sendRedirect completes the response; returning right after guarantees
    // no further middleware or page rendering runs for this request.
    await sendRedirect(event, decision.location, 307);
    return;
  }

  if (decision.outcome === "forbidden") {
    setResponseStatus(event, 403);
    setHeader(event, "Cache-Control", "no-store");
    return send(event, DREAMUP_FORBIDDEN_MESSAGE, "text/plain; charset=utf-8");
  }

  // Fail closed: any unresolved authorization state yields 503 no-store.
  setResponseStatus(event, 503);
  setHeader(event, "Cache-Control", "no-store");
  return send(event, UNAVAILABLE_MESSAGE, "text/plain; charset=utf-8");
});
