<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin user danger zone (step-up disable / enable confirm / step-up revoke all sessions)
-->

<script setup lang="ts">
// Vue port of the frozen `user-detail.tsx` DangerTab:
//  - disable requires step-up (`user.disable` bound to the user id; the
//    backend also revokes sessions as part of the disable),
//  - enable is a plain confirmation (not on the 8 high-risk actions),
//  - revoke-all-sessions requires step-up (`user.sessions.revoke`).
// Both step-up grants are single-use and target-bound; the ceremony is
// aborted when the modal closes.
import { computed, ref } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import AdminReauthenticationModal from "@/features/admin/components/AdminReauthenticationModal.vue";
import type { UserDetail } from "@/features/admin/types";

const props = defineProps<{ detail: UserDetail }>();

const route = useRoute();
const message = useMessage();
const dialog = useDialog();

const isActive = computed(() => props.detail.status === "active");
const toggling = ref(false);
const revokingSessions = ref(false);
const reauthAction = ref<"disable" | "sessions" | null>(null);

function refresh(): void {
  void navigateTo(route.fullPath, { external: true });
}

function handleToggleStatus(): void {
  if (isActive.value) {
    reauthAction.value = "disable";
    return;
  }
  dialog.info({
    title: "启用此用户？",
    content: "恢复后用户可重新登录。已有授权保持原状态。",
    positiveText: "确认启用",
    negativeText: "取消",
    onPositiveClick: async () => {
      toggling.value = true;
      try {
        await browserCommands.updateUserStatus(props.detail.userId, "active");
        message.success("用户已启用。");
        refresh();
      } catch {
        message.error("操作失败，请重试。");
      } finally {
        toggling.value = false;
      }
    },
  });
}

async function runHighRiskOperation(reauthToken: string, signal: AbortSignal): Promise<void> {
  if (reauthAction.value === "disable") {
    toggling.value = true;
    try {
      await browserCommands.updateUserStatus(props.detail.userId, "disabled", reauthToken, { signal });
      message.success("用户已停用，关联会话撤销已启动。");
    } finally {
      toggling.value = false;
    }
  } else if (reauthAction.value === "sessions") {
    revokingSessions.value = true;
    try {
      await browserCommands.revokeUserSessions(props.detail.userId, reauthToken, { signal });
      message.success("已撤销该用户的所有会话。");
    } finally {
      revokingSessions.value = false;
    }
  }
  reauthAction.value = null;
  refresh();
}
</script>

<template>
  <div class="danger-zone">
    <n-alert type="warning" :show-icon="false" class="danger-notice">
      <strong>危险操作</strong>
      以下操作会影响该用户的登录和会话。后端将强制执行并记录审计事件。
    </n-alert>

    <div class="danger-item">
      <div>
        <strong>{{ isActive ? "停用用户" : "启用用户" }}</strong>
        <p>
          {{ isActive
            ? "停用后用户将无法登录，并启动已有会话撤销；OAuth 授权记录保持不变。"
            : "恢复后用户可重新登录。" }}
        </p>
      </div>
      <n-button
        :type="isActive ? 'error' : 'primary'"
        :loading="toggling"
        @click="handleToggleStatus"
      >
        {{ isActive ? "停用用户" : "启用用户" }}
      </n-button>
    </div>

    <div class="danger-item">
      <div>
        <strong>撤销所有会话</strong>
        <p>立即撤销该用户在所有设备上的登录会话。用户需要重新登录。</p>
      </div>
      <n-button
        type="error"
        :loading="revokingSessions"
        :disabled="revokingSessions"
        @click="reauthAction = 'sessions'"
      >
        撤销所有会话
      </n-button>
    </div>

    <AdminReauthenticationModal
      :show="reauthAction !== null"
      :title="reauthAction === 'disable' ? '重新认证并停用用户' : '重新认证并撤销所有会话'"
      :action="reauthAction === 'disable' ? 'user.disable' : 'user.sessions.revoke'"
      :target="detail.userId"
      :submit-label="reauthAction === 'disable' ? '验证并停用' : '验证并撤销'"
      operation-error="操作未完成；此次单次授权不会被重复使用，请重新验证后再试。"
      destructive
      :perform-granted="runHighRiskOperation"
      @update:show="(value) => { if (!value) reauthAction = null; }"
    >
      <p class="reauth-bound-notice">
        本次授权仅绑定到用户 <strong>{{ detail.displayName }}</strong>（{{ detail.userId }}），
        且只能使用一次。
      </p>
    </AdminReauthenticationModal>
  </div>
</template>

<style scoped>
.danger-zone { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }

.danger-notice { line-height: 1.7; font-size: 13px; }
.danger-notice strong { margin-right: 8px; }

.danger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-muted);
}

.danger-item strong {
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 640;
}

.danger-item p {
  margin: 4px 0 0;
  color: var(--up-muted);
  font-size: 12px;
  line-height: 1.6;
}

.reauth-bound-notice {
  margin: 0 0 16px;
  color: var(--up-ink-secondary);
  font-size: 13px;
  line-height: 1.7;
}
</style>
