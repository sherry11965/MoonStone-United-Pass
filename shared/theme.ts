//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Color theme definitions and anti-flash inline script (Naive UI)
//

export type ColorTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "united-pass-color-theme";
export const THEME_CHANGE_EVENT = "united-pass-theme-change";

/**
 * Anti-flash theme initialization script, injected inline before first paint
 * (see the legacy `src/lib/theme/theme.ts` initialization logic). It resolves
 * the stored preference, falling back to the OS color scheme, and stamps
 * `data-theme` on the document element synchronously so the first paint never
 * flashes the wrong theme. Unlike the Semi Design variant, Naive UI does not
 * mirror a `theme-mode` body attribute, so only `data-theme` is maintained.
 */
export const THEME_INITIALIZATION_SCRIPT = `
(function () {
  var resolvedTheme = "light";
  try {
    var storedTheme = localStorage.getItem("${THEME_STORAGE_KEY}");
    resolvedTheme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch (error) {
    resolvedTheme = "light";
  }
  document.documentElement.setAttribute("data-theme", resolvedTheme);
})();`;
