<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Post-logout redirect handler (Vue port of logout-redirect.tsx)
-->

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { isApiError } from "@/shared/api-error";
import { browserCommands } from "@/shared/commands/browser-commands";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { hardNavigate } from "@/features/auth/auth-navigation";

const LOGOUT_REDIRECT_DELAY_MS = 800;

const failed = ref(false);
let started = false;

/**
 * DELETE /auth/session must succeed (or already be gone, 401) before the
 * browser is sent to /login: a hard navigation is used instead of a client
 * route replace so every SSR-resolved identity state is re-fetched and the
 * revoked session cookie can never be rendered against a stale page payload.
 */
async function logout(): Promise<void> {
  failed.value = false;
  if (USE_MOCK_DATA_SOURCE) {
    window.setTimeout(() => hardNavigate("/login"), LOGOUT_REDIRECT_DELAY_MS);
    return;
  }

  try {
    await browserCommands.logout();
    hardNavigate("/login");
  } catch (error) {
    if (isApiError(error) && error.kind === "unauthorized") {
      hardNavigate("/login");
      return;
    }
    failed.value = true;
  }
}

onMounted(() => {
  if (started) return;
  started = true;
  void logout();
});
</script>

<template>
  <div class="auth-panel">
    <div class="auth-heading">
      <span v-if="USE_MOCK_DATA_SOURCE" class="auth-badge">MOCK PREVIEW</span>
      <h1>正在退出登录</h1>
      <p>正在清除当前会话，请稍候。</p>
    </div>
    <div v-if="failed" class="auth-status-card" role="alert">
      <div class="auth-banner auth-banner-danger">
        退出登录失败，当前会话可能仍然有效。请重试。
      </div>
      <div class="auth-actions" style="width: 100%">
        <button type="button" class="auth-button auth-button-primary" @click="logout">
          重试退出
        </button>
      </div>
    </div>
    <div v-else class="auth-loading-block" role="status" aria-live="polite">
      <span class="auth-spinner" aria-hidden="true" />
      <span>正在退出登录…</span>
    </div>
    <p v-if="USE_MOCK_DATA_SOURCE" class="auth-notice">当前为界面 mock，不会撤销任何真实会话。</p>
  </div>
</template>
