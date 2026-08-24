<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Registration-closed state card (ADR-0016 public registration flag off)
-->

<script setup lang="ts">
const props = defineProps<{ requestId?: string }>();

const loginHref = props.requestId
  ? `/login?requestId=${encodeURIComponent(props.requestId)}`
  : "/login";
</script>

<template>
  <div class="auth-panel" data-testid="registration-closed">
    <div class="auth-heading">
      <span class="auth-badge">REGISTRATION CLOSED</span>
      <h1>注册暂未开放</h1>
      <p>砾石进化统一登陆门户平台目前仅向已有账户开放登录。公开注册启用后，我们会在 MoonStone 官方渠道说明。</p>
    </div>
    <div class="auth-status-card" role="status">
      <p>如果你已经拥有账户，可以直接返回登录；此页面不会收集姓名、邮箱或密码。</p>
    </div>
    <div class="auth-actions">
      <NuxtLink class="auth-button auth-button-primary" :to="loginHref">返回登录</NuxtLink>
    </div>
    <p class="auth-notice">DreamUP 报名资格与统一门户账户注册是两个独立流程。</p>
  </div>
</template>
