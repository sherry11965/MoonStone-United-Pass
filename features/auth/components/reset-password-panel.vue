<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Password reset confirmation panel (Vue port of reset-password-panel.tsx)
-->

<script setup lang="ts">
import { ref } from "vue";
import { isApiError } from "@/shared/api-error";
import { confirmPasswordReset } from "@/shared/commands/auth-commands";

const props = defineProps<{
  userId: string;
  code: string;
}>();

type ResetPhase =
  | { phase: "form" }
  | { phase: "submitting" }
  | { phase: "success" }
  | { phase: "error"; message: string; icon: "warning" | "danger" };

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const phase = ref<ResetPhase>({ phase: "form" });
const passwordError = ref<string | undefined>(undefined);
const confirmPasswordError = ref<string | undefined>(undefined);

async function handleSubmit(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.currentTarget as HTMLFormElement | null;
  if (!form) return;
  const formData = new FormData(form);
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    passwordError.value = `密码至少需要 ${PASSWORD_MIN_LENGTH} 个字符。`;
    return;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    passwordError.value = `密码不能超过 ${PASSWORD_MAX_LENGTH} 个字符。`;
    return;
  }
  if (!/[a-z]/u.test(password) || !/[A-Z]/u.test(password) || !/[0-9]/u.test(password) || !/[^A-Za-z0-9]/u.test(password)) {
    passwordError.value = "密码需同时包含大写字母、小写字母、数字和符号。";
    return;
  }
  if (password !== confirmPassword) {
    confirmPasswordError.value = "两次输入的密码不一致，请重新确认。";
    return;
  }

  passwordError.value = undefined;
  confirmPasswordError.value = undefined;
  phase.value = { phase: "submitting" };

  try {
    await confirmPasswordReset(props.userId, props.code, password);
    phase.value = { phase: "success" };
  } catch (submitError) {
    if (isApiError(submitError)) {
      if (submitError.kind === "rate_limited") {
        phase.value = {
          phase: "error",
          icon: "warning",
          message: submitError.retryAfter
            ? `操作过于频繁，请在 ${submitError.retryAfter} 秒后再试。`
            : "操作过于频繁，请稍后再试。",
        };
        return;
      }
      if (submitError.kind === "network") {
        phase.value = { phase: "error", icon: "warning", message: "网络连接异常，请检查网络后重试。" };
        return;
      }
      if (submitError.kind === "validation") {
        phase.value = {
          phase: "error",
          icon: "danger",
          message: "该密码重置链接无效、已失效或已被使用。请重新申请重置密码。",
        };
        return;
      }
    }
    phase.value = { phase: "error", icon: "warning", message: "暂时无法重置密码，请稍后重试。" };
  }
}
</script>

<template>
  <div v-if="phase.phase === 'success'" class="auth-panel">
    <div class="auth-status-card" role="status" aria-live="polite">
      <h1 style="margin: 0">密码已重置</h1>
      <p>你的账户密码已成功更新。请使用新密码登录。</p>
    </div>
    <div class="auth-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/login">返回登录</NuxtLink>
    </div>
  </div>

  <div v-else-if="phase.phase === 'error'" class="auth-panel">
    <div class="auth-heading">
      <h1>无法重置密码</h1>
      <p>密码重置链接存在问题，请根据以下提示处理。</p>
    </div>
    <div
      class="auth-banner"
      :class="phase.icon === 'danger' ? 'auth-banner-danger' : 'auth-banner-warning'"
      role="alert"
    >
      {{ phase.message }}
    </div>
    <div class="auth-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/forgot-password">重新申请重置密码</NuxtLink>
    </div>
  </div>

  <div v-else class="auth-panel">
    <div class="auth-heading">
      <h1>设置新密码</h1>
      <p>为你的统一门户账户设置一个新的登录密码。</p>
    </div>

    <form class="auth-form" @submit="handleSubmit">
      <label class="auth-field">
        <span>新密码</span>
        <input
          class="auth-input"
          name="password"
          type="password"
          placeholder="至少 12 个字符"
          autocomplete="new-password"
          :minlength="PASSWORD_MIN_LENGTH"
          :maxlength="PASSWORD_MAX_LENGTH"
          :aria-invalid="Boolean(passwordError)"
          :aria-errormessage="passwordError ? 'reset-password-error' : undefined"
          :disabled="phase.phase === 'submitting'"
          required
          @input="passwordError = undefined"
        >
        <small>至少 {{ PASSWORD_MIN_LENGTH }} 个字符，需同时包含大写字母、小写字母、数字和符号。</small>
        <small v-if="passwordError" id="reset-password-error" class="auth-field-error" role="alert">
          {{ passwordError }}
        </small>
      </label>
      <label class="auth-field">
        <span>确认新密码</span>
        <input
          class="auth-input"
          name="confirmPassword"
          type="password"
          placeholder="再次输入新密码"
          autocomplete="new-password"
          :minlength="PASSWORD_MIN_LENGTH"
          :maxlength="PASSWORD_MAX_LENGTH"
          :aria-invalid="Boolean(confirmPasswordError)"
          :aria-errormessage="confirmPasswordError ? 'reset-confirm-password-error' : undefined"
          :disabled="phase.phase === 'submitting'"
          required
          @input="confirmPasswordError = undefined"
        >
        <small v-if="confirmPasswordError" id="reset-confirm-password-error" class="auth-field-error" role="alert">
          {{ confirmPasswordError }}
        </small>
      </label>

      <button
        type="submit"
        class="auth-button auth-button-primary"
        :disabled="phase.phase === 'submitting'"
      >
        {{ phase.phase === "submitting" ? "正在重置…" : "重置密码" }}
      </button>
    </form>

    <p class="auth-switch-mode">
      已想起密码？<NuxtLink to="/login">返回登录</NuxtLink>
    </p>
  </div>
</template>
