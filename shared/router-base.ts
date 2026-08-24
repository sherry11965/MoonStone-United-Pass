//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Dual-stack router base path seam and absolute-path prefixing
//

import { readRouterBaseRaw } from "@/shared/runtime-config-adapter";

/**
 * Normalized application base path for full-document (hard) navigations.
 *
 * Sub-path deployments (GitHub Pages project sites build the SPA with
 * `--base=/MoonStone-United-Pass/`) require every absolute internal target
 * of a `window.location` navigation to carry the base prefix, otherwise the
 * browser leaves the app root and the host answers 404. The raw value comes
 * through the stack-neutral `shared/runtime-config-adapter.ts` seam: the
 * Vite SPA stack bakes `import.meta.env.BASE_URL`, every other stack (Nuxt
 * client/SSR, bare vitest) resolves the constant `/`, so shared modules in
 * the Nuxt bundle keep their exact legacy targets.
 *
 * This is the ONLY sanctioned consumer of `readRouterBaseRaw` (mirrors the
 * `shared/data-source-mode.ts` doctrine for the mock/real switch).
 */
export const ROUTER_BASE: string = normalizeRouterBase(readRouterBaseRaw());

/**
 * Normalizes a raw base path to the canonical absolute-with-trailing-slash
 * form. Anything that is not an absolute path degrades to `/` (root
 * deployment) instead of producing a malformed prefix.
 */
export function normalizeRouterBase(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/**
 * Prefixes the router base onto an absolute internal path for a
 * full-document navigation.
 *
 * Only targets starting with a single `/` are internal app paths and get
 * prefixed. Protocol-relative URLs (`//host/...`) and full URLs
 * (`https://...`, custom schemes) pass through untouched — they are either
 * backend-validated external callbacks or cross-origin resources and must
 * never be rewritten. With the root base `/` the target is returned
 * verbatim, so default builds keep their exact legacy navigation targets.
 * The join strips the base's trailing slash because the target already
 * carries the leading one (no double slash).
 */
export function applyRouterBase(url: string, base: string = ROUTER_BASE): string {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  const normalized = normalizeRouterBase(base);
  if (normalized === "/") return url;
  return `${normalized.slice(0, -1)}${url}`;
}
