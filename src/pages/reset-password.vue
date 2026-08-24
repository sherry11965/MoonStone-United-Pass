<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of pages/reset-password.vue (P3a wave 1 — one-time link guard + reset panel)
-->

<script setup lang="ts">
import InvalidLinkNotice from "@/features/auth/components/invalid-link-notice.vue";
import ResetPasswordPanel from "@/features/auth/components/reset-password-panel.vue";
import { useHead } from "@/src/nuxt-compat";
import { useRoute } from "vue-router";
import { firstQueryValue } from "@/src/router/query-value";

useHead({ title: "重置密码" });

// Invalid-link guard, branch-for-branch identical to pages/reset-password.vue
// L26-30: both `userId` and `code` must be present as non-empty (trimmed)
// strings, else the notice card renders instead of the reset panel.
const route = useRoute();
const userId = firstQueryValue(route.query.userId);
const code = firstQueryValue(route.query.code);

const hasValidLink = userId !== undefined && userId.trim().length > 0
  && code !== undefined && code.trim().length > 0;
</script>

<template>
  <InvalidLinkNotice
    v-if="!hasValidLink"
    title="链接无效"
    description="密码重置链接缺少必要的参数。请确认你打开的是邮件中完整的重置链接。"
    action-href="/forgot-password"
    action-label="重新申请重置密码"
  />
  <ResetPasswordPanel v-else :user-id="userId!" :code="code!" />
</template>
