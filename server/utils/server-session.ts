//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-05
// Description: Server-side session access helpers
//

// h3 helpers come from `h3` directly, and `useEvent` from `#imports` (the
// Nitro runtime exposes `useEvent`, not `useRequestEvent`, in the server
// type graph). Returns `undefined` outside a request context.
import { getRequestHeader, sendRedirect } from "h3";
import { useEvent } from "#imports";
import { SESSION_COOKIE_NAME } from "@/shared/constants";

/**
 * Server-side session reading.
 *
 * Reads the `up_session` HttpOnly cookie from the incoming SSR request
 * (h3 event) so server-side callers can forward it to the backend API as a
 * Cookie header.
 *
 * See ADR-0004 for the API client architecture.
 * See ADR-0006 for the Cookie naming and deployment topology.
 */

export { SESSION_COOKIE_NAME };

export async function getSessionCookie(): Promise<string | undefined> {
  const event = useEvent();
  if (!event) return undefined;

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

export async function requireSession(): Promise<void> {
  const session = await getSessionCookie();
  if (!session) {
    const event = useEvent();
    if (event) {
      await sendRedirect(event, "/login");
    }
  }
}
