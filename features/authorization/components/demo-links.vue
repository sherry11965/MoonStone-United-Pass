<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Mock-only consent state demo links (frozen demo request IDs)
-->

<script setup lang="ts">
defineProps<{ currentRequestId: string }>();

const consentStateDemos = [
  { requestId: "consent_demo_001", label: "有效请求" },
  { requestId: "consent_demo_002", label: "请求已过期" },
  { requestId: "consent_demo_003", label: "Client 不存在" },
  { requestId: "consent_demo_004", label: "Redirect URI 不匹配" },
  { requestId: "consent_demo_005", label: "用户未登录" },
  { requestId: "consent_demo_006", label: "Scope 不允许" },
  { requestId: "consent_demo_007", label: "已经授权过" },
];
</script>

<template>
  <div class="auth-demo-block">
    <p>Mock 状态演示（点击切换 requestId）</p>
    <ul>
      <li v-for="demo in consentStateDemos" :key="demo.requestId">
        <template v-if="demo.requestId === currentRequestId">→ </template>
        <NuxtLink :to="`/authorize?requestId=${demo.requestId}`">
          <code>{{ demo.requestId }}</code> — {{ demo.label }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
