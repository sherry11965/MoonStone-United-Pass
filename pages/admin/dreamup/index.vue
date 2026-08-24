<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: DreamUP administration placeholder (legacy page redirected to the external DreamUP admin)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/dreamup/page.tsx`: the legacy entry
// immediately redirected to the external DreamUP administration site. The
// Nitro admin gate already enforces DreamUP administration access for
// `/admin/dreamup*` via `/admin/dreamup/events` before this page renders.
definePageMeta({ layout: "dashboard" });
useHead({ title: "DreamUP 活动管理" });

const DREAMUP_ADMIN_URL = "https://moonstone.org.cn/dreamup/admin/";

if (import.meta.server) {
  await navigateTo(DREAMUP_ADMIN_URL, { external: true, redirectCode: 307 });
}
</script>

<template>
  <div class="stub">
    <h1>DreamUP 活动管理</h1>
    <p>正在前往 DreamUP 活动管理站…</p>
    <a :href="DREAMUP_ADMIN_URL" rel="noopener">若未自动跳转，请点击此处</a>
  </div>
</template>

<style scoped>
.stub {
  display: grid;
  gap: 8px;
  justify-items: start;
  padding: 24px 0;
}

.stub h1 {
  margin: 0;
  color: var(--up-ink);
  font-size: 22px;
  font-weight: 680;
}

.stub p {
  margin: 0;
  color: var(--up-muted);
  font-size: 13px;
}

.stub a {
  color: var(--up-brand);
  font-size: 13px;
  font-weight: 620;
}
</style>
