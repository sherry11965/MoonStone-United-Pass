<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Notice card for invalid or expired one-time links
-->

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}>();
</script>

<template>
  <div class="auth-panel">
    <div class="auth-heading">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="auth-status-card" role="alert">
      <p>链接缺少必要的参数，无法继续。请使用邮件中的完整链接，或重新发起请求。</p>
    </div>
    <div class="auth-actions">
      <NuxtLink class="auth-button auth-button-primary" :to="actionHref">{{ actionLabel }}</NuxtLink>
    </div>
  </div>
</template>
