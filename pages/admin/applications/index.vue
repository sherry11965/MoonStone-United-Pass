<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin OAuth applications directory (client-side filter over the full list)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/applications/page.tsx` +
// `applications-table.tsx`: flat application list with local search
// filtering (legacy getSearchText behaviour) plus the "注册应用" write
// entry introduced in M6.
import { h } from "vue";
import { NuxtLink } from "#components";
import type { DataTableColumns } from "naive-ui";
import AdminDirectory from "@/features/admin/components/AdminDirectory.vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { AUDIENCE_LABELS, type OAuthApplication } from "@/features/applications/types";

definePageMeta({ layout: "dashboard" });
useHead({ title: "OAuth 应用" });

const { data: records } = await useAsyncData<OAuthApplication[]>(
  "admin-applications",
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      const page = await serverQueries.getApplications({ limit: 100 });
      return page.items;
    }
    return [];
  },
  { server: true },
);

const search = ref("");

function getSearchText(record: OAuthApplication): string {
  return [record.name, record.applicationId, record.ownerName].join(" ");
}

const visibleRecords = computed(() => {
  const term = search.value.trim().toLowerCase();
  const list = records.value ?? [];
  if (!term) return list;
  return list.filter((record) => getSearchText(record).toLowerCase().includes(term));
});

const columns: DataTableColumns<OAuthApplication> = [
  {
    title: "应用",
    key: "name",
    width: 260,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h(
          NuxtLink,
          {
            to: `/admin/applications/${record.applicationId}`,
            external: true,
            class: "name-link",
          },
          () => h("strong", null, record.name),
        ),
        h("span", null, record.applicationId),
      ]),
  },
  {
    title: "受众",
    key: "audience",
    width: 120,
    render: (record) => AUDIENCE_LABELS[record.audience],
  },
  { title: "负责人", key: "ownerName", width: 140 },
  {
    title: "Client 数量",
    key: "clientCount",
    width: 110,
    render: (record) => String(record.clientCount),
  },
  {
    title: "状态",
    key: "status",
    width: 100,
    render: (record) =>
      h(AdminStatusBadge, {
        label: record.status === "active" ? "正常" : "已停用",
        tone: record.status === "active" ? "success" : "danger",
      }),
  },
  {
    title: "操作",
    key: "actions",
    width: 90,
    render: (record) =>
      h(
        NuxtLink,
        { to: `/admin/applications/${record.applicationId}`, external: true },
        () => h("span", { class: "row-action" }, "查看"),
      ),
  },
];
</script>

<template>
  <AdminPageHeader
    eyebrow="OAuth 2.0 / OIDC"
    title="OAuth 应用"
    description="管理 OAuth 应用和客户端配置。客户端密钥不会在列表中展示。"
  >
    <template #action>
      <NuxtLink to="/admin/applications/new" external>
        <n-button type="primary">注册应用</n-button>
      </NuxtLink>
    </template>
  </AdminPageHeader>

  <AdminDirectory
    directory-label="OAuth 应用目录"
    search-placeholder="搜索应用或负责人"
    :search-value="search"
    :has-previous="false"
    :has-next="false"
    @search="search = $event"
  >
    <n-data-table
      remote
      :columns="columns"
      :data="visibleRecords"
      :row-key="(row: OAuthApplication) => row.applicationId"
      :scroll-x="880"
    />
  </AdminDirectory>
</template>

<style scoped>
:deep(.primary-cell) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:deep(.primary-cell .name-link) {
  color: inherit;
  text-decoration: none;
}

:deep(.primary-cell .name-link:hover strong) { color: var(--up-brand); }

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
