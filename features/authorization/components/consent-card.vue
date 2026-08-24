<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Consent request card (identity, scope listing, allow/deny)
-->

<script setup lang="ts">
import type { ConsentRequest } from "@/features/authorization/types";
import type { CurrentUser } from "@/shared/types/identity";

const props = defineProps<{
  currentUser: CurrentUser;
  request: ConsentRequest;
  showMockIndicators: boolean;
}>();

const emit = defineEmits<{
  allow: [];
  deny: [];
}>();

const DEFAULT_APP_LOGO = "https://moonstone.org.cn/image/logo.png";

const avatarSrc = props.currentUser.avatarUrl?.startsWith("/api/v1/media/avatars/")
  ? props.currentUser.avatarUrl
  : undefined;
</script>

<template>
  <div class="auth-panel auth-consent-card">
    <div v-if="props.showMockIndicators" class="auth-badge">授权请求 · MOCK</div>
    <div class="auth-consent-application">
      <div class="auth-consent-app-icon">
        <img :src="props.request.logoUrl || DEFAULT_APP_LOGO" alt="" loading="lazy">
      </div>
      <div>
        <h1>{{ props.request.applicationName }}</h1>
        <p>{{ props.request.applicationDescription }}</p>
        <span>由 {{ props.request.applicationOwner }} 提供</span>
      </div>
    </div>

    <section class="auth-consent-identity" aria-labelledby="current-identity-title">
      <span class="auth-consent-avatar">
        <img v-if="avatarSrc" :src="avatarSrc" alt="">
        <svg v-else width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5" />
        </svg>
      </span>
      <div>
        <span id="current-identity-title">当前身份</span>
        <strong>{{ props.currentUser.displayName }}</strong>
        <p>{{ props.currentUser.email }}</p>
      </div>
    </section>

    <section class="auth-consent-scopes" aria-labelledby="permissions-title">
      <h2 id="permissions-title">此应用希望：</h2>
      <ul>
        <li v-for="requestedScope in props.request.scopes" :key="requestedScope.scope">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <div>
            <strong>{{ requestedScope.label }}</strong>
            <p>{{ requestedScope.description }}</p>
          </div>
        </li>
      </ul>
    </section>

    <p class="auth-consent-redirect-notice">
      允许后将返回 <strong>{{ props.request.redirectHost }}</strong>。OAuth Scope 仅描述授权数据，不代表业务管理权限。
    </p>

    <div class="auth-actions-row">
      <button type="button" data-testid="consent-deny" class="auth-button auth-button-outline" @click="emit('deny')">
        拒绝
      </button>
      <button type="button" data-testid="consent-allow" class="auth-button auth-button-primary" @click="emit('allow')">
        {{ props.showMockIndicators ? "允许并继续（Mock）" : "允许并继续" }}
      </button>
    </div>
  </div>
</template>
