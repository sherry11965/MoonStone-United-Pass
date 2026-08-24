//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Server-only API base URL (moved out of shared/constants.ts in P2)
//

import { useRuntimeConfig } from "#imports";

/**
 * Server-side API base URL (direct to Go backend or reverse proxy).
 *
 * Resolved from the Nuxt private runtime config (`NUXT_API_BASE_URL`,
 * default `http://localhost:8080/api/v1`). Preserves the original constant
 * semantics: a single shared module-level value for all server-side callers.
 *
 * P2 note (Nuxt 3 → Vue 3 + Vite SPA refactor): this value used to live in
 * `shared/constants.ts`, but it is server-only and its `#imports` read may
 * not sit at the top level of a module the Vite SPA bundle loads. It moved
 * here, into a server-only module the SPA never imports (the browser always
 * talks to the same-origin `/api/v1` prefix, `BROWSER_API_BASE_URL`).
 */
export const SERVER_API_BASE_URL: string = readServerApiBaseUrl();

function readServerApiBaseUrl(): string {
  try {
    const apiBaseUrl = useRuntimeConfig().apiBaseUrl;
    if (typeof apiBaseUrl === "string" && apiBaseUrl.length > 0) {
      return apiBaseUrl;
    }
  } catch {
    // Runtime config is unavailable outside an active Nuxt context (e.g. a
    // bare unit-test import); fall through to the documented default.
  }
  return "http://localhost:8080/api/v1";
}
