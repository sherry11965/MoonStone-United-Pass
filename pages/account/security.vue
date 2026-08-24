<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Account security page (factor matrix, password/TOTP/passkey management)
-->

<script setup lang="ts">
// Vue port of the frozen `(account)/account/security/page.tsx`: the security
// summary is read server-side through `server/queries/server-queries.ts`
// (server: true). The dynamic import keeps the server-only module out of the
// browser bundle; on the client the hydrated payload is reused.
import type { SecuritySummary } from "@/features/account/types";
import SecurityOverview from "@/features/account/components/SecurityOverview.vue";

definePageMeta({ layout: "account" });
useHead({ title: "登录与安全" });

const ACCOUNT_SECURITY_SUMMARY_KEY = "account-security-summary";

const nuxtApp = useNuxtApp();
const { data: securitySummary, refresh } = await useAsyncData<SecuritySummary | null>(
  ACCOUNT_SECURITY_SUMMARY_KEY,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getSecuritySummary();
    }
    // Account navigation is full-document (external links), so subsequent
    // reads re-render on the server; the client keeps the hydrated payload
    // instead of issuing a second request.
    return (
      (nuxtApp.payload.data[ACCOUNT_SECURITY_SUMMARY_KEY] as SecuritySummary | undefined) ?? null
    );
  },
  { server: true },
);
</script>

<template>
  <SecurityOverview
    v-if="securitySummary"
    :security-summary="securitySummary"
    :refresh-summary="refresh"
  />
</template>
