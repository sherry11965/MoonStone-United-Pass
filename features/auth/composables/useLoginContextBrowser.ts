//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Browser-side login-page context (session destination + public flags) for the SPA stack
//

import type { PublicLoginProvider } from "@/shared/response-validators";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { isApiError } from "@/shared/api-error";
import { browserQueries, getPublicLoginProviders } from "@/shared/queries/browser-queries";
import { loginDestination } from "@/features/auth/auth-navigation";
import { createError } from "@/src/nuxt-compat";

export type LoginContextBrowserData = {
  /** Where an already-authenticated visitor should continue (null = anonymous). */
  destination: string | null;
  /** Whether the Feishu entry is visible on the credential panel. */
  feishuLoginEnabled: boolean;
  /** Public registration flag (ADR-0016), baked as a VITE build-time variable. */
  registrationEnabled: boolean;
};

/**
 * Browser-side counterpart of `server/routes/login-context.get.ts` for the
 * migrated SPA `/login` page.
 *
 * Session-check semantics are copied verbatim from
 * `server/utils/login-session.ts`: the destination is confirmed through
 * `getCurrentUser()` (GET /me) and ONLY an explicit 401
 * (`kind === "unauthorized"`) counts as an anonymous session — every other
 * backend failure is wrapped in `createError` and thrown onto the app error
 * boundary instead of being disguised as a logged-out login page.
 *
 * MOCK MODE SKIPS DESTINATION RESOLUTION (deliberate contract parity):
 * the Nuxt contract checks the `up_session` cookie BEFORE calling /me
 * (`server/utils/login-session.ts` L24-25) and the mock e2e host never
 * issues that cookie, so the faithful mock outcome is "anonymous". Skipping
 * the /me read keeps the frozen `auth.spec.ts` homepage baseline green
 * (stay on /login, zero console errors — the mock source always returns a
 * user, which a naive resolution would misread as authenticated and
 * navigate away). Providers and the registration flag still resolve
 * normally.
 *
 * CSRF needs no dedicated field in the SPA: `browser-http-client.ts`
 * attaches the `up_csrf` double-submit header automatically on every write
 * request. The hidden-field variant exists exclusively for the Nuxt stack's
 * no-JavaScript native form POST.
 */
export async function useLoginContextBrowser(
  resumeRequestId?: string,
): Promise<LoginContextBrowserData> {
  // Build-time baked public flag (SPA counterpart of the runtime-config value
  // read by login-context.get.ts; see the src/pages/register.vue note).
  const registrationEnabled = import.meta.env.VITE_PUBLIC_REGISTRATION_ENABLED === "true";

  if (USE_MOCK_DATA_SOURCE) {
    const providers = await getPublicLoginProviders();
    return {
      destination: null,
      feishuLoginEnabled: hasFeishuLoginEnabled(providers),
      registrationEnabled,
    };
  }

  try {
    const [destination, providers] = await Promise.all([
      resolveAuthenticatedLoginDestinationBrowser(resumeRequestId),
      getPublicLoginProviders(),
    ]);

    return {
      destination,
      feishuLoginEnabled: hasFeishuLoginEnabled(providers),
      registrationEnabled,
    };
  } catch {
    // Mirrors pages/login.vue L50-56: any non-401 backend failure surfaces
    // on the error page instead of being disguised as a login form.
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to resolve the login session",
      fatal: true,
    });
  }
}

/**
 * Browser port of `resolveAuthenticatedLoginDestination`
 * (server/utils/login-session.ts L21-40): cookie presence is not proof of
 * authentication — confirm the session through /me, treat only an explicit
 * 401 as anonymous, rethrow every other failure for the caller's
 * createError wrapping. Destination computation reuses the frozen
 * `loginDestination` helper (features/auth/auth-navigation.ts L29-34).
 */
async function resolveAuthenticatedLoginDestinationBrowser(
  resumeRequestId?: string,
): Promise<string | null> {
  try {
    await browserQueries.getCurrentUser();
  } catch (error) {
    if (isApiError(error) && error.kind === "unauthorized") return null;
    throw error;
  }
  return loginDestination(resumeRequestId);
}

/** Mirrors login-context.get.ts L57-59. */
function hasFeishuLoginEnabled(providers: PublicLoginProvider[]): boolean {
  return providers.some(
    (provider) => provider.providerId === "provider_feishu" && provider.loginEnabled,
  );
}
