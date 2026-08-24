<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Forgot password request panel (Vue port of forgot-password-panel.tsx)
-->

<script setup lang="ts">
import { ref } from "vue";
import { isApiError } from "@/shared/api-error";
import { requestPasswordReset } from "@/shared/commands/auth-commands";

const submitted = ref(false);
const isSubmitting = ref(false);
const error = ref<string | undefined>(undefined);

function messageFor(errorValue: unknown): string {
  if (isApiError(errorValue)) {
    if (errorValue.kind === "rate_limited") {
      return errorValue.retryAfter
        ? `请求过于频繁，请在 ${errorValue.retryAfter} 秒后重试。`
        : "请求过于频繁，请稍后重试。";
    }
    if (errorValue.kind === "network") return "网络连接异常，请检查网络后重试。";
    return errorValue.message;
  }
  return "暂时无法发送重置链接，请稍后重试。";
}

async function handleSubmit(event: Event): Promise<void> {
  event.preventDefault();
  error.value = undefined;
  const form = event.currentTarget as HTMLFormElement | null;
  if (!form) return;
  const data = new FormData(form);
  const identifier = data.get("identifier");
  if (typeof identifier !== "string" || identifier.trim().length === 0) {
    error.value = "请输入账户名或邮箱。";
    return;
  }

  isSubmitting.value = true;
  try {
    await requestPasswordReset(identifier.trim());
    submitted.value = true;
  } catch (submitError) {
    error.value = messageFor(submitError);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="submitted" class="auth-panel">
    <div class="auth-heading">
      <h1>检查你的邮箱</h1>
      <p>如果该账户存在且已绑定已验证的邮箱，我们已向它发送密码重置链接。</p>
    </div>
    <div class="auth-status-card" role="status" aria-live="polite">
      <p>链接在 1 小时内有效。如果没有收到，请检查垃圾邮件目录或重新申请。</p>
    </div>
    <div class="auth-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/login">返回登录</NuxtLink>
    </div>
    <p class="auth-switch-mode">
      仍然无法登录？<NuxtLink to="/forgot-password">重新申请重置密码</NuxtLink>
    </p>
  </div>

  <div v-else class="auth-panel">
    <div class="auth-heading">
      <h1>找回账户密码</h1>
      <p>输入账户名或邮箱，我们将发送密码重置链接。</p>
    </div>

    <form class="auth-form" @submit="handleSubmit">
      <label class="auth-field">
        <span>账户名或邮箱</span>
        <input
          class="auth-input"
          name="identifier"
          type="text"
          placeholder="账户名或 name@example.com"
          autocomplete="username"
          maxlength="254"
          required
        >
      </label>

      <div v-if="error" class="auth-banner auth-banner-danger" role="alert">{{ error }}</div>

      <button type="submit" class="auth-button auth-button-primary" :disabled="isSubmitting">
        {{ isSubmitting ? "正在发送…" : "发送重置链接" }}
      </button>
    </form>

    <p class="auth-switch-mode">
      已想起密码？<NuxtLink to="/login">返回登录</NuxtLink>
    </p>
  </div>
</template>
