<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Placeholder for the 34 pages still on the Nuxt stack (P1 route stub)
-->

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useHead } from "@/src/nuxt-compat";

// Every route record that has not been migrated yet (P2+) resolves to this
// stub instead of the Nuxt page source, so the SPA bundle and type graph stay
// free of auto-import-driven pages. The placeholder surfaces the migration
// status instead of a hard 404 while keeping the route resolvable.
const route = useRoute();

const pageSource = computed(() =>
  typeof route.meta.pageSource === "string" ? route.meta.pageSource : "未知页面",
);

useHead({ title: "页面迁移中" });
</script>

<template>
  <main class="state">
    <section class="card">
      <h1>该页面仍在迁移中</h1>
      <p>
        此路由（<code>{{ route.path }}</code>）对应的页面
        <code>{{ pageSource }}</code>
        尚未从 Nuxt 栈平移到 Vite SPA（计划于 P2/P3 阶段完成）。
      </p>
      <NuxtLink class="action" to="/spike">
        前往 Naive UI 验证页
      </NuxtLink>
    </section>
  </main>
</template>

<style scoped>
.state {
  display: grid;
  min-height: 60vh;
  place-items: center;
  padding: 24px;
}

.card {
  width: min(100%, 520px);
  padding: 30px;
  border: 1px solid var(--mg-border, #e4e8ef);
  border-radius: 18px;
  background: var(--mg-surface, #ffffff);
  text-align: center;
}

.card h1 {
  margin: 0 0 12px;
  font-size: 20px;
}

.card p {
  margin: 0 0 20px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--mg-ink-soft, #5a6478);
}

.card code {
  font-size: 12px;
}

.action {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  padding: 0 16px;
  border-radius: 9px;
  color: #ffffff;
  background: var(--mg-brand, #2457d6);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
</style>
