//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: ESLint flat configuration for the Nuxt 3 frontend
//

import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      ".nuxt/**",
      ".output/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "docs/**",
      "e2e-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    rules: {
      // Nuxt auto-imports (`ref`, `computed`, `useHead`, ...) are typed by the
      // generated globals; TypeScript reports genuinely undefined identifiers.
      "no-undef": "off",
      // The frozen migrated assets use intentionally empty `catch {}` blocks.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Migrated code marks deliberately unused parameters with a `_` prefix
      // (e.g. `validateConsentModeWithAudience(_audience, ...)`).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Vue multi-word component names are not required for `pages/*.vue`.
      "vue/multi-word-component-names": "off",
      // Template formatting preferences are not enforced in this codebase.
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
    },
  },
];
