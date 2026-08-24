<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of components/ThemeToggle.vue (P1 migration; explicit
              imports replace Nuxt auto-imports, template/styles unchanged)
-->

<script setup lang="ts">
import { computed, inject, type Ref } from "vue";
import type { ColorTheme } from "@/shared/theme";

// The app shell (src/App.vue) owns the theme state and exposes it through
// provide/inject so any page can toggle without prop drilling.
const colorTheme = inject<Ref<ColorTheme> | undefined>("colorTheme");
const setColorTheme = inject<((theme: ColorTheme) => void) | undefined>("setColorTheme");

const isDarkTheme = computed(() => colorTheme?.value === "dark");
const accessibleLabel = computed(() => (isDarkTheme.value ? "切换到亮色模式" : "切换到暗色模式"));

function toggleTheme(): void {
  setColorTheme?.(isDarkTheme.value ? "light" : "dark");
}
</script>

<template>
  <n-button
    class="toggle"
    :class="{ 'is-dark': isDarkTheme }"
    tertiary
    circle
    :aria-label="accessibleLabel"
    :aria-pressed="isDarkTheme"
    :title="accessibleLabel"
    @click="toggleTheme"
  >
    <span class="icons" aria-hidden="true">
      <svg class="moon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg class="sun" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </span>
  </n-button>
</template>

<style scoped>
.toggle {
  flex: none;
}

.icons {
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
}

.moon,
.sun {
  grid-area: 1 / 1;
  transition: opacity 160ms ease, transform 180ms ease;
}

.sun {
  opacity: 0;
  transform: rotate(-30deg) scale(0.7);
}

.toggle.is-dark .moon {
  opacity: 0;
  transform: rotate(30deg) scale(0.7);
}

.toggle.is-dark .sun {
  opacity: 1;
  transform: rotate(0) scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .moon,
  .sun {
    transition: none;
  }
}
</style>
