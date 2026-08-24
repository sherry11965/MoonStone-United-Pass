//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: E2E webServer launcher for the SPA stack — builds the Vite SPA (baking the mock data source and the registration flag) then serves dist-spa/ with redirect rules, session-cookie gates and a stub-backend passthrough
//

import { execSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist-spa");

// The SPA host reads UP_E2E_PORT (playwright.config.ts webServer.env), not
// the Nuxt stack's `PORT` — the two launchers must stay independently
// configurable.
const port = process.env.UP_E2E_PORT ?? "3000";

// Stub backend (e2e/stub-backend.ts) target for the /api/v1 passthrough below.
const stubPort = process.env.UP_E2E_STUB_PORT ?? "3100";

/**
 * Fail fast when something else already listens on the e2e port: without this
 * guard the static host dies on EADDRINUSE (stderr) and Playwright would
 * silently burn the whole webServer readiness timeout polling the wrong
 * server. (With `reuseExistingServer` Playwright only skips launching when
 * the configured `url` already answers, so a non-answering squatter still
 * reaches this launcher.)
 */
await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once("error", (error) => {
    probe.close();
    reject(new Error(`[e2e webserver-spa] port ${port} is already in use — kill the squatter and rerun (${error.code})`));
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
 * Playwright `webServer.command` entry point (SPA stack).
 *
 * Mirrors e2e/webserver.mjs: a single `node` invocation (no shell `&&`
 * chaining, unreliable across Windows shells); the verbose build stdout is
 * discarded (`stdio: "ignore"`) rather than pumped through Playwright's
 * webServer pipe — Vite's build output can stall the pipe and blow the
 * webServer readiness timeout. Build failures still surface through the
 * inherited stderr + exit code.
 *
 * `VITE_USE_MOCK` / `VITE_PUBLIC_REGISTRATION_ENABLED` are baked at build
 * time: `import.meta.env.VITE_*` values are statically substituted by Vite,
 * so a runtime-only override would never reach the bundle. Playwright
 * injects both through `webServer.env` (playwright.config.ts); the `?? "…"`
 * defaults keep a manual `node e2e/webserver-spa.mjs` run equivalent.
 *
 * The vite binary is launched through the current node executable + its
 * resolved script path instead of relying on PATH: a bare `vite build` would
 * require `node_modules/.bin` on PATH, which holds under pnpm-run scripts
 * but not for a direct `node e2e/run-e2e-spa.mjs` invocation.
 */
try {
  const viteBin = path.join(rootDir, "node_modules", "vite", "bin", "vite.js");
  execSync(`"${process.execPath}" "${viteBin}" build`, {
    cwd: rootDir,
    stdio: ["ignore", "ignore", "inherit"],
    env: {
      ...process.env,
      VITE_USE_MOCK: process.env.VITE_USE_MOCK ?? "true",
      VITE_PUBLIC_REGISTRATION_ENABLED: process.env.VITE_PUBLIC_REGISTRATION_ENABLED ?? "false",
    },
  });
} catch {
  console.error("[e2e webserver-spa] vite build failed — aborting webServer startup");
  process.exit(1);
}

/**
 * Redirect rule table: exact pathname match → Location + status. Array of
 * `{match, location, status}` records so later migration phases can append
 * rules without touching the dispatcher below — P3c will append the DreamUP
 * external-jump rules (`/admin/dreamup*` → https://moonstone.org.cn/…).
 *
 * The built-in `"/" → 307 /login` rule reproduces the frozen server-side
 * behavior of `pages/index.vue` (`navigateTo("/login", { redirectCode: 307 })`
 * during SSR). It must be a REAL request-visible 307: routes-smoke.spec.ts
 * observes the first hop with `page.request.fetch("/", { maxRedirects: 0 })`
 * and asserts status 307 + Location, which a client-side router redirect or
 * a static index.html can never satisfy.
 */
const REDIRECT_RULES = [
  { match: "/", location: "/login", status: 307 },
];

/**
 * Cookie gate: anonymous requests to the signed-in surfaces are sent back to
 * the login page — the HTTP-layer counterpart of the Nuxt stack's
 * `requireSession` (server/utils/server-session.ts, `/account*`) and the
 * Nitro administration gate's anonymous branch (`/admin*`). The SPA is
 * client-only and cannot run those server guards, so the e2e host enforces
 * the same observable contract: auth.spec.ts ("Mock 登录被弹回" /
 * "未登录门禁") and routes-smoke's session segments depend on it. Any
 * `up_session` cookie value passes here — capability decisions stay with the
 * SPA shells in real mode and are out of scope for the host (P3c may
 * upgrade this to permission-aware routing).
 */
const GATED_PREFIXES = ["/account", "/admin"];

function isGated(pathname) {
  return GATED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasSessionCookie(request) {
  const raw = request.headers.cookie;
  if (!raw) return false;
  return raw
    .split(";")
    .map((part) => part.trim())
    .some((part) => part.startsWith("up_session="));
}

function sendRedirect(response, location, status) {
  response.writeHead(status, { Location: location });
  response.end();
}

/**
 * Frozen browser-side API mocks for seams the migrated SPA pages fetch from
 * the browser even in mock mode. The Nuxt stack resolves these server-side
 * (SSR query layer), so the baseline never observes them over the wire; the
 * SPA counterpart fetches same-origin `/api/v1/*`, and a non-2xx answer would
 * surface as a browser console "Failed to load resource" error and break the
 * suites' zero-console-error assertions. Each entry must reproduce the
 * baseline-visible contract exactly:
 *
 * - `/api/v1/legal-documents`: the baseline environment carries no approved
 *   publication (legal.spec.ts asserts the "暂未生效" copy), so the empty
 *   `items` list degrades to a null publication in
 *   `verifyLegalPublication` — observable parity with the Nuxt SSR result.
 */
const API_MOCKS = new Map([
  ["/api/v1/legal-documents", { items: [] }],
]);

/**
 * `/api/v1/*` passthrough to the e2e stub backend, preserving the full path
 * (the stub answers `/api/v1/me/permissions` etc.) and forwarding the
 * request cookie header verbatim. Pre-wired for P3b/P3c where real-mode
 * browser fetches reach the backend same-origin under the `/api/v1` prefix
 * (mirroring vite.config.ts dev proxy); the current mock-mode suites never
 * touch this branch.
 */
function proxyToStubBackend(request, response) {
  const proxyRequest = httpRequest(
    {
      hostname: "localhost",
      port: Number(stubPort),
      method: request.method,
      path: request.url,
      headers: { ...request.headers, host: `localhost:${stubPort}` },
    },
    (proxyResponse) => {
      response.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
      proxyResponse.pipe(response);
    },
  );
  proxyRequest.on("error", (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    }
    response.end(JSON.stringify({ error: "bad_gateway", detail: String(error?.message ?? error) }));
  });
  request.pipe(proxyRequest);
}

/** Content-Type map for the static assets Vite emits into dist-spa/. */
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

/** Serves a file from dist-spa/ when it exists; traversal-safe. */
async function tryServeStatic(pathname, request, response) {
  if (pathname.includes("\0")) return false;
  const filePath = path.normalize(path.join(distDir, decodeURIComponent(pathname)));
  if (filePath !== distDir && !filePath.startsWith(`${distDir}${path.sep}`)) return false;

  let stats;
  try {
    stats = await stat(filePath);
  } catch {
    return false;
  }
  if (!stats.isFile()) return false;

  const contentType = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const body = await readFile(filePath);
  response.writeHead(200, { "Content-Type": contentType });
  if (request.method === "HEAD") {
    response.end();
  } else {
    response.end(body);
  }
  return true;
}

/**
 * The SPA e2e host: same-process node:http server (Playwright manages its
 * lifecycle), dispatch order:
 *
 *  0. stack-unique readiness probe `/__e2e_stack_spa` — answered before any
 *     other rule so playwright.config.ts can verify it is really THIS host
 *     (and not a leftover server from the Nuxt stack on the shared port);
 *  a. redirect rule table (exact match) — see REDIRECT_RULES;
 *  b. session-cookie gate for /account* and /admin*;
 *  c. /api/v1 passthrough to the e2e stub backend;
 *  d. static files from dist-spa/, with an index.html fallback so deep
 *     links (/login, /register, …) answer 200 directly and vue-router takes
 *     over client-side.
 */
const server = createHttpServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

    // Stack-unique readiness probe: must precede the redirect rule table,
    // the cookie gate, the /api/v1 passthrough and the static/history
    // fallback alike — any other dispatch could be mimicked by a leftover
    // server of the other stack, defeating the probe's purpose.
    if (pathname === "/__e2e_stack_spa") {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("spa");
    }

    const rule = REDIRECT_RULES.find((entry) => entry.match === pathname);
    if (rule) {
      return sendRedirect(response, rule.location, rule.status);
    }

    if (isGated(pathname) && !hasSessionCookie(request)) {
      return sendRedirect(response, "/login", 307);
    }

    if (pathname === "/api/v1" || pathname.startsWith("/api/v1/")) {
      const apiMock = API_MOCKS.get(pathname);
      if (apiMock !== undefined) {
        response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        return response.end(JSON.stringify(apiMock));
      }
      return proxyToStubBackend(request, response);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end("method not allowed");
    }

    if (await tryServeStatic(pathname, request, response)) return;

    // History fallback: every unmatched path boots the SPA from index.html.
    const indexHtml = await readFile(path.join(distDir, "index.html"));
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    if (request.method === "HEAD") {
      return response.end();
    }
    response.end(indexHtml);
  } catch (error) {
    console.error("[e2e webserver-spa] request handling failed", error);
    if (!response.headersSent) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    }
    response.end("internal e2e webserver-spa error");
  }
});

server.listen(Number(port), () => {
  console.log(`[e2e webserver-spa] serving dist-spa/ on http://localhost:${port} (stack=spa, stub=${stubPort})`);
});
