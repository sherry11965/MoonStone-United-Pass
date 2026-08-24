<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin page: link an employee profile onto an existing unified account
-->

<script setup lang="ts">
// Vue port of the frozen `employees/link` page: server-side rosters
// (active users filtered by the URL `q` term, departments, supervisors)
// feed the link form, which loads on demand to keep the write command
// seam out of the common chunk.
import { defineAsyncComponent } from "vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import type {
  DepartmentRecord,
  EmployeeRecord,
  ManagedUser,
} from "@/features/admin/types";

const EmployeeLinkForm = defineAsyncComponent(
  () => import("@/features/admin/components/EmployeeLinkForm.vue"),
);

definePageMeta({ layout: "dashboard" });
useHead({ title: "关联员工档案" });

const route = useRoute();
const search = typeof route.query.q === "string" ? route.query.q : "";

const { data: formData } = await useAsyncData<{
  users: ManagedUser[];
  departments: DepartmentRecord[];
  supervisors: EmployeeRecord[];
}>(
  `admin-employee-link:${search}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      const [usersPage, departments, supervisorsPage] = await Promise.all([
        serverQueries.getUsers({ limit: 20, query: search || undefined, status: "active", sort: "displayName" }),
        serverQueries.getDepartments({ limit: 100 }),
        serverQueries.getEmployees({ limit: 20, status: "active", sort: "displayName" }),
      ]);
      return { users: usersPage.items, departments, supervisors: supervisorsPage.items };
    }
    return { users: [], departments: [], supervisors: [] };
  },
  { server: true },
);

const users = computed(() => formData.value?.users ?? []);
const departments = computed(() => formData.value?.departments ?? []);
const supervisors = computed(() => formData.value?.supervisors ?? []);
</script>

<template>
  <NuxtLink class="back-link" to="/admin/employees" external>← 返回员工列表</NuxtLink>

  <AdminPageHeader
    eyebrow="Workforce"
    title="关联员工档案"
    description="为既有统一账户建立员工档案。员工档案始终关联到稳定的 userId，不会创建新账户。"
  />

  <EmployeeLinkForm
    :users="users"
    :departments="departments"
    :supervisors="supervisors"
    :initial-search="search"
  />
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 16px;
  color: var(--up-muted);
  font-size: 13px;
  font-weight: 620;
  text-decoration: none;
  transition: color 160ms ease;
}

.back-link:hover { color: var(--up-brand); }
</style>
