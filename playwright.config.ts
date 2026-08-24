//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Playwright end-to-end test configuration
//

import { defineConfig, devices } from "@playwright/test";

const e2ePort = Number(process.env.UP_E2E_PORT ?? "3000");
if (!Number.isInteger(e2ePort) || e2ePort < 1 || e2ePort > 65535) {
  throw new Error("UP_E2E_PORT must be a valid TCP port");
}

// Port of the e2e stub backend (e2e/stub-backend.ts) that answers the
// server-side administration-authorization lookups (`/me/permissions` and
// `/admin/dreamup/events`) driven by the injected `up_session` cookie.
const stubPort = Number(process.env.UP_E2E_STUB_PORT ?? "3100");
if (!Number.isInteger(stubPort) || stubPort < 1 || stubPort > 65535) {
  throw new Error("UP_E2E_STUB_PORT must be a valid TCP port");
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // `list` instead of the default `html`: the HTML reporter starts an
  // interactive "Serving HTML report" server after a failed run, which blocks
  // the terminal and keeps the redirected log file handle open.
  reporter: "list",
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // The baseline runs against a PRODUCTION build rather than `nuxt dev`
    // because the dev toolchain has two pre-existing SSR blockers that are
    // unrelated to product behavior (see agent.txt "结果/偏离"):
    //
    //  1. vite-node evaluates `shared/data-source-mode.ts`'s module-level
    //     `useRuntimeConfig()` outside a Nuxt instance and 500s every mock
    //     page; Rollup's production bundling evaluates it inside the request
    //     context and works.
    //  2. the naive-ui → vueuc ESM named-export resolution fails under Node's
    //     native ESM in dev SSR; production bundling resolves it with no
    //     config change.
    //
    // `NUXT_PUBLIC_USE_MOCK` MUST be baked at build time: the module-level
    // `USE_MOCK_DATA_SOURCE` captures the build default, and a runtime env
    // override never reaches that constant. (The runtime-override gap is the
    // known SPA-migration risk formally resolved in P2 step 9's import.meta.env
    // rework.) The built Nitro node server reads `PORT` for its listen port.
    //
    // The launcher (e2e/webserver.mjs) builds then imports the server in a
    // single `node` process, discarding the verbose build stdout so Nitro's
    // huge file manifest cannot stall Playwright's webServer readiness pipe.
    command: `node e2e/webserver.mjs`,
    url: `http://localhost:${e2ePort}/spike`,
    reuseExistingServer: true,
    // Generous: the launcher runs `nuxt build` first, and on slow machines the
    // full production build alone can take several minutes.
    timeout: 900_000,
    env: {
      // Baked into the build so `USE_MOCK_DATA_SOURCE` resolves true (a
      // runtime-only override would not reach the module-level constant).
      NUXT_PUBLIC_USE_MOCK: "true",
      // The interactive telemetry consent prompt blocks startup in CI/headless
      // environments; disable telemetry for the e2e webServer.
      NUXT_TELEMETRY_DISABLED: "1",
      // The Nitro administration gate still performs real server-side
      // authorization fetches in mock mode; point them at the e2e stub
      // backend so the gate decisions are driven by the injected session
      // cookie instead of requiring a live Go backend.
      NUXT_API_BASE_URL: `http://localhost:${stubPort}/api/v1`,
      // Listen port for the built Nitro node server.
      PORT: String(e2ePort),
    },
  },
});
