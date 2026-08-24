<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Missing requestId guard card (real mode never guesses request IDs)
-->

<template>
  <div class="auth-panel auth-state-card" data-testid="missing-request-id">
    <div class="auth-state-icon auth-state-icon-warning" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9.5v4.5M12 17.2v.3" />
      </svg>
    </div>
    <h1>缺少授权请求</h1>
    <p>此页面需要由应用发起的授权请求才能继续。</p>
    <p>请从发起授权的应用重新进入，页面不接受自行拼装的请求参数。</p>
    <div class="auth-state-actions">
      <NuxtLink class="auth-button auth-button-primary" to="/account">返回账户中心</NuxtLink>
    </div>
  </div>
</template>
