<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA port of error.vue — route-level error boundary view (P1 migration)
-->

<script setup lang="ts">
import { computed } from "vue";
import { SYSTEM_NAME } from "@/shared/branding";
import { useHead, type CompatRouteErrorInstance } from "@/src/nuxt-compat";

// SPA counterpart of the frozen `error.vue`: the app-level error boundary
// (src/App.vue) swaps the RouterView for this view whenever a page throws a
// compat error (createError) during (async) setup or a navigation fails.
const props = defineProps<{ error: CompatRouteErrorInstance }>();

const isNotFound = computed(() => props.error.statusCode === 404);

useHead({
  title: computed(() => (isNotFound.value ? "找不到这个页面" : "页面暂时无法加载")),
});

function reload(): void {
  // Retry the current URL (legacy `clearError({ redirect })` behaviour): a
  // full-document reload re-resolves the lazy route component from scratch.
  window.location.assign(window.location.pathname + window.location.search);
}
</script>

<template>
  <main class="state">
    <section v-if="isNotFound" class="card">
      <div class="mark" aria-hidden="true">
        404
      </div>
      <h1>找不到这个页面</h1>
      <p>页面可能已移动，或者你没有可用的访问入口。</p>
      <NuxtLink class="action" to="/account">
        返回账户中心
      </NuxtLink>
    </section>

    <section v-else class="card">
      <div class="mark" aria-hidden="true">
        !
      </div>
      <h1>页面暂时无法加载</h1>
      <p>可能是临时问题。请重试；如果问题持续存在，请联系{{ SYSTEM_NAME }}支持人员。</p>
      <button class="action" type="button" @click="reload">
        重新加载
      </button>
    </section>
  </main>
</template>

<style scoped>
/* Self-contained tokens: the error view renders instead of the routed page,
   so page-scoped styles cannot be assumed. Dark mode follows the anti-flash
   attribute when present and the OS preference otherwise. */
.state {
  --up-brand: #2457d6;
  --up-brand-soft: #edf3ff;
  --up-ink: #172033;
  --up-muted: #687185;
  --up-line: #e4e8ef;
  --up-surface: #ffffff;
  --up-canvas: #f4f6f9;
  --up-shadow: 0 16px 48px rgb(34 54 94 / 8%);

  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  margin: 0;
  background: var(--up-canvas);
  color: var(--up-ink);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

html[data-theme="dark"] .state {
  --up-brand: #7fa5ff;
  --up-brand-soft: #202e4d;
  --up-ink: #edf1f7;
  --up-muted: #a4adbc;
  --up-line: #303946;
  --up-surface: #1a2029;
  --up-canvas: #10151c;
  --up-shadow: 0 18px 54px rgb(0 0 0 / 28%);
}

.card {
  width: min(100%, 460px);
  padding: 34px;
  border: 1px solid var(--up-line);
  border-radius: 22px;
  background: var(--up-surface);
  box-shadow: var(--up-shadow);
  text-align: center;
}

.mark {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 18px;
  place-items: center;
  border-radius: 15px;
  color: var(--up-brand);
  background: var(--up-brand-soft);
  font-size: 19px;
  font-weight: 760;
}

.card h1 {
  margin: 0;
  font-size: 23px;
  letter-spacing: -0.025em;
}

.card p {
  margin: 10px 0 22px;
  color: var(--up-muted);
  font-size: 13px;
  line-height: 1.7;
}

.action {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  padding: 0 18px;
  border: none;
  border-radius: 9px;
  color: white;
  background: var(--up-brand);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  text-decoration: none;
}

@media (prefers-color-scheme: dark) {
  .state {
    --up-brand: #7fa5ff;
    --up-brand-soft: #202e4d;
    --up-ink: #edf1f7;
    --up-muted: #a4adbc;
    --up-line: #303946;
    --up-surface: #1a2029;
    --up-canvas: #10151c;
    --up-shadow: 0 18px 54px rgb(0 0 0 / 28%);
  }
}
</style>
