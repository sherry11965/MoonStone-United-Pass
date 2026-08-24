<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of pages/register.vue (P3a wave 1 — open panel vs registration-closed card)
-->

<script setup lang="ts">
import RegistrationClosedCard from "@/features/auth/components/registration-closed-card.vue";
import RegistrationPanel from "@/features/auth/components/registration-panel.vue";
import { useHead } from "@/src/nuxt-compat";
import { useRoute } from "vue-router";
import { firstQueryValue } from "@/src/router/query-value";

useHead({ title: "注册" });

// Simplification vs the Nuxt page (pages/register.vue): the /register-context
// endpoint exists only because the flag is *private* runtime config that a
// client may not read directly. In the SPA the flag ships as a build-time
// VITE variable (already public by definition), so the single semantic the
// endpoint carries — `registrationEnabled` — is read locally without HTTP.
// The e2e host bakes VITE_PUBLIC_REGISTRATION_ENABLED at build time, matching
// the frozen baseline (registration closed).
const registrationEnabled = import.meta.env.VITE_PUBLIC_REGISTRATION_ENABLED === "true";

const route = useRoute();
const requestId = firstQueryValue(route.query.requestId);
</script>

<template>
  <RegistrationPanel v-if="registrationEnabled" :request-id="requestId" />
  <RegistrationClosedCard v-else :request-id="requestId" />
</template>
