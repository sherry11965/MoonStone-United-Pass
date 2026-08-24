<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Active session list UI — Vue port of session-list.tsx
//

import { toRef } from "vue";
import type { UserSession } from "@/features/account/types";
import AccountPageHeader from "@/features/account/components/AccountPageHeader.vue";
import AccountStatusBadge from "@/features/account/components/AccountStatusBadge.vue";
import { useSessionList } from "@/features/account/composables/useSessionList";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import { useMessage } from "naive-ui";

const props = defineProps<{
  sessions: UserSession[];
  /** Re-runs the authoritative server query (real data source only). */
  refreshSessions?: () => Promise<void> | void;
}>();

const message = useMessage();

const { displayedSessions, revokingId, revokeSession } = useSessionList(
  toRef(props, "sessions"),
  () => props.refreshSessions?.(),
);

async function handleRevoke(sessionId: string): Promise<void> {
  const outcome = await revokeSession(sessionId);
  if (outcome === "revoked") message.success("会话已撤销。");
  if (outcome === "not_found") message.info("该会话已不存在，正在刷新列表。");
  if (outcome === "failed") message.error("撤销会话失败，请稍后重试。");
}
</script>

<template>
  <div>
    <AccountPageHeader
      eyebrow="Active sessions"
      title="活跃会话"
      description="核对登录设备、最近活动与大致位置。IP 地址仅显示脱敏值。"
    />
    <section class="card">
      <div class="session-list">
        <article v-for="session in displayedSessions" :key="session.sessionId" class="session-row">
          <div class="device-icon" aria-hidden="true">{{ session.deviceName.includes("iPhone") ? "M" : "D" }}</div>
          <div class="session-copy">
            <div class="session-title">
              <h2>{{ session.deviceName || "未知设备" }}</h2>
              <AccountStatusBadge v-if="session.isCurrent" label="当前设备" tone="success" />
            </div>
            <p>{{ session.clientName || "未知浏览器" }}</p>
            <span>{{ session.approximateLocation || "未知位置" }} · {{ session.ipAddressMasked || "未知 IP" }} · {{ formatSecurityDateTime(session.lastActiveAt) }}</span>
          </div>
          <n-popconfirm
            v-if="!session.isCurrent"
            positive-text="确认撤销"
            negative-text="取消"
            :positive-button-props="{ type: 'error' }"
            :disabled="revokingId === session.sessionId"
            @positive-click="handleRevoke(session.sessionId)"
          >
            <template #trigger>
              <n-button
                secondary
                type="error"
                :loading="revokingId === session.sessionId"
                :disabled="revokingId === session.sessionId"
                :data-testid="`revoke-session-${session.sessionId}`"
              >
                撤销会话
              </n-button>
            </template>
            <template #header>
              撤销 {{ session.deviceName || "未知设备" }} 的会话？
            </template>
            该设备上的登录会话将立即失效，用户需要重新登录。
          </n-popconfirm>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.card {
  border: 1px solid var(--up-line);
  border-radius: var(--up-radius-md);
  background: var(--up-surface);
  box-shadow: var(--up-card-shadow);
  padding: 26px;
}

.session-list { display: grid; }
.session-row { display: flex; align-items: center; gap: 16px; padding: 20px 0; border-top: 1px solid var(--up-line-soft); }
.session-row:first-child { border-top: 0; }

.device-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: none;
  place-items: center;
  border-radius: 13px;
  color: var(--up-brand);
  background: var(--up-brand-soft);
  font-size: 14px;
  font-weight: 750;
}

.session-copy { min-width: 0; flex: 1; }
.session-title { display: flex; align-items: center; gap: 9px; }
.session-title h2 { margin: 0; font-size: 14px; }
.session-copy p { margin: 5px 0; color: var(--up-muted); font-size: 12px; line-height: 1.5; }
.session-copy > span { color: var(--up-muted-soft); font-size: 12px; }

@media (max-width: 760px) {
  .card { padding: 20px 16px; }
  .session-row { align-items: flex-start; flex-wrap: wrap; }
}
</style>
