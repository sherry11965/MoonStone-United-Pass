<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Already-authorized auto-completion card
-->

<script setup lang="ts">
import type { ConsentResolution } from "@/features/authorization/types";
import type { AutoCompletionState } from "@/features/authorization/composables/use-consent-decision";
import CompletionFailedCard from "@/features/authorization/components/completion-failed-card.vue";

defineProps<{
  resolution: Extract<ConsentResolution, { status: "already_authorized" }>;
  autoCompletion: AutoCompletionState;
}>();
</script>

<template>
  <CompletionFailedCard
    v-if="autoCompletion.phase === 'failed'"
    decision="allow"
    :failure="autoCompletion.failure"
    :request-id="resolution.requestId"
  />

  <!--
    In-flight view: the silent allow is being submitted and the browser will
    follow the validated Redirect URI via window.location.assign(). The
    callback URL itself never enters the DOM.
  -->
  <div v-else class="auth-panel auth-state-card">
    <div class="auth-state-icon auth-state-icon-success" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="m4.5 12.5 5 5 10-11" />
      </svg>
    </div>
    <h1>已经授权过此应用</h1>
    <p>你此前已授权 <strong>{{ resolution.applicationName }}</strong> 访问相关数据。</p>
    <p>无需再次确认，正在返回 <strong>{{ resolution.redirectHost }}</strong>…</p>
    <div class="auth-loading-block" role="status" aria-live="polite">
      <span class="auth-spinner" aria-hidden="true" />
    </div>
  </div>
</template>
