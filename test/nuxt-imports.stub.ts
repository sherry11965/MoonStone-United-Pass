//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Vitest stand-in for the Nuxt virtual `#imports` module
//

/**
 * Bare-vitest replacement for Nuxt's virtual `#imports` module.
 *
 * The migrated framework-agnostic suites run outside a Nuxt request context,
 * exactly as they did in the frozen Next.js frontend. Modules that read
 * `useRuntimeConfig` (shared/constants.ts, shared/data-source-mode.ts) or
 * `useEvent` (server/utils/*) resolve through this alias instead, so
 * their module-load behaviour mirrors the production defaults:
 *
 * - `useRuntimeConfig` reflects the nuxt.config defaults and the same env
 *   overrides (`NUXT_API_BASE_URL`, `NUXT_PUBLIC_USE_MOCK`).
 * - `useEvent` returns `undefined` outside a request, which every
 *   migrated server helper treats as "no session context".
 *
 * Test files that need to observe specific request headers mock `#imports`
 * themselves via `vi.mock("#imports", ...)`.
 */

export function useRuntimeConfig(): {
  apiBaseUrl: string;
  publicRegistrationEnabled: boolean;
  public: { useMock: boolean };
} {
  return {
    apiBaseUrl: process.env.NUXT_API_BASE_URL ?? "http://localhost:8080/api/v1",
    publicRegistrationEnabled: process.env.UP_PUBLIC_REGISTRATION_ENABLED === "true",
    public: {
      useMock: process.env.NUXT_PUBLIC_USE_MOCK === "true",
    },
  };
}

export function useEvent(): undefined {
  return undefined;
}

export function getRequestHeader(_event: unknown, _name: string): string | undefined {
  return undefined;
}

export async function sendRedirect(_event: unknown, _location: string): Promise<void> {
  // No-op outside a Nuxt request context.
}
