//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Vite SPA ambient type declarations (P1 migration)
//

/// <reference types="vite/client" />

// Single-file-component modules as seen from plain TypeScript files.
declare module "*.vue" {
  import type { DefineComponent } from "vue";

  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    unknown
  >;
  export default component;
}

// Nuxt's import-meta flags, reproduced by vite.config.ts `define` for the
// mechanically copied modules (the SPA is client-only).
interface ImportMeta {
  readonly client: boolean;
  readonly server: boolean;
}

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_PUBLIC_REGISTRATION_ENABLED?: string;
  readonly VITE_API_BASE_URL?: string;
}
