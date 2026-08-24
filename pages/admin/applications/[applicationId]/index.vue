<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin application detail page (read-only tabs + danger zone)
-->

<script setup lang="ts">
// Vue port of the frozen `application-detail.tsx`: header card + URL-driven
// tabs (basic / clients / grants / audit / danger). The danger tab loads on
// demand so the write command seam stays out of the common chunk.
import { defineAsyncComponent } from "vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import { AUDIENCE_LABELS, type OAuthApplicationDetail } from "@/features/applications/types";

const ApplicationDangerZone = defineAsyncComponent(
  () => import("@/features/applications/components/ApplicationDangerZone.vue"),
);

const DEFAULT_APP_LOGO = "https://moonstone.org.cn/image/logo.png";

const route = useRoute();
const applicationId = route.params.applicationId;
if (typeof applicationId !== "string" || applicationId.length === 0) {
  throw createError({ statusCode: 404, statusMessage: "应用不存在" });
}

definePageMeta({ layout: "dashboard" });

const { data: detail } = await useAsyncData<OAuthApplicationDetail | null>(
  `admin-application-detail:${applicationId}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      return serverQueries.getApplicationDetail(applicationId);
    }
    return null;
  },
  { server: true },
);

if (import.meta.server && detail.value === null) {
  throw createError({ statusCode: 404, statusMessage: "应用不存在" });
}

useHead({ title: computed(() => (detail.value ? `应用 · ${detail.value.name}` : "应用")) });

const VALID_TABS = ["basic", "clients", "grants", "audit", "danger"] as const;
type TabKey = (typeof VALID_TABS)[number];

const activeTab = computed<TabKey>(() => {
  const tab = route.query.tab;
  const value = typeof tab === "string" ? tab : "";
  return (VALID_TABS as readonly string[]).includes(value) ? (value as TabKey) : "basic";
});

function handleTabChange(tab: string): void {
  const query = { ...route.query };
  if (tab === "basic") delete query.tab;
  else query.tab = tab;
  void navigateTo({ path: route.path, query }, { external: true });
}
</script>

<template>
  <div v-if="detail">
    <NuxtLink class="back-link" to="/admin/applications" external>← 返回应用列表</NuxtLink>

    <AdminPageHeader
      eyebrow="OAuth 2.0 / OIDC"
      :title="detail.name"
      :description="detail.description"
    />

    <div class="header-card">
      <div class="header-info">
        <img :src="detail.logoUrl || DEFAULT_APP_LOGO" alt="" class="app-logo">
        <div>
          <h1>{{ detail.name }}</h1>
          <p>{{ detail.description }}</p>
        </div>
      </div>
      <div class="header-meta">
        <span>受众：{{ AUDIENCE_LABELS[detail.audience] }}</span>
        <AdminStatusBadge
          :label="detail.status === 'active' ? '正常' : '已停用'"
          :tone="detail.status === 'active' ? 'success' : 'danger'"
        />
      </div>
    </div>

    <n-tabs :value="activeTab" type="line" @update:value="handleTabChange">
      <n-tab-pane tab="基本信息" name="basic">
        <dl class="description-list">
          <dt>应用名称</dt>
          <dd>{{ detail.name }}</dd>

          <dt>应用说明</dt>
          <dd>{{ detail.description || "—" }}</dd>

          <dt>受众</dt>
          <dd>{{ AUDIENCE_LABELS[detail.audience] }}</dd>

          <dt>负责人</dt>
          <dd>{{ detail.ownerName }}</dd>

          <dt>状态</dt>
          <dd>
            <AdminStatusBadge
              :label="detail.status === 'active' ? '正常' : '已停用'"
              :tone="detail.status === 'active' ? 'success' : 'danger'"
            />
          </dd>

          <dt>创建时间</dt>
          <dd>{{ formatSecurityDateTime(detail.createdAt) }}</dd>

          <dt>更新时间</dt>
          <dd>{{ formatSecurityDateTime(detail.updatedAt) }}</dd>
        </dl>
      </n-tab-pane>

      <n-tab-pane tab="OAuth Clients" name="clients">
        <n-empty
          v-if="detail.clients.length === 0"
          description="此应用尚未配置任何 OAuth Client。"
        />
        <div v-else class="section">
          <NuxtLink
            v-for="client in detail.clients"
            :key="client.clientId"
            class="client-card"
            :to="`/admin/applications/${detail.applicationId}/clients/${client.clientId}`"
            external
          >
            <div class="client-heading">
              <h3>{{ client.name }}</h3>
              <span>Client ID：<code>{{ client.clientId }}</code></span>
              <AdminStatusBadge
                :label="client.status === 'active' ? '正常' : '已停用'"
                :tone="client.status === 'active' ? 'success' : 'danger'"
              />
            </div>
            <div class="client-meta">
              <span>{{ client.clientType === "public" ? "公共客户端（PKCE）" : "机密客户端" }}</span>
              <span>·</span>
              <span>{{ client.grantTypes.join(", ") }}</span>
              <span>·</span>
              <span>{{ client.tokenEndpointAuthMethod }}</span>
              <span>·</span>
              <span>{{ client.redirectUris.length }} 个 Redirect URI</span>
            </div>
          </NuxtLink>
        </div>
      </n-tab-pane>

      <n-tab-pane tab="授权记录" name="grants">
        <n-empty
          v-if="detail.grants.length === 0"
          description="用户授权此应用后将显示在此处。"
        />
        <dl v-else class="description-list">
          <template v-for="grant in detail.grants" :key="grant.grantId">
            <dt>用户</dt>
            <dd>{{ grant.userLabel }}</dd>

            <dt>已授权 Scope</dt>
            <dd>{{ grant.scopes.join(", ") }}</dd>

            <dt>授权时间</dt>
            <dd>{{ formatSecurityDateTime(grant.grantedAt) }}</dd>

            <dt>最近使用</dt>
            <dd>{{ grant.lastUsedAt ? formatSecurityDateTime(grant.lastUsedAt) : "从未使用" }}</dd>

            <dt>状态</dt>
            <dd>
              <AdminStatusBadge
                :label="grant.status === 'active' ? '有效' : '已撤销'"
                :tone="grant.status === 'active' ? 'success' : 'danger'"
              />
            </dd>
          </template>
        </dl>
      </n-tab-pane>

      <n-tab-pane tab="审计日志" name="audit">
        <n-empty v-if="detail.auditEntries.length === 0" description="暂无审计记录。" />
        <dl v-else class="description-list">
          <template v-for="entry in detail.auditEntries" :key="entry.eventId">
            <dt>事件</dt>
            <dd>{{ entry.eventType }}</dd>

            <dt>操作者</dt>
            <dd>{{ entry.actorName }}</dd>

            <dt>时间</dt>
            <dd>{{ formatSecurityDateTime(entry.occurredAt) }}</dd>

            <dt>结果</dt>
            <dd>
              <AdminStatusBadge
                :label="entry.result === 'success' ? '成功' : '拒绝'"
                :tone="entry.result === 'success' ? 'success' : 'danger'"
              />
            </dd>
          </template>
        </dl>
      </n-tab-pane>

      <n-tab-pane tab="危险操作" name="danger">
        <ApplicationDangerZone :detail="detail" />
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

.header-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.app-logo {
  width: 52px;
  height: 52px;
  flex: none;
  border-radius: 14px;
  object-fit: cover;
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

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.client-card {
  padding: 16px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-muted);
  text-decoration: none;
  transition: border-color 160ms ease;
}

.client-card:hover { border-color: var(--up-brand); }

.client-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.client-heading h3 {
  margin: 0;
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 660;
}

.client-heading span {
  color: var(--up-muted);
  font-size: 12px;
}

.client-heading code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--up-surface);
  font-size: 12px;
}

.client-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: var(--up-muted);
  font-size: 12px;
}
</style>
