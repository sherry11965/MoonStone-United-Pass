<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Password reset page (one-time link parameters, invalid-link guard)
-->

<script setup lang="ts">
import ResetPasswordPanel from "@/features/auth/components/reset-password-panel.vue";
import InvalidLinkNotice from "@/features/auth/components/invalid-link-notice.vue";

definePageMeta({ layout: "auth" });
useHead({ title: "重置密码" });

function queryValue(value: unknown): string | undefined {
  if (typeof value === "string" && value !== "") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string" && first !== "") return first;
  }
  return undefined;
}

const route = useRoute();
const userId = queryValue(route.query.userId);
const code = queryValue(route.query.code);

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
