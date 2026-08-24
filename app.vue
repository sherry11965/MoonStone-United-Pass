<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Application shell — Naive UI providers, locales, title template and route loading state
-->

<script setup lang="ts">
import { darkTheme, dateZhCN, zhCN, type GlobalTheme } from "naive-ui";
import { SYSTEM_NAME } from "@/shared/branding";
import { THEME_INITIALIZATION_SCRIPT } from "@/shared/theme";

// Anti-flash theme bootstrap: runs inline before first paint (SSR + client).
// Title template mirrors the frozen root layout metadata: pages that set a
// title render as "<页面标题> | <系统名>", otherwise the system name stands alone.
useHead({
  script: [{ innerHTML: THEME_INITIALIZATION_SCRIPT }],
  titleTemplate: (title) => (title ? `${title} | ${SYSTEM_NAME}` : SYSTEM_NAME),
});

const { colorTheme, setColorTheme } = useColorTheme();

const naiveTheme = computed<GlobalTheme | null>(() =>
  colorTheme.value === "dark" ? darkTheme : null,
);

// Root-level route transition loading state (legacy `src/app/loading.tsx`).
const { isLoading: routeTransitioning } = useLoadingIndicator();

// Expose the toggle to the layout/page without prop drilling.
provide("setColorTheme", setColorTheme);
provide("colorTheme", colorTheme);
</script>

<template>
  <n-config-provider
    :theme="naiveTheme"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <n-message-provider>
      <n-dialog-provider>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
        <PageLoading v-if="routeTransitioning" />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
@import "@/assets/global.css";
</style>
