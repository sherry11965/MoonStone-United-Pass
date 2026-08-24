//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA-stack e2e entry — sets UP_E2E_STACK=spa then spawns `playwright test`, forwarding CLI arguments and the exit code
//

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A shell-free switch for the SPA stack. Setting the stack selector through
 * `process.env` here (instead of an `UP_E2E_STACK=spa playwright test`
 * script prefix) avoids the incompatible inline environment-variable syntax
 * across Windows shells (cmd / PowerShell), while staying a no-op on every
 * other platform. playwright.config.ts reads UP_E2E_STACK and swaps only
 * `webServer` — the default (unset) value keeps the Nuxt baseline byte-for-byte.
 *
 * The Playwright CLI is invoked through the current node executable + the
 * package's resolved cli.js instead of relying on a `playwright` PATH entry
 * (same reasoning as e2e/webserver-spa.mjs's vite invocation).
 */
process.env.UP_E2E_STACK = "spa";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playwrightCli = path.join(rootDir, "node_modules", "@playwright", "test", "cli.js");

const child = spawn(process.execPath, [playwrightCli, "test", ...process.argv.slice(2)], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});

child.on("close", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
