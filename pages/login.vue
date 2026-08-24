<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Login page (SSR session resolution + credential panel)
-->

<script setup lang="ts">
import CredentialPanel from "@/features/auth/components/credential-panel.vue";

definePageMeta({ layout: "auth" });
useHead({ title: "登录" });

// Mirrors server/routes/login-context.get.ts. Declared here because app code
// cannot import Nitro `server/` modules into the client bundle.
type LoginContextResponse = {
  destination: string | null;
  feishuLoginEnabled: boolean;
  registrationEnabled: boolean;
  csrfToken: string;
};

function queryValue(value: unknown): string | undefined {
  if (typeof value === "string" && value !== "") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string" && first !== "") return first;
  }
  return undefined;
}

const route = useRoute();
const requestId = queryValue(route.query.requestId);
const providerError = queryValue(route.query.providerError);
const loginErrorCode = queryValue(route.query.loginError);

// useRequestFetch forwards the incoming Cookie header during SSR, so the
// context endpoint reuses the migrated login-session.ts contract unchanged:
// only an explicit 401 from /me counts as anonymous (destination: null);
// every other backend failure surfaces as a 5xx and is thrown onto the
// error page instead of being disguised as a logged-out state.
const requestFetch = useRequestFetch();
const { data, error } = await useAsyncData("login-context", () =>
  requestFetch<LoginContextResponse>("/login-context", {
    query: requestId !== undefined ? { requestId } : {},
  }),
);

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: "Failed to resolve the login session",
    fatal: true,
  });
}

if (data.value?.destination) {
  await navigateTo(data.value.destination);
}
</script>

<template>
  <CredentialPanel
    :resume-request-id="requestId"
    :provider-error="providerError"
    :login-error-code="loginErrorCode"
    :feishu-login-enabled="data?.feishuLoginEnabled ?? false"
    :registration-enabled="data?.registrationEnabled ?? false"
    :csrf-token="data?.csrfToken ?? ''"
  />
</template>
