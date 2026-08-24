//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Reactive color-theme state synchronized with the anti-flash attribute
//

import type { ColorTheme } from "@/shared/theme";
import { THEME_STORAGE_KEY } from "@/shared/theme";

/**
 * Owns the reactive color theme for the Naive UI `<n-config-provider>`.
 *
 * During SSR the theme is always `light` so the rendered markup matches the
 * initial client state (the anti-flash inline script stamps `data-theme`
 * before hydration but the provider only switches theme post-mount). Reading
 * the stored preference happens in `onMounted` to avoid a hydration mismatch.
 */
export function useColorTheme() {
  const colorTheme = ref<ColorTheme>("light");

  if (import.meta.client) {
    onMounted(() => {
      const applied = document.documentElement.getAttribute("data-theme");
      colorTheme.value = applied === "dark" ? "dark" : "light";
    });
  }

  function setColorTheme(theme: ColorTheme): void {
    colorTheme.value = theme;
    if (import.meta.client) {
      document.documentElement.setAttribute("data-theme", theme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Storage may be unavailable (private mode); the live attribute still applies.
      }
    }
  }

  return { colorTheme, setColorTheme };
}
