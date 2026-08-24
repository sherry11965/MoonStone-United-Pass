<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin page: create a new policy (editor + permissions from the gate memo)
-->

<script setup lang="ts">
// Vue port of the frozen `policies/new` page: permissions come from the
// request-level gate memo (fail closed) and the heavy editor loads on
// demand so the write command seam stays out of the common chunk.
import { defineAsyncComponent } from "vue";
import { useAdminShell } from "@/features/admin/composables/useAdminShell";

const PolicyEditor = defineAsyncComponent(
  () => import("@/features/policies/components/PolicyEditor.vue"),
);

definePageMeta({ layout: "dashboard" });
useHead({ title: "新建策略" });

const { permissions } = await useAdminShell();
const canManage = computed(() => permissions.value.policyManage);
const canPublish = computed(() => permissions.value.policyPublish);
</script>

<template>
  <PolicyEditor :can-manage="canManage" :can-publish="canPublish" />
</template>
