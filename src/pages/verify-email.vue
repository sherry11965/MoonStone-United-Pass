<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of pages/verify-email.vue (P3a wave 1 — one-time fragment code)
-->

<script setup lang="ts">
import VerifyEmailPanel from "@/features/auth/components/verify-email-panel.vue";
import { useHead } from "@/src/nuxt-compat";

// Pure component mount, mirroring the Nuxt source page verbatim: the panel
// owns the fragment-code flow, so the page carries no props or query reads.
useHead({ title: "验证邮箱" });
</script>

<template>
  <VerifyEmailPanel />
</template>
