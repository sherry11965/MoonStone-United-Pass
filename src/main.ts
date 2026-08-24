//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA entry — app factory, router, Naive UI global registration
//

import { createApp } from "vue";
import { RouterLink } from "vue-router";
import naive from "naive-ui";
import App from "./App.vue";
import { router } from "./router";
import BrandMark from "./components/BrandMark.vue";
import ThemeToggle from "./components/ThemeToggle.vue";
import PageLoading from "./components/PageLoading.vue";

const app = createApp(App);

app.use(router);

// Global Naive UI registration (semantics moved from plugins/naive-ui.ts L14;
// the @css-render/vue3-ssr style collection is SSR-only and dropped in the SPA).
app.use(naive);

// Nuxt auto-import stand-ins: templates keep their original component names.
app.component("NuxtLink", RouterLink);
app.component("BrandMark", BrandMark);
app.component("ThemeToggle", ThemeToggle);
app.component("PageLoading", PageLoading);

router.isReady().then(() => {
  app.mount("#app");
});
