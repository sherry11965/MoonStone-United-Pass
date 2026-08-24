<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: MFA challenge input panel (Vue port of mfa-challenge-panel.tsx)
-->

<script setup lang="ts">
import { onMounted } from "vue";
import type { MfaMethod } from "@/features/auth/types";
import { useMfaChallenge } from "@/features/auth/composables/use-mfa-challenge";

const props = defineProps<{
  mfaToken: string;
  availableMethods: MfaMethod[];
  passkeyRequestOptions?: unknown;
  onSuccess: (redirectUrl: string) => void;
  onCancel: () => void;
  onVerify?: (method: MfaMethod, code: string, passkeyAssertion?: unknown) => Promise<void>;
}>();

const challenge = useMfaChallenge({
  mfaToken: props.mfaToken,
  availableMethods: props.availableMethods,
  passkeyRequestOptions: props.passkeyRequestOptions,
  onSuccess: props.onSuccess,
  onCancel: props.onCancel,
  onVerify: props.onVerify,
});

// Passkey-only challenges auto-trigger the WebAuthn prompt on mount so a
// passkey-first login flows straight into the browser credential dialog.
onMounted(() => {
  if (challenge.isRealMode && challenge.isPasskeyOnly && props.passkeyRequestOptions !== undefined) {
    void challenge.triggerPasskey();
  }
});
</script>

<template>
  <div class="auth-panel">
    <div v-if="challenge.phase.value === 'expired'" class="auth-heading">
      <span v-if="!challenge.isRealMode" class="auth-badge">MOCK PREVIEW</span>
      <h1>验证已过期</h1>
      <p>多因素验证挑战已超时，请返回登录重新发起。</p>
      <div class="auth-banner auth-banner-warning" role="alert">
        出于安全考虑，验证挑战有效时间较短。请重新登录以获取新的验证挑战。
      </div>
      <div class="auth-actions">
        <button type="button" class="auth-button auth-button-outline" @click="props.onCancel">
          返回登录
        </button>
      </div>
      <p v-if="!challenge.isRealMode" class="auth-notice">当前为界面 mock，不会执行真实的多因素验证。</p>
    </div>

    <div v-else-if="challenge.phase.value === 'too_many_attempts'" class="auth-heading">
      <span v-if="!challenge.isRealMode" class="auth-badge">MOCK PREVIEW</span>
      <h1>尝试次数过多</h1>
      <p>为保护账户安全，多因素验证已被暂时锁定。</p>
      <div class="auth-banner auth-banner-danger" role="alert">
        连续验证失败次数已达上限。请稍后再试，或使用其他已绑定的验证方式。
      </div>
      <div class="auth-actions">
        <button type="button" class="auth-button auth-button-outline" @click="props.onCancel">
          返回登录
        </button>
      </div>
      <p v-if="!challenge.isRealMode" class="auth-notice">当前为界面 mock，不会执行真实的多因素验证。</p>
    </div>

    <div v-else>
      <div class="auth-heading">
        <span v-if="!challenge.isRealMode" class="auth-badge">MOCK PREVIEW</span>
        <h1>二次验证</h1>
        <p>
          请完成多因素验证以继续登录。<template v-if="!challenge.isRealMode">验证令牌：<code>{{ props.mfaToken }}</code></template>
        </p>
      </div>

      <div
        v-if="props.availableMethods.length > 1"
        class="auth-method-selector"
        role="group"
        aria-label="选择验证方式"
      >
        <button
          v-for="method in props.availableMethods"
          :key="method"
          type="button"
          class="auth-method-chip"
          :class="{ 'auth-method-chip-active': challenge.selectedMethod.value === method }"
          :aria-pressed="challenge.selectedMethod.value === method"
          @click="challenge.selectMethod(method)"
        >
          {{ challenge.methodLabel(method) }}
        </button>
      </div>

      <form
        v-if="challenge.selectedMethod.value === 'totp'"
        class="auth-form"
        method="post"
        @submit.prevent="challenge.submitTotp"
      >
        <label class="auth-field">
          <span>验证器动态码</span>
          <input
            :value="challenge.codeValue.value"
            class="auth-input"
            type="text"
            placeholder="6 位数字"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            :aria-invalid="Boolean(challenge.fieldError.value)"
            :aria-errormessage="challenge.fieldError.value ? 'totp-code-error' : undefined"
            :disabled="challenge.isSubmitting.value"
            required
            @input="(event) => {
              const target = event.target as HTMLInputElement | null;
              challenge.codeValue.value = (target?.value ?? '').replace(/\D/g, '').slice(0, 6);
              challenge.fieldError.value = undefined;
            }"
          >
          <small>打开验证器应用，输入当前显示的 6 位动态验证码。</small>
          <small v-if="challenge.fieldError.value" id="totp-code-error" class="auth-field-error" role="alert">
            {{ challenge.fieldError.value }}
          </small>
        </label>
        <div class="auth-actions-row">
          <button
            type="button"
            class="auth-button auth-button-outline"
            :disabled="challenge.isSubmitting.value"
            @click="props.onCancel"
          >
            取消
          </button>
          <button
            type="submit"
            class="auth-button auth-button-primary"
            :disabled="challenge.isSubmitting.value"
          >
            {{ challenge.isSubmitting.value ? "正在验证…" : challenge.isRealMode ? "验证" : "验证（Mock）" }}
          </button>
        </div>
      </form>

      <div v-if="challenge.selectedMethod.value === 'passkey'" class="auth-form">
        <div class="auth-field">
          <span>通行密钥</span>
          <div class="auth-loading-block">
            <span>使用已绑定的通行密钥完成无密码验证。</span>
            <small v-if="challenge.fieldError.value" class="auth-field-error" role="alert">
              {{ challenge.fieldError.value }}
            </small>
          </div>
        </div>
        <div class="auth-actions-row">
          <button
            type="button"
            class="auth-button auth-button-outline"
            :disabled="challenge.isSubmitting.value"
            @click="props.onCancel"
          >
            取消
          </button>
          <button
            type="button"
            class="auth-button auth-button-primary"
            :disabled="challenge.isSubmitting.value"
            @click="challenge.triggerPasskey()"
          >
            {{ challenge.isSubmitting.value ? "正在验证…" : "使用通行密钥" }}
          </button>
        </div>
      </div>

      <form
        v-if="challenge.selectedMethod.value === 'recovery_code'"
        class="auth-form"
        method="post"
        @submit.prevent="challenge.submitRecovery"
      >
        <label class="auth-field">
          <span>恢复代码</span>
          <input
            v-model="challenge.recoveryValue.value"
            class="auth-input"
            type="text"
            placeholder="输入账户安全中心生成的恢复代码"
            autocomplete="off"
            :aria-invalid="Boolean(challenge.fieldError.value)"
            :aria-errormessage="challenge.fieldError.value ? 'recovery-code-error' : undefined"
            :disabled="challenge.isSubmitting.value"
            required
            @input="challenge.fieldError.value = undefined"
          >
          <small>恢复代码在启用二次验证时生成，每个代码仅可使用一次。</small>
          <small v-if="challenge.fieldError.value" id="recovery-code-error" class="auth-field-error" role="alert">
            {{ challenge.fieldError.value }}
          </small>
        </label>
        <p v-if="challenge.attempts.value > 0" class="auth-attempts-note">
          已失败 {{ challenge.attempts.value }} 次，剩余尝试次数 {{ 5 - challenge.attempts.value }} 次。
        </p>
        <div class="auth-actions-row">
          <button
            type="button"
            class="auth-button auth-button-outline"
            :disabled="challenge.isSubmitting.value"
            @click="props.onCancel"
          >
            取消
          </button>
          <button
            type="submit"
            class="auth-button auth-button-primary"
            :disabled="challenge.isSubmitting.value"
          >
            {{ challenge.isSubmitting.value ? "正在验证…" : challenge.isRealMode ? "验证" : "验证（Mock）" }}
          </button>
        </div>
      </form>

      <p v-if="!challenge.isRealMode" class="auth-notice">当前为界面 mock，不会执行真实的多因素验证。</p>

      <div v-if="!challenge.isRealMode" class="auth-demo-block">
        <p>Mock 状态演示</p>
        <ul>
          <li>
            <button type="button" @click="challenge.demoSetPhase('expired')">模拟挑战已过期</button>
          </li>
          <li>
            <button type="button" @click="challenge.demoSetPhase('too_many_attempts')">模拟尝试次数过多</button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-method-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.auth-method-chip {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--mg-border);
  background: transparent;
  color: var(--mg-ink-soft);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.auth-method-chip:hover {
  border-color: var(--mg-brand);
  color: var(--mg-brand-strong);
}

.auth-method-chip-active {
  border-color: var(--mg-brand);
  background: var(--mg-brand-soft);
  color: var(--mg-brand-strong);
}

.auth-attempts-note {
  margin: 0;
  font-size: 12.5px;
  color: var(--mg-warning);
}

.auth-demo-block button {
  border: none;
  background: none;
  padding: 0;
  color: var(--mg-brand-strong);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
}

.auth-demo-block button:hover {
  text-decoration: underline;
}
</style>
