//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Vite-side stand-in for the Nuxt virtual `#imports` module
//

/**
 * Vite-build replacement for Nuxt's virtual `#imports` module.
 *
 * The P2 step 9 de-`#imports` rework has already landed: `shared/` sources no
 * longer reference `#imports`, and shared/constants.ts no longer reads
 * `useRuntimeConfig` (the freeze was lifted by the follow-up migration task).
 * This wrapper remains as the Vite-side stand-in for the remaining SPA
 * consumers of `useRuntimeConfig`/`useEvent`.
 *
 * Values come from `import.meta.env.VITE_*`, which Vite bakes in at build
 * time — runtime overrides are impossible by design; rebuild to change them
 * (see .env.example). The defaults mirror the nuxt.config.ts runtime-config
 * defaults.
 */

export function useRuntimeConfig(): {
  apiBaseUrl: string;
  publicRegistrationEnabled: boolean;
  public: { useMock: boolean };
} {
  return {
    // The browser always talks to the same-origin `/api/v1` prefix (proxied
    // to the Go backend in dev); the private server-side base URL does not
    // exist in the SPA bundle.
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
    publicRegistrationEnabled: import.meta.env.VITE_PUBLIC_REGISTRATION_ENABLED === "true",
    public: {
      useMock: import.meta.env.VITE_USE_MOCK === "true",
    },
  };
}

/** No request event exists in a browser SPA. */
export function useEvent(): undefined {
  return undefined;
}
