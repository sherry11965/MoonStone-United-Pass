//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-05
// Description: API route constants
//

/**
 * Shared API constants for Cookie names, CSRF header, and API base URL.
 *
 * Framework-neutral on purpose: this module is imported by BOTH the Nuxt
 * stack and the Vite SPA bundle, so it must not depend on the Nuxt
 * `#imports` virtual module. The server-only API base URL lives in
 * `server/utils/server-api-base.ts`.
 *
 * See ADR-0006 for the full deployment topology decision.
 */

/** HttpOnly session cookie — set by the backend, not readable by JS. */
export const SESSION_COOKIE_NAME = "up_session";

/** Non-HttpOnly CSRF cookie — readable by JS, sent as X-CSRF-Token on writes. */
export const CSRF_COOKIE_NAME = "up_csrf";

/** Request header name for the CSRF token on write operations. */
export const CSRF_HEADER_NAME = "X-CSRF-Token";

/** Browser-side API base URL (same-origin via reverse proxy). */
export const BROWSER_API_BASE_URL = "/api/v1";
