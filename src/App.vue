<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA port of app.vue — Naive UI providers, locales, title template,
              Suspense-based route loading and the route-level error boundary
-->

<script setup lang="ts">
import { computed, onErrorCaptured, provide, shallowRef } from "vue";
import { RouterView } from "vue-router";
import { darkTheme, dateZhCN, zhCN, type GlobalTheme } from "naive-ui";
import { useColorTheme } from "@/src/composables/useColorTheme";
import { useApplyDocumentTitle, toCompatError, type CompatRouteErrorInstance } from "@/src/nuxt-compat";
import { router } from "@/src/router";
import ErrorView from "@/src/components/ErrorView.vue";
import PageLoading from "@/src/components/PageLoading.vue";

// Title template mirrors the frozen root layout metadata (app.vue L19): pages
// that set a title render as "<页面标题> | <系统名>", otherwise the system name
// stands alone. The anti-flash theme bootstrap lives inline in index.html.
useApplyDocumentTitle();

const { colorTheme, setColorTheme } = useColorTheme();

const naiveTheme = computed<GlobalTheme | null>(() =>
  colorTheme.value === "dark" ? darkTheme : null,
);

// Expose the toggle to the layout/page without prop drilling (app.vue L32-33).
provide("setColorTheme", setColorTheme);
provide("colorTheme", colorTheme);

// Route-level error boundary (SPA counterpart of error.vue). A compat error
// thrown from a page (async) setup — e.g. createError({ statusCode: 404 }) —
// or a failed lazy-route chunk load swaps the RouterView for ErrorView.
const fatalError = shallowRef<CompatRouteErrorInstance | null>(null);

onErrorCaptured((error) => {
  fatalError.value = toCompatError(error);
  return false;
});

router.onError((error) => {
  fatalError.value = toCompatError(error);
});

// A successful navigation clears any previously rendered error view. Failed
// navigations keep it: afterEach fires on failures too (failure is non-null).
router.afterEach((_to, _from, failure) => {
  if (!failure) fatalError.value = null;
});
</script>

<template>
  <n-config-provider
    :theme="naiveTheme"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <ErrorView v-if="fatalError" :error="fatalError" />
        <RouterView v-else v-slot="{ Component }">
          <Suspense>
            <component :is="Component" />
            <template #fallback>
              <PageLoading />
            </template>
          </Suspense>
        </RouterView>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
@import "@/assets/global.css";
</style>
