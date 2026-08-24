<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Provider sync-conflict rows (step-up explicit link / plain ignore)
-->

<script setup lang="ts">
// Vue port of the frozen `provider-detail.tsx` ConflictRow: resolving a
// conflict requires step-up (`provider.identity.link` bound to the
// conflictId) with an explicit target userId, while ignoring is a plain
// mutation. Both keep the row rendered in place and only flip its local
// status badge (legacy parity: no page reload on conflict resolution).
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import AdminReauthenticationModal from "@/features/admin/components/AdminReauthenticationModal.vue";
import type { SyncConflict } from "@/features/admin/types";

const props = defineProps<{ conflict: SyncConflict }>();

const message = useMessage();
const resolving = ref(false);
const selectedUserId = ref(props.conflict.matchedUserId ?? "");
const status = ref(props.conflict.status);
const reauthVisible = ref(false);

function matchReasonLabel(reason: SyncConflict["matchReason"], detailed: boolean): string {
  if (reason === "email") return detailed ? "邮箱匹配" : "邮箱";
  if (reason === "name") return detailed ? "姓名匹配" : "姓名";
  return "手动";
}

function handleResolve(): void {
  if (!selectedUserId.value) {
    message.warning("请选择要关联的用户。");
    return;
  }
  reauthVisible.value = true;
}

async function resolveWithGrant(reauthToken: string, signal: AbortSignal): Promise<void> {
  resolving.value = true;
  try {
    await browserCommands.resolveSyncConflict(props.conflict.conflictId, selectedUserId.value, reauthToken, { signal });
    status.value = "resolved";
    message.success("冲突已解决，外部身份已关联到指定用户。");
  } finally {
    resolving.value = false;
  }
}

async function handleIgnore(): Promise<void> {
  resolving.value = true;
  try {
    await browserCommands.ignoreSyncConflict(props.conflict.conflictId);
    status.value = "ignored";
    message.success("冲突已忽略。");
  } catch {
    message.error("操作失败，请重试。");
  } finally {
    resolving.value = false;
  }
}
</script>

<template>
  <div v-if="status !== 'pending'" class="list-item">
    <div>
      <strong>{{ conflict.externalName }} · {{ conflict.externalEmail }}</strong>
      <p>匹配原因：{{ matchReasonLabel(conflict.matchReason, false) }}</p>
      <AdminStatusBadge
        :label="status === 'resolved' ? '已解决' : '已忽略'"
        :tone="status === 'resolved' ? 'success' : 'neutral'"
      />
    </div>
  </div>

  <div v-else class="list-item pending-item">
    <div class="conflict-info">
      <strong>{{ conflict.externalName }} · {{ conflict.externalEmail }}</strong>
      <p>飞书 Subject：{{ conflict.externalSubject }}</p>
      <p>匹配原因：{{ matchReasonLabel(conflict.matchReason, true) }}</p>
      <p v-if="conflict.matchedUserName">
        疑似匹配：{{ conflict.matchedUserName }}（{{ conflict.matchedUserId }}）
      </p>
      <p>检测时间：{{ formatSecurityDateTime(conflict.detectedAt) }}</p>
    </div>

    <div class="conflict-actions">
      <n-input
        v-model:value="selectedUserId"
        placeholder="输入既有稳定 userId"
        aria-label="选择关联用户"
        :disabled="resolving"
      />
      <div class="conflict-buttons">
        <n-button
          type="primary"
          size="small"
          :loading="resolving"
          :disabled="resolving"
          @click="handleResolve"
        >
          确认关联
        </n-button>
        <n-button
          quaternary
          type="error"
          size="small"
          :loading="resolving"
          :disabled="resolving"
          @click="handleIgnore"
        >
          忽略
        </n-button>
      </div>
    </div>

    <AdminReauthenticationModal
      :show="reauthVisible"
      title="重新认证并建立身份关联"
      action="provider.identity.link"
      :target="conflict.conflictId"
      submit-label="验证并确认关联"
      operation-error="身份关联未完成；此次单次授权不会被重复使用，请重新验证后再试。"
      :perform-granted="resolveWithGrant"
      @update:show="(value) => { if (!value) reauthVisible = false; }"
    >
      <p class="reauth-bound-notice">外部 Subject 将显式绑定到所选稳定 userId；邮箱和姓名只作为候选提示。</p>
    </AdminReauthenticationModal>
  </div>
</template>

<style scoped>
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

.pending-item {
  flex-direction: column;
  align-items: stretch;
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

.conflict-actions {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.conflict-buttons { display: flex; gap: 8px; }

.reauth-bound-notice {
  margin: 0 0 16px;
  color: var(--up-ink-secondary);
  font-size: 13px;
  line-height: 1.7;
}
</style>
