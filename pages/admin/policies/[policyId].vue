<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin policy detail page (editor with draft values + simulation panel)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/policies/[policyId]/page.tsx`: the
// detail page IS the editor prefilled with the latest draft plus the
// simulation panel. Permissions come from the request-level gate memo
// (fail closed); the heavy editor/simulation load on demand so the write
// command seam stays out of the common chunk.
import { defineAsyncComponent } from "vue";
import { useAdminShell } from "@/features/admin/composables/useAdminShell";
import type { PolicyDetail } from "@/features/policies/types";

const PolicyEditor = defineAsyncComponent(
  () => import("@/features/policies/components/PolicyEditor.vue"),
);
const PolicySimulationPanel = defineAsyncComponent(
  () => import("@/features/policies/components/PolicySimulationPanel.vue"),
);

const route = useRoute();
const policyId = route.params.policyId;
if (typeof policyId !== "string" || policyId.length === 0) {
  throw createError({ statusCode: 404, statusMessage: "策略不存在" });
}

definePageMeta({ layout: "dashboard" });

const { permissions } = await useAdminShell();
const canManage = computed(() => permissions.value.policyManage);
const canPublish = computed(() => permissions.value.policyPublish);

const { data: detail } = await useAsyncData<PolicyDetail | null>(
  `admin-policy-detail:${policyId}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getPolicyDetail(policyId);
    }
    return null;
  },
  { server: true },
);

if (import.meta.server && detail.value === null) {
  throw createError({ statusCode: 404, statusMessage: "策略不存在" });
}

useHead({ title: computed(() => (detail.value ? `策略 · ${detail.value.name}` : "策略")) });
</script>

<template>
  <div v-if="detail">
    <PolicyEditor :detail="detail" :can-manage="canManage" :can-publish="canPublish" />
    <div class="simulation-wrapper">
      <PolicySimulationPanel :policy-id="detail.policyId" />
    </div>
  </div>
</template>

<style scoped>
.simulation-wrapper { margin-top: 24px; }
</style>
