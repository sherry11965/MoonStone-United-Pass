//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: E2E webServer launcher — builds (baking the mock data source) then starts the production server
//

import { execSync } from "node:child_process";
import { createServer } from "node:net";

const port = process.env.PORT ?? "3000";

/**
 * Fail fast when something else already listens on the e2e port: without this
 * guard the Nitro server dies on EADDRINUSE (stderr) and Playwright would
 * silently burn the whole webServer readiness timeout polling the wrong
 * server. (With `reuseExistingServer` Playwright only skips launching when
 * the configured `url` already answers, so a non-answering squatter still
 * reaches this launcher.)
 */
await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", (error) => {
    probe.close();
    reject(new Error(`[e2e webserver] port ${port} is already in use — kill the squatter and rerun (${error.code})`));
  });
  probe.once("listening", () => {
    probe.close(resolve);
  });
  probe.listen(Number(port), "0.0.0.0");
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});

/**
 * Playwright `webServer.command` entry point.
 *
 * The baseline runs against a PRODUCTION build (see playwright.config.ts for
 * why `nuxt dev` is unusable), so the launcher:
 *
 * 1. builds with `NUXT_PUBLIC_USE_MOCK` already present in the environment
 *    (Playwright injects it via `webServer.env`), which bakes the mock data
 *    source into the bundle — a runtime-only override would never reach the
 *    module-level `USE_MOCK_DATA_SOURCE` constant;
 * 2. starts the built Nitro node server in this same process so Playwright can
 *    manage its lifecycle.
 *
 * It is a single `node` invocation (no shell `&&` chaining, which is not
 * reliable across Windows shells), and the verbose `nuxt build` stdout is
 * discarded (`stdio: "ignore"`) rather than pumped through Playwright's
 * webServer pipe — the Nitro build prints a very large file manifest that can
 * stall the pipe and blow the webServer readiness timeout. Build failures
 * still surface through the inherited stderr + exit code.
 */
try {
  execSync("nuxt build", {
    stdio: ["ignore", "ignore", "inherit"],
    env: process.env,
  });
} catch {
  console.error("[e2e webserver] nuxt build failed — aborting webServer startup");
  process.exit(1);
}

// The built server reads `PORT` (set in `webServer.env`) for its listen port.
await import("../.output/server/index.mjs");
