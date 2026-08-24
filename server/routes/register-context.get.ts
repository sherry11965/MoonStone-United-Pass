//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SSR register-page context (public registration flag, ADR-0016)
//

/**
 * Server-side context for the /register page.
 *
 * `publicRegistrationEnabled` is a PRIVATE runtime-config flag, invisible to
 * the client bundle; the page therefore resolves it through this endpoint so
 * the frozen Next.js behavior (server component reads the env switch and
 * renders either the registration panel or the closed card) is preserved.
 */

export type RegisterContextResponse = {
  registrationEnabled: boolean;
};

export default defineEventHandler((): RegisterContextResponse => {
  return {
    registrationEnabled: Boolean(useRuntimeConfig().publicRegistrationEnabled),
  };
});
