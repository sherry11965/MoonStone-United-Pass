<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Email verification page (one-time fragment code)
-->

<script setup lang="ts">
import VerifyEmailPanel from "@/features/auth/components/verify-email-panel.vue";

definePageMeta({ layout: "auth" });
useHead({ title: "验证邮箱" });
</script>

<template>
  <VerifyEmailPanel />
</template>
