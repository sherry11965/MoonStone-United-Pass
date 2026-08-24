//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Dual-stack runtime configuration read seam (Nuxt <-> Vite SPA)
//

/**
 * Stack-neutral configuration seam backing `shared/data-source-mode.ts`.
 *
 * During the dual-stack period (Nuxt SSR app and Vite SPA sharing `shared/`)
 * this module replaces the old `#imports` / `useRuntimeConfig` reads so no
 * shared module imported by the Vite bundle carries a top-level `#imports`
 * dependency (P2 step of the Nuxt 3 → Vue 3 + Vite SPA refactor).
 *
 * Resolution order for the mock/real data-source selection:
 *
 * 1. Vite SPA stack — detected through the `__UP_SPA_BUILD__` compile-time
 *    constant that ONLY `vite.config.ts` injects via `define`. The value is
 *    baked at build time from `import.meta.env.VITE_USE_MOCK` (see
 *    `.env.example`); runtime overrides are impossible by design.
 * 2. Nuxt client — reads the payload-serialized public runtime config
 *    (`window.__NUXT__.config.public.useMock`), which is exactly the source
 *    `useRuntimeConfig().public.useMock` resolves from on the client, so the
 *    legacy `NUXT_PUBLIC_USE_MOCK` build-time baking is preserved.
 * 3. Nitro server and bare vitest — reads `process.env.NUXT_PUBLIC_USE_MOCK`
 *    with the nuxt.config.ts default (`false`), mirroring the documented
 *    semantics of `test/nuxt-imports.stub.ts`.
 *
 * This module only surfaces the RAW value; the exact legacy
 * `String(raw) === "true"` contract (no silent fallback) is enforced by the
 * sole sanctioned consumer, `shared/data-source-mode.ts` (AGENTS.md §18).
 */

// Compile-time marker injected only by the Vite SPA build
// (`define` in vite.config.ts). It is deliberately NOT a declared runtime
// identifier in any other stack (Nuxt client, Nitro, bare vitest), so the
// `typeof` guard below is mandatory.
declare const __UP_SPA_BUILD__: string | undefined;

type NuxtClientPayload = {
  config?: { public?: { useMock?: unknown } };
};

function inViteSpaStack(): boolean {
  return typeof __UP_SPA_BUILD__ !== "undefined" && __UP_SPA_BUILD__ === "true";
}

/**
 * Reads the raw mock/real data-source selection for the current stack.
 *
 * Returns `unknown` on purpose: the value may be a boolean (typed runtime
 * config default) or a string (env override), and the caller applies the
 * frozen `String(raw) === "true"` normalization.
 */
export function readUseMockDataSourceRaw(): unknown {
  if (inViteSpaStack()) {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    return env?.VITE_USE_MOCK;
  }

  if (typeof window !== "undefined") {
    const payload = (window as Window & { __NUXT__?: NuxtClientPayload }).__NUXT__;
    const useMock = payload?.config?.public?.useMock;
    if (useMock !== undefined) return useMock;
  }

  if (
    typeof process !== "undefined" &&
    typeof process.env?.NUXT_PUBLIC_USE_MOCK === "string"
  ) {
    return process.env.NUXT_PUBLIC_USE_MOCK;
  }

  // nuxt.config.ts runtimeConfig.public.useMock default.
  return false;
}
