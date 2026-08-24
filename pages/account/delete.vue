<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Account deletion page (30-day cooling-period state machine)
-->

<script setup lang="ts">
// Vue port of the frozen `(account)/account/delete/page.tsx`: the user
// identity and the deletion state are read in parallel (legacy Promise.all),
// server-side through `server/queries/server-queries.ts` (server: true).
import type { AccountDeletion } from "@/features/account/types";
import AccountPageHeader from "@/features/account/components/AccountPageHeader.vue";
import AccountDeletionPanel from "@/features/account/components/AccountDeletionPanel.vue";
import { useAccountShell } from "@/features/account/composables/useAccountShell";

definePageMeta({ layout: "account" });
useHead({ title: "注销账户" });

const ACCOUNT_DELETION_KEY = "account-deletion";

const nuxtApp = useNuxtApp();
const [shell, deletionRead] = await Promise.all([
  useAccountShell(),
  useAsyncData<AccountDeletion | null>(
    ACCOUNT_DELETION_KEY,
    async () => {
      if (import.meta.server) {
        const { serverQueries } = await import("@/server/queries/server-queries");
        return serverQueries.getAccountDeletion();
      }
      // Full-document navigation re-renders on the server; the client keeps
      // the hydrated payload instead of issuing a second request.
      return (
        (nuxtApp.payload.data[ACCOUNT_DELETION_KEY] as AccountDeletion | undefined) ?? null
      );
    },
    { server: true },
  ),
]);

const currentUser = shell.currentUser;
const deletion = deletionRead.data;
</script>

<template>
  <template v-if="currentUser && deletion">
    <AccountPageHeader
      eyebrow="Account privacy"
      title="注销账户"
      description="永久注销当前账户并删除相关数据。"
    />
    <AccountDeletionPanel :user-id="currentUser.userId" :initial-deletion="deletion" />
  </template>
</template>
