<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of pages/login.vue (P3a wave 2 — session destination + credential panel)
-->

<script setup lang="ts">
import CredentialPanel from "@/features/auth/components/credential-panel.vue";
import { useLoginContextBrowser } from "@/features/auth/composables/useLoginContextBrowser";
import { navigateTo, useHead } from "@/src/nuxt-compat";
import { useRoute } from "vue-router";
import { firstQueryValue } from "@/src/router/query-value";

useHead({ title: "登录" });

const route = useRoute();
const requestId = firstQueryValue(route.query.requestId);
const providerError = firstQueryValue(route.query.providerError);
const loginErrorCode = firstQueryValue(route.query.loginError);

// Browser-side counterpart of server/routes/login-context.get.ts: only an
// explicit 401 from /me counts as anonymous (destination null); every other
// backend failure is thrown as a fatal compat error onto the app error
// boundary (App.vue). The async setup suspends rendering through the
// App.vue Suspense boundary until the context resolves.
const context = await useLoginContextBrowser(requestId);

// Already-authenticated visitors continue to their destination instead of
// seeing the credential form (pages/login.vue L58-60). The 307 code maps to
// history-replacing navigation in the SPA navigateTo shim, mirroring the
// SSR redirect semantics.
if (context.destination) {
  await navigateTo(context.destination, { redirectCode: 307 });
}
</script>

<template>
  <CredentialPanel
    :resume-request-id="requestId"
    :provider-error="providerError"
    :login-error-code="loginErrorCode"
    :feishu-login-enabled="context.feishuLoginEnabled"
    :registration-enabled="context.registrationEnabled"
  />
  <!--
   No :csrf-token binding: the hidden-field variant exists exclusively for
   the Nuxt stack's no-JavaScript native form POST. In the SPA the
   browser-http-client attaches the up_csrf double-submit header
   automatically on every write request. The panel's @submit interception
   lives inside the component; the page does not duplicate it.
  -->
</template>
