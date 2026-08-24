<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of components/BrandMark.vue (P1 migration; explicit
              imports replace Nuxt auto-imports, template/styles unchanged)
-->

<script setup lang="ts">
import { SYSTEM_NAME } from "@/shared/branding";

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });
</script>

<template>
  <span class="brand" :aria-label="SYSTEM_NAME">
    <img
      class="logo"
      src="/brand/gravel-evolution-logo.png"
      width="44"
      height="44"
      alt=""
      aria-hidden="true"
    >
    <span v-if="!compact" class="wordmark">{{ SYSTEM_NAME }}</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.logo {
  width: 42px;
  height: 42px;
  flex: none;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: white;
  box-shadow: 0 7px 18px rgb(20 24 32 / 12%);
  object-fit: contain;
}

.wordmark {
  max-width: 176px;
}
</style>
