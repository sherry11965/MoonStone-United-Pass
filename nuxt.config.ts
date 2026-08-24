//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Nuxt application configuration
//

// https://nuxt.com/docs/api/configuration/nuxt-config
const config = {
  compatibilityDate: "2026-08-01",
  devtools: { enabled: false },

  typescript: {
    strict: true,
  },

  // The server seams read the request event after `await` (api-fetch and
  // server-session call `useEvent()` from async helpers invoked by handlers).
  // Nitro only keeps the request context across awaits when the experimental
  // async-context flag is on; without it every cookie/session-backed route
  // 500s with "Nitro request context is not available".
  experimental: {
    asyncContext: true,
  },

  // The shared server helpers (server/utils/api-fetch, server-session) enter
  // BOTH bundles: pages dynamically import server queries (app bundle) while
  // nitro handlers/middleware import them directly (nitro bundle). The Nitro
  // `#imports` exposes `useEvent` and the app-side `#imports` exposes
  // `useRequestEvent`, and neither side provides the other's symbol. Alias
  // the app-side `useRequestEvent` as `useEvent` so the shared files can use
  // one name in both bundles; Nitro provides `useEvent` natively. Both
  // resolve to the same "current request event, or undefined outside a
  // request" semantics, so behaviour is unchanged.
  imports: {
    imports: [
      { name: "useRequestEvent", as: "useEvent", from: "nuxt/app" },
    ],
  },

  // Environment switches (frontend-freeze-v1.md §5, ADR-0004, ADR-0006).
  //
  // - `apiBaseUrl` (private): server-side Go backend base URL. Overridden at
  //   runtime by `NUXT_API_BASE_URL`; defaults to the local topology.
  // - `publicRegistrationEnabled` (private): driven by the bespoke
  //   `UP_PUBLIC_REGISTRATION_ENABLED` flag (ADR-0016).
  // - `public.useMock`: the single mock/real data-source switch, overridden by
  //   `NUXT_PUBLIC_USE_MOCK`. It must ONLY be read through
  //   `shared/data-source-mode.ts`, which preserves the legacy
  //   `=== "true"` semantics with no silent fallback.
  runtimeConfig: {
    apiBaseUrl: process.env.NUXT_API_BASE_URL ?? "http://localhost:8080/api/v1",
    publicRegistrationEnabled: process.env.UP_PUBLIC_REGISTRATION_ENABLED === "true",
    public: {
      useMock: process.env.NUXT_PUBLIC_USE_MOCK === "true",
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "zh-CN" },
      title: "United Pass",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },

  // Legal documents are immutable per published version; serve them with a
  // 300s stale-while-revalidate cache. The installed @nuxt/schema 3.21.11
  // type surface omits `routeRules`/`nitro` (they are merged into
  // `nitro.routeRules` at runtime), so the object is asserted below.
  routeRules: {
    "/privacy": { swr: 300 },
    "/terms": { swr: 300 },
  },
};

export default defineNuxtConfig(config as Parameters<typeof defineNuxtConfig>[0]);
