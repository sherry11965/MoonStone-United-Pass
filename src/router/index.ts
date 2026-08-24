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
  history: createWebHistory(),
  routes: appRoutes,
});

// Per-page title overrides must not leak across route changes: a title-less
// destination falls back to the bare system name (app.vue L19 template).
router.beforeEach(() => {
  resetHeadTitle();
});
