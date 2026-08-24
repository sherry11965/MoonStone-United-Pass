<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Forgot password request page
-->

<script setup lang="ts">
import ForgotPasswordPanel from "@/features/auth/components/forgot-password-panel.vue";

definePageMeta({ layout: "auth" });
useHead({ title: "找回密码" });
</script>

<template>
  <ForgotPasswordPanel />
</template>
