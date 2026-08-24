//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-07
// Description: Centralized mock/real data source switch flag
//

import { readUseMockDataSourceRaw } from "@/shared/runtime-config-adapter";

/**
 * Data source switch for the per-seam mock → real HTTP migration
 * (frontend-freeze-v1.md §5, ADR-0004).
 *
 * `NUXT_PUBLIC_USE_MOCK=true` (Nuxt stack) or `VITE_USE_MOCK=true` (Vite SPA
 * stack, baked at build time) keeps every seam on the mock data source.
 * Any other value routes the already-migrated seams through the real HTTP
 * clients; seams without a backend implementation stay on the mock source.
 *
 * This is the ONLY sanctioned place to read the data source selection
 * (AGENTS.md §18). The raw value is sourced through the stack-neutral
 * `shared/runtime-config-adapter.ts` seam (Nuxt runtime config on the Nuxt
 * stack, `import.meta.env.VITE_USE_MOCK` on the Vite SPA stack), so this
 * module no longer depends on the Nuxt `#imports` virtual module. There is
 * deliberately no silent fallback: only the exact value `true` enables the
 * mock source, exactly mirroring the legacy
 * `process.env.NEXT_PUBLIC_USE_MOCK === "true"` contract.
 */
export const USE_MOCK_DATA_SOURCE: boolean = resolveUseMockDataSource();

function resolveUseMockDataSource(): boolean {
  const raw = readUseMockDataSourceRaw();
  // The runtime config value is typed as a boolean from the nuxt.config
  // default, but an env override (`NUXT_PUBLIC_USE_MOCK` /
  // `VITE_USE_MOCK`) may arrive as a string at runtime. `String(...)`
  // normalises both representations with the exact legacy `=== "true"`
  // semantics: only the literal "true" enables mock.
  return String(raw) === "true";
}
