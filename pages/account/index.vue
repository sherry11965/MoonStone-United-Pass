<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Account overview page (profile, contacts, avatar upload)
-->

<script setup lang="ts">
// Vue port of the frozen `(account)/account/page.tsx`: the shell read
// (requireSession + current user) is shared with layouts/account.vue through
// the same useAsyncData payload key — no second request on the client.
import AccountOverview from "@/features/account/components/AccountOverview.vue";
import { useAccountShell } from "@/features/account/composables/useAccountShell";

definePageMeta({ layout: "account" });
useHead({ title: "账户概览" });

const { currentUser } = await useAccountShell();
</script>

<template>
  <AccountOverview v-if="currentUser" :current-user="currentUser" />
</template>
