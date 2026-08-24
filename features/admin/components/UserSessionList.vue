<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin user session list with per-session revocation (write side)
-->

<script setup lang="ts">
// Vue port of the frozen `user-detail.tsx` SessionsTab write side: each
// non-current session can be revoked behind a confirmation popover; the
// revocation itself needs no step-up (per-session revocation is not on the
// 8 high-risk actions), and a successful revocation triggers a full-document
// reload to keep the legacy per-render server contract.
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import type { UserDetail } from "@/features/admin/types";

const props = defineProps<{
  userId: string;
  sessions: UserDetail["activeSessions"];
  canManage: boolean;
}>();

const route = useRoute();
const message = useMessage();
const revokingId = ref<string | null>(null);

async function handleRevoke(sessionId: string): Promise<void> {
  revokingId.value = sessionId;
  try {
    await browserCommands.revokeUserSession(props.userId, sessionId);
    message.success("会话已撤销。");
    void navigateTo(route.fullPath, { external: true });
  } catch {
    message.error("撤销会话失败，请稍后重试。");
  } finally {
    revokingId.value = null;
  }
}
</script>

<template>
  <n-empty
    v-if="sessions.length === 0"
    description="该用户当前没有活跃的登录会话。"
  />
  <div v-else class="section">
    <div v-for="session in sessions" :key="session.sessionId" class="list-item">
      <div>
        <strong>{{ session.deviceName }}</strong>
        <p>{{ formatSecurityDateTime(session.lastActiveAt) }}</p>
        <AdminStatusBadge v-if="session.isCurrent" label="当前会话" tone="success" />
      </div>
      <n-popconfirm
        v-if="canManage && !session.isCurrent"
        :positive-text="'确认撤销'"
        negative-text="取消"
        :disabled="revokingId === session.sessionId"
        @positive-click="handleRevoke(session.sessionId)"
      >
        <template #trigger>
          <n-button
            type="error"
            secondary
            :loading="revokingId === session.sessionId"
            :disabled="revokingId === session.sessionId"
          >
            撤销会话
          </n-button>
        </template>
        <div>
          <strong>撤销 {{ session.deviceName }} 的会话？</strong>
          <p>该设备上的登录会话将立即失效。</p>
        </div>
      </n-popconfirm>
    </div>
  </div>
</template>

<style scoped>
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
