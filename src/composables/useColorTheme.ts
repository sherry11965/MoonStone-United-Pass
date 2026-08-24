//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA port of composables/useColorTheme.ts (P1 migration)
//

import { ref } from "vue";
import type { ColorTheme } from "@/shared/theme";
import { THEME_STORAGE_KEY } from "@/shared/theme";

/**
 * SPA variant of `useColorTheme` (composables/useColorTheme.ts).
 *
 * The SSR-only considerations of the Nuxt version disappear in a client-only
 * app: the anti-flash inline script in index.html has already stamped
 * `data-theme` before this module executes, so the stored preference is read
 * synchronously and the provider theme is correct from the first render.
 */
export function useColorTheme() {
  const appliedTheme =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";

  const colorTheme = ref<ColorTheme>(appliedTheme);

  function setColorTheme(theme: ColorTheme): void {
    colorTheme.value = theme;
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage may be unavailable (private mode); the live attribute still applies.
    }
  }

  return { colorTheme, setColorTheme };
}
