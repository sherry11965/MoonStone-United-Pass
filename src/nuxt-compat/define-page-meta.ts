//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA-compatible `definePageMeta` no-op (Nuxt compat layer, P1 migration)
//

/**
 * Page metadata accepted for signature parity.
 *
 * In the Nuxt stack `definePageMeta` is a compiler macro feeding the
 * file-based router; in the SPA the layout choice is expressed by route
 * nesting in `src/router/routes.ts` and every other field has no runtime
 * counterpart yet.
 */
export type PageMeta = {
  layout?: string | false;
  [key: string]: unknown;
};

/**
 * No-op kept so mechanically migrated pages compile and read unchanged.
 * The meta is intentionally discarded: layouts are expressed through the
 * explicit route hierarchy (P1 decision), and no other consumer exists.
 */
export function definePageMeta(meta?: PageMeta): void {
  void meta;
}
