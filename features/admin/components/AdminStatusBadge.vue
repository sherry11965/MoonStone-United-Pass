<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin status badge (thin wrapper over the shared account badge)
-->

<script setup lang="ts">
// The admin surface reuses the frozen account status-badge presentation;
// this wrapper keeps the admin pages decoupled from account-domain renames.
import AccountStatusBadge from "@/features/account/components/AccountStatusBadge.vue";

type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

withDefaults(defineProps<{ label: string; tone?: StatusTone }>(), { tone: "neutral" });
</script>

<template>
  <AccountStatusBadge :label="label" :tone="tone" />
</template>
