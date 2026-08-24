<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Password change modal (details -> reauthentication -> mutate)
//

import { ref } from "vue";
import AccountReauthenticationForm from "@/features/account/components/AccountReauthenticationForm.vue";
import { browserCommands } from "@/shared/commands/browser-commands";
import { isApiError } from "@/shared/api-error";
import { useMessage } from "naive-ui";

const PASSWORD_MIN_LENGTH = 12;

const emit = defineEmits<{
  cancel: [];
  success: [];
}>();

const message = useMessage();

const phase = ref<"details" | "reauth">("details");
const newPassword = ref("");
const confirmPassword = ref("");
const fieldError = ref<string>();
const reauthFormRef = ref<InstanceType<typeof AccountReauthenticationForm>>();

function handleDetails(): void {
  if (newPassword.value.length < PASSWORD_MIN_LENGTH) {
    fieldError.value = `新密码至少需要 ${PASSWORD_MIN_LENGTH} 个字符。`;
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    fieldError.value = "两次输入的新密码不一致。";
    return;
  }

  fieldError.value = undefined;
  phase.value = "reauth";
}

function handleCancel(): void {
  reauthFormRef.value?.abort();
  emit("cancel");
}

async function changePassword(reauthToken: string, signal: AbortSignal): Promise<void> {
  try {
    await browserCommands.changePassword(newPassword.value, reauthToken, { signal });
  } catch (error) {
    if (isApiError(error) && error.kind === "unauthorized") {
      newPassword.value = "";
      confirmPassword.value = "";
      message.info("账户安全状态已变更，请重新登录以确认凭据状态。");
      await navigateTo("/login");
      await refreshNuxtData();
      return;
    }
    throw error;
  }
  newPassword.value = "";
  confirmPassword.value = "";
  message.success("密码已更新，其他登录会话已失效。");
  emit("success");
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    title="修改密码"
    :mask-closable="false"
    :style="{ width: '480px', maxWidth: 'calc(100vw - 32px)' }"
    @update:show="(visible: boolean) => { if (!visible) handleCancel(); }"
  >
    <form v-if="phase === 'details'" class="profile-form" method="post" @submit.prevent="handleDetails">
      <label class="profile-field" for="new-password">
        <span>新密码</span>
        <n-input
          id="new-password"
          v-model:value="newPassword"
          type="password"
          show-password-on="click"
          :placeholder="`至少 ${PASSWORD_MIN_LENGTH} 个字符`"
          autocomplete="new-password"
          data-testid="password-new"
          @update:value="fieldError = undefined"
        />
        <small>至少 {{ PASSWORD_MIN_LENGTH }} 个字符，请勿使用其他服务的密码。</small>
      </label>
      <label class="profile-field" for="confirm-new-password">
        <span>确认新密码</span>
        <n-input
          id="confirm-new-password"
          v-model:value="confirmPassword"
          type="password"
          show-password-on="click"
          autocomplete="new-password"
          :status="fieldError ? 'error' : undefined"
          :input-props="{ 'aria-invalid': Boolean(fieldError), 'aria-errormessage': fieldError ? 'password-change-error' : undefined }"
          data-testid="password-confirm"
          @update:value="fieldError = undefined"
        />
        <small v-if="fieldError" id="password-change-error" class="profile-error" role="alert">
          {{ fieldError }}
        </small>
      </label>
      <p class="profile-notice">
        下一步将重新验证当前密码；新密码只会发送到最终密码修改请求。
      </p>
      <div class="profile-actions">
        <n-button type="button" @click="handleCancel">取消</n-button>
        <n-button attr-type="submit" type="primary" data-testid="password-next">下一步</n-button>
      </div>
    </form>
    <AccountReauthenticationForm
      v-else
      ref="reauthFormRef"
      action="account.password.change"
      target=""
      submit-label="验证并更新密码"
      :perform-granted="changePassword"
      operation-error="密码更新失败，请重新开始。此次授权不会被重复使用。"
      @cancel="handleCancel"
    />
  </n-modal>
</template>

<style scoped>
.profile-form { display: grid; gap: 18px; padding-bottom: 16px; }
.profile-field { display: grid; gap: 8px; }
.profile-field > span { color: var(--up-ink-secondary); font-size: 12px; font-weight: 620; }
.profile-field > small { color: var(--up-muted-soft); font-size: 12px; line-height: 1.55; }
.profile-field > .profile-error { color: var(--up-danger); }

.profile-notice {
  margin: 0;
  padding: 11px 13px;
  border-radius: 9px;
  color: var(--up-muted);
  background: var(--up-surface-subtle);
  font-size: 12px;
  line-height: 1.6;
}

.profile-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
</style>
