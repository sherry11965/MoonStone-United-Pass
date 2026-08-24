//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Vite configuration for the SPA stack (P1 Nuxt → Vite migration)
//

import path from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

/**
 * Vite-side SPA build.
 *
 * - `@` mirrors the Nuxt srcDir alias (identical to vitest.config.ts L63-70)
 *   so migrated modules resolve the same way in both stacks.
 * - `#imports` resolves to a Vite-specific wrapper (src/nuxt-compat/
 *   nuxt-imports.ts) that reads `import.meta.env.VITE_*` — baked at build
 *   time. The bare-vitest stub (test/nuxt-imports.stub.ts) stays untouched
 *   for the existing unit tests; this alias only applies to the Vite build.
 * - `import.meta.client` / `import.meta.server` reproduce the Nuxt import
 *   meta flags for mechanically copied modules (layouts) — the SPA is
 *   client-only.
 * - `/api/v1` proxies to the Go backend, matching the deployment topology
 *   where the browser talks to a same-origin `/api/v1` prefix.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir),
      "#imports": path.resolve(rootDir, "src/nuxt-compat/nuxt-imports.ts"),
    },
  },
  define: {
    "import.meta.client": "true",
    "import.meta.server": "false",
    // Compile-time SPA stack marker consumed by shared/runtime-config-adapter.ts:
    // only this build defines it, so the adapter can branch on the Vite SPA
    // stack (import.meta.env.VITE_USE_MOCK) without touching Nuxt runtime
    // config paths. Absent as a runtime identifier in every other stack.
    "__UP_SPA_BUILD__": "\"true\"",
  },
  server: {
    proxy: {
      "/api/v1": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist-spa",
  },
});
