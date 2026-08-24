<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: One-shot completion failure card (relogin vs terminal)
-->

<script setup lang="ts">
import type { ConsentDecision } from "@/features/authorization/types";
import type { CompletionFailure } from "@/features/authorization/consent-completion";

defineProps<{
  decision: ConsentDecision;
  failure: CompletionFailure;
  requestId: string;
}>();
</script>

<template>
  <!--
    401 continuation: the session gate rejected the request before any
    decision was applied, so logging in with the same request ID resumes
    the flow safely.
  -->
  <div v-if="failure.outcome === 'relogin'" class="auth-panel auth-state-card">
    <div class="auth-state-icon auth-state-icon-warning" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5" />
      </svg>
    </div>
    <h1>需要重新登录</h1>
    <p>登录状态未能验证，你的{{ decision === "allow" ? "授权" : "拒绝" }}决定未被提交。</p>
    <p>请重新登录后继续此授权请求。</p>
    <div class="auth-state-actions">
      <NuxtLink class="auth-button auth-button-primary" :to="`/login?requestId=${encodeURIComponent(requestId)}`">前往登录</NuxtLink>
    </div>
  </div>

  <!--
    Terminal failures (409/410, ambiguous network/provider errors): the
    completion is one-shot and the browser cannot prove the decision was not
    applied, so no same-request retry is offered.
  -->
  <div v-else class="auth-panel auth-state-card">
    <div class="auth-state-icon auth-state-icon-danger" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9.5v4.5M12 17.2v.3" />
      </svg>
    </div>
    <h1>无法继续此授权请求</h1>
    <p>{{ failure.message }}</p>
    <p>授权请求只能完成一次，统一登陆门户无法确认决定是否已提交，因此不会对同一请求再次提交。</p>
    <div class="auth-state-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/account">返回账户中心</NuxtLink>
    </div>
  </div>
</template>
