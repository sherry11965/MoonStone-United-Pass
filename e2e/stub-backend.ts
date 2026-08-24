//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: E2E stub backend answering the server-side administration authorization lookups
//

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

/**
 * E2E-only stub for the Go backend endpoints that the Nuxt stack reaches
 * server-side even in mock mode: the Nitro administration gate fetches
 * `${NUXT_API_BASE_URL}/me/permissions` (non-DreamUP surfaces) and
 * `${NUXT_API_BASE_URL}/admin/dreamup/events` (DreamUP surfaces), forwarding
 * exactly the `up_session` cookie (frozen legacy proxy header contract).
 *
 * The stub derives every response from that cookie value, so tests simulate
 * "logged-in" states purely by injecting the HttpOnly `up_session` cookie
 * through `context.addCookies` (e2e/support.ts) — mirroring what the backend
 * would have issued after a real login. No product code is touched.
 */

/** Mirrors `SESSION_COOKIE_NAME` in `shared/constants.ts` (e2e never imports product source). */
export const SESSION_COOKIE_NAME = "up_session";

/** Cookie values the stub understands; tests inject them verbatim. */
export const E2E_SESSIONS = {
  /** Full administration capabilities. */
  admin: "e2e-admin-session",
  /** Signed-in user without any administration capability. */
  user: "e2e-user-session",
  /** Backend answers 401 (session expired/revoked). */
  expired: "e2e-expired-session",
  /** DreamUP administration rights on one event, no console capabilities. */
  dreamup: "e2e-dreamup-session",
} as const;

export type E2ESessionCookie = (typeof E2E_SESSIONS)[keyof typeof E2E_SESSIONS];

/**
 * Capability shapes duplicated from `shared/types/permissions.ts`
 * (FULL_PERMISSIONS / NO_PERMISSIONS); kept literal so the e2e suite stays
 * independent of product source imports.
 */
const FULL_PERMISSIONS = {
  userRead: true,
  userDisable: true,
  employeeManage: true,
  employeeOffboard: true,
  departmentManage: true,
  applicationRead: true,
  applicationManage: true,
  applicationSecretRotate: true,
  policyRead: true,
  policyManage: true,
  policyPublish: true,
  auditRead: true,
  auditExport: true,
  providerRead: true,
  providerManage: true,
};

const NO_PERMISSIONS = {
  userRead: false,
  userDisable: false,
  employeeManage: false,
  employeeOffboard: false,
  departmentManage: false,
  applicationRead: false,
  applicationManage: false,
  applicationSecretRotate: false,
  policyRead: false,
  policyManage: false,
  policyPublish: false,
  auditRead: false,
  auditExport: false,
  providerRead: false,
  providerManage: false,
};

/**
 * `DreamUPEventsResponse` shape accepted by
 * `features/dreamup-admin/api/response-validators.ts#parseDreamUPEvents`.
 */
const DREAMUP_EVENTS = {
  events: [
    {
      eventId: "evt_demo_001",
      displayName: "DreamUP 2026 秋季赛",
      slug: "dreamup-2026-fall",
      role: "admin",
      counts: { total: 12, pending: 5, accepted: 6, rejected: 1 },
    },
  ],
};

const EMPTY_EVENTS = { events: [] };

export type StubBackendHandle = {
  baseUrl: string;
  port: number;
  close(): Promise<void>;
};

function readSessionCookie(request: IncomingMessage): string | undefined {
  const raw = request.headers.cookie;
  if (!raw) return undefined;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  return raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

export function stubPort(): number {
  const port = Number(process.env.UP_E2E_STUB_PORT ?? "3100");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("UP_E2E_STUB_PORT must be a valid TCP port");
  }
  return port;
}

/**
 * Starts the stub backend. Every endpoint not listed below answers 404 so a
 * test that accidentally reaches the stub for an unmigrated seam fails fast
 * instead of silently succeeding against a live backend.
 */
export async function startStubBackend(port = stubPort()): Promise<StubBackendHandle> {
  const server: Server = createServer((request, response) => {
    const pathname = (request.url ?? "/").split("?")[0];

    if (pathname === "/__stub_health") {
      return sendJson(response, 200, { ok: true });
    }

    const session = readSessionCookie(request);

    if (pathname === "/api/v1/me/permissions") {
      if (session === E2E_SESSIONS.admin) {
        return sendJson(response, 200, FULL_PERMISSIONS);
      }
      // A signed-in session without console capabilities (zero-permission
      // user) and a DreamUP-only session both yield the capability shape with
      // every flag false: the gate then redirects `/admin*` to `/account`.
      if (session === E2E_SESSIONS.user || session === E2E_SESSIONS.dreamup) {
        return sendJson(response, 200, NO_PERMISSIONS);
      }
      // Missing, unknown or expired session → gate redirects to /login.
      return sendJson(response, 401, { error: "unauthorized" });
    }

    if (pathname === "/api/v1/admin/dreamup/events") {
      if (session === E2E_SESSIONS.dreamup) {
        return sendJson(response, 200, DREAMUP_EVENTS);
      }
      // Signed-in sessions without DreamUP administration rights: the gate
      // answers the DreamUP surface with the frozen 403 forbidden text.
      if (session === E2E_SESSIONS.admin || session === E2E_SESSIONS.user) {
        return sendJson(response, 200, EMPTY_EVENTS);
      }
      return sendJson(response, 401, { error: "unauthorized" });
    }

    return sendJson(response, 404, { error: "not_found", path: pathname });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.removeListener("error", reject);
      resolve();
    });
  });

  return {
    baseUrl: `http://localhost:${port}/api/v1`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
