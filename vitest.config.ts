//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Vitest unit test configuration
//

import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

/**
 * Minimal single-file-component transform for bare-vitest component tests.
 *
 * NOTE (2026-08-24): the dependency freeze that originally motivated this
 * plugin has been lifted as part of the Nuxt 3 → Vue 3 + Vite SPA refactor;
 * `vite` and `@vitejs/plugin-vue` are now declared devDependencies. This
 * hand-rolled plugin is deliberately kept unchanged for now — it is scheduled
 * to be replaced by `@vitejs/plugin-vue` during phase P5 (test-toolchain
 * unification). It compiles `<script setup lang="ts">` SFCs with the
 * project's existing `vue/compiler-sfc` and strips types with the existing
 * `typescript` dependency. Scoped styles are irrelevant to behavior tests and
 * are deliberately not injected.
 */
// Historical note: when `vite` itself was not a declared dependency (only
// `vitest` re-exported the config surface), the plugin was typed structurally
// instead of via the `Plugin` import. That typing choice is retained for
// compatibility until the P5 replacement.
function vueSfcPlugin() {
  return {
    name: "frontend-vue:test-sfc",
    transform(code: string, id: string) {
      if (!id.endsWith(".vue")) return undefined;

      const { descriptor, errors } = parse(code, { filename: id });
      if (errors.length > 0) {
        throw new Error(`SFC parse failed for ${id}: ${errors[0].message}`);
      }

      const compiled = compileScript(descriptor, {
        id: path.basename(id),
        inlineTemplate: true,
        templateOptions: { ssr: false },
      });

      const transpiled = ts.transpileModule(compiled.content, {
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          verbatimModuleSyntax: false,
        },
        fileName: id,
      });

      return { code: transpiled.outputText, map: null };
    },
  };
}

export default defineConfig({
  plugins: [vueSfcPlugin()],
  resolve: {
    alias: {
      // Mirror the Nuxt `@` → srcDir alias so migrated modules resolve identically.
      "@": path.resolve(rootDir),
      // Nuxt's virtual `#imports` module does not exist outside the Nuxt
      // build; the stub reproduces the documented production defaults.
      "#imports": path.resolve(rootDir, "test/nuxt-imports.stub.ts"),
    },
  },
  test: {
    // The migrated framework-agnostic suites run in a bare Node environment,
    // exactly as they did in the frozen Next.js frontend.
    environment: "node",
    include: [
      "shared/**/*.test.ts",
      "features/**/*.test.ts",
      // Server-layer contract tests live outside `server/` so the Nitro build
      // never bundles vitest-only modules into the server output.
      "test/**/*.test.ts",
      // Vite SPA compat-layer / router suites (P1); DOM-dependent files opt
      // into happy-dom through a file-level `@vitest-environment` docblock.
      "src/**/*.test.ts",
    ],
  },
});
