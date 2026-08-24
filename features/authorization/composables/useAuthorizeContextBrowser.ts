//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Browser-side authorize-page context (consent resolution + identity) for the SPA stack
//

import type { ConsentResolution } from "@/features/authorization/types";
import type { CurrentUser } from "@/shared/types/identity";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { browserQueries } from "@/shared/queries/browser-queries";
import { createError } from "@/src/nuxt-compat";

/**
 * Frozen mock-only fallback request ID (mirrors
 * server/routes/authorize-context.get.ts L39): real mode never substitutes
 * an ID, the fallback exists exclusively for the mock data source.
 */
const MOCK_FALLBACK_REQUEST_ID = "consent_demo_001";

export type AuthorizeContextBrowserData = {
  /**
   * Whether the consent request should resolve at all. `false` renders the
   * MissingRequestIdCard and never touches the data source (real mode with
   * no caller-supplied requestId).
   */
  shouldResolve: boolean;
  resolution: ConsentResolution | null;
  currentUser: CurrentUser | null;
};

/**
 * Browser-side counterpart of `server/routes/authorize-context.get.ts` for
 * the migrated SPA `/authorize` page.
 *
 * Branch-for-branch replication of the endpoint contract:
 *
 * - `shouldResolve = requestId !== undefined || USE_MOCK_DATA_SOURCE`
 *   (pages/authorize.vue L42) — real mode without a caller-supplied
 *   requestId renders the MissingRequestIdCard page-side without ever
 *   reading the data source;
 * - the mock-only `consent_demo_001` fallback substitutes an absent
 *   requestId (endpoint L39);
 * - the current identity is fetched ONLY for a `valid` resolution (endpoint
 *   L46-48) — non-valid state cards never trigger a /me read;
 * - any backend failure is wrapped in `createError` and thrown onto the app
 *   error boundary (pages/authorize.vue L53-59) — the context never guesses
 *   request IDs and never accepts raw returnTo URLs.
 */
export async function useAuthorizeContextBrowser(
  requestId?: string,
): Promise<AuthorizeContextBrowserData> {
  const shouldResolve = requestId !== undefined || USE_MOCK_DATA_SOURCE;
  if (!shouldResolve) {
    return { shouldResolve: false, resolution: null, currentUser: null };
  }

  // Reached with an undefined requestId only in mock mode, where the frozen
  // fallback applies; real mode arrives here exclusively with a caller ID.
  const effectiveRequestId = requestId ?? MOCK_FALLBACK_REQUEST_ID;

  try {
    const resolution = await browserQueries.getConsentResolution(effectiveRequestId);
    const currentUser =
      resolution.status === "valid" ? await browserQueries.getCurrentUser() : null;
    return { shouldResolve: true, resolution, currentUser: currentUser ?? null };
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to resolve the authorization request",
      fatal: true,
    });
  }
}
