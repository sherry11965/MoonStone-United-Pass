<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Contact verification modal (email/SMS code) — Vue port
//

import { computed, ref } from "vue";
import type { ContactKind } from "@/features/account/utils/contact-validation";
import { validateContactValue } from "@/features/account/utils/contact-validation";
import { browserCommands } from "@/shared/commands/browser-commands";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { useMessage } from "naive-ui";

const props = defineProps<{
  kind: ContactKind;
  currentValue: string;
}>();

const emit = defineEmits<{
  cancel: [];
  verified: [nextValue: string];
}>();

const message = useMessage();
const MOCK_VERIFICATION_CODE = "246810";

const step = ref<"request" | "verify">("request");
const contactValue = ref("");
const verificationCode = ref("");
const fieldError = ref<string>();
const isSubmitting = ref(false);
const requestId = ref<string>();

const isEmail = computed(() => props.kind === "email");
const contactLabel = computed(() => (isEmail.value ? "邮箱地址" : "手机号码"));
const normalizedContactValue = computed(() => contactValue.value.trim());

async function handleRequestCode(): Promise<void> {
  const validationError = validateContactValue(props.kind, normalizedContactValue.value);

  if (validationError) {
    fieldError.value = validationError;
    return;
  }

  if (normalizedContactValue.value === props.currentValue) {
    fieldError.value = `新${contactLabel.value}不能与当前值相同。`;
    return;
  }

  fieldError.value = undefined;
  isSubmitting.value = true;
  try {
    const result = isEmail.value
      ? await browserCommands.requestEmailChange(normalizedContactValue.value)
      : await browserCommands.requestPhoneChange(normalizedContactValue.value);
    requestId.value = result.requestId;
    step.value = "verify";
  } catch {
    message.error("发送验证码失败，请稍后重试。");
  } finally {
    isSubmitting.value = false;
  }
}

async function handleVerifyCode(): Promise<void> {
  if (!isEmail.value && USE_MOCK_DATA_SOURCE && verificationCode.value.trim() !== MOCK_VERIFICATION_CODE) {
    fieldError.value = "验证码错误，请输入页面显示的 Mock 验证码。";
    return;
  }

  if (!requestId.value) {
    fieldError.value = "验证请求已失效，请重新发起。";
    return;
  }

  fieldError.value = undefined;
  isSubmitting.value = true;
  try {
    if (isEmail.value) {
      const result = await browserCommands.verifyEmailChange(requestId.value, verificationCode.value.trim());
      emit("verified", result.email);
    } else {
      await browserCommands.verifyPhoneChange(requestId.value, verificationCode.value.trim());
      emit("verified", normalizedContactValue.value);
    }
  } catch {
    fieldError.value = "验证失败，请检查验证码或稍后重试。";
  } finally {
    isSubmitting.value = false;
  }
}

function handleBackToRequest(): void {
  step.value = "request";
  verificationCode.value = "";
  fieldError.value = undefined;
  requestId.value = undefined;
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    :title="`修改${contactLabel}`"
    :mask-closable="false"
    :style="{ width: '480px', maxWidth: 'calc(100vw - 32px)' }"
    @update:show="(visible: boolean) => { if (!visible) emit('cancel'); }"
  >
    <form v-if="step === 'request'" class="contact-form" method="post" @submit.prevent="handleRequestCode">
      <p class="contact-current">当前{{ contactLabel }}：<strong>{{ currentValue }}</strong></p>
      <label class="profile-field" :for="`new-${kind}`">
        <span>新{{ contactLabel }}</span>
        <n-input
          :id="`new-${kind}`"
          v-model:value="contactValue"
          :status="fieldError ? 'error' : undefined"
          :placeholder="isEmail ? 'new-address@example.com' : '13800138000'"
          :disabled="isSubmitting"
          :input-props="{ type: isEmail ? 'email' : 'tel', autocomplete: isEmail ? 'email' : 'tel', 'aria-invalid': Boolean(fieldError) }"
          data-testid="contact-new-value"
          @update:value="fieldError = undefined"
        />
        <small v-if="fieldError" :id="`new-${kind}-error`" class="profile-error" role="alert">
          {{ fieldError }}
        </small>
      </label>
      <p class="profile-notice">
        {{ isEmail
          ? "验证码将发送到新邮箱。完成验证后，新邮箱会立即成为登录邮箱。"
          : "手机号验证目前仍处于预览流程。" }}
      </p>
      <div class="profile-actions">
        <n-button :disabled="isSubmitting" @click="emit('cancel')">取消</n-button>
        <n-button attr-type="submit" type="primary" :loading="isSubmitting" :disabled="isSubmitting">
          发送验证码
        </n-button>
      </div>
    </form>

    <form v-else class="contact-form" method="post" @submit.prevent="handleVerifyCode">
      <p class="contact-current">正在验证：<strong>{{ normalizedContactValue }}</strong></p>
      <div v-if="!isEmail && USE_MOCK_DATA_SOURCE" class="mock-code" aria-live="polite">
        <span>本次 Mock 验证码</span>
        <code>{{ MOCK_VERIFICATION_CODE }}</code>
      </div>
      <label class="profile-field" :for="`${kind}-verification-code`">
        <span>输入验证码</span>
        <n-input
          :id="`${kind}-verification-code`"
          v-model:value="verificationCode"
          :status="fieldError ? 'error' : undefined"
          placeholder="6 位验证码"
          inputmode="numeric"
          autocomplete="one-time-code"
          :maxlength="6"
          :disabled="isSubmitting"
          :input-props="{ 'aria-invalid': Boolean(fieldError) }"
          data-testid="contact-verification-code"
          @update:value="(value: string) => { verificationCode = value.replace(/\D/g, '').slice(0, 6); fieldError = undefined; }"
        />
        <small v-if="fieldError" :id="`${kind}-verification-code-error`" class="profile-error" role="alert">
          {{ fieldError }}
        </small>
      </label>
      <div class="profile-actions">
        <n-button @click="handleBackToRequest">返回修改</n-button>
        <n-button attr-type="submit" type="primary" :loading="isSubmitting" :disabled="isSubmitting">
          验证并更新
        </n-button>
      </div>
    </form>
  </n-modal>
</template>

<style scoped>
.contact-form { display: grid; gap: 18px; padding-bottom: 16px; }

.contact-current {
  margin: 0;
  padding: 12px 14px;
  border-radius: 9px;
  color: var(--up-muted);
  background: var(--up-surface-subtle);
  font-size: 12px;
  line-height: 1.6;
}

.contact-current strong { color: var(--up-ink-secondary); overflow-wrap: anywhere; }

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

.mock-code {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--up-line);
  border-radius: 11px;
  background: var(--up-brand-soft);
}

.mock-code span { color: var(--up-muted); font-size: 12px; }
.mock-code code { color: var(--up-brand); font-size: 22px; font-weight: 760; letter-spacing: 0.16em; }
</style>
