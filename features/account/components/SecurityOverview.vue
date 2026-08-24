<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Security overview panel — Vue port of security-overview.tsx
//

import { computed, ref } from "vue";
import type { SecuritySummary } from "@/features/account/types";
import AccountPageHeader from "@/features/account/components/AccountPageHeader.vue";
import AccountStatusBadge from "@/features/account/components/AccountStatusBadge.vue";
import SecurityFactorRow from "@/features/account/components/SecurityFactorRow.vue";
import PasswordChangeModal from "@/features/account/components/PasswordChangeModal.vue";
import TotpEnrollModal from "@/features/account/components/TotpEnrollModal.vue";
import TotpRemoveModal from "@/features/account/components/TotpRemoveModal.vue";
import PasskeyEnrollModal from "@/features/account/components/PasskeyEnrollModal.vue";
import PasskeyRemoveModal from "@/features/account/components/PasskeyRemoveModal.vue";
import RecoveryCodesModal from "@/features/account/components/RecoveryCodesModal.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import { browserCommands } from "@/shared/commands/browser-commands";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { useMessage } from "naive-ui";

type ActiveModal =
  | { type: "password" }
  | { type: "totp_enroll" }
  | { type: "totp_remove" }
  | { type: "passkey_enroll" }
  | { type: "passkey_remove"; passkeyId: string }
  | { type: "recovery_codes" }
  | null;

const props = defineProps<{
  securitySummary: SecuritySummary;
  /** Re-runs the authoritative server query (real data source only). */
  refreshSummary?: () => Promise<void> | void;
}>();

const message = useMessage();

const activeModal = ref<ActiveModal>(null);
const isRevokingSessions = ref(false);
const mockSummary = ref<SecuritySummary>(props.securitySummary);

const displayedSummary = computed<SecuritySummary>(() =>
  USE_MOCK_DATA_SOURCE ? mockSummary.value : props.securitySummary,
);

const removingPasskeyId = computed(() =>
  activeModal.value?.type === "passkey_remove" ? activeModal.value.passkeyId : "",
);

function refreshAuthoritativeState(): void {
  if (!USE_MOCK_DATA_SOURCE) void props.refreshSummary?.();
}

function closeActiveModal(): void {
  activeModal.value = null;
}

async function handleRevokeOtherSessions(): Promise<void> {
  isRevokingSessions.value = true;
  try {
    const { revoked } = await browserCommands.revokeOtherSessions();
    message.success(revoked === 0 ? "没有需要撤销的其他会话。" : `已撤销 ${revoked} 个其他会话。`);
  } catch {
    message.error("撤销会话失败，请稍后重试。");
  } finally {
    isRevokingSessions.value = false;
  }
}

function handlePasswordSuccess(): void {
  if (USE_MOCK_DATA_SOURCE) {
    mockSummary.value = { ...mockSummary.value, password: { set: true } };
  }
  refreshAuthoritativeState();
  closeActiveModal();
}

function handleTotpEnrollSuccess(): void {
  if (USE_MOCK_DATA_SOURCE) {
    mockSummary.value = { ...mockSummary.value, totp: { enabled: true } };
  }
  refreshAuthoritativeState();
  closeActiveModal();
}

function handleTotpRemoveSuccess(): void {
  if (USE_MOCK_DATA_SOURCE) {
    mockSummary.value = { ...mockSummary.value, totp: { enabled: false } };
  }
  refreshAuthoritativeState();
  closeActiveModal();
}

function handlePasskeyEnrollSuccess(passkeyId: string): void {
  if (USE_MOCK_DATA_SOURCE) {
    mockSummary.value = {
      ...mockSummary.value,
      passkeys: [...mockSummary.value.passkeys, { passkeyId, state: "active", createdAt: new Date().toISOString() }],
    };
  }
  refreshAuthoritativeState();
  closeActiveModal();
}

function handlePasskeyRemoveSuccess(): void {
  const passkeyId = removingPasskeyId.value;
  if (USE_MOCK_DATA_SOURCE) {
    mockSummary.value = {
      ...mockSummary.value,
      passkeys: mockSummary.value.passkeys.filter((passkey) => passkey.passkeyId !== passkeyId),
    };
  }
  refreshAuthoritativeState();
  closeActiveModal();
}
</script>

<template>
  <div>
    <AccountPageHeader
      eyebrow="Account security"
      title="登录与安全"
      description="管理登录凭据和多重验证方式。通行密钥变更需要重新验证身份。"
    />

    <section class="card">
      <div class="card-heading">
        <div>
          <span class="label">AUTHENTICATION</span>
          <h2>验证方式</h2>
        </div>
        <AccountStatusBadge
          :label="USE_MOCK_DATA_SOURCE ? 'Mock 预览状态' : '身份提供方实时状态'"
          :tone="USE_MOCK_DATA_SOURCE ? 'info' : 'neutral'"
        />
      </div>
      <div class="factor-list">
        <SecurityFactorRow
          icon="密"
          label="账户密码"
          :status-label="displayedSummary.password.set ? '已设置' : '未设置'"
          :active="displayedSummary.password.set"
          description="用于基础凭据验证，建议避免与其他服务复用。"
        >
          <template #action>
            <n-button secondary data-testid="open-password-modal" @click="activeModal = { type: 'password' }">
              修改密码
            </n-button>
          </template>
        </SecurityFactorRow>

        <SecurityFactorRow
          icon="验"
          label="身份验证器"
          :status-label="displayedSummary.totp.enabled ? '已启用' : '未启用'"
          :active="displayedSummary.totp.enabled"
          description="使用身份验证器生成的一次性动态验证码。"
        >
          <template #action>
            <n-button
              v-if="displayedSummary.totp.enabled"
              secondary
              type="error"
              data-testid="open-totp-remove-modal"
              @click="activeModal = { type: 'totp_remove' }"
            >
              删除
            </n-button>
            <n-button
              v-else
              secondary
              type="primary"
              data-testid="open-totp-enroll-modal"
              @click="activeModal = { type: 'totp_enroll' }"
            >
              设置
            </n-button>
          </template>
        </SecurityFactorRow>

        <SecurityFactorRow
          v-for="passkey in displayedSummary.passkeys"
          :key="passkey.passkeyId"
          icon="钥"
          label="通行密钥"
          :status-label="passkey.state === 'active' ? '已启用' : '等待确认'"
          :active="passkey.state === 'active'"
          :description="`凭据标识：${passkey.passkeyId}`"
          :detail="passkey.createdAt === null ? '添加时间：未知' : `添加时间：${formatSecurityDateTime(passkey.createdAt)}`"
        >
          <template #action>
            <n-button
              secondary
              type="error"
              :data-testid="`remove-passkey-${passkey.passkeyId}`"
              @click="activeModal = { type: 'passkey_remove', passkeyId: passkey.passkeyId }"
            >
              删除
            </n-button>
          </template>
        </SecurityFactorRow>

        <SecurityFactorRow
          icon="钥"
          :label="displayedSummary.passkeys.length === 0 ? '尚未添加通行密钥' : '添加其他通行密钥'"
          :status-label="displayedSummary.passkeys.length === 0 ? '建议启用' : '可添加'"
          :active="false"
          description="使用设备生物识别或安全密钥进行抗钓鱼验证。"
        >
          <template #action>
            <n-button secondary type="primary" data-testid="open-passkey-enroll-modal" @click="activeModal = { type: 'passkey_enroll' }">
              添加
            </n-button>
          </template>
        </SecurityFactorRow>
      </div>
    </section>

    <section class="card danger-card">
      <div>
        <h2>安全恢复</h2>
        <p>撤销除当前设备以外的全部会话。此操作需要确认，执行后其他设备将被立即登出。</p>
      </div>
      <n-popconfirm
        positive-text="确认撤销"
        negative-text="取消"
        :positive-button-props="{ type: 'error' }"
        :disabled="isRevokingSessions"
        @positive-click="handleRevokeOtherSessions"
      >
        <template #trigger>
          <n-button secondary type="error" :loading="isRevokingSessions" :disabled="isRevokingSessions" data-testid="revoke-other-sessions">
            撤销其他会话
          </n-button>
        </template>
        <template #header>
          撤销其他全部会话？
        </template>
        其他设备上的登录会话将立即失效，用户需要重新登录。当前设备不受影响。
      </n-popconfirm>
    </section>

    <section v-if="USE_MOCK_DATA_SOURCE" class="card danger-card">
      <div>
        <h2>恢复代码</h2>
        <p>生成一次性恢复代码，在无法使用常规验证方式时用于恢复账户访问。每个代码仅可使用一次。</p>
      </div>
      <n-button secondary type="primary" data-testid="open-recovery-codes-modal" @click="activeModal = { type: 'recovery_codes' }">
        生成恢复代码
      </n-button>
    </section>

    <PasswordChangeModal
      v-if="activeModal?.type === 'password'"
      @cancel="closeActiveModal"
      @success="handlePasswordSuccess"
    />
    <TotpEnrollModal
      v-if="activeModal?.type === 'totp_enroll'"
      @cancel="closeActiveModal"
      @success="handleTotpEnrollSuccess"
    />
    <TotpRemoveModal
      v-if="activeModal?.type === 'totp_remove'"
      @cancel="closeActiveModal"
      @success="handleTotpRemoveSuccess"
    />
    <PasskeyEnrollModal
      v-if="activeModal?.type === 'passkey_enroll'"
      @cancel="closeActiveModal"
      @success="handlePasskeyEnrollSuccess"
    />
    <PasskeyRemoveModal
      v-if="activeModal?.type === 'passkey_remove'"
      :passkey-id="removingPasskeyId"
      @cancel="closeActiveModal"
      @success="handlePasskeyRemoveSuccess"
    />
    <RecoveryCodesModal
      v-if="activeModal?.type === 'recovery_codes'"
      @cancel="closeActiveModal"
      @complete="closeActiveModal"
    />
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

.card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
.card-heading h2,
.danger-card h2 { margin: 4px 0 0; font-size: 17px; }
.label { color: var(--up-muted-soft); font-size: 12px; font-weight: 750; letter-spacing: 0.13em; }

.factor-list { display: grid; }

.danger-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: 20px;
  margin-bottom: 8px;
  border-color: var(--up-danger-line);
}

.danger-card p { margin: 7px 0 0; color: var(--up-muted); font-size: 12px; line-height: 1.6; }

@media (max-width: 760px) {
  .card { padding: 20px 16px; }
  .danger-card { align-items: stretch; flex-direction: column; }
}
</style>
