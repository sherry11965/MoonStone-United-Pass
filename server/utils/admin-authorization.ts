//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Request-scoped administration authorization lookup (gate/layout shared memo)
//

import type { H3Event } from "h3";
// `getRequestHeader` comes from `h3` directly: `#imports` in the Nuxt app
// bundle only exposes Nuxt composables.
import { getRequestHeader } from "h3";
import { SESSION_COOKIE_NAME } from "@/shared/constants";
import { SERVER_API_BASE_URL } from "@/server/utils/server-api-base";
import type { AdminAuthorizationSnapshot } from "@/features/admin/gate-decision";

/**
 * Per-request authorization memo shared by the Nitro admin gate middleware
 * and the dashboard layout.
 *
 * The snapshot promise is stored on the h3 `event.context`, which lives and
 * dies with a single HTTP request — there is deliberately NO module-level or
 * cross-request cache, so a permission revocation takes effect on the very
 * next request. Within one request, the gate's pre-render check and the
 * layout's navigation read observe the exact same lookup result instead of
 * issuing duplicate `/me/permissions` calls (legacy layout issued three
 * concurrent requests per render).
 */

const MEMO_CONTEXT_PREFIX = "__upAdminAuthorization:";

function incomingHeader(event: H3Event, name: string): string | undefined {
  const raw = getRequestHeader(event, name);
  return Array.isArray(raw) ? raw.join("; ") : raw;
}

function readCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${name}=`;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  return match?.slice(prefix.length);
}

async function fetchAuthorizationSnapshot(
  event: H3Event,
  authorizationPath: string,
): Promise<AdminAuthorizationSnapshot> {
  // Frozen legacy proxy header contract: forward exactly the session cookie
  // and, when present, the incoming X-Request-ID; never cache the lookup.
  const headers: Record<string, string> = {};
  const sessionCookieValue = readCookieValue(incomingHeader(event, "cookie"), SESSION_COOKIE_NAME);
  if (sessionCookieValue !== undefined) {
    headers["Cookie"] = `${SESSION_COOKIE_NAME}=${sessionCookieValue}`;
  }
  const requestId = incomingHeader(event, "x-request-id");
  if (requestId) {
    headers["X-Request-ID"] = requestId;
  }

  let response: Response;
  try {
    response = await fetch(`${SERVER_API_BASE_URL}${authorizationPath}`, {
      headers,
      cache: "no-store",
    });
  } catch {
    return { kind: "fetch_failed" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { kind: "body_parse_failed", status: response.status };
  }

  return { kind: "response", status: response.status, body };
}

/**
 * Resolves the authorization snapshot for `authorizationPath`, fetching at
 * most once per request. The gate middleware calls it with the path derived
 * from the request pathname; the dashboard layout calls it with
 * `/me/permissions` and `/admin/dreamup/events` and reuses whatever the gate
 * already resolved for the current pathname.
 */
export function getAdminAuthorizationSnapshot(
  event: H3Event,
  authorizationPath: string,
): Promise<AdminAuthorizationSnapshot> {
  const context = event.context as Record<string, unknown>;
  const memoKey = `${MEMO_CONTEXT_PREFIX}${authorizationPath}`;
  const existing = context[memoKey];
  if (existing instanceof Promise) {
    return existing;
  }
  const pending = fetchAuthorizationSnapshot(event, authorizationPath);
  context[memoKey] = pending;
  return pending;
}
