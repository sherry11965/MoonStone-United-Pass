//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-14
// Description: Server-side login-page session resolution
//

import { isApiError } from "@/shared/api-error";
import { serverQueries } from "@/server/queries/server-queries";
import { getSessionCookie } from "@/server/utils/server-session";

/**
 * Resolves where an already-authenticated visitor to /login should continue.
 *
 * Cookie presence alone is not proof of authentication: the opaque session may
 * have expired or been revoked in Redis. Confirm it through /me before
 * redirecting, and treat only an explicit 401 as an anonymous session. Other
 * backend failures remain visible instead of being disguised as a login page.
 */
export async function resolveAuthenticatedLoginDestination(
  requestId?: string,
): Promise<string | undefined> {
  const sessionCookie = await getSessionCookie();
  if (!sessionCookie) return undefined;

  try {
    await serverQueries.getCurrentUser();
  } catch (error) {
    if (isApiError(error) && error.kind === "unauthorized") {
      return undefined;
    }
    throw error;
  }

  if (requestId) {
    return `/authorize?requestId=${encodeURIComponent(requestId)}`;
  }
  return "/account";
}
