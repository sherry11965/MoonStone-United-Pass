<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Account authorized applications page (grant list and revocation)
-->

<script setup lang="ts">
// Vue port of the frozen `(account)/account/applications/page.tsx`: the grant
// list is read server-side through `server/queries/server-queries.ts`
// (server: true) and the payload is reused on the client.
import type { AuthorizedApplication } from "@/features/account/types";
import AuthorizedApplicationList from "@/features/account/components/AuthorizedApplicationList.vue";

definePageMeta({ layout: "account" });
useHead({ title: "授权应用" });

const ACCOUNT_APPLICATIONS_KEY = "account-authorized-applications";

const nuxtApp = useNuxtApp();
const { data: applications, refresh } = await useAsyncData<AuthorizedApplication[] | null>(
  ACCOUNT_APPLICATIONS_KEY,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getAuthorizedApplications();
    }
    // Full-document navigation re-renders on the server; the client keeps the
    // hydrated payload instead of issuing a second request.
    return (
      (nuxtApp.payload.data[ACCOUNT_APPLICATIONS_KEY] as AuthorizedApplication[] | undefined) ??
      null
    );
  },
  { server: true },
);
</script>

<template>
  <AuthorizedApplicationList
    v-if="applications"
    :applications="applications"
    :refresh-applications="refresh"
  />
</template>
