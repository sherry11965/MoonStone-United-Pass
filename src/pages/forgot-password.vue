<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of pages/forgot-password.vue (P3a wave 1 — password reset request)
-->

<script setup lang="ts">
import ForgotPasswordPanel from "@/features/auth/components/forgot-password-panel.vue";
import { useHead } from "@/src/nuxt-compat";

// Pure component mount: the Nuxt source page carries no props, no query
// reads and no async data — only the auth layout (expressed by the route
// nesting) and the document title.
useHead({ title: "找回密码" });
</script>

<template>
  <ForgotPasswordPanel />
</template>
