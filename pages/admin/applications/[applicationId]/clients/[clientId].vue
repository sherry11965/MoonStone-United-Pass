<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin OAuth client detail page (read-only + secret rotation panel)
-->

<script setup lang="ts">
// Vue port of the frozen `client-detail.tsx`: basic info, redirect URIs,
// allowed scopes and the client secret panel (metadata + rotation with the
// one-time new-secret display). The secret panel loads on demand so the
// write command seam stays out of the common chunk.
import { defineAsyncComponent } from "vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import {
  CONSENT_MODE_LABELS,
  type OAuthApplicationDetail,
  type OAuthClient,
  type OAuthGrantType,
} from "@/features/applications/types";

const ClientSecretPanel = defineAsyncComponent(
  () => import("@/features/applications/components/ClientSecretPanel.vue"),
);

const route = useRoute();
const applicationId = route.params.applicationId;
const clientId = route.params.clientId;
if (
  typeof applicationId !== "string" || applicationId.length === 0 ||
  typeof clientId !== "string" || clientId.length === 0
) {
  throw createError({ statusCode: 404, statusMessage: "OAuth 客户端不存在" });
}

definePageMeta({ layout: "dashboard" });

const { data } = await useAsyncData<{
  appDetail: OAuthApplicationDetail | null;
  client: OAuthClient | null;
} | null>(
  `admin-client-detail:${applicationId}:${clientId}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      const [appDetail, client] = await Promise.all([
        serverQueries.getApplicationDetail(applicationId),
        serverQueries.getClientDetail(applicationId, clientId),
      ]);
      return { appDetail, client };
    }
    return null;
  },
  { server: true },
);

if (import.meta.server && (data.value === null || data.value.appDetail === null || data.value.client === null)) {
  throw createError({ statusCode: 404, statusMessage: "OAuth 客户端不存在" });
}

const appDetail = computed(() => data.value?.appDetail ?? null);
const client = computed(() => data.value?.client ?? null);

useHead({
  title: computed(() =>
    client.value
      ? `${client.value.name} · ${appDetail.value?.name ?? "OAuth 应用"}`
      : "OAuth 客户端",
  ),
});

const clientTypeLabel = (clientType: OAuthClient["clientType"]) =>
  clientType === "public" ? "公共客户端（PKCE）" : "机密客户端";

const grantTypeLabel = (grantType: OAuthGrantType) => {
  switch (grantType) {
    case "authorization_code":
      return "Authorization Code";
    case "refresh_token":
      return "Refresh Token";
    case "client_credentials":
      return "Client Credentials";
    default:
      return grantType;
  }
};
</script>

<template>
  <div v-if="appDetail && client">
    <NuxtLink
      class="back-link"
      :to="`/admin/applications/${applicationId}`"
      external
    >
      ← 返回 {{ appDetail.name }}
    </NuxtLink>

    <AdminPageHeader
      eyebrow="OAuth Client"
      :title="client.name"
      :description="`${appDetail.name} · Client ID: ${client.clientId}`"
    />

    <div class="header-card">
      <div class="header-info">
        <h1>{{ client.name }}</h1>
        <p>
          属于
          <NuxtLink :to="`/admin/applications/${applicationId}`" external>{{ appDetail.name }}</NuxtLink>
          {" · "}
          Client ID：<code>{{ client.clientId }}</code>
        </p>
      </div>
      <div class="header-meta">
        <AdminStatusBadge
          :label="client.status === 'active' ? '正常' : '已停用'"
          :tone="client.status === 'active' ? 'success' : 'danger'"
        />
        <span v-if="appDetail.status === 'disabled'">所属应用已停用</span>
      </div>
    </div>

    <div class="content-layout">
      <section class="section-card">
        <h3>客户端基本信息</h3>
        <dl class="description-list">
          <dt>客户端名称</dt>
          <dd>{{ client.name }}</dd>

          <dt>Client ID</dt>
          <dd><code>{{ client.clientId }}</code></dd>

          <dt>客户端类型</dt>
          <dd>{{ clientTypeLabel(client.clientType) }}</dd>

          <dt>Grant Types</dt>
          <dd>{{ client.grantTypes.map(grantTypeLabel).join(", ") }}</dd>

          <dt>令牌端点认证方式</dt>
          <dd>{{ client.tokenEndpointAuthMethod }}</dd>

          <dt>用户确认授权</dt>
          <dd>{{ CONSENT_MODE_LABELS[client.consentMode] }}</dd>

          <dt>Logout URI</dt>
          <dd>{{ client.logoutUri || "未配置" }}</dd>

          <dt>状态</dt>
          <dd>
            <AdminStatusBadge
              :label="client.status === 'active' ? '正常' : '已停用'"
              :tone="client.status === 'active' ? 'success' : 'danger'"
            />
          </dd>

          <dt>创建时间</dt>
          <dd>{{ formatSecurityDateTime(client.createdAt) }}</dd>

          <dt>更新时间</dt>
          <dd>{{ formatSecurityDateTime(client.updatedAt) }}</dd>
        </dl>
      </section>

      <section class="section-card">
        <h3>Redirect URI</h3>
        <n-empty
          v-if="client.redirectUris.length === 0"
          description="此客户端未配置任何回调地址。"
        />
        <div v-else class="uri-list">
          <div v-for="entry in client.redirectUris" :key="entry.uri" class="uri-row">
            <code>{{ entry.uri }}</code>
            <span>
              {{ entry.isLoopback ? "本地回环地址" : "远程地址" }}
              {" · "}
              添加于 {{ formatSecurityDateTime(entry.addedAt) }}
            </span>
          </div>
          <div class="notice notice-warning">
            <div>
              <strong>安全提示</strong>
              Redirect URI 必须由后端按精确安全语义校验。前端不会静默归一化或拼接用户输入的地址。
            </div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h3>允许的 Scope</h3>
        <n-empty
          v-if="client.allowedScopes.length === 0"
          description="此客户端未授权任何 Scope。"
        />
        <div v-else class="scope-grid">
          <div v-for="scope in client.allowedScopes" :key="scope.scope" class="scope-row">
            <code>{{ scope.scope }}</code>
            <div>
              <strong>{{ scope.label }}{{ scope.required ? "（必选）" : "" }}</strong>
              <p>{{ scope.description }}</p>
            </div>
          </div>
          <div class="notice notice-info">
            <div>
              <strong>Scope 与权限的边界</strong>
              OAuth Scope 仅描述授权数据范围，不代表业务管理权限。应用级 ABAC 权限由后端独立强制执行。
            </div>
          </div>
        </div>
      </section>

      <section class="section-card">
        <h3>Client Secret</h3>
        <ClientSecretPanel :client="client" />
      </section>
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

.header-info a {
  color: var(--up-brand);
  text-decoration: none;
}

.header-info code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--up-surface-muted);
  font-size: 12px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--up-muted);
  font-size: 13px;
}

.content-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 16px;
}

.section-card {
  padding: 20px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.section-card h3 {
  margin: 0 0 12px;
  color: var(--up-ink);
  font-size: 15px;
  font-weight: 660;
}

.description-list {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
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

.uri-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.uri-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border: 1px solid var(--up-line);
  border-radius: 10px;
  background: var(--up-surface-muted);
}

.uri-row code {
  color: var(--up-ink);
  font-size: 12px;
  word-break: break-all;
}

.uri-row span {
  color: var(--up-muted);
  font-size: 12px;
}

.scope-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scope-row {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--up-line);
  border-radius: 10px;
  background: var(--up-surface-muted);
}

.scope-row code {
  flex: none;
  color: var(--up-ink);
  font-size: 12px;
}

.scope-row strong {
  color: var(--up-ink);
  font-size: 13px;
  font-weight: 640;
}

.scope-row p {
  margin: 4px 0 0;
  color: var(--up-muted);
  font-size: 12px;
  line-height: 1.6;
}

.notice {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.7;
}

.notice strong {
  display: block;
  margin-bottom: 2px;
  font-size: 13px;
}

.notice-info {
  border: 1px solid var(--up-info-line, #bcd6ff);
  background: var(--up-info-bg, #f2f7ff);
  color: var(--up-info-ink, #214a9e);
}

.notice-warning {
  border: 1px solid var(--up-warning-line, #f0d6a3);
  background: var(--up-warning-bg, #fdf6e9);
  color: var(--up-warning-ink, #7a5410);
}

.notice-danger {
  border: 1px solid var(--up-danger-line, #f0b6b6);
  background: var(--up-danger-bg, #fdf0f0);
  color: var(--up-danger-ink, #9e2121);
}
</style>
