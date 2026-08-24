<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Authentication pages layout shell ("Moonstone Gate" brand surface)
              — P1 mechanical copy of layouts/auth.vue for the Vite SPA;
              template/styles unchanged, script ported off Nuxt auto-imports.
-->

<script setup lang="ts">
import type { ComputedRef } from "vue";
import { inject } from "vue";
import type { ColorTheme } from "@/shared/theme";
import { BRAND_NAME, COMPANY_LEGAL_NAME, SYSTEM_NAME } from "@/shared/branding";

// Display typefaces are linked (not bundled) so no npm dependency is added;
// the system font stack is the graceful fallback when offline.
//
// P1 note: the frozen Nuxt layout registered these through `useHead({ link })`.
// The SPA compat layer only manages the document title, so the links are
// appended to the document head directly (idempotently).
// TODO(P2): generic link/meta support in the compat layer if needed.
const AUTH_FONT_LINKS = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
];

if (typeof document !== "undefined") {
  for (const attributes of AUTH_FONT_LINKS) {
    const alreadyPresent = Array.from(document.head.querySelectorAll("link")).some(
      (link) => link.getAttribute("href") === attributes.href,
    );
    if (alreadyPresent) continue;
    const link = document.createElement("link");
    for (const [name, value] of Object.entries(attributes)) {
      link.setAttribute(name, value);
    }
    document.head.appendChild(link);
  }
}

const colorTheme = inject<ComputedRef<ColorTheme>>("colorTheme");
const setColorTheme = inject<(theme: ColorTheme) => void>("setColorTheme");

function toggleTheme(): void {
  if (!colorTheme || !setColorTheme) return;
  setColorTheme(colorTheme.value === "dark" ? "light" : "dark");
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-brand" :aria-label="`${SYSTEM_NAME}产品介绍`">
      <div class="auth-orbital" aria-hidden="true">
        <span class="auth-orb" />
        <span class="auth-ring auth-ring-a" />
        <span class="auth-ring auth-ring-b" />
        <span class="auth-star auth-star-a" />
        <span class="auth-star auth-star-b" />
        <span class="auth-star auth-star-c" />
      </div>

      <NuxtLink class="auth-brand-mark" to="/login">
        <span class="auth-brand-glyph" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M8.5 12a3.5 3.5 0 0 1 7 0" />
          </svg>
        </span>
        <span class="auth-brand-name">{{ SYSTEM_NAME }}</span>
      </NuxtLink>

      <div class="auth-brand-copy">
        <p class="auth-kicker">HIGH-TECH ENTERPRISE, YOUTH-DEVELOP</p>
        <h1>我们始终相信老登和小登一起能迸发出最强的力量</h1>
        <p>We’ve always believed that the combination of the experienced and the young can burst forth with the strongest energy together.</p>
      </div>

      <div class="auth-security-note">
        <span class="auth-security-dot" aria-hidden="true" />
        OAuth 2.0 与 OpenID Connect
      </div>
    </section>

    <section class="auth-content">
      <button
        type="button"
        class="auth-theme-toggle"
        :aria-label="colorTheme === 'dark' ? '切换为浅色主题' : '切换为深色主题'"
        @click="toggleTheme"
      >
        <svg v-if="colorTheme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      </button>

      <div class="auth-mobile-brand">
        <span class="auth-brand-glyph" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M8.5 12a3.5 3.5 0 0 1 7 0" />
          </svg>
        </span>
        <strong>{{ BRAND_NAME }}</strong>
      </div>

      <div class="auth-content-body">
        <router-view />
      </div>

      <footer class="auth-footer">
        <span>© 2026 {{ COMPANY_LEGAL_NAME }}</span>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/privacy">隐私政策</NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/terms">服务条款</NuxtLink>
      </footer>
    </section>
  </main>
</template>

<style scoped>
/* Layout structure of the Moonstone Gate shell. */
.auth-page {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  min-height: 100dvh;
}

.auth-brand {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 48px;
  overflow: hidden;
  color: #f2f3ff;
  background:
    radial-gradient(120% 90% at 85% -10%, rgba(125, 227, 212, 0.22), transparent 55%),
    radial-gradient(110% 90% at -15% 110%, rgba(151, 108, 255, 0.35), transparent 60%),
    linear-gradient(160deg, #0b0d2a 0%, #141243 52%, #241a5e 100%);
}

.auth-brand-mark {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  align-self: flex-start;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: inherit;
  text-decoration: none;
}

.auth-brand-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  color: #eaf0ff;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 0 18px rgba(180, 205, 255, 0.35);
}

.auth-brand-copy {
  position: relative;
  z-index: 2;
  max-width: 460px;
}

.auth-kicker {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.32em;
  color: #8fe6d8;
}

.auth-brand-copy h1 {
  margin: 0 0 12px;
  font-size: 30px;
  line-height: 1.32;
  font-weight: 700;
}

.auth-brand-copy p:last-child {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(235, 238, 255, 0.72);
}

.auth-security-note {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  font-size: 13px;
  color: rgba(235, 238, 255, 0.85);
}

.auth-security-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7de3d4;
  box-shadow: 0 0 10px rgba(125, 227, 212, 0.9);
}

/* Moonstone orb + orbital rings. */
.auth-orbital {
  position: absolute;
  top: 50%;
  right: -140px;
  width: 460px;
  height: 460px;
  transform: translateY(-50%);
  pointer-events: none;
}

.auth-orb {
  position: absolute;
  inset: 26%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 30%, rgba(255, 255, 255, 0.95), rgba(199, 214, 255, 0.55) 34%, rgba(110, 122, 235, 0.32) 62%, rgba(24, 20, 68, 0.1) 78%),
    #cdd8ff;
  box-shadow:
    0 0 60px rgba(168, 190, 255, 0.55),
    0 0 140px rgba(120, 140, 255, 0.35),
    inset -18px -24px 60px rgba(52, 42, 130, 0.55);
  animation: mg-breathe 7s ease-in-out infinite;
}

.auth-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed rgba(190, 205, 255, 0.4);
}

.auth-ring-a {
  inset: 10%;
  animation: mg-spin 26s linear infinite;
}

.auth-ring-b {
  inset: -6%;
  border-color: rgba(125, 227, 212, 0.35);
  animation: mg-spin 44s linear infinite reverse;
}

.auth-star {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #eaf0ff;
  box-shadow: 0 0 12px rgba(234, 240, 255, 0.9);
  animation: mg-twinkle 4s ease-in-out infinite;
}

.auth-star-a { top: 12%; left: 18%; }
.auth-star-b { top: 72%; left: 6%; animation-delay: 1.3s; }
.auth-star-c { top: 30%; left: 78%; animation-delay: 2.2s; }

@keyframes mg-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
}

@keyframes mg-spin {
  to { transform: rotate(360deg); }
}

@keyframes mg-twinkle {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

/* Content panel. */
.auth-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  background: var(--mg-surface);
}

.auth-theme-toggle {
  position: absolute;
  top: 20px;
  right: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid var(--mg-border);
  background: var(--mg-field);
  color: var(--mg-ink-soft);
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.auth-theme-toggle:hover {
  border-color: var(--mg-brand);
  color: var(--mg-brand);
  transform: translateY(-1px);
}

.auth-mobile-brand {
  display: none;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  color: var(--mg-ink);
}

.auth-mobile-brand .auth-brand-glyph {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  color: var(--mg-brand);
  background: var(--mg-brand-soft);
  border: 1px solid var(--mg-brand-border);
  box-shadow: none;
}

.auth-content-body {
  width: 100%;
  max-width: 440px;
  margin: auto 0;
}

.auth-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 32px;
  font-size: 12px;
  color: var(--mg-ink-faint);
}

.auth-footer a {
  color: inherit;
  text-decoration: none;
}

.auth-footer a:hover {
  color: var(--mg-brand);
}

@media (max-width: 900px) {
  .auth-page {
    grid-template-columns: 1fr;
  }

  .auth-brand {
    display: none;
  }

  .auth-mobile-brand {
    display: flex;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-orb,
  .auth-ring,
  .auth-star {
    animation: none;
  }
}
</style>

<style>
/*
 * Shared, unscoped design tokens and panel primitives for the auth screens.
 * Everything is nested under `.auth-page` so nothing leaks into the app shell.
 */
.auth-page {
  --mg-brand: #5b5bd6;
  --mg-brand-strong: #4040b8;
  --mg-brand-soft: rgba(91, 91, 214, 0.1);
  --mg-brand-border: rgba(91, 91, 214, 0.38);
  --mg-surface: #f6f7fd;
  --mg-panel: #ffffff;
  --mg-field: #ffffff;
  --mg-border: #dfe2f0;
  --mg-ink: #1c1e36;
  --mg-ink-soft: #4c4f6e;
  --mg-ink-faint: #8a8da9;
  --mg-danger: #d6455d;
  --mg-danger-soft: rgba(214, 69, 93, 0.08);
  --mg-warning: #c07f1f;
  --mg-warning-soft: rgba(192, 127, 31, 0.1);
  --mg-success: #2e9e6b;
  --mg-success-soft: rgba(46, 158, 107, 0.1);
  --mg-info: #3a6ea8;
  --mg-info-soft: rgba(58, 110, 168, 0.1);
  color: var(--mg-ink);
  font-family: "Sora", "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
}

html[data-theme="dark"] .auth-page {
  --mg-brand: #8b8bf0;
  --mg-brand-strong: #a5a5f7;
  --mg-brand-soft: rgba(139, 139, 240, 0.14);
  --mg-brand-border: rgba(139, 139, 240, 0.42);
  --mg-surface: #101223;
  --mg-panel: #171a30;
  --mg-field: #10122a;
  --mg-border: #2c2f4e;
  --mg-ink: #e8eaf6;
  --mg-ink-soft: #b3b6d4;
  --mg-ink-faint: #7b7e9e;
  --mg-danger: #f08aa0;
  --mg-danger-soft: rgba(240, 138, 160, 0.12);
  --mg-warning: #e8b45a;
  --mg-warning-soft: rgba(232, 180, 90, 0.12);
  --mg-success: #6fd6a4;
  --mg-success-soft: rgba(111, 214, 164, 0.12);
  --mg-info: #7faee0;
  --mg-info-soft: rgba(127, 174, 224, 0.12);
}

.auth-page .auth-panel {
  padding: 36px 32px;
  border-radius: 20px;
  background: var(--mg-panel);
  border: 1px solid var(--mg-border);
  box-shadow: 0 24px 60px -36px rgba(24, 20, 68, 0.45);
}

.auth-page .auth-heading h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
}

.auth-page .auth-heading > p {
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--mg-ink-soft);
}

.auth-page .auth-heading code {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-size: 12.5px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--mg-brand-soft);
  color: var(--mg-brand-strong);
}

.auth-page .auth-badge {
  display: inline-block;
  margin-bottom: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--mg-brand-strong);
  background: var(--mg-brand-soft);
  border: 1px solid var(--mg-brand-border);
}

.auth-page .auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.auth-page .auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-page .auth-field > span {
  font-size: 13px;
  font-weight: 600;
  color: var(--mg-ink);
}

.auth-page .auth-field > small {
  font-size: 12px;
  line-height: 1.6;
  color: var(--mg-ink-faint);
}

.auth-page .auth-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--mg-border);
  background: var(--mg-field);
  color: var(--mg-ink);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.auth-page .auth-input:focus-visible {
  outline: none;
  border-color: var(--mg-brand);
  box-shadow: 0 0 0 3px var(--mg-brand-soft);
}

.auth-page .auth-input[aria-invalid="true"] {
  border-color: var(--mg-danger);
}

.auth-page .auth-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-page .auth-field-error {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--mg-danger);
}

.auth-page .auth-checkbox-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--mg-ink-soft);
}

.auth-page .auth-checkbox-row label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.auth-page .auth-checkbox-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--mg-brand);
}

.auth-page a {
  color: var(--mg-brand-strong);
  text-decoration: none;
}

.auth-page a:hover {
  text-decoration: underline;
}

.auth-page .auth-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid transparent;
  font-size: 14.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none !important;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}

.auth-page .auth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.auth-page .auth-button-primary {
  color: #ffffff;
  background: linear-gradient(135deg, var(--mg-brand) 0%, var(--mg-brand-strong) 100%);
  box-shadow: 0 14px 30px -18px var(--mg-brand);
}

.auth-page .auth-button-primary:not(:disabled):hover {
  transform: translateY(-1px);
}

.auth-page .auth-button-outline {
  color: var(--mg-ink);
  background: transparent;
  border-color: var(--mg-border);
}

.auth-page .auth-button-outline:not(:disabled):hover {
  border-color: var(--mg-brand);
  color: var(--mg-brand-strong);
}

.auth-page .auth-button-ghost {
  color: var(--mg-brand-strong);
  background: var(--mg-brand-soft);
  border-color: var(--mg-brand-border);
}

.auth-page .auth-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 22px;
}

.auth-page .auth-actions-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 22px;
}

.auth-page .auth-notice {
  margin: 20px 0 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--mg-ink-faint);
}

.auth-page .auth-switch-mode {
  margin: 20px 0 0;
  font-size: 13px;
  color: var(--mg-ink-soft);
}

.auth-page .auth-status-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 20px;
  border-radius: 16px;
  border: 1px solid var(--mg-border);
  background: var(--mg-brand-soft);
  text-align: center;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--mg-ink-soft);
}

.auth-page .auth-status-card p {
  margin: 0;
}

.auth-page .auth-loading-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 0 8px;
  color: var(--mg-ink-soft);
  font-size: 13.5px;
}

.auth-page .auth-spinner {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid var(--mg-border);
  border-top-color: var(--mg-brand);
  animation: mg-spinner-spin 0.9s linear infinite;
}

@keyframes mg-spinner-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .auth-page .auth-spinner {
    animation-duration: 2.4s;
  }
}

.auth-page .auth-banner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.65;
}

.auth-page .auth-banner-warning {
  color: var(--mg-warning);
  background: var(--mg-warning-soft);
  border: 1px solid rgba(192, 127, 31, 0.3);
}

.auth-page .auth-banner-danger {
  color: var(--mg-danger);
  background: var(--mg-danger-soft);
  border: 1px solid rgba(214, 69, 93, 0.3);
}

.auth-page .auth-banner-success {
  color: var(--mg-success);
  background: var(--mg-success-soft);
  border: 1px solid rgba(46, 158, 107, 0.3);
}

.auth-page .auth-banner-info {
  color: var(--mg-info);
  background: var(--mg-info-soft);
  border: 1px solid rgba(58, 110, 168, 0.3);
}

.auth-page .auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 0;
  font-size: 12px;
  color: var(--mg-ink-faint);
}

.auth-page .auth-divider::before,
.auth-page .auth-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--mg-border);
}

.auth-page .auth-demo-block {
  margin-top: 22px;
  padding: 16px;
  border-radius: 14px;
  border: 1px dashed var(--mg-border);
  font-size: 12.5px;
  color: var(--mg-ink-soft);
}

.auth-page .auth-demo-block p {
  margin: 0 0 10px;
  font-weight: 600;
}

.auth-page .auth-demo-block ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth-page .auth-demo-block code {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
}

.auth-page .auth-demo-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
}

.auth-page .auth-demo-grid code {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
}
</style>
