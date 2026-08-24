<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin page: create a new application (scopes fetched server-side)
-->

<script setup lang="ts">
// Vue port of the frozen `applications/new` page: the available scope
// catalog is fetched server-side and the (heavy) create form loads on
// demand so the write command seam stays out of the common chunk.
import { defineAsyncComponent } from "vue";
import type { AllowedScope } from "@/features/applications/types";

const ApplicationCreateForm = defineAsyncComponent(
  () => import("@/features/applications/components/ApplicationCreateForm.vue"),
);

definePageMeta({ layout: "dashboard" });
useHead({ title: "注册 OAuth 应用" });

const { data: scopes } = await useAsyncData<AllowedScope[]>(
  "admin-application-create-scopes",
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getAvailableScopes();
    }
    return [];
  },
  { server: true },
);

const availableScopes = computed(() => scopes.value ?? []);
</script>

<template>
  <ApplicationCreateForm :available-scopes="availableScopes" />
</template>
