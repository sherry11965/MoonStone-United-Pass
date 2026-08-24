<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin identity providers directory (client-side filter over the full list)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/providers/page.tsx` +
// `providers-table.tsx`: flat provider list with local search filtering
// (legacy getSearchText behaviour); no cursor pagination in this contract.
import { h } from "vue";
import { NuxtLink } from "#components";
import type { DataTableColumns } from "naive-ui";
import AdminDirectory from "@/features/admin/components/AdminDirectory.vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type { IdentityProviderRecord } from "@/features/admin/types";

definePageMeta({ layout: "dashboard" });
useHead({ title: "Provider" });

const { data: records } = await useAsyncData<IdentityProviderRecord[]>(
  "admin-providers",
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      const page = await serverQueries.getIdentityProviders({ limit: 100 });
      return page.items;
    }
    return [];
  },
  { server: true },
);

const search = ref("");

function getSearchText(record: IdentityProviderRecord): string {
  return [record.displayName, record.providerId, record.vendor, record.integrationLabel].join(" ");
}

const visibleRecords = computed(() => {
  const term = search.value.trim().toLowerCase();
  const list = records.value ?? [];
  if (!term) return list;
  return list.filter((record) => getSearchText(record).toLowerCase().includes(term));
});

const STATUS_META: Record<IdentityProviderRecord["status"], { label: string; tone: "success" | "warning" | "danger" }> = {
  active: { label: "正常", tone: "success" },
  planned: { label: "规划中", tone: "warning" },
  disabled: { label: "已停用", tone: "danger" },
};

const columns: DataTableColumns<IdentityProviderRecord> = [
  {
    title: "Provider",
    key: "displayName",
    width: 240,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h("strong", null, record.displayName),
        h("span", null, `${record.providerId} · ${record.vendor === "feishu" ? "飞书" : "通用"}`),
      ]),
  },
  { title: "接入方式", key: "integrationLabel", width: 160 },
  {
    title: "状态",
    key: "status",
    width: 100,
    render: (record) =>
      h(AdminStatusBadge, {
        label: STATUS_META[record.status].label,
        tone: STATUS_META[record.status].tone,
      }),
  },
  {
    title: "登录",
    key: "loginEnabled",
    width: 100,
    render: (record) => (record.loginEnabled ? "已启用" : "未启用"),
  },
  {
    title: "已关联用户",
    key: "linkedUserCount",
    width: 110,
    render: (record) => String(record.linkedUserCount),
  },
  {
    title: "最近更新",
    key: "updatedAt",
    width: 200,
    render: (record) => formatSecurityDateTime(record.updatedAt),
  },
  {
    title: "操作",
    key: "actions",
    width: 90,
    render: (record) =>
      h(
        NuxtLink,
        { to: `/admin/providers/${record.providerId}`, external: true },
        () => h("span", { class: "row-action" }, "查看"),
      ),
  },
];
</script>

<template>
  <AdminPageHeader
    eyebrow="Identity Provider"
    title="Provider"
    description="查看外部身份源接入、登录开关与目录同步状态。前端可见性不是权限边界，所有管理操作仍需后端授权。"
  />

  <AdminDirectory
    directory-label="Provider 目录"
    search-placeholder="搜索 Provider"
    :search-value="search"
    :has-previous="false"
    :has-next="false"
    @search="search = $event"
  >
    <n-data-table
      remote
      :columns="columns"
      :data="visibleRecords"
      :row-key="(row: IdentityProviderRecord) => row.providerId"
      :scroll-x="1060"
    />
  </AdminDirectory>
</template>

<style scoped>
:deep(.primary-cell) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:deep(.primary-cell strong) {
  color: var(--up-ink);
  font-size: 13px;
  font-weight: 640;
}

:deep(.primary-cell span) {
  color: var(--up-muted);
  font-size: 12px;
}

:deep(.row-action) {
  color: var(--up-brand);
  font-size: 13px;
  font-weight: 620;
}
</style>
