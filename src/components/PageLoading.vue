<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of components/PageLoading.vue (P1 migration; used as the
              Suspense fallback for lazy route components)
-->

<script setup lang="ts">
// Root loading fallback (legacy `src/app/loading.tsx`): shown while a route
// transition is in flight, announced to assistive technology via role/status.
</script>

<template>
  <div class="state" role="status" aria-label="页面加载中">
    <div class="loader" />
  </div>
</template>

<style scoped>
.state {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--up-canvas) 82%, transparent);
}

.loader {
  width: 34px;
  height: 34px;
  border: 3px solid var(--up-info-line);
  border-top-color: var(--up-brand);
  border-radius: 50%;
  animation: up-page-loading-spin 700ms linear infinite;
}

@keyframes up-page-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loader {
    animation: none;
  }
}
</style>
