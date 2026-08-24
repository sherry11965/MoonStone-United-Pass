<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Credential login panel (Vue port of credential-panel.tsx) with no-JS form fallback
-->

<script setup lang="ts">
import { computed, ref } from "vue";
import type { MfaMethod } from "@/features/auth/types";
import { isApiError } from "@/shared/api-error";
import {
  beginPasskeyLogin,
  completeLoginMfa,
  submitLogin,
} from "@/shared/commands/auth-commands";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { authenticateMockAccount, MOCK_LOGIN_ACCOUNTS } from "@/shared/mock/mock-auth";
import { hardNavigate, loginDestination } from "@/features/auth/auth-navigation";
import MfaChallengePanel from "@/features/auth/components/mfa-challenge-panel.vue";

const props = withDefaults(defineProps<{
  /**
   * Authorization transaction ID to resume after successful login. Only an
   * opaque server-issued transaction ID is accepted — never a raw returnTo URL.
   */
  resumeRequestId?: string;
  feishuLoginEnabled?: boolean;
  providerError?: string;
  registrationEnabled?: boolean;
  /** No-JS degradation: opaque error code redirected back by login.post.ts. */
  loginErrorCode?: string;
  /** CSRF token rendered into the native form as a hidden field. */
  csrfToken?: string;
}>(), {
  resumeRequestId: undefined,
  feishuLoginEnabled: false,
  providerError: undefined,
  registrationEnabled: false,
  loginErrorCode: undefined,
  csrfToken: "",
});

/**
 * MFA methods the login seam can actually complete end-to-end today. The
 * passkey assertion requires backend-issued options, and the P1 backend
 * explicitly rejects recovery codes, so anything else is filtered out
 * before rendering the challenge panel (frozen credential-panel contract).
 */
const COMPLETABLE_MFA_METHODS: ReadonlySet<MfaMethod> = new Set(["totp", "passkey"]);

type MfaChallenge = {
  mfaToken: string;
  availableMethods: MfaMethod[];
  passkeyRequestOptions?: unknown;
};

function initialErrorMessage(): string | undefined {
  if (props.providerError === "identity_unlinked") {
    return "该飞书身份尚未关联统一门户账户，请联系管理员完成显式身份绑定。";
  }
  if (props.providerError) {
    return "飞书登录未完成，请重试或使用统一账户登录。";
  }
  switch (props.loginErrorCode) {
    case "invalid_credentials":
      return "账户名、邮箱或密码错误，请重试。";
    case "mfa_required":
      return "当前账户需要二次验证，请在启用脚本的浏览器中完成验证。";
    case "rate_limited":
      return "尝试次数过多，请稍后再试。";
    case "network":
      return "网络异常，请检查连接后重试。";
    case "server_error":
      return "登录服务暂时不可用，请稍后重试。";
    default:
      return undefined;
  }
}

const loginError = ref<string | undefined>(initialErrorMessage());
const remember = ref(true);
const isSubmitting = ref(false);
const mfaChallenge = ref<MfaChallenge | undefined>(undefined);

function loginFailureMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.kind === "rate_limited") {
      const wait = error.retryAfter !== undefined ? `请在 ${error.retryAfter} 秒后再试。` : "请稍后再试。";
      return `尝试次数过多，${wait}`;
    }
    if (error.kind === "network") {
      return "网络异常，请检查连接后重试。";
    }
    return error.message;
  }
  return "登录失败，请稍后重试。";
}

async function handleRealLogin(identifier: string, password: string): Promise<void> {
  isSubmitting.value = true;
  loginError.value = undefined;
  try {
    const outcome = await submitLogin({
      identifier,
      password,
      remember: remember.value,
      resumeRequestId: props.resumeRequestId,
    });
    if (outcome.status === "mfa_required") {
      const completable = outcome.availableMethods.filter((method) =>
        COMPLETABLE_MFA_METHODS.has(method) &&
        (method !== "passkey" || outcome.passkeyRequestOptions !== undefined),
      );
      if (completable.length === 0) {
        loginError.value = "当前账户要求二次验证，但可用的验证方式暂不支持在此完成。请联系管理员。";
        return;
      }
      mfaChallenge.value = {
        mfaToken: outcome.mfaToken,
        availableMethods: completable,
        passkeyRequestOptions: outcome.passkeyRequestOptions,
      };
      return;
    }
    hardNavigate(loginDestination(props.resumeRequestId));
  } catch (error) {
    loginError.value = loginFailureMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

async function handleRealMfaVerify(method: MfaMethod, code: string, passkeyAssertion?: unknown): Promise<void> {
  const challenge = mfaChallenge.value;
  if (!challenge) return;
  await completeLoginMfa({
    mfaToken: challenge.mfaToken,
    method,
    ...(code !== undefined && { code }),
    ...(passkeyAssertion !== undefined && { passkeyAssertion }),
  });
}

async function handlePasskeyLogin(): Promise<void> {
  isSubmitting.value = true;
  loginError.value = undefined;
  try {
    const outcome = await beginPasskeyLogin(props.resumeRequestId);
    if (outcome.status === "mfa_required") {
      if (outcome.passkeyRequestOptions === undefined) {
        loginError.value = "此设备没有可用的通行密钥，请使用账号密码登录。";
        return;
      }
      mfaChallenge.value = {
        mfaToken: outcome.mfaToken,
        availableMethods: ["passkey"],
        passkeyRequestOptions: outcome.passkeyRequestOptions,
      };
      return;
    }
    hardNavigate(loginDestination(props.resumeRequestId));
  } catch (error) {
    loginError.value = loginFailureMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

function handleSubmit(event: Event): void {
  event.preventDefault();

  const form = event.currentTarget as HTMLFormElement | null;
  if (!form) return;
  const formData = new FormData(form);
  const identifier = formData.get("identifier");
  const password = formData.get("password");
  if (typeof identifier !== "string" || typeof password !== "string") {
    return;
  }

  if (!USE_MOCK_DATA_SOURCE) {
    void handleRealLogin(identifier, password);
    return;
  }

  const destination = authenticateMockAccount(identifier, password);

  if (!destination) {
    loginError.value = "账户名、邮箱或密码错误，请使用页面提供的 Mock 凭据。";
    return;
  }

  loginError.value = undefined;
  hardNavigate(props.resumeRequestId
    ? `/authorize?requestId=${encodeURIComponent(props.resumeRequestId)}`
    : destination);
}

const feishuAuthorizeHref = computed(() =>
  `/api/v1/auth/providers/feishu/authorize?remember=${remember.value ? "true" : "false"}${props.resumeRequestId ? `&resumeRequestId=${encodeURIComponent(props.resumeRequestId)}` : ""}`,
);
const registerHref = props.resumeRequestId
  ? `/register?requestId=${encodeURIComponent(props.resumeRequestId)}`
  : "/register";
</script>

<template>
  <MfaChallengePanel
    v-if="mfaChallenge"
    :mfa-token="mfaChallenge.mfaToken"
    :available-methods="mfaChallenge.availableMethods"
    :passkey-request-options="mfaChallenge.passkeyRequestOptions"
    :on-verify="handleRealMfaVerify"
    :on-success="() => hardNavigate(loginDestination(props.resumeRequestId))"
    :on-cancel="() => { mfaChallenge = undefined; loginError = undefined; }"
  />

  <div v-else>
    <div class="auth-panel">
      <div class="auth-heading">
        <span v-if="USE_MOCK_DATA_SOURCE" class="auth-badge">MOCK PREVIEW</span>
        <h1>欢迎回来</h1>
        <p>使用你的统一账户继续访问。</p>
      </div>

      <!--
      The native method="post" submission is the no-JavaScript degradation
      path (server/routes/login.post.ts): credentials stay in the request
      body and never appear in the URL. With scripts enabled, @submit.prevent
      intercepts and runs the AJAX/MFA flow instead.
    -->
      <form class="auth-form" method="post" action="/login" @submit="handleSubmit">
        <input type="hidden" name="csrfToken" :value="props.csrfToken">
        <input v-if="props.resumeRequestId" type="hidden" name="resumeRequestId" :value="props.resumeRequestId">

        <label class="auth-field">
          <span>账户名或邮箱</span>
          <input
            class="auth-input"
            name="identifier"
            type="text"
            placeholder="账户名或 name@example.com"
            autocomplete="username"
            :aria-invalid="Boolean(loginError)"
            :aria-errormessage="loginError ? 'login-form-error' : undefined"
            required
            @input="loginError = undefined"
          >
        </label>
        <label class="auth-field">
          <span>密码</span>
          <input
            class="auth-input"
            name="password"
            type="password"
            placeholder="输入密码"
            autocomplete="current-password"
            minlength="12"
            :aria-invalid="Boolean(loginError)"
            :aria-errormessage="loginError ? 'login-form-error' : undefined"
            required
            @input="loginError = undefined"
          >
          <small v-if="loginError" id="login-form-error" class="auth-field-error" role="alert">
            {{ loginError }}
          </small>
        </label>

        <div class="auth-checkbox-row">
          <label>
            <input v-model="remember" type="checkbox" name="remember" value="true">
            保持登录
          </label>
          <NuxtLink to="/forgot-password">忘记密码？</NuxtLink>
        </div>

        <button
          type="submit"
          class="auth-button auth-button-primary"
          :disabled="!USE_MOCK_DATA_SOURCE && isSubmitting"
        >
          {{ USE_MOCK_DATA_SOURCE ? "登录（Mock）" : isSubmitting ? "正在登录…" : "登录" }}
        </button>
      </form>

      <template v-if="!USE_MOCK_DATA_SOURCE">
        <div class="auth-divider">或使用通行密钥直接登录</div>
        <button
          type="button"
          class="auth-button auth-button-ghost"
          style="margin-top: 14px"
          :disabled="isSubmitting"
          @click="handlePasskeyLogin"
        >
          使用通行密钥登录
        </button>
      </template>

      <template v-if="!USE_MOCK_DATA_SOURCE && props.feishuLoginEnabled">
        <div class="auth-divider">或使用企业身份</div>
        <a class="auth-button auth-button-outline" style="margin-top: 14px" :href="feishuAuthorizeHref">
          使用飞书登录
        </a>
        <p class="auth-notice">飞书仅证明外部身份，不会自动授予员工或管理权限。</p>
      </template>

      <div v-if="USE_MOCK_DATA_SOURCE" class="auth-demo-block">
        <p>普通用户演示凭据</p>
        <div class="auth-demo-grid">
          <span>账户名</span>
          <code>{{ MOCK_LOGIN_ACCOUNTS.externalUser.username }}</code>
          <span>邮箱</span>
          <code>{{ MOCK_LOGIN_ACCOUNTS.externalUser.email }}</code>
          <span>密码</span>
          <code>{{ MOCK_LOGIN_ACCOUNTS.externalUser.password }}</code>
        </div>
      </div>

      <p v-if="USE_MOCK_DATA_SOURCE" class="auth-notice">当前为界面 mock，不会提交密码或创建真实账户。</p>
      <p v-else class="auth-notice">
        登录即表示你已阅读并同意<NuxtLink to="/terms">服务条款</NuxtLink>与<NuxtLink to="/privacy">隐私政策</NuxtLink>。
      </p>
      <p class="auth-switch-mode">
        还没有账户？
        <NuxtLink :to="registerHref">{{ props.registrationEnabled ? "立即注册" : "查看注册状态" }}</NuxtLink>
      </p>
    </div>
  </div>
</template>
