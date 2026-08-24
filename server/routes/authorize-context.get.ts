//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SSR authorize-page context (consent resolution and identity)
//

import { serverQueries } from "@/server/queries/server-queries";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import type { ConsentResolution } from "@/features/authorization/types";
import type { CurrentUser } from "@/shared/types/identity";

/**
 * Server-side context for the /authorize page.
 *
 * Mirrors the frozen Next.js server component (`(auth)/authorize/page.tsx`):
 * the opaque caller-supplied requestId is resolved server-side with the
 * session cookie forwarded, and the current identity is fetched only for a
 * `valid` resolution. Any backend failure propagates as a 5xx so the page can
 * surface it on the error page — the endpoint never guesses request IDs and
 * never accepts raw returnTo URLs.
 *
 * The `consent_demo_001` fallback exists exclusively for the frozen mock
 * source, exactly as in the legacy page.
 */

export type AuthorizeContextResponse = {
  resolution: ConsentResolution;
  currentUser: CurrentUser | null;
};

export default defineEventHandler(async (event): Promise<AuthorizeContextResponse> => {
  const query = getQuery(event);
  const requestId = typeof query.requestId === "string" ? query.requestId : "";

  // Real mode renders MissingRequestIdCard page-side before ever calling this
  // endpoint; the fallback ID is a frozen mock-only behavior.
  const effectiveRequestId = requestId || (USE_MOCK_DATA_SOURCE ? "consent_demo_001" : "");
  if (effectiveRequestId === "") {
    throw createError({ statusCode: 400, statusMessage: "Missing requestId" });
  }

  const resolution = await serverQueries.getConsentResolution(effectiveRequestId);

  const currentUser = resolution.status === "valid"
    ? await serverQueries.getCurrentUser()
    : null;

  return { resolution, currentUser: currentUser ?? null };
});
