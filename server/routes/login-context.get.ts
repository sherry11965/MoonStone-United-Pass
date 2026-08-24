//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SSR login-page context (session destination and public flags)
//

import { getPublicLoginProviders } from "@/server/queries/server-queries";
import { resolveAuthenticatedLoginDestination } from "@/server/utils/login-session";
import { CSRF_COOKIE_NAME } from "@/shared/constants";

/**
 * Server-side context for the /login page.
 *
 * Nuxt pages cannot import Nitro `server/` modules into the app bundle, so the
 * /login page resolves its SSR state through this endpoint with
 * `useRequestFetch` (which forwards the incoming Cookie header on the internal
 * call). The endpoint keeps the migrated `login-session.ts` contract intact:
 *
 * - only an explicit 401 from /me counts as anonymous (`destination: null`);
 * - every other backend failure propagates as a 5xx so the login page can
 *   throw it onto the error page instead of disguising the failure.
 *
 * The response carries only public render inputs: the continuation destination
 * for an already-authenticated visitor, the Feishu entry visibility, and the
 * public registration flag (ADR-0016).
 */

export type LoginContextResponse = {
  destination: string | null;
  feishuLoginEnabled: boolean;
  registrationEnabled: boolean;
  /**
   * Double-submit CSRF token for the no-JavaScript native form POST: the
   * non-HttpOnly `up_csrf` cookie value mirrored into a hidden field so the
   * degraded path can attach it as `X-CSRF-Token` (login.post.ts).
   */
  csrfToken: string;
};

export default defineEventHandler(async (event): Promise<LoginContextResponse> => {
  const query = getQuery(event);
  const requestId = typeof query.requestId === "string" && query.requestId !== ""
    ? query.requestId
    : undefined;

  // Throws on non-401 backend failures → Nitro 5xx → page error surface.
  const destination = await resolveAuthenticatedLoginDestination(requestId);

  const loginProviders = await getPublicLoginProviders();

  const csrfCookie = parseCookies(event)[CSRF_COOKIE_NAME];

  return {
    destination: destination ?? null,
    feishuLoginEnabled: loginProviders.some(
      (provider) => provider.providerId === "provider_feishu" && provider.loginEnabled,
    ),
    registrationEnabled: Boolean(useRuntimeConfig().publicRegistrationEnabled),
    csrfToken: typeof csrfCookie === "string" ? csrfCookie : "",
  };
});
