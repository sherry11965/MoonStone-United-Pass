//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA-compatible `useHead` title management (Nuxt compat layer, P1 migration)
//

import { ref, toValue, watchEffect, type MaybeRefOrGetter } from "vue";
import { SYSTEM_NAME } from "@/shared/branding";

/**
 * The frozen title template (app.vue L19): a page that sets a title renders
 * as "<页面标题> | <系统名>", otherwise the system name stands alone.
 */
export function documentTitleTemplate(
  title: string | null | undefined,
): string {
  return title ? `${title} | ${SYSTEM_NAME}` : SYSTEM_NAME;
}

/**
 * Module-level page-title override. Pages write into it through `useHead`;
 * the single app-level writer (`useApplyDocumentTitle`, mounted once in
 * `src/App.vue`) mirrors it onto `document.title`.
 */
const pageTitle = ref<string | undefined>(undefined);

export type HeadInput = {
  title?: MaybeRefOrGetter<string | null | undefined>;
};

/**
 * SPA drop-in for Nuxt's `useHead({ title })`.
 *
 * Only the `title` field is supported in P1 — it is the only field the four
 * migrated routes use. The auth layout's font `<link>` entries are appended to
 * the DOM directly by `src/layouts/auth.vue` (TODO(P2): generic link/meta
 * support if migrated pages need it).
 *
 * The watcher is instance-scoped, so it stops when the calling component
 * unmounts; `resetHeadTitle()` clears the override on every route change so a
 * title-less page never inherits its predecessor's title.
 */
export function useHead(input: HeadInput = {}): void {
  if (input.title === undefined) return;
  watchEffect(() => {
    pageTitle.value = toValue(input.title) ?? undefined;
  });
}

/** Clears the page-title override (called by the router beforeEach hook). */
export function resetHeadTitle(): void {
  pageTitle.value = undefined;
}

/** Current override, exposed for tests and diagnostics. */
export function currentHeadTitle(): string | undefined {
  return pageTitle.value;
}

/**
 * App-level writer: installs once in `src/App.vue` and keeps `document.title`
 * in sync with the template-applied page title.
 */
export function useApplyDocumentTitle(): void {
  watchEffect(() => {
    if (typeof document === "undefined") return;
    document.title = documentTitleTemplate(pageTitle.value);
  });
}
