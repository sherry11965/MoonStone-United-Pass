<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin-side step-up reauthentication form (password -> optional MFA -> one-time target-bound grant)
-->

<script setup lang="ts">
import type { AdminReauthenticationAction } from "@/features/account/types";
import { useAdminReauthenticationFlow } from "@/features/admin/composables/useAdminReauthenticationFlow";

/**
 * Admin-domain step-up ceremony form, maintained independently from the
 * account-domain `AccountReauthenticationForm` (frozen behaviour:
 * `docs/api-contracts.md` §高危操作重认证). The grant is single-use and bound
 * to the declared action/target; it is handed to `performGranted` together
 * with the ceremony AbortSignal so the caller attaches it as
 * `X-Reauthentication-Token` on exactly one mutating request.
 */
const props = withDefaults(
  defineProps<{
    action: AdminReauthenticationAction;
    target: string;
    submitLabel: string;
    operationError: string;
    destructive?: boolean;
    performGranted: (reauthToken: string, signal: AbortSignal) => Promise<void>;
  }>(),
  { destructive: false },
);

const emit = defineEmits<{ cancel: [] }>();

// The closure reads the latest props on every call so the form stays correct
// across prop updates without re-creating the ceremony state.
const flow = useAdminReauthenticationFlow({
  get action() { return props.action; },
  get target() { return props.target; },
  get operationError() { return props.operationError; },
  get performGranted() { return props.performGranted; },
});

function handleCancel(): void {
  flow.abort();
  emit("cancel");
}

defineExpose({ abort: flow.abort });
</script>

<template>
  <div v-if="flow.challenge.value !== null" class="reauth-form" data-testid="admin-reauth-challenge">
    <div v-if="flow.challenge.value.availableMethods.length > 1" class="reauth-actions method-switch">
      <n-button
        v-for="availableMethod in flow.challenge.value.availableMethods"
        :key="availableMethod"
        :type="flow.method.value === availableMethod ? 'primary' : 'default'"
        :secondary="flow.method.value !== availableMethod"
        :disabled="flow.isSubmitting.value"
        @click="() => { flow.method.value = availableMethod; flow.error.value = undefined; }"
      >
        {{ availableMethod === "totp" ? "动态验证码" : "通行密钥" }}
      </n-button>
    </div>
    <label v-if="flow.method.value === 'totp'" class="reauth-field" :for="`admin-reauth-totp-${action}`">
      <span>动态验证码</span>
      <n-input
        :id="`admin-reauth-totp-${action}`"
        v-model:value="flow.totpCode.value"
        :maxlength="8"
        autocomplete="one-time-code"
        :disabled="flow.isSubmitting.value"
      />
    </label>
    <n-alert v-if="flow.error.value" type="error" :show-icon="false" class="reauth-error" role="alert">
      {{ flow.error.value }}
    </n-alert>
    <div class="reauth-actions">
      <n-button :disabled="flow.isSubmitting.value" @click="handleCancel">取消</n-button>
      <n-button
        :type="destructive ? 'error' : 'primary'"
        :loading="flow.isSubmitting.value"
        :disabled="flow.isSubmitting.value || (flow.method.value === 'totp' && flow.totpCode.value.length === 0)"
        data-testid="admin-reauth-complete-mfa"
        @click="flow.completeMfa()"
      >
        {{ flow.method.value === "totp" ? "验证验证码" : "使用通行密钥验证" }}
      </n-button>
    </div>
  </div>

  <form v-else class="reauth-form" method="post" data-testid="admin-reauth-password" @submit.prevent="flow.requestGrant()">
    <label class="reauth-field" :for="`admin-reauth-password-${action}`">
      <span>当前密码</span>
      <n-input
        :id="`admin-reauth-password-${action}`"
        v-model:value="flow.password.value"
        type="password"
        show-password-on="click"
        autocomplete="current-password"
        :disabled="flow.isSubmitting.value"
        data-testid="admin-reauth-password-input"
        @update:value="flow.error.value = undefined"
      />
    </label>
    <p class="reauth-notice">密码仅用于本次重新验证，不会包含在后续管理操作请求中。</p>
    <n-alert v-if="flow.error.value" type="error" :show-icon="false" class="reauth-error" role="alert">
      {{ flow.error.value }}
    </n-alert>
    <div class="reauth-actions">
      <n-button :disabled="flow.isSubmitting.value" @click="handleCancel">取消</n-button>
      <n-button
        attr-type="submit"
        :type="destructive ? 'error' : 'primary'"
        :loading="flow.isSubmitting.value"
        :disabled="flow.isSubmitting.value || flow.password.value.length === 0"
        data-testid="admin-reauth-submit"
      >
        {{ submitLabel }}
      </n-button>
    </div>
  </form>
</template>

<style scoped>
.reauth-form { display: grid; gap: 18px; }
.reauth-field { display: grid; gap: 8px; }
.reauth-field > span { color: var(--up-ink-secondary); font-size: 12px; font-weight: 620; }

.reauth-notice {
  margin: 0;
  padding: 11px 13px;
  border-radius: 9px;
  color: var(--up-muted);
  background: var(--up-surface-subtle);
  font-size: 12px;
  line-height: 1.6;
}

.reauth-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
.method-switch { justify-content: flex-start; }
</style>
