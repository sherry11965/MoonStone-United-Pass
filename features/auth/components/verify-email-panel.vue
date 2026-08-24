<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Email verification panel consuming the one-time #userId&code fragment
-->

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { verifyRegistrationEmail } from "@/shared/commands/registration-commands";

type VerifyPhase = "verifying" | "success" | "error";

const phase = ref<VerifyPhase>("verifying");
const continueHref = ref("/login");
let started = false;

onMounted(() => {
  if (started) return;
  started = true;

  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const userId = fragment.get("userId") ?? "";
  const code = fragment.get("code") ?? "";
  const requestId = fragment.get("requestId") ?? "";

  // Erase the one-time code before validation, rendering, network work, or
  // navigation. Fragments never reach HTTP/nginx logs, and this prevents it
  // from lingering in browser history or accidental screenshots.
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

  async function verify() {
    if (!userId || !code) {
      throw new TypeError("Email verification fragment is incomplete");
    }
    return verifyRegistrationEmail({ userId, code, requestId });
  }

  void verify()
    .then((result) => {
      continueHref.value = result.requestId
        ? `/login?requestId=${encodeURIComponent(result.requestId)}`
        : "/login";
      phase.value = "success";
    })
    .catch(() => {
      phase.value = "error";
    });
});
</script>

<template>
  <div v-if="phase === 'verifying'" class="auth-panel">
    <div class="auth-heading">
      <h1>正在验证邮箱</h1>
      <p>正在安全地启用你的统一账户，请稍候。</p>
    </div>
    <div class="auth-loading-block" role="status" aria-live="polite">
      <span class="auth-spinner" aria-hidden="true" />
      <span>正在验证…</span>
    </div>
  </div>

  <div v-else-if="phase === 'success'" class="auth-panel">
    <div class="auth-heading">
      <h1>邮箱验证成功</h1>
      <p>你的统一账户已经启用，可以继续登录并返回刚才的应用。</p>
    </div>
    <div class="auth-banner auth-banner-success">
      验证已经完成。本页面不会再次消耗验证链接。
    </div>
    <div class="auth-actions">
      <NuxtLink class="auth-button auth-button-primary" :to="continueHref">继续登录</NuxtLink>
      <NuxtLink class="auth-button auth-button-outline" to="/account">前往账户中心</NuxtLink>
    </div>
  </div>

  <div v-else class="auth-panel">
    <div class="auth-heading">
      <h1>无法验证邮箱</h1>
      <p>验证链接无效、已失效或已被使用。</p>
    </div>
    <div class="auth-banner auth-banner-danger">
      请使用最新一封验证邮件中的完整链接，或返回注册页重新开始。
    </div>
    <div class="auth-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/register">返回注册</NuxtLink>
      <NuxtLink class="auth-button auth-button-outline" to="/login">返回登录</NuxtLink>
    </div>
  </div>
</template>
