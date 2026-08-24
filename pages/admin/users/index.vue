<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin users directory (URL-driven server search + cursor pagination)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/users/page.tsx` + `users-table.tsx`:
// server-side search and cursor pagination driven by the URL through
// useCursorPage; never a full-table load.
import { h } from "vue";
import { NuxtLink } from "#components";
import type { DataTableColumns } from "naive-ui";
import AdminDirectory from "@/features/admin/components/AdminDirectory.vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { useCursorPage } from "@/features/admin/composables/useCursorPage";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type { ManagedUser } from "@/features/admin/types";
import type { PageQuery } from "@/shared/types/pagination";

definePageMeta({ layout: "dashboard" });
useHead({ title: "用户" });

const USER_STATUS_LABELS: Record<ManagedUser["status"], { label: string; tone: "success" | "warning" | "danger" }> = {
  active: { label: "正常", tone: "success" },
  pending: { label: "待验证", tone: "warning" },
  disabled: { label: "已停用", tone: "danger" },
};

const fetchUsers = async (query: PageQuery) => {
  if (import.meta.server) {
    const { serverQueries } = await import("@/server/queries/server-queries");
    return serverQueries.getUsers(query);
  }
  return { items: [], page: { nextCursor: null, hasMore: false } };
};

const { items, pageInfo, hasPrevious, search, loading, navigate, next, previous } =
  await useCursorPage<ManagedUser>("/admin/users", fetchUsers, { limit: 25 });

const columns: DataTableColumns<ManagedUser> = [
  {
    title: "用户",
    key: "displayName",
    width: 260,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h("strong", null, record.displayName),
        h("span", null, `${record.email} · ${record.userId}`),
      ]),
  },
  { title: "人格", key: "personaLabel", width: 140 },
  {
    title: "状态",
    key: "status",
    width: 110,
    render: (record) =>
      h(AdminStatusBadge, {
        label: USER_STATUS_LABELS[record.status].label,
        tone: USER_STATUS_LABELS[record.status].tone,
      }),
  },
  {
    title: "最近活动",
    key: "lastActiveAt",
    width: 220,
    render: (record) => formatSecurityDateTime(record.lastActiveAt),
  },
  {
    title: "操作",
    key: "actions",
    width: 90,
    render: (record) =>
      h(
        NuxtLink,
        { to: `/admin/users/${record.userId}`, external: true },
        () => h("span", { class: "row-action" }, "查看"),
      ),
  },
];
</script>

<template>
  <AdminPageHeader
    eyebrow="Identity directory"
    title="用户"
    description="查看平台用户账户、人格与状态。前端可见性不是权限边界，所有管理操作仍需后端授权。"
  />

  <AdminDirectory
    directory-label="用户目录"
    search-placeholder="搜索用户名或邮箱"
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
      :row-key="(row: ManagedUser) => row.userId"
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
