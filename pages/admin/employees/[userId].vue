<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin employee detail page (profile edit + offboarding write side)
-->

<script setup lang="ts">
// Vue port of the frozen `employee-detail.tsx`: header card + URL-driven
// tabs (profile / access / danger). The profile editor and the offboarding
// ceremony load on demand so their command seams stay out of the common
// chunk; the editor additionally needs the department / supervisor rosters.
import { defineAsyncComponent } from "vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { useAdminShell } from "@/features/admin/composables/useAdminShell";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type {
  DepartmentRecord,
  EmployeeDetail,
  EmployeeRecord,
} from "@/features/admin/types";

const EmployeeProfileEditor = defineAsyncComponent(
  () => import("@/features/admin/components/EmployeeProfileEditor.vue"),
);
const EmployeeOffboardZone = defineAsyncComponent(
  () => import("@/features/admin/components/EmployeeOffboardZone.vue"),
);

const route = useRoute();
const userId = route.params.userId;
if (typeof userId !== "string" || userId.length === 0) {
  throw createError({ statusCode: 404, statusMessage: "员工档案不存在" });
}

definePageMeta({ layout: "dashboard" });

const { permissions } = await useAdminShell();
const canManage = computed(() => permissions.value.employeeManage);
const canOffboard = computed(() => permissions.value.employeeOffboard);

const { data: detail } = await useAsyncData<EmployeeDetail | null>(
  `admin-employee-detail:${userId}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getEmployeeDetail(userId);
    }
    return null;
  },
  { server: true },
);

if (import.meta.server && detail.value === null) {
  throw createError({ statusCode: 404, statusMessage: "员工档案不存在" });
}

// Rosters feeding the profile editor (legacy: getDepartments({limit:100})
// and getEmployees({limit:20, status:"active", sort:"displayName"})).
const { data: editorData } = await useAsyncData<{
  departments: DepartmentRecord[];
  supervisors: EmployeeRecord[];
}>(
  `admin-employee-editor:${userId}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      const [departments, supervisorsPage] = await Promise.all([
        serverQueries.getDepartments({ limit: 100 }),
        serverQueries.getEmployees({ limit: 20, status: "active", sort: "displayName" }),
      ]);
      return { departments, supervisors: supervisorsPage.items };
    }
    return { departments: [], supervisors: [] };
  },
  { server: true },
);

const departments = computed(() => editorData.value?.departments ?? []);
const supervisors = computed(() => editorData.value?.supervisors ?? []);

useHead({ title: computed(() => (detail.value ? `员工 · ${detail.value.displayName}` : "员工")) });

const VALID_TABS = ["profile", "access", "danger"] as const;
type TabKey = (typeof VALID_TABS)[number];

const activeTab = computed<TabKey>(() => {
  const tab = route.query.tab;
  const value = typeof tab === "string" ? tab : "";
  const requested = (VALID_TABS as readonly string[]).includes(value) ? (value as TabKey) : "profile";
  // Legacy behaviour: requesting the danger tab without offboard permission
  // falls back to the profile tab instead of showing a locked pane.
  return requested === "danger" && !canOffboard.value ? "profile" : requested;
});

function handleTabChange(tab: string): void {
  const query = { ...route.query };
  if (tab === "profile") delete query.tab;
  else query.tab = tab;
  void navigateTo({ path: route.path, query }, { external: true });
}
</script>

<template>
  <div v-if="detail">
    <NuxtLink class="back-link" to="/admin/employees" external>← 返回员工列表</NuxtLink>

    <AdminPageHeader
      eyebrow="Workforce"
      :title="detail.displayName"
      :description="`员工编号：${detail.employeeId}`"
    />

    <div class="header-card">
      <div class="header-info">
        <h1>{{ detail.displayName }}</h1>
        <p>{{ detail.email }} · {{ detail.title }}</p>
      </div>
      <div class="header-meta">
        <span>{{ detail.departmentName }}</span>
        <AdminStatusBadge
          :label="detail.status === 'active' ? '在职' : '离职处理中'"
          :tone="detail.status === 'active' ? 'success' : 'warning'"
        />
      </div>
    </div>

    <n-tabs :value="activeTab" type="line" @update:value="handleTabChange">
      <n-tab-pane tab="档案信息" name="profile">
        <EmployeeProfileEditor
          v-if="canManage && detail.status === 'active'"
          :detail="detail"
          :departments="departments"
          :supervisors="supervisors"
        />
        <dl class="description-list">
          <dt>用户 ID</dt>
          <dd><code>{{ detail.userId }}</code></dd>

          <dt>员工编号</dt>
          <dd>{{ detail.employeeId }}</dd>

          <dt>显示名称</dt>
          <dd>{{ detail.displayName }}</dd>

          <dt>邮箱</dt>
          <dd>{{ detail.email }}</dd>

          <dt>部门</dt>
          <dd>{{ detail.departmentName }}</dd>

          <dt>职位</dt>
          <dd>{{ detail.title }}</dd>

          <dt>主管</dt>
          <dd>{{ detail.supervisorName ?? "未指定" }}</dd>

          <dt>入职时间</dt>
          <dd>{{ formatSecurityDateTime(detail.onboardedAt) }}</dd>

          <dt>关联的消费者账户</dt>
          <dd>{{ detail.linkedConsumerAccount ? "已关联统一账户（消费者人格保留）" : "未关联" }}</dd>
        </dl>
      </n-tab-pane>

      <n-tab-pane tab="访问权限" name="access">
        <n-empty
          v-if="detail.status === 'offboarding'"
          description="该员工的访问权限正在撤销中。离职完成后所有管理端访问将被移除。"
        />
        <div v-else class="section">
          <div class="list-item">
            <div>
              <strong>管理端访问</strong>
              <p>员工状态为在职，可由后端策略授予管理能力；在职状态本身不构成授权。</p>
            </div>
            <AdminStatusBadge label="策略决定" tone="info" />
          </div>

          <div v-if="detail.linkedConsumerAccount" class="list-item">
            <div>
              <strong>消费者人格</strong>
              <p>该员工同时拥有消费者人格。离职后消费者功能不受影响。</p>
            </div>
            <AdminStatusBadge label="保留" tone="info" />
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane v-if="canOffboard" tab="离职操作" name="danger">
        <EmployeeOffboardZone v-if="detail" :detail="detail" />
      </n-tab-pane>
    </n-tabs>
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
  margin: 16px 0 0;
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
  margin-top: 16px;
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
  line-height: 1.6;
}
</style>
