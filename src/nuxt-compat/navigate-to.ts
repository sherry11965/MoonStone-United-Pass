//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA-compatible `navigateTo` (Nuxt compat layer, P1 migration)
//

import type { RouteLocationRaw, Router } from "vue-router";
import { applyRouterBase } from "@/shared/router-base";

export type NavigateToOptions = {
  /** Full-document navigation through `window.location`. */
  external?: boolean;
  /**
   * HTTP redirect-code semantics retained from the SSR stack: 301/307/308
   * map to history-replacing navigation, the default (302-equivalent) maps
   * to a regular push.
   */
  redirectCode?: number;
  /** Explicit replace, independent of the redirect code. */
  replace?: boolean;
};

/**
 * SPA drop-in for Nuxt's `navigateTo(to, options)`.
 *
 * - `{ external: true }` performs a full-document navigation through
 *   `window.location.assign` (mirrors the frozen shells' full-document
 *   navigation semantics). Absolute internal targets pass through
 *   `applyRouterBase` (shared/router-base.ts) so sub-path deployments keep
 *   the Pages base prefix; external URLs pass through untouched.
 * - Internal targets go through the app router: `push` by default, `replace`
 *   for `redirectCode` 301/307/308 (the SSR permanent/temporary-preserve
 *   redirects never grow the browser history) or explicit `replace: true`.
 *
 * The router instance is resolved lazily from `@/router` to avoid a static
 * import cycle (the router imports pages/layouts which import this module);
 * the dynamic import is exercised at most once per navigation.
 */
export async function navigateTo(
  to: RouteLocationRaw,
  options: NavigateToOptions = {},
): Promise<void> {
  if (options.external) {
    if (typeof to !== "string") {
      throw new TypeError("navigateTo: external navigation requires a string URL");
    }
    window.location.assign(applyRouterBase(to));
    return;
  }

  const router = await resolveRouter();
  const replace =
    options.replace === true ||
    options.redirectCode === 301 ||
    options.redirectCode === 307 ||
    options.redirectCode === 308;

  if (replace) {
    await router.replace(to);
  } else {
    await router.push(to);
  }
}

async function resolveRouter(): Promise<Router> {
  const { router } = await import("@/src/router");
  return router;
}
