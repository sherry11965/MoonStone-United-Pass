<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin page header (thin wrapper over the shared account header)
-->

<script setup lang="ts">
// The admin surface reuses the frozen account page-header presentation; this
// wrapper keeps the admin pages decoupled from account-domain renames.
import AccountPageHeader from "@/features/account/components/AccountPageHeader.vue";

defineProps<{ eyebrow?: string; title: string; description: string }>();
</script>

<template>
  <AccountPageHeader :eyebrow="eyebrow" :title="title" :description="description">
    <template v-if="$slots.action" #action>
      <slot name="action" />
    </template>
  </AccountPageHeader>
</template>
