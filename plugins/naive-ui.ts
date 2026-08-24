//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Naive UI registration + SSR style collection via @css-render/vue3-ssr
//

import { setup } from "@css-render/vue3-ssr";
import naive from "naive-ui";

export default defineNuxtPlugin((nuxtApp) => {
  // Register every Naive UI component globally so pages can use <n-*> tags.
  nuxtApp.vueApp.use(naive);

  // Server-side: collect the css-render styles emitted while rendering the app
  // and inject them into the document head so the first paint is styled.
  if (import.meta.server) {
    const { collect } = setup(nuxtApp.vueApp);
    const collectedStyles = ref("");
    nuxtApp.hooks.hook("app:rendered", () => {
      collectedStyles.value = collect();
    });
    useHead({
      style: computed(() =>
        collectedStyles.value
          ? [{ innerHTML: collectedStyles.value }]
          : [],
      ),
    });
  }
});
