<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Public registration panel (Vue port of registration-panel.tsx)
-->

<script setup lang="ts">
import { ref } from "vue";
import { isApiError } from "@/shared/api-error";
import {
  createRegistration,
  resendRegistrationEmail,
} from "@/shared/commands/registration-commands";

const props = defineProps<{ requestId?: string }>();

type WaitingState = {
  email: string;
  registrationToken: string;
};

const acceptedTerms = ref(false);
const isSubmitting = ref(false);
const error = ref<string | undefined>(undefined);
const waiting = ref<WaitingState | undefined>(undefined);
const isResending = ref(false);
const resendMessage = ref<string | undefined>(undefined);

const loginHref = props.requestId
  ? `/login?requestId=${encodeURIComponent(props.requestId)}`
  : "/login";

function messageFor(errorValue: unknown): string {
  if (isApiError(errorValue)) {
    if (errorValue.kind === "rate_limited") {
      return errorValue.retryAfter
        ? `请求过于频繁，请在 ${errorValue.retryAfter} 秒后重试。`
        : "请求过于频繁，请稍后重试。";
    }
    if (errorValue.code === "registration.closed") return "注册暂未开放。";
    if (errorValue.kind === "network") return "网络连接异常，请检查网络后重试。";
    return errorValue.message;
  }
  return "暂时无法完成注册，请稍后重试。";
}

async function handleSubmit(event: Event): Promise<void> {
  event.preventDefault();
  error.value = undefined;
  const form = event.currentTarget as HTMLFormElement | null;
  if (!form) return;
  const data = new FormData(form);
  const username = data.get("username");
  const displayName = data.get("displayName");
  const email = data.get("email");
  const password = data.get("password");
  const confirmation = data.get("passwordConfirmation");
  if (typeof username !== "string"
    || typeof displayName !== "string"
    || typeof email !== "string"
    || typeof password !== "string"
    || typeof confirmation !== "string") {
    error.value = "请完整填写注册信息。";
    return;
  }
  if (password !== confirmation) {
    error.value = "两次输入的密码不一致。";
    return;
  }
  if (!/[a-z]/u.test(password) || !/[A-Z]/u.test(password) || !/[0-9]/u.test(password) || !/[^A-Za-z0-9]/u.test(password)) {
    error.value = "密码需同时包含大写字母、小写字母、数字和符号。";
    return;
  }
  if (!acceptedTerms.value) {
    error.value = "请先阅读并同意服务条款与隐私政策。";
    return;
  }

  isSubmitting.value = true;
  try {
    const result = await createRegistration({
      username, displayName, email, password,
      acceptedTerms: true,
      requestId: props.requestId,
    });
    waiting.value = { email, registrationToken: result.registrationToken };
  } catch (submitError) {
    error.value = messageFor(submitError);
  } finally {
    isSubmitting.value = false;
  }
}

async function resend(): Promise<void> {
  const current = waiting.value;
  if (!current) return;
  isResending.value = true;
  resendMessage.value = undefined;
  try {
    await resendRegistrationEmail(current.registrationToken);
    resendMessage.value = "验证邮件已重新发送，请检查收件箱和垃圾邮件目录。";
  } catch (resendError) {
    resendMessage.value = messageFor(resendError);
  } finally {
    isResending.value = false;
  }
}
</script>

<template>
  <div v-if="waiting" class="auth-panel">
    <div class="auth-heading">
      <h1>检查你的邮箱</h1>
      <p>验证邮件已发送至 {{ waiting.email }}。点击邮件中的链接后，账户才会启用。</p>
    </div>
    <div class="auth-status-card" role="status" aria-live="polite">
      <p>验证链接为一次性链接。如果没有收到邮件，可以在下方重新发送。</p>
    </div>
    <div v-if="resendMessage" class="auth-banner auth-banner-info" style="margin-top: 16px">
      {{ resendMessage }}
    </div>
    <div class="auth-actions">
      <button
        type="button"
        class="auth-button auth-button-primary"
        :disabled="isResending"
        @click="resend"
      >
        {{ isResending ? "正在重新发送…" : "重新发送验证邮件" }}
      </button>
    </div>
    <p class="auth-switch-mode">已经验证？<NuxtLink :to="loginHref">返回登录</NuxtLink></p>
  </div>

  <div v-else class="auth-panel">
    <div class="auth-heading">
      <h1>创建统一账户</h1>
      <p>注册后请先完成邮箱验证，再使用账户登录。</p>
    </div>
    <form class="auth-form" @submit="handleSubmit">
      <label class="auth-field">
        <span>账户名</span>
        <input
          class="auth-input"
          name="username"
          type="text"
          autocomplete="username"
          placeholder="3–64 位字母、数字、点、横线或下划线"
          pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,63}"
          maxlength="64"
          required
        >
      </label>
      <label class="auth-field">
        <span>称呼</span>
        <input class="auth-input" name="displayName" type="text" autocomplete="name" maxlength="100" placeholder="希望我们如何称呼你" required>
      </label>
      <label class="auth-field">
        <span>邮箱</span>
        <input class="auth-input" name="email" type="email" autocomplete="email" maxlength="254" placeholder="name@example.com" required>
      </label>
      <label class="auth-field">
        <span>密码</span>
        <input class="auth-input" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="至少 12 位，含大小写、数字和符号" required>
      </label>
      <label class="auth-field">
        <span>确认密码</span>
        <input class="auth-input" name="passwordConfirmation" type="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="再次输入密码" required>
      </label>
      <div class="auth-checkbox-row" style="justify-content: flex-start">
        <label>
          <input v-model="acceptedTerms" type="checkbox">
          <span>我已阅读并同意<NuxtLink to="/terms">服务条款</NuxtLink>与<NuxtLink to="/privacy">隐私政策</NuxtLink></span>
        </label>
      </div>
      <small v-if="error" class="auth-field-error" role="alert">{{ error }}</small>
      <button type="submit" class="auth-button auth-button-primary" :disabled="isSubmitting">
        {{ isSubmitting ? "正在创建账户…" : "创建账户" }}
      </button>
    </form>
    <p class="auth-switch-mode">已经有账户？<NuxtLink :to="loginHref">返回登录</NuxtLink></p>
  </div>
</template>
