<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: OAuth authorization consent page (opaque requestId, server-resolved)
-->

<script setup lang="ts">
import type { ConsentResolution } from "@/features/authorization/types";
import type { CurrentUser } from "@/shared/types/identity";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import AuthorizationConsent from "@/features/authorization/components/authorization-consent.vue";
import MissingRequestIdCard from "@/features/authorization/components/missing-request-id-card.vue";

definePageMeta({ layout: "auth" });
useHead({ title: "确认应用授权" });

// Mirrors server/routes/authorize-context.get.ts. Declared here because app
// code cannot import Nitro `server/` modules into the client bundle.
type AuthorizeContextResponse = {
  resolution: ConsentResolution;
  currentUser: CurrentUser | null;
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

// Real mode resolves only caller-supplied opaque request IDs; the
// consent_demo_001 fallback exists exclusively for the frozen mock source
// (applied server-side). The page never guesses request IDs and never
// accepts raw returnTo URLs.
const shouldResolve = requestId !== undefined || USE_MOCK_DATA_SOURCE;

const requestFetch = useRequestFetch();
const { data, error } = await useAsyncData("authorize-context", () =>
  shouldResolve
    ? requestFetch<AuthorizeContextResponse>("/authorize-context", {
        query: requestId !== undefined ? { requestId } : {},
      })
    : Promise.resolve(null),
);

if (shouldResolve && error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: "Failed to resolve the authorization request",
    fatal: true,
  });
}
</script>

<template>
  <MissingRequestIdCard v-if="!shouldResolve" />
  <AuthorizationConsent
    v-else-if="data"
    :resolution="data.resolution"
    :current-user="data.currentUser"
  />
</template>
