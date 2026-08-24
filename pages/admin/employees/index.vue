<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin employees directory (URL-driven server search + cursor pagination)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/employees/page.tsx` +
// `employees-table.tsx`. The "关联员工档案" entry is gated by
// `permissions.employeeManage` (legacy behaviour); the write form itself is
// an M6 deliverable and the route renders a placeholder until then.
import { h } from "vue";
import { NuxtLink } from "#components";
import type { DataTableColumns } from "naive-ui";
import AdminDirectory from "@/features/admin/components/AdminDirectory.vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { useAdminShell } from "@/features/admin/composables/useAdminShell";
import { useCursorPage } from "@/features/admin/composables/useCursorPage";
import type { EmployeeRecord } from "@/features/admin/types";
import type { PageQuery } from "@/shared/types/pagination";

definePageMeta({ layout: "dashboard" });
useHead({ title: "员工" });

const { permissions } = await useAdminShell();
const canLinkEmployee = computed(() => permissions.value.employeeManage);

const fetchEmployees = async (query: PageQuery) => {
  if (import.meta.server) {
    const { serverQueries } = await import("@/server/queries/server-queries");
    return serverQueries.getEmployees(query);
  }
  return { items: [], page: { nextCursor: null, hasMore: false } };
};

const { items, pageInfo, hasPrevious, search, loading, navigate, next, previous } =
  await useCursorPage<EmployeeRecord>("/admin/employees", fetchEmployees, { limit: 25 });

const columns: DataTableColumns<EmployeeRecord> = [
  {
    title: "员工",
    key: "displayName",
    width: 240,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h("strong", null, record.displayName),
        h("span", null, record.userId),
      ]),
  },
  { title: "员工编号", key: "employeeId", width: 140 },
  {
    title: "部门 · 职位",
    key: "departmentName",
    width: 220,
    render: (record) => `${record.departmentName} · ${record.title}`,
  },
  {
    title: "状态",
    key: "status",
    width: 130,
    render: (record) =>
      h(AdminStatusBadge, {
        label: record.status === "active" ? "在职" : "离职处理中",
        tone: record.status === "active" ? "success" : "warning",
      }),
  },
  {
    title: "操作",
    key: "actions",
    width: 90,
    render: (record) =>
      h(
        NuxtLink,
        { to: `/admin/employees/${record.userId}`, external: true },
        () => h("span", { class: "row-action" }, "查看"),
      ),
  },
];
</script>

<template>
  <AdminPageHeader
    eyebrow="Workforce"
    title="员工"
    description="查看员工档案、部门归属与在职状态。前端可见性不是权限边界，所有管理操作仍需后端授权。"
  >
    <template v-if="canLinkEmployee" #action>
      <NuxtLink to="/admin/employees/link" external>
        <n-button type="primary">关联员工档案</n-button>
      </NuxtLink>
    </template>
  </AdminPageHeader>

  <AdminDirectory
    directory-label="员工目录"
    search-placeholder="搜索员工姓名或编号"
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
      :row-key="(row: EmployeeRecord) => row.userId"
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
