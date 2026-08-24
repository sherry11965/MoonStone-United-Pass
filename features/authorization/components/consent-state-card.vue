<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Consent resolution state cards (expired / client_not_found / redirect_mismatch / unauthenticated / scope_not_allowed)
-->

<script setup lang="ts">
import type { ConsentResolution } from "@/features/authorization/types";

defineProps<{ resolution: ConsentResolution }>();
</script>

<template>
  <div v-if="resolution.status === 'expired'" class="auth-panel auth-state-card">
    <div class="auth-state-icon auth-state-icon-warning" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 3h12M6 21h12M8 3v3l4 4 4-4V3M8 21v-3l4-4 4 4v3" />
      </svg>
    </div>
    <h1>授权请求已过期</h1>
    <p>请求 <code>{{ resolution.requestId }}</code> 已于 {{ resolution.expiredAt }} 过期。</p>
    <p>请返回发起授权的应用重新开始流程。</p>
    <div class="auth-state-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/account">返回账户中心</NuxtLink>
    </div>
  </div>

  <div v-else-if="resolution.status === 'client_not_found'" class="auth-panel auth-state-card">
    <div class="auth-state-icon auth-state-icon-danger" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </div>
    <h1>应用不存在</h1>
    <p>请求 <code>{{ resolution.requestId }}</code> 对应的 OAuth 客户端不存在或已被删除。</p>
    <p>页面不接受用户自行拼装的应用名称或任意回跳地址。</p>
    <div class="auth-state-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/account">返回账户中心</NuxtLink>
    </div>
  </div>

  <div v-else-if="resolution.status === 'redirect_mismatch'" class="auth-panel auth-state-card">
    <div class="auth-state-icon auth-state-icon-danger" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9.5v4.5M12 17.2v.3" />
      </svg>
    </div>
    <h1>Redirect URI 不匹配</h1>
    <p>请求 <code>{{ resolution.requestId }}</code> 携带的重定向地址与已登记的 Redirect URI 不一致。</p>
    <p>页面不会接受 <code>{{ resolution.attemptedRedirect }}</code> 等未校验的地址。</p>
    <div class="auth-state-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/account">返回账户中心</NuxtLink>
    </div>
  </div>

  <div v-else-if="resolution.status === 'unauthenticated'" class="auth-panel auth-state-card">
    <div class="auth-state-icon auth-state-icon-warning" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5" />
      </svg>
    </div>
    <h1>需要登录</h1>
    <p>请求 <code>{{ resolution.requestId }}</code> 需要已登录的用户身份才能完成授权。</p>
    <p>登录后请使用原授权链接返回此页面继续流程。</p>
    <div class="auth-state-actions">
      <NuxtLink class="auth-button auth-button-primary" :to="`/login?requestId=${encodeURIComponent(resolution.requestId)}`">前往登录</NuxtLink>
    </div>
  </div>

  <div v-else-if="resolution.status === 'scope_not_allowed'" class="auth-panel auth-state-card">
    <div class="auth-state-icon auth-state-icon-danger" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9.5v4.5M12 17.2v.3" />
      </svg>
    </div>
    <h1>请求的 Scope 不被允许</h1>
    <p>请求 <code>{{ resolution.requestId }}</code> 包含此应用未登记的 Scope：</p>
    <div class="auth-scope-list">
      <code v-for="scope in resolution.disallowedScopes" :key="scope">{{ scope }}</code>
    </div>
    <p>请联系应用管理员确认允许的 Scope 范围。</p>
    <div class="auth-state-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/account">返回账户中心</NuxtLink>
    </div>
  </div>
</template>
