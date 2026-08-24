<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of pages/authorize.vue (P3a wave 2 — consent resolution, opaque requestId)
-->

<script setup lang="ts">
import AuthorizationConsent from "@/features/authorization/components/authorization-consent.vue";
import MissingRequestIdCard from "@/features/authorization/components/missing-request-id-card.vue";
import { useAuthorizeContextBrowser } from "@/features/authorization/composables/useAuthorizeContextBrowser";
import { useHead } from "@/src/nuxt-compat";
import { useRoute } from "vue-router";
import { firstQueryValue } from "@/src/router/query-value";

useHead({ title: "确认应用授权" });

const route = useRoute();
const requestId = firstQueryValue(route.query.requestId);

// Browser-side counterpart of server/routes/authorize-context.get.ts. Real
// mode resolves only caller-supplied opaque request IDs; the
// consent_demo_001 fallback exists exclusively for the frozen mock source.
// The page never guesses request IDs and never accepts raw returnTo URLs.
// Resolution failures are thrown as fatal compat errors onto the App.vue
// error boundary; the async setup suspends rendering until resolved.
const context = await useAuthorizeContextBrowser(requestId);
</script>

<template>
  <MissingRequestIdCard v-if="!context.shouldResolve" />
  <AuthorizationConsent
    v-else-if="context.resolution"
    :resolution="context.resolution"
    :current-user="context.currentUser"
  />
</template>
