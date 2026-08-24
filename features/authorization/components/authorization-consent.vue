<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: OAuth consent screen orchestrator (Vue port of authorization-consent.tsx)
-->

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import type { ConsentResolution } from "@/features/authorization/types";
import type { CurrentUser } from "@/shared/types/identity";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { useConsentDecision } from "@/features/authorization/composables/use-consent-decision";
import { hardNavigate } from "@/features/auth/auth-navigation";
import ConsentCard from "@/features/authorization/components/consent-card.vue";
import ConsentStateCard from "@/features/authorization/components/consent-state-card.vue";
import AlreadyAuthorizedCard from "@/features/authorization/components/already-authorized-card.vue";
import CompletionFailedCard from "@/features/authorization/components/completion-failed-card.vue";
import DemoLinks from "@/features/authorization/components/demo-links.vue";

const props = defineProps<{
  currentUser?: CurrentUser | null;
  resolution: ConsentResolution;
}>();

const consent = useConsentDecision(props.resolution);

// Side effects stay out of render: the silent POST starts after mount, and a
// remount attaches to the same single-flight Promise instead of re-POSTing.
let disposeAutoCompletion: (() => void) | undefined;
onMounted(() => {
  disposeAutoCompletion = consent.startAutoCompletion();
});
onBeforeUnmount(() => {
  disposeAutoCompletion?.();
});
</script>

<template>
  <!-- valid resolution: decision lifecycle cards -->
  <div v-if="props.resolution.status === 'valid'">
    <div
      v-if="consent.decisionState.value.phase === 'submitting' || consent.decisionState.value.phase === 'navigating'"
      class="auth-panel auth-state-card"
    >
      <div class="auth-state-icon" aria-hidden="true">
        <span class="auth-spinner" />
      </div>
      <h1>{{ consent.decisionState.value.decision === "allow" ? "正在授权…" : "正在拒绝…" }}</h1>
      <p>正在向 <strong>{{ props.resolution.request.applicationName }}</strong> 提交你的授权决定。</p>
    </div>

    <div v-else-if="consent.decisionState.value.phase === 'done'" class="auth-panel auth-state-card">
      <div
        class="auth-state-icon"
        :class="consent.decisionState.value.decision === 'allow' ? 'auth-state-icon-success' : 'auth-state-icon-danger'"
        aria-hidden="true"
      >
        <svg v-if="consent.decisionState.value.decision === 'allow'" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="m4.5 12.5 5 5 10-11" />
        </svg>
        <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </div>
      <div class="auth-decision-result">
        <h1>{{ consent.decisionState.value.decision === "allow" ? "授权成功" : "已拒绝授权" }}</h1>
        <template v-if="consent.decisionState.value.decision === 'allow'">
          <p>你已授权 <strong>{{ props.resolution.request.applicationName }}</strong> 访问请求的数据。</p>
          <p>
            <template v-if="!consent.decisionState.value.redirectUrl.startsWith('/')">
              点击下方按钮后将跳转至 <code>{{ consent.decisionState.value.redirectUrl }}</code>。
            </template>
            <template v-else>点击下方按钮继续。</template>
          </p>
        </template>
        <template v-else>
          <p>你已拒绝 <strong>{{ props.resolution.request.applicationName }}</strong> 的授权请求。应用不会获得任何数据访问权限。</p>
          <p>拒绝结果将返回已验证的 Redirect URI 并携带 OAuth 错误。</p>
        </template>
      </div>
      <div class="auth-state-actions">
        <button
          type="button"
          class="auth-button auth-button-primary"
          @click="hardNavigate(consent.decisionState.value.phase === 'done' ? consent.decisionState.value.redirectUrl : '/account')"
        >
          {{ consent.decisionState.value.decision === "allow" ? "完成并跳转" : "完成并返回" }}
        </button>
      </div>
    </div>

    <div v-else-if="consent.decisionState.value.phase === 'error'" class="auth-panel auth-state-card">
      <div class="auth-state-icon auth-state-icon-danger" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3 2.5 20h19L12 3Z" />
          <path d="M12 9.5v4.5M12 17.2v.3" />
        </svg>
      </div>
      <h1>提交失败</h1>
      <p>{{ consent.decisionState.value.message }}</p>
      <p>你的{{ consent.decisionState.value.decision === "allow" ? "授权" : "拒绝" }}决定尚未提交。</p>
      <div class="auth-state-actions">
        <button type="button" class="auth-button auth-button-primary" @click="consent.retryFromError()">
          返回重试
        </button>
      </div>
    </div>

    <CompletionFailedCard
      v-else-if="consent.decisionState.value.phase === 'failed'"
      :decision="consent.decisionState.value.decision"
      :failure="consent.decisionState.value.failure"
      :request-id="props.resolution.request.requestId"
    />

    <div v-else>
      <ConsentCard
        v-if="props.currentUser"
        :current-user="props.currentUser"
        :request="props.resolution.request"
        :show-mock-indicators="USE_MOCK_DATA_SOURCE"
        @allow="consent.handleDecision('allow')"
        @deny="consent.handleDecision('deny')"
      />
      <DemoLinks v-if="USE_MOCK_DATA_SOURCE" :current-request-id="props.resolution.request.requestId" />
    </div>
  </div>

  <AlreadyAuthorizedCard
    v-else-if="props.resolution.status === 'already_authorized'"
    :resolution="props.resolution"
    :auto-completion="consent.autoCompletion.value"
  />

  <div v-else>
    <ConsentStateCard :resolution="props.resolution" />
    <DemoLinks v-if="USE_MOCK_DATA_SOURCE" :current-request-id="props.resolution.requestId" />
  </div>
</template>

<style>
/* Consent-specific primitives, scoped under the auth layout root. */
.auth-page .auth-state-card {
  text-align: center;
}

.auth-page .auth-state-card h1 {
  margin: 18px 0 10px;
  font-size: 22px;
  font-weight: 700;
}

.auth-page .auth-state-card > p {
  margin: 0 0 8px;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--mg-ink-soft);
}

.auth-page .auth-state-card code {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 12.5px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--mg-brand-soft);
  color: var(--mg-brand-strong);
}

.auth-page .auth-state-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  color: var(--mg-brand-strong);
  background: var(--mg-brand-soft);
  border: 1px solid var(--mg-brand-border);
}

.auth-page .auth-state-icon-warning {
  color: var(--mg-warning);
  background: var(--mg-warning-soft);
  border-color: rgba(192, 127, 31, 0.32);
}

.auth-page .auth-state-icon-danger {
  color: var(--mg-danger);
  background: var(--mg-danger-soft);
  border-color: rgba(214, 69, 93, 0.32);
}

.auth-page .auth-state-icon-success {
  color: var(--mg-success);
  background: var(--mg-success-soft);
  border-color: rgba(46, 158, 107, 0.32);
}

.auth-page .auth-state-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.auth-page .auth-scope-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.auth-page .auth-scope-list code {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 12.5px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--mg-danger-soft);
  color: var(--mg-danger);
}

.auth-page .auth-consent-application {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.auth-page .auth-consent-app-icon {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--mg-border);
  background: var(--mg-field);
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-page .auth-consent-app-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-page .auth-consent-application h1 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
}

.auth-page .auth-consent-application p {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--mg-ink-soft);
}

.auth-page .auth-consent-application span {
  font-size: 12px;
  color: var(--mg-ink-faint);
}

.auth-page .auth-consent-identity {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 22px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--mg-border);
  background: var(--mg-field);
}

.auth-page .auth-consent-avatar {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  color: var(--mg-brand-strong);
  background: var(--mg-brand-soft);
  border: 1px solid var(--mg-brand-border);
}

.auth-page .auth-consent-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.auth-page .auth-consent-identity span {
  display: block;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: var(--mg-ink-faint);
}

.auth-page .auth-consent-identity strong {
  display: block;
  font-size: 14.5px;
}

.auth-page .auth-consent-identity p {
  margin: 2px 0 0;
  font-size: 12.5px;
  color: var(--mg-ink-soft);
}

.auth-page .auth-consent-scopes {
  margin-top: 20px;
}

.auth-page .auth-consent-scopes h2 {
  margin: 0 0 10px;
  font-size: 14.5px;
  font-weight: 700;
}

.auth-page .auth-consent-scopes ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-page .auth-consent-scopes li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--mg-border);
  color: var(--mg-brand-strong);
}

.auth-page .auth-consent-scopes li svg {
  flex: 0 0 auto;
  margin-top: 2px;
}

.auth-page .auth-consent-scopes li strong {
  display: block;
  font-size: 13.5px;
  color: var(--mg-ink);
}

.auth-page .auth-consent-scopes li p {
  margin: 2px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--mg-ink-soft);
}

.auth-page .auth-consent-redirect-notice {
  margin: 18px 0 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--mg-ink-faint);
}

.auth-page .auth-decision-result h1 {
  margin: 18px 0 10px;
}
</style>
