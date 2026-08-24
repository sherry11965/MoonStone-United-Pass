<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Authorized application list UI — Vue port of authorized-application-list.tsx
//

import { computed, h } from "vue";
import type { AuthorizedApplication } from "@/features/account/types";
import AccountPageHeader from "@/features/account/components/AccountPageHeader.vue";
import AccountStatusBadge from "@/features/account/components/AccountStatusBadge.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import { browserCommands } from "@/shared/commands/browser-commands";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { useDialog, useMessage } from "naive-ui";

const DEFAULT_APP_LOGO = "https://moonstone.org.cn/image/logo.png";

const props = defineProps<{
  applications: AuthorizedApplication[];
  /** Re-runs the authoritative server query after a revocation settles. */
  refreshApplications?: () => Promise<void> | void;
}>();

const message = useMessage();
const dialog = useDialog();

const revokingGrants = ref<Record<string, boolean>>({});

const activeGrants = computed(() => props.applications.filter((grant) => grant.status === "active"));
const revokedGrants = computed(() => props.applications.filter((grant) => grant.status === "revoked"));

function handleRevoke(grant: AuthorizedApplication): void {
  dialog.warning({
    title: `撤销 ${grant.applicationName} 的授权？`,
    content: () => h("div", [
      h("p", "撤销后："),
      h("ul", [
        h("li", "未来新的授权请求需要重新获得你的确认（不再静默复用此授权记录）"),
        h("li", "已签发的 Access Token 与 Refresh Token 不会被统一登陆门户立即撤销，可能持续有效直到 Provider 生命周期结束"),
        h("li", "如果需要重新授权，需在应用中重新发起授权流程"),
      ]),
      h("p", USE_MOCK_DATA_SOURCE ? "此操作不可逆。当前为 Mock 实现，刷新页面后恢复。" : "此操作不可逆。"),
    ]),
    positiveText: "确认撤销",
    negativeText: "取消",
    positiveButtonProps: { type: "error" },
    onPositiveClick: async () => {
      revokingGrants.value = { ...revokingGrants.value, [grant.grantId]: true };
      try {
        await browserCommands.revokeGrant(grant.grantId);
        message.success(`已撤销 ${grant.applicationName} 的授权。`);
        await props.refreshApplications?.();
      } catch {
        message.error("撤销授权失败，请重试。");
        return false;
      } finally {
        revokingGrants.value = { ...revokingGrants.value, [grant.grantId]: false };
      }
    },
  });
}
</script>

<template>
  <div>
    <AccountPageHeader
      eyebrow="Authorized applications"
      title="授权应用"
      description="查看你授权过的 OAuth 应用与已授予的 Scope。撤销授权后，砾石进化统一登陆门户平台不再为该应用静默复用此授权；未来新的授权请求需要重新获得你的确认。"
    />

    <section v-if="applications.length === 0" class="empty-state">
      <p>你还没有授权任何应用。</p>
      <p class="empty-hint">当你在其他应用中使用统一门户登录并确认授权后，记录会出现在这里。</p>
    </section>

    <template v-else>
      <section v-if="activeGrants.length > 0" class="grant-section">
        <h2 class="section-title">活跃授权（{{ activeGrants.length }}）</h2>
        <div class="grant-list">
          <article v-for="grant in activeGrants" :key="grant.grantId" class="grant-card">
            <div class="grant-header">
              <div class="grant-identity">
                <div class="app-icon" aria-hidden="true">
                  <img class="app-logo" :src="grant.logoUrl || DEFAULT_APP_LOGO" alt="" loading="lazy">
                </div>
                <div>
                  <div class="grant-title">
                    <h3>{{ grant.applicationName }}</h3>
                    <AccountStatusBadge label="活跃" tone="success" />
                  </div>
                  <p>由 {{ grant.applicationOwner }} 提供 · {{ grant.clientType === "public" ? "Public Client" : "Confidential Client" }}</p>
                </div>
              </div>
              <n-button
                type="error"
                :loading="revokingGrants[grant.grantId]"
                :disabled="revokingGrants[grant.grantId]"
                :data-testid="`revoke-grant-${grant.grantId}`"
                @click="handleRevoke(grant)"
              >
                撤销授权
              </n-button>
            </div>

            <dl class="detail-list">
              <div>
                <dt>授权时间</dt>
                <dd>{{ formatSecurityDateTime(grant.grantedAt) }}</dd>
              </div>
              <div>
                <dt>最近使用</dt>
                <dd>{{ grant.lastUsedAt ? formatSecurityDateTime(grant.lastUsedAt) : "从未使用" }}</dd>
              </div>
            </dl>

            <div class="scope-row">
              <span class="scope-label">已授予 Scope</span>
              <div class="scope-tags">
                <code v-for="scope in grant.scopes" :key="scope">{{ scope }}</code>
              </div>
            </div>

            <p v-if="grant.hasOfflineAccess" class="offline-notice">
              此授权包含 <code>offline_access</code>，应用可在你不活跃时通过 Refresh Token 继续访问已授权数据。撤销后统一登陆门户
              不再允许基于此授权记录的静默授权；已签发的令牌不会被统一登陆门户立即撤销。
            </p>
          </article>
        </div>
      </section>

      <section v-if="revokedGrants.length > 0" class="grant-section">
        <h2 class="section-title">已撤销（{{ revokedGrants.length }}）</h2>
        <div class="grant-list">
          <article v-for="grant in revokedGrants" :key="grant.grantId" class="grant-card">
            <div class="grant-header">
              <div class="grant-identity">
                <div class="app-icon" aria-hidden="true">
                  <img class="app-logo" :src="grant.logoUrl || DEFAULT_APP_LOGO" alt="" loading="lazy">
                </div>
                <div>
                  <div class="grant-title">
                    <h3>{{ grant.applicationName }}</h3>
                    <AccountStatusBadge label="已撤销" tone="neutral" />
                  </div>
                  <p>由 {{ grant.applicationOwner }} 提供 · {{ grant.clientType === "public" ? "Public Client" : "Confidential Client" }}</p>
                </div>
              </div>
            </div>

            <dl class="detail-list">
              <div>
                <dt>授权时间</dt>
                <dd>{{ formatSecurityDateTime(grant.grantedAt) }}</dd>
              </div>
              <div>
                <dt>最近使用</dt>
                <dd>{{ grant.lastUsedAt ? formatSecurityDateTime(grant.lastUsedAt) : "从未使用" }}</dd>
              </div>
            </dl>

            <div class="scope-row">
              <span class="scope-label">已授予 Scope</span>
              <div class="scope-tags">
                <code v-for="scope in grant.scopes" :key="scope">{{ scope }}</code>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 46px 30px;
  border: 1px dashed var(--up-line);
  border-radius: var(--up-radius-md);
  background: var(--up-surface-subtle);
  text-align: center;
}

.empty-state p { margin: 0; font-size: 14px; font-weight: 620; }
.empty-hint { margin-top: 8px !important; color: var(--up-muted); font-size: 12px !important; font-weight: 400 !important; }

.grant-section { margin-bottom: 26px; }
.section-title { margin: 0 0 14px; font-size: 15px; }
.grant-list { display: grid; gap: 14px; }

.grant-card {
  padding: 22px 24px;
  border: 1px solid var(--up-line);
  border-radius: var(--up-radius-md);
  background: var(--up-surface);
  box-shadow: var(--up-card-shadow);
}

.grant-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.grant-identity { display: flex; gap: 14px; }

.app-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: none;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--up-line-soft);
  border-radius: 13px;
  background: var(--up-surface-subtle);
}

.app-logo { width: 100%; height: 100%; object-fit: contain; }

.grant-title { display: flex; align-items: center; gap: 9px; }
.grant-title h3 { margin: 0; font-size: 15px; }
.grant-identity p { margin: 5px 0 0; color: var(--up-muted); font-size: 12px; }

.detail-list { display: grid; gap: 0; margin: 16px 0 0; }
.detail-list > div { display: grid; grid-template-columns: 110px 1fr; gap: 14px; padding: 11px 0; border-top: 1px solid var(--up-line-soft); }
.detail-list dt { color: var(--up-muted); font-size: 12px; }
.detail-list dd { margin: 0; font-size: 13px; font-weight: 560; }

.scope-row { display: flex; align-items: center; gap: 14px; padding-top: 14px; border-top: 1px solid var(--up-line-soft); }
.scope-label { color: var(--up-muted); font-size: 12px; flex: none; width: 110px; }
.scope-tags { display: flex; flex-wrap: wrap; gap: 7px; }
.scope-tags code {
  padding: 3px 9px;
  border: 1px solid var(--up-line-soft);
  border-radius: 999px;
  background: var(--up-surface-subtle);
  color: var(--up-ink-secondary);
  font-size: 11px;
  font-weight: 620;
}

.offline-notice {
  margin: 14px 0 0;
  padding: 11px 13px;
  border-radius: 9px;
  color: var(--up-muted);
  background: var(--up-surface-subtle);
  font-size: 12px;
  line-height: 1.6;
}

.offline-notice code { color: var(--up-ink-secondary); font-weight: 620; }

@media (max-width: 760px) {
  .grant-header { flex-direction: column; }
  .detail-list > div { grid-template-columns: 1fr; gap: 6px; }
  .scope-row { flex-direction: column; align-items: flex-start; }
  .scope-label { width: auto; }
}
</style>
