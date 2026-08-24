<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin user detail page (read tabs + danger zone / session revocation write side)
-->

<script setup lang="ts">
// Vue port of the frozen `user-detail.tsx`: header card + URL-driven tabs
// (profile / sessions / authorizations / audit / danger). The danger tab and
// session revocation are write operations loaded on demand so the step-up
// ceremony stays out of the common chunk.
import { defineAsyncComponent } from "vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { useAdminShell } from "@/features/admin/composables/useAdminShell";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type { UserDetail } from "@/features/admin/types";

const UserSessionList = defineAsyncComponent(
  () => import("@/features/admin/components/UserSessionList.vue"),
);
const UserDangerZone = defineAsyncComponent(
  () => import("@/features/admin/components/UserDangerZone.vue"),
);

const route = useRoute();
const userId = route.params.id;
if (typeof userId !== "string" || userId.length === 0) {
  throw createError({ statusCode: 404, statusMessage: "用户不存在" });
}

definePageMeta({ layout: "dashboard" });

const { permissions } = await useAdminShell();
const canManage = computed(() => permissions.value.userDisable);

const { data: detail } = await useAsyncData<UserDetail | null>(
  `admin-user-detail:${userId}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getUserDetail(userId);
    }
    return null;
  },
  { server: true },
);

if (import.meta.server && detail.value === null) {
  throw createError({ statusCode: 404, statusMessage: "用户不存在" });
}

useHead({ title: computed(() => (detail.value ? `用户 · ${detail.value.displayName}` : "用户")) });

const VALID_TABS = ["profile", "sessions", "authorizations", "audit", "danger"] as const;
type TabKey = (typeof VALID_TABS)[number];

const activeTab = computed<TabKey>(() => {
  const tab = route.query.tab;
  const value = typeof tab === "string" ? tab : "";
  const requested = (VALID_TABS as readonly string[]).includes(value) ? (value as TabKey) : "profile";
  // Legacy behaviour: requesting the danger tab without permission falls
  // back to the profile tab instead of showing a locked pane.
  return requested === "danger" && !canManage.value ? "profile" : requested;
});

function handleTabChange(tab: string): void {
  const query = { ...route.query };
  if (tab === "profile") delete query.tab;
  else query.tab = tab;
  void navigateTo({ path: route.path, query }, { external: true });
}

function personaLabel(personas: UserDetail["personas"]): string {
  return personas.map((persona) => (persona === "consumer" ? "外部用户" : "员工")).join(" · ");
}

const STATUS_META: Record<UserDetail["status"], { label: string; tone: "success" | "warning" | "danger" }> = {
  active: { label: "正常", tone: "success" },
  pending: { label: "待验证", tone: "warning" },
  disabled: { label: "已停用", tone: "danger" },
};
</script>

<template>
  <div v-if="detail">
    <NuxtLink class="back-link" to="/admin/users" external>← 返回用户列表</NuxtLink>

    <AdminPageHeader
      eyebrow="Identity"
      :title="detail.displayName"
      :description="`稳定标识：${detail.userId}`"
    />

    <div class="header-card">
      <div class="header-info">
        <h1>{{ detail.displayName }}</h1>
        <p>{{ detail.email }} · {{ detail.phoneMasked }}</p>
      </div>
      <div class="header-meta">
        <span>人格：{{ personaLabel(detail.personas) }}</span>
        <AdminStatusBadge
          :label="STATUS_META[detail.status].label"
          :tone="STATUS_META[detail.status].tone"
        />
      </div>
    </div>

    <n-tabs :value="activeTab" type="line" @update:value="handleTabChange">
      <n-tab-pane tab="账户资料" name="profile">
        <dl class="description-list">
          <dt>用户 ID</dt>
          <dd><code>{{ detail.userId }}</code></dd>

          <dt>显示名称</dt>
          <dd>{{ detail.displayName }}</dd>

          <dt>邮箱</dt>
          <dd>{{ detail.email }}</dd>

          <dt>手机（脱敏）</dt>
          <dd>{{ detail.phoneMasked }}</dd>

          <dt>人格类型</dt>
          <dd>{{ personaLabel(detail.personas) }}</dd>

          <dt>员工档案</dt>
          <dd>
            <template v-if="detail.employeeProfile">
              {{ detail.employeeProfile.employeeId }} · {{ detail.employeeProfile.departmentName }} · {{ detail.employeeProfile.title }}
            </template>
            <template v-else>未关联员工档案</template>
          </dd>

          <dt>外部身份关联</dt>
          <dd>
            <template v-if="detail.linkedIdentities.length > 0">
              <div v-for="identity in detail.linkedIdentities" :key="identity.providerId">
                {{ identity.providerName }}：{{ identity.externalSubject }}（关联于 {{ formatSecurityDateTime(identity.linkedAt) }}）
              </div>
            </template>
            <template v-else>无</template>
          </dd>

          <dt>最近活动</dt>
          <dd>{{ formatSecurityDateTime(detail.lastActiveAt) }}</dd>
        </dl>
      </n-tab-pane>

      <n-tab-pane tab="活跃会话" name="sessions">
        <UserSessionList
          v-if="detail"
          :user-id="detail.userId"
          :sessions="detail.activeSessions"
          :can-manage="canManage"
        />
      </n-tab-pane>

      <n-tab-pane tab="授权应用" name="authorizations">
        <n-empty
          v-if="detail.authorizedApplications.length === 0"
          description="该用户尚未授权任何应用。"
        />
        <div v-else class="section">
          <div v-for="app in detail.authorizedApplications" :key="app.applicationName" class="list-item">
            <div>
              <strong>{{ app.applicationName }}</strong>
              <p>Scope：{{ app.scopes.join(", ") }}</p>
              <p>授权时间：{{ formatSecurityDateTime(app.grantedAt) }}</p>
              <AdminStatusBadge
                :label="app.status === 'active' ? '有效' : '已撤销'"
                :tone="app.status === 'active' ? 'success' : 'danger'"
              />
            </div>
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane tab="审计记录" name="audit">
        <n-empty
          v-if="detail.recentAuditEvents.length === 0"
          description="该用户最近没有审计事件。"
        />
        <dl v-else class="description-list">
          <template v-for="event in detail.recentAuditEvents" :key="event.eventId">
            <dt>事件</dt>
            <dd>{{ event.eventType }}</dd>

            <dt>操作者</dt>
            <dd>{{ event.actorName }}</dd>

            <dt>目标</dt>
            <dd>{{ event.targetLabel }}</dd>

            <dt>时间</dt>
            <dd>{{ formatSecurityDateTime(event.occurredAt) }}</dd>

            <dt>结果</dt>
            <dd>
              <AdminStatusBadge
                :label="event.result === 'success' ? '成功' : '拒绝'"
                :tone="event.result === 'success' ? 'success' : 'danger'"
              />
            </dd>
          </template>
        </dl>
      </n-tab-pane>

      <n-tab-pane v-if="canManage" tab="危险操作" name="danger">
        <UserDangerZone v-if="detail" :detail="detail" />
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
  margin: 4px 0;
  color: var(--up-muted);
  font-size: 12px;
}
</style>
