//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA router instance (P1 migration)
//

import { createRouter, createWebHistory } from "vue-router";
import { resetHeadTitle } from "@/src/nuxt-compat/use-head";
import { appRoutes } from "./routes";

export const router = createRouter({
  // `import.meta.env.BASE_URL` mirrors the Vite `base` option: it is `/` for
  // every local/dev/default build (identical to the previous bare
  // `createWebHistory()` semantics) and only differs when the SPA is built
  // with an explicit `--base` for a sub-path deployment (e.g. GitHub Pages
  // project sites), where a root-pinned history would never match.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
});

// Per-page title overrides must not leak across route changes: a title-less
// destination falls back to the bare system name (app.vue L19 template).
router.beforeEach(() => {
  resetHeadTitle();
});
