<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin departments directory (client-side filter over the full list)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/departments/page.tsx` +
// `departments-table.tsx`: the directory returns a flat list (no cursor
// pagination in the contract), so search filters locally over the loaded
// records exactly like the legacy getSearchText behaviour.
import { h } from "vue";
import { NuxtLink } from "#components";
import type { DataTableColumns } from "naive-ui";
import AdminDirectory from "@/features/admin/components/AdminDirectory.vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import type { DepartmentRecord } from "@/features/admin/types";

definePageMeta({ layout: "dashboard" });
useHead({ title: "部门" });

const { data: records } = await useAsyncData<DepartmentRecord[]>(
  "admin-departments",
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getDepartments({ limit: 100 });
    }
    return [];
  },
  { server: true },
);

const search = ref("");

function getSearchText(record: DepartmentRecord): string {
  return [record.name, record.departmentId, record.parentName, record.ownerName].join(" ");
}

const visibleRecords = computed(() => {
  const term = search.value.trim().toLowerCase();
  const list = records.value ?? [];
  if (!term) return list;
  return list.filter((record) => getSearchText(record).toLowerCase().includes(term));
});

const columns: DataTableColumns<DepartmentRecord> = [
  {
    title: "部门",
    key: "name",
    width: 260,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h("strong", null, record.name),
        h("span", null, record.departmentId),
      ]),
  },
  { title: "上级部门", key: "parentName", width: 180 },
  { title: "负责人", key: "ownerName", width: 140 },
  {
    title: "成员",
    key: "memberCount",
    width: 90,
    render: (record) => String(record.memberCount),
  },
  {
    title: "操作",
    key: "actions",
    width: 90,
    render: (record) =>
      h(
        NuxtLink,
        { to: `/admin/departments/${record.departmentId}`, external: true },
        () => h("span", { class: "row-action" }, "查看"),
      ),
  },
];
</script>

<template>
  <AdminPageHeader
    eyebrow="Organization"
    title="部门"
    description="查看组织架构中的部门、上级关系与负责人。前端可见性不是权限边界，所有管理操作仍需后端授权。"
  />

  <AdminDirectory
    directory-label="部门目录"
    search-placeholder="搜索部门或负责人"
    :search-value="search"
    :has-previous="false"
    :has-next="false"
    @search="search = $event"
  >
    <n-data-table
      remote
      :columns="columns"
      :data="visibleRecords"
      :row-key="(row: DepartmentRecord) => row.departmentId"
      :scroll-x="820"
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
