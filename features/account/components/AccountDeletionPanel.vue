<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Account deletion panel — 30-day cooling-period state machine (request / cancel)
//

import { onScopeDispose, ref } from "vue";
import type { AccountDeletion } from "@/features/account/types";
import AccountReauthenticationForm from "@/features/account/components/AccountReauthenticationForm.vue";
import { useAccountDeletion } from "@/features/account/composables/useAccountDeletion";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import { useMessage } from "naive-ui";

const props = defineProps<{
  userId: string;
  initialDeletion: AccountDeletion;
}>();

const message = useMessage();

const {
  deletion,
  isCancelling,
  mayRequest,
  mayCancel,
  applyRequestedDeletion,
  cancelDeletion,
} = useAccountDeletion(props.initialDeletion);

const isDialogOpen = ref(false);
const reauthFormRef = ref<InstanceType<typeof AccountReauthenticationForm>>();

onScopeDispose(() => {
  reauthFormRef.value?.abort();
});

function closeDialog(): void {
  reauthFormRef.value?.abort();
  isDialogOpen.value = false;
}

async function requestDeletion(reauthToken: string, signal: AbortSignal): Promise<void> {
  await applyRequestedDeletion(reauthToken, signal);
  isDialogOpen.value = false;
  message.success("注销申请已提交。冷静期内可随时取消。");
}

async function handleCancelDeletion(): Promise<void> {
  const settled = await cancelDeletion();
  if (settled) {
    message.success("注销申请已取消，账户不会被删除。");
  } else {
    message.error("无法取消注销申请。申请可能已进入执行阶段，请刷新后确认。");
  }
}

function deletionStatusLabel(status: Exclude<AccountDeletion["status"], "none">): string {
  return {
    pending: "冷静期中",
    processing: "正在删除身份账户",
    provider_deleted: "正在清理本地数据",
    completed: "已完成",
    cancelled: "已取消",
    failed: "需要重试",
  }[status];
}
</script>

<template>
  <div>
    <n-alert type="warning" :show-icon="false" class="cooling-warning">
      注销不是即时操作：提交后有 30 天冷静期。到期后系统会删除身份提供商账户、撤销会话与授权，并匿名化本地个人信息。审计记录仅保留必要的操作证明。
    </n-alert>

    <section class="card danger-card">
      <div>
        <p class="eyebrow">Account deletion</p>
        <h2>永久注销账户</h2>
        <p class="description">执行完成后无法恢复账户、员工档案、身份关联或应用授权。</p>
      </div>
      <n-button v-if="mayRequest" type="error" data-testid="request-account-deletion" @click="isDialogOpen = true">
        申请注销
      </n-button>
    </section>

    <section v-if="deletion.status !== 'none'" class="status-card" aria-live="polite">
      <h2>注销申请状态</h2>
      <dl class="details">
        <div><dt>状态</dt><dd data-testid="deletion-status">{{ deletionStatusLabel(deletion.status) }}</dd></div>
        <div><dt>申请时间</dt><dd>{{ formatSecurityDateTime(deletion.requestedAt) }}</dd></div>
        <div><dt>计划执行</dt><dd>{{ formatSecurityDateTime(deletion.executeAfter) }}</dd></div>
      </dl>
      <n-button
        v-if="mayCancel"
        secondary
        :loading="isCancelling"
        :disabled="isCancelling"
        data-testid="cancel-account-deletion"
        @click="handleCancelDeletion"
      >
        取消注销申请
      </n-button>
      <p v-if="deletion.status === 'processing' || deletion.status === 'provider_deleted'" class="muted">
        注销已进入执行阶段，无法再取消。系统会以可重试状态机完成清理。
      </p>
    </section>

    <n-modal
      v-model:show="isDialogOpen"
      preset="card"
      title="确认申请注销账户"
      :mask-closable="false"
      :close-on-esc="false"
      :style="{ width: '520px', maxWidth: 'calc(100vw - 32px)' }"
      @update:show="(visible: boolean) => { if (!visible) closeDialog(); }"
    >
      <n-alert type="error" :show-icon="false" class="dialog-warning">
        继续后将启动 30 天冷静期。冷静期结束且未取消时，账户删除不可恢复。
      </n-alert>
      <div class="reauth-block">
        <AccountReauthenticationForm
          v-if="isDialogOpen"
          ref="reauthFormRef"
          action="account.delete"
          :target="userId"
          submit-label="验证并申请注销"
          :perform-granted="requestDeletion"
          operation-error="注销申请失败。授权不会被重复使用，请重新验证后再试。"
          destructive
          @cancel="closeDialog"
        />
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.cooling-warning { margin-bottom: 18px; }

.card,
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 18px;
  padding: 26px;
  border: 1px solid var(--up-line);
  border-radius: var(--up-radius-md);
  background: var(--up-surface);
  box-shadow: var(--up-card-shadow);
}

.card h2,
.status-card h2 { margin: 4px 0 0; font-size: 17px; }

.danger-card { border-color: var(--up-danger-line); }

.eyebrow {
  margin: 0;
  color: var(--up-brand);
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.description,
.muted { margin: 8px 0 0; color: var(--up-muted); font-size: 13px; line-height: 1.7; }

.status-card { display: block; }
.details { display: grid; gap: 0; margin: 16px 0; }
.details > div { display: grid; grid-template-columns: 110px 1fr; gap: 14px; padding: 11px 0; border-top: 1px solid var(--up-line-soft); }
.details dt { color: var(--up-muted); font-size: 12px; }
.details dd { margin: 0; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }

.dialog-warning { margin-bottom: 4px; }
.reauth-block { margin-top: 18px; }

@media (max-width: 760px) {
  .card { align-items: stretch; flex-direction: column; }
  .details > div { grid-template-columns: 1fr; gap: 6px; }
}
</style>
