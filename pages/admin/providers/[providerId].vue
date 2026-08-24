<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin provider detail page (login toggle / directory sync / conflict resolution write side)
-->

<script setup lang="ts">
// Vue port of the frozen `provider-detail.tsx`: header card, configuration
// description list, security notice, directory sync trigger with the last
// sync result, the conflict list with explicit-link / ignore actions and the
// sync history. The write components load on demand so the step-up ceremony
// stays out of the common chunk.
import { defineAsyncComponent } from "vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type {
  DirectorySyncHistoryEntry,
  DirectorySyncResult,
  ProviderDetail,
  SyncConflict,
} from "@/features/admin/types";

const ProviderLoginToggle = defineAsyncComponent(
  () => import("@/features/admin/components/ProviderLoginToggle.vue"),
);
const ProviderSyncPanel = defineAsyncComponent(
  () => import("@/features/admin/components/ProviderSyncPanel.vue"),
);
const ProviderConflictList = defineAsyncComponent(
  () => import("@/features/admin/components/ProviderConflictList.vue"),
);

const route = useRoute();
const providerId = route.params.providerId;
if (typeof providerId !== "string" || providerId.length === 0) {
  throw createError({ statusCode: 404, statusMessage: "Provider 不存在" });
}

definePageMeta({ layout: "dashboard" });

const { data } = await useAsyncData<{
  detail: ProviderDetail | null;
  syncHistory: DirectorySyncHistoryEntry[];
  conflicts: SyncConflict[];
}>(
  `admin-provider-detail:${providerId}`,
  async () => {
    if (import.meta.server) {
      const { serverQueries } = await import("@/server/queries/server-queries");
      const [detail, syncHistory, conflicts] = await Promise.all([
        serverQueries.getProviderDetail(providerId),
        serverQueries.getDirectorySyncHistory(providerId),
        serverQueries.getSyncConflicts(providerId),
      ]);
      return { detail, syncHistory, conflicts };
    }
    return { detail: null, syncHistory: [], conflicts: [] };
  },
  { server: true },
);

if (import.meta.server && data.value?.detail === null) {
  throw createError({ statusCode: 404, statusMessage: "Provider 不存在" });
}

const detail = computed(() => data.value?.detail ?? null);
const syncHistory = computed(() => data.value?.syncHistory ?? []);
const conflicts = computed(() => data.value?.conflicts ?? []);

useHead({
  title: computed(() => (detail.value ? `Provider · ${detail.value.displayName}` : "Provider")),
});

const STATUS_META: Record<ProviderDetail["status"], { label: string; tone: "success" | "warning" | "danger" }> = {
  active: { label: "正常", tone: "success" },
  planned: { label: "规划中", tone: "warning" },
  disabled: { label: "已停用", tone: "danger" },
};

function syncStatusMeta(status: DirectorySyncResult["status"]): { label: string; tone: "info" | "success" | "warning" | "danger" } {
  if (status === "pending") return { label: "已排队", tone: "info" };
  if (status === "running") return { label: "处理中", tone: "info" };
  if (status === "success") return { label: "成功", tone: "success" };
  if (status === "partial") return { label: "部分成功", tone: "warning" };
  return { label: "失败", tone: "danger" };
}
</script>

<template>
  <div v-if="detail">
    <NuxtLink class="back-link" to="/admin/providers" external>← 返回 Provider 列表</NuxtLink>

    <AdminPageHeader
      eyebrow="Identity Provider"
      :title="detail.displayName"
      :description="`Provider ID：${detail.providerId}`"
    />

    <div class="header-card">
      <div class="header-info">
        <h1>{{ detail.displayName }}</h1>
        <p>厂商：{{ detail.vendor === "feishu" ? "飞书" : "通用" }} · {{ detail.contactScope }}</p>
      </div>
      <div class="header-meta">
        <AdminStatusBadge
          :label="STATUS_META[detail.status].label"
          :tone="STATUS_META[detail.status].tone"
        />
        <AdminStatusBadge
          :label="detail.loginEnabled ? '登录已启用' : '登录未启用'"
          :tone="detail.loginEnabled ? 'success' : 'neutral'"
        />
        <ProviderLoginToggle :detail="detail" />
      </div>
    </div>

    <section class="card">
      <dl class="description-list">
        <dt>App ID</dt>
        <dd><code>{{ detail.appId }}</code></dd>

        <dt>Secret</dt>
        <dd>{{ detail.secretConfigured ? "已配置（不显示明文）" : "未配置" }}</dd>

        <dt>OAuth 回调地址</dt>
        <dd><code>{{ detail.callbackUrl }}</code></dd>

        <dt>通讯录授权范围</dt>
        <dd>{{ detail.contactScope }}</dd>

        <dt>已关联用户</dt>
        <dd>{{ detail.linkedUserCount }} 人</dd>

        <dt>最近同步</dt>
        <dd>{{ detail.lastSyncAt ? formatSecurityDateTime(detail.lastSyncAt) : "从未同步" }}</dd>

        <dt>最近凭据校验</dt>
        <dd>{{ detail.lastValidatedAt ? formatSecurityDateTime(detail.lastValidatedAt) : "尚未校验" }}</dd>
      </dl>

      <div class="notice notice-info">
        <div>
          <strong>安全提醒</strong>
          飞书 App Secret、Access Token 和签名材料仅在服务端存储和使用，不会暴露到浏览器。
          授权重定向、回调验证、Code 交换和重放保护均由后端执行。
          外部身份通过显式流程关联到既有 userId，不会仅凭邮箱静默合并。
        </div>
      </div>

      <ProviderSyncPanel :detail="detail" />
    </section>

    <section v-if="conflicts.length > 0" class="card">
      <h3 class="section-heading">身份关联冲突</h3>
      <div class="notice notice-danger">
        <div>
          <strong>不允许仅凭邮箱静默合并</strong>
          以下冲突需手动确认。仅凭邮箱、手机号、域名或显示名的匹配不构成自动合并。
          必须由管理员显式选择关联到既有的统一门户用户，或忽略。
        </div>
      </div>
      <ProviderConflictList
        v-for="conflict in conflicts"
        :key="conflict.conflictId"
        :conflict="conflict"
      />
    </section>

    <section v-if="syncHistory.length > 0" class="card">
      <h3 class="section-heading">同步历史</h3>
      <div v-for="entry in syncHistory" :key="entry.syncId" class="list-item">
        <div>
          <strong>{{ entry.summary }}</strong>
          <p>
            {{ formatSecurityDateTime(entry.startedAt) }} →
            {{ entry.completedAt ? formatSecurityDateTime(entry.completedAt) : "处理中" }}
          </p>
          <AdminStatusBadge
            :label="syncStatusMeta(entry.status).label"
            :tone="syncStatusMeta(entry.status).tone"
          />
        </div>
      </div>
    </section>
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
}

.card {
  margin-top: 20px;
  padding: 22px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.section-heading {
  margin: 20px 0 12px;
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 660;
}

.card > .section-heading:first-child { margin-top: 0; }

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

.notice {
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.7;
}

.notice strong { display: block; margin-bottom: 4px; }

.notice-info {
  color: var(--up-status-info-ink);
  background: var(--up-status-info-bg);
}

.notice-danger {
  color: var(--up-status-danger-ink);
  background: var(--up-status-danger-bg);
}

.list-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
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
