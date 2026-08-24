<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin authorization policies directory (URL-driven server search + cursor pagination)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/policies/page.tsx` +
// `policies-table.tsx`: server-side search and cursor pagination driven by
// the URL through useCursorPage; never a full-table load. The "新建策略"
// write entry was introduced in M6.
import { h } from "vue";
import { NuxtLink } from "#components";
import type { DataTableColumns } from "naive-ui";
import AdminDirectory from "@/features/admin/components/AdminDirectory.vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { useCursorPage } from "@/features/admin/composables/useCursorPage";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type { AuthorizationPolicy } from "@/features/policies/types";
import type { PageQuery } from "@/shared/types/pagination";

definePageMeta({ layout: "dashboard" });
useHead({ title: "授权策略" });

const fetchPolicies = async (query: PageQuery) => {
  if (import.meta.server) {
    const { serverQueries } = await import("@/server/queries/server-queries");
    return serverQueries.getPolicies(query);
  }
  return { items: [], page: { nextCursor: null, hasMore: false } };
};

const { items, pageInfo, hasPrevious, search, loading, navigate, next, previous } =
  await useCursorPage<AuthorizationPolicy>("/admin/policies", fetchPolicies, { limit: 25 });

const columns: DataTableColumns<AuthorizationPolicy> = [
  {
    title: "策略",
    key: "name",
    width: 260,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h(
          NuxtLink,
          {
            to: `/admin/policies/${record.policyId}`,
            external: true,
            class: "name-link",
          },
          () => h("strong", null, record.name),
        ),
        h("span", null, record.policyId),
      ]),
  },
  {
    title: "资源",
    key: "resource",
    width: 170,
    render: (record) => h("code", { class: "resource-code" }, record.resource),
  },
  {
    title: "版本",
    key: "version",
    width: 90,
    render: (record) => `v${record.version}`,
  },
  {
    title: "状态",
    key: "status",
    width: 110,
    render: (record) =>
      h(AdminStatusBadge, {
        label: record.status === "published" ? "已发布" : "草稿",
        tone: record.status === "published" ? "success" : "warning",
      }),
  },
  {
    title: "最近更新",
    key: "updatedAt",
    width: 200,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h("strong", null, record.updatedBy),
        h("span", null, formatSecurityDateTime(record.updatedAt)),
      ]),
  },
  {
    title: "操作",
    key: "actions",
    width: 100,
    render: (record) =>
      h(
        NuxtLink,
        { to: `/admin/policies/${record.policyId}`, external: true },
        () => h("span", { class: "row-action" }, "查看"),
      ),
  },
];
</script>

<template>
  <AdminPageHeader
    eyebrow="ABAC policies"
    title="授权策略"
    description="管理业务授权策略。OAuth Scope 与 ABAC 业务权限保持独立。"
  >
    <template #action>
      <NuxtLink to="/admin/policies/new" external>
        <n-button type="primary">新建策略</n-button>
      </NuxtLink>
    </template>
  </AdminPageHeader>

  <AdminDirectory
    directory-label="授权策略目录"
    search-placeholder="搜索策略或资源"
    :search-value="search"
    :has-previous="hasPrevious"
    :has-next="pageInfo.hasMore"
    @search="navigate({ q: $event, cursor: null })"
    @previous="previous"
    @next="next"
  >
    <n-data-table
      remote
      :columns="columns"
      :data="items"
      :loading="loading"
      :row-key="(row: AuthorizationPolicy) => row.policyId"
      :scroll-x="960"
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

:deep(.resource-code) {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--up-surface-muted);
  color: var(--up-muted);
  font-size: 12px;
}

:deep(.row-action) {
  color: var(--up-brand);
  font-size: 13px;
  font-weight: 620;
}
</style>
