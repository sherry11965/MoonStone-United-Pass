<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Account sessions page (active session list, revocation keeps current device)
-->

<script setup lang="ts">
// Vue port of the frozen `(account)/account/sessions/page.tsx`: the session
// list is read server-side through `server/queries/server-queries.ts`
// (server: true) and the payload is reused on the client.
import type { UserSession } from "@/features/account/types";
import SessionList from "@/features/account/components/SessionList.vue";

definePageMeta({ layout: "account" });
useHead({ title: "活跃会话" });

const ACCOUNT_SESSIONS_KEY = "account-sessions";

const nuxtApp = useNuxtApp();
const { data: sessions, refresh } = await useAsyncData<UserSession[] | null>(
  ACCOUNT_SESSIONS_KEY,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getSessions();
    }
    // Full-document navigation re-renders on the server; the client keeps the
    // hydrated payload instead of issuing a second request.
    return (
      (nuxtApp.payload.data[ACCOUNT_SESSIONS_KEY] as UserSession[] | undefined) ?? null
    );
  },
  { server: true },
);
</script>

<template>
  <SessionList v-if="sessions" :sessions="sessions" :refresh-sessions="refresh" />
</template>
