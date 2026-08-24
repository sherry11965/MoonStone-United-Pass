<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin department detail page (read-only; manage actions land in M6)
-->

<script setup lang="ts">
// Vue port of the frozen `department-detail.tsx` (read-only surface): header
// card, description list, child departments and member list. Department
// management actions (rename/reparent/owner change) are M6 deliverables.
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import type { DepartmentDetail } from "@/features/admin/types";

const route = useRoute();
const departmentId = route.params.departmentId;
if (typeof departmentId !== "string" || departmentId.length === 0) {
  throw createError({ statusCode: 404, statusMessage: "部门不存在" });
}

definePageMeta({ layout: "dashboard" });

const { data: detail } = await useAsyncData<DepartmentDetail | null>(
  `admin-department-detail:${departmentId}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getDepartmentDetail(departmentId);
    }
    return null;
  },
  { server: true },
);

if (import.meta.server && detail.value === null) {
  throw createError({ statusCode: 404, statusMessage: "部门不存在" });
}

useHead({ title: computed(() => (detail.value ? `部门 · ${detail.value.name}` : "部门")) });
</script>

<template>
  <div v-if="detail">
    <NuxtLink class="back-link" to="/admin/departments" external>← 返回部门列表</NuxtLink>

    <AdminPageHeader
      eyebrow="Organization"
      :title="detail.name"
      :description="`部门 ID：${detail.departmentId}`"
    />

    <div class="header-card">
      <div class="header-info">
        <h1>{{ detail.name }}</h1>
        <p>
          {{ detail.parentName ? `上级部门：${detail.parentName}` : "顶级部门" }} · 负责人：{{ detail.ownerName }}
        </p>
      </div>
      <div class="header-meta">
        <span>成员：{{ detail.memberCount }} 人</span>
        <AdminStatusBadge label="正常" tone="success" />
      </div>
    </div>

    <dl class="description-list">
      <dt>部门 ID</dt>
      <dd><code>{{ detail.departmentId }}</code></dd>

      <dt>部门名称</dt>
      <dd>{{ detail.name }}</dd>

      <dt>上级部门</dt>
      <dd>{{ detail.parentName ?? "无（顶级部门）" }}</dd>

      <dt>负责人</dt>
      <dd>{{ detail.ownerName }}</dd>

      <dt>成员总数</dt>
      <dd>{{ detail.memberCount }} 人</dd>
    </dl>

    <div v-if="detail.childDepartments.length > 0" class="section">
      <h3>子部门</h3>
      <NuxtLink
        v-for="child in detail.childDepartments"
        :key="child.departmentId"
        class="list-link"
        :to="`/admin/departments/${child.departmentId}`"
        external
      >
        <div>
          <strong>{{ child.name }}</strong>
          <p>{{ child.memberCount }} 人</p>
        </div>
      </NuxtLink>
    </div>

    <div class="section">
      <h3>成员列表</h3>
      <n-empty v-if="detail.members.length === 0" description="该部门尚未有成员。" />
      <div v-for="member in detail.members" :key="member.userId" class="list-item">
        <div>
          <strong>{{ member.displayName }}</strong>
          <p>{{ member.employeeId }} · {{ member.title }}</p>
        </div>
        <NuxtLink :to="`/admin/users/${member.userId}`" external>查看用户</NuxtLink>
      </div>
    </div>
  </div>
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

.header-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 22px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.header-info h1 {
  margin: 0;
  color: var(--up-ink);
  font-size: 22px;
  font-weight: 680;
}

.header-info p {
  margin: 4px 0 0;
  color: var(--up-muted);
  font-size: 13px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--up-muted);
  font-size: 13px;
}

.description-list {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 10px 16px;
  margin: 0;
}

.description-list dt {
  color: var(--up-muted);
  font-size: 13px;
  font-weight: 620;
}

.description-list dd {
  margin: 0;
  color: var(--up-ink);
  font-size: 13px;
  line-height: 1.7;
  word-break: break-all;
}

.description-list code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--up-surface-muted);
  font-size: 12px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.section h3 {
  margin: 0;
  color: var(--up-ink);
  font-size: 15px;
  font-weight: 660;
}

.list-link {
  padding: 14px 16px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-muted);
  text-decoration: none;
  transition: border-color 160ms ease;
}

.list-link:hover { border-color: var(--up-brand); }

.list-link strong {
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 640;
}

.list-link p {
  margin: 4px 0 0;
  color: var(--up-muted);
  font-size: 12px;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-muted);
}

.list-item strong {
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 640;
}

.list-item p {
  margin: 4px 0 0;
  color: var(--up-muted);
  font-size: 12px;
}

.list-item > a {
  color: var(--up-brand);
  font-size: 13px;
  font-weight: 620;
  text-decoration: none;
  white-space: nowrap;
}
</style>
