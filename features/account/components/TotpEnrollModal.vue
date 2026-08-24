<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: TOTP enrollment modal (reauthentication -> secret display -> confirm code)
//

import { ref } from "vue";
import type { TotpEnrollment } from "@/features/account/types";
import AccountReauthenticationForm from "@/features/account/components/AccountReauthenticationForm.vue";
import { browserCommands } from "@/shared/commands/browser-commands";
import { isApiError } from "@/shared/api-error";
import { useMessage } from "naive-ui";

const emit = defineEmits<{
  cancel: [];
  success: [];
}>();

const message = useMessage();

const enrollment = ref<TotpEnrollment | null>(null);
const code = ref("");
const fieldError = ref<string>();
const isSubmitting = ref(false);
const reauthFormRef = ref<InstanceType<typeof AccountReauthenticationForm>>();

async function handleCancel(): Promise<void> {
  if (isSubmitting.value) return;
  reauthFormRef.value?.abort();
  if (enrollment.value !== null) {
    isSubmitting.value = true;
    try {
      await browserCommands.cancelTotpEnrollment(enrollment.value.enrollmentToken);
    } catch {
      message.error("无法取消当前绑定，请重试后再关闭。");
      isSubmitting.value = false;
      return;
    }
  }
  enrollment.value = null;
  code.value = "";
  emit("cancel");
}

async function beginEnrollment(reauthToken: string, signal: AbortSignal): Promise<void> {
  enrollment.value = await browserCommands.beginTotpEnrollment(reauthToken, { signal });
}

async function handleConfirm(): Promise<void> {
  if (!/^\d{6}$/u.test(code.value.trim())) {
    fieldError.value = "请输入 6 位数字验证码。";
    return;
  }

  fieldError.value = undefined;
  isSubmitting.value = true;
  try {
    if (enrollment.value === null) return;
    await browserCommands.confirmTotpEnrollment({
      enrollmentToken: enrollment.value.enrollmentToken,
      code: code.value.trim(),
    });
    enrollment.value = null;
    code.value = "";
    message.success("身份验证器已绑定。");
    emit("success");
  } catch (error) {
    if (isApiError(error) && error.kind === "validation") {
      enrollment.value = null;
      code.value = "";
      fieldError.value = "验证码错误，本次绑定已结束，请重新验证后开始新的绑定。";
    } else {
      fieldError.value = "确认失败，请稍后重试当前验证码。";
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    :title="enrollment === null ? '绑定身份验证器' : '确认身份验证器'"
    :mask-closable="false"
    :style="{ width: '480px', maxWidth: 'calc(100vw - 32px)' }"
    @update:show="(visible: boolean) => { if (!visible) void handleCancel(); }"
  >
    <div v-if="enrollment === null" class="profile-form">
      <p class="profile-notice">
        绑定身份验证器后，登录时需要输入验证器应用生成的 6 位动态验证码。
      </p>
      <n-alert v-if="fieldError" type="error" :show-icon="false" role="alert">
        {{ fieldError }}
      </n-alert>
      <AccountReauthenticationForm
        ref="reauthFormRef"
        action="account.totp.enroll"
        target=""
        submit-label="验证并生成密钥"
        :perform-granted="beginEnrollment"
        operation-error="无法启动身份验证器绑定，请重新开始。此次授权不会被重复使用。"
        @cancel="() => void handleCancel()"
      />
    </div>

    <form v-else class="profile-form" method="post" @submit.prevent="handleConfirm">
      <div class="totp-secret">
        <p>使用验证器应用扫描以下密钥或手动输入：</p>
        <code data-testid="totp-secret">{{ enrollment.secret }}</code>
        <a v-if="enrollment.otpauthUri" :href="enrollment.otpauthUri">
          在身份验证器应用中打开
        </a>
      </div>
      <label class="profile-field" for="totp-code">
        <span>验证器动态码</span>
        <n-input
          id="totp-code"
          :value="code"
          placeholder="6 位数字"
          inputmode="numeric"
          autocomplete="one-time-code"
          :maxlength="6"
          :status="fieldError ? 'error' : undefined"
          :disabled="isSubmitting"
          :input-props="{ 'aria-invalid': Boolean(fieldError), 'aria-errormessage': fieldError ? 'totp-enroll-error' : undefined }"
          data-testid="totp-confirm-code"
          @update:value="(value: string) => { code = value.replace(/\D/g, '').slice(0, 6); fieldError = undefined; }"
        />
        <small v-if="fieldError" id="totp-enroll-error" class="profile-error" role="alert">
          {{ fieldError }}
        </small>
      </label>
      <p class="profile-notice">密钥仅在此窗口显示；关闭后需要重新开始绑定。</p>
      <div class="profile-actions">
        <n-button :disabled="isSubmitting" @click="() => void handleCancel()">取消</n-button>
        <n-button attr-type="submit" type="primary" :loading="isSubmitting" :disabled="isSubmitting" data-testid="totp-confirm-submit">
          确认绑定
        </n-button>
      </div>
    </form>
  </n-modal>
</template>

<style scoped>
.profile-form { display: grid; gap: 18px; padding-bottom: 16px; }
.profile-field { display: grid; gap: 8px; }
.profile-field > span { color: var(--up-ink-secondary); font-size: 12px; font-weight: 620; }
.profile-error { color: var(--up-danger); font-size: 12px; }

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

.totp-secret {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--up-line);
  border-radius: 11px;
  background: var(--up-surface-subtle);
}

.totp-secret p { margin: 0; color: var(--up-muted); font-size: 12px; line-height: 1.6; }
.totp-secret code { color: var(--up-ink-secondary); font-size: 14px; font-weight: 600; word-break: break-all; }
.totp-secret a { color: var(--up-brand); font-size: 12px; font-weight: 650; }
</style>
