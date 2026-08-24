//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Nuxt compat layer barrel — SPA replacements for Nuxt auto-imports
//

export { useAsyncData, type AsyncData, type AsyncDataOptions } from "./use-async-data";
export { navigateTo, type NavigateToOptions } from "./navigate-to";
export {
  useHead,
  resetHeadTitle,
  currentHeadTitle,
  useApplyDocumentTitle,
  documentTitleTemplate,
  type HeadInput,
} from "./use-head";
export {
  createError,
  isCompatError,
  toCompatError,
  type CompatRouteError,
  type CompatRouteErrorInstance,
  type CreateErrorInput,
} from "./create-error";
export { definePageMeta, type PageMeta } from "./define-page-meta";
