<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Registration page (open panel vs registration-closed card, ADR-0016)
-->

<script setup lang="ts">
import RegistrationPanel from "@/features/auth/components/registration-panel.vue";
import RegistrationClosedCard from "@/features/auth/components/registration-closed-card.vue";

definePageMeta({ layout: "auth" });
useHead({ title: "注册" });

// Mirrors server/routes/register-context.get.ts. The flag is private
// runtime config, so it must be resolved through a server endpoint.
type RegisterContextResponse = {
  registrationEnabled: boolean;
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

const requestFetch = useRequestFetch();
const { data, error } = await useAsyncData("register-context", () =>
  requestFetch<RegisterContextResponse>("/register-context"),
);

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? 500,
    statusMessage: "Failed to resolve the registration flag",
    fatal: true,
  });
}
</script>

<template>
  <RegistrationPanel v-if="data?.registrationEnabled" :request-id="requestId" />
  <RegistrationClosedCard v-else :request-id="requestId" />
</template>
