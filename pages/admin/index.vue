<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin console workspace (overview dashboard, explicit Mock seam)
-->

<script setup lang="ts">
// Vue port of the frozen admin workspace. The legacy `/admin` page was a
// redirect seam; the milestone scope restores the overview dashboard backed
// by `getAdminDashboard()`, which stays mock-backed by design (explicit Mock
// seam until the backend dashboard contract lands).
import AdminOverview from "@/features/admin/components/AdminOverview.vue";
import type { AdminDashboard } from "@/shared/united-pass-data-source";

definePageMeta({ layout: "dashboard" });
useHead({ title: "身份管理工作台" });

const { data } = await useAsyncData<AdminDashboard | null>(
  "admin-dashboard",
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getAdminDashboard();
    }
    return null;
  },
  { server: true },
);
</script>

<template>
  <AdminOverview v-if="data" :dashboard="data" />
</template>
