//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Router query value helper (SPA counterpart of the Nuxt pages' queryValue)
//

/**
 * Extracts the first usable string from a vue-router `route.query` value.
 *
 * vue-router types query values as `LocationQueryValue | LocationQueryValue[]`
 * (i.e. `string | null` or an array thereof). This helper mirrors, branch for
 * branch, the identical `queryValue` helpers currently duplicated across the
 * four Nuxt pages (`pages/login.vue` L24-31, `pages/authorize.vue` L26-33,
 * `pages/register.vue` L22-29, `pages/reset-password.vue` L16-23) so the
 * migrated SPA pages keep the exact same contract:
 *
 * - a non-empty string is returned as-is;
 * - an array returns its FIRST element, but only if that element is a
 *   non-empty string (a leading empty element yields `undefined`; later
 *   elements are never consulted — same as the frozen Nuxt pages);
 * - empty strings, `null`, `undefined` and anything else yield `undefined`.
 */
export function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string" && value !== "") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string" && first !== "") return first;
  }
  return undefined;
}
