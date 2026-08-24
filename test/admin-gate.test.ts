//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Administration gate tests (1:1 port of legacy proxy.test.ts, full branch coverage)
//

import { afterEach, describe, expect, it, vi } from "vitest";
import { FULL_PERMISSIONS, NO_PERMISSIONS } from "@/shared/types/permissions";
import {
  decideAdminGateOutcome,
  getAdminAuthorizationPath,
  isAdminSurfacePathname,
  isDreamUPAdministrationPathname,
  runAdminGate,
  type AdminAuthorizationSnapshot,
} from "@/features/admin/gate-decision";
import { hasDreamUPAdministrationAccess } from "@/features/dreamup-admin/permissions";

// ---------------------------------------------------------------------------
// Transport doubles. The middleware resolves everything through `#imports`
// (useEvent/getRequestHeader) and `h3` response helpers; both are replaced
// with observable fakes so the suite can assert the exact legacy status
// codes, locations and headers without a live server.
// ---------------------------------------------------------------------------

type FakeEvent = {
  path: string;
  context: Record<string, unknown>;
  cookieHeader?: string;
  requestId?: string;
  status?: number;
  headers: Record<string, string>;
  redirect?: { location: string; code?: number };
  body?: unknown;
};

function fakeEvent(pathname: string, options: { session?: string; requestId?: string } = {}): FakeEvent {
  return {
    path: pathname,
    context: {},
    cookieHeader: options.session !== undefined ? `up_session=${options.session}` : undefined,
    requestId: options.requestId,
    headers: {},
  };
}

const testState = vi.hoisted(() => ({
  event: undefined as unknown,
}));

vi.mock("#imports", () => ({
  useEvent: () => testState.event,
  getRequestHeader: (event: FakeEvent | undefined, name: string) => {
    if (!event) return undefined;
    if (name === "cookie") return event.cookieHeader;
    if (name === "x-request-id") return event.requestId;
    return undefined;
  },
  useRuntimeConfig: () => ({
    apiBaseUrl: "http://localhost:8080/api/v1",
    public: { useMock: false },
  }),
  sendRedirect: async () => {
    // Unused: the middleware's h3 sendRedirect is mocked below.
  },
}));

vi.mock("h3", () => ({
  defineEventHandler: (handler: unknown) => handler,
  getRequestHeader: (event: FakeEvent | undefined, name: string) => {
    if (!event) return undefined;
    if (name === "cookie") return event.cookieHeader;
    if (name === "x-request-id") return event.requestId;
    return undefined;
  },
  sendRedirect: vi.fn(async (event: FakeEvent, location: string, code?: number) => {
    event.redirect = { location, code };
  }),
  setHeader: vi.fn((event: FakeEvent, name: string, value: string) => {
    event.headers[name] = value;
  }),
  setResponseStatus: vi.fn((event: FakeEvent, code: number) => {
    event.status = code;
  }),
  send: vi.fn(async (event: FakeEvent, data: unknown, type?: string) => {
    event.body = data;
    if (type) event.headers["Content-Type"] = type;
  }),
}));

import adminGateHandler from "@/server/middleware/admin-gate";

const handleGate = adminGateHandler as unknown as (event: FakeEvent) => Promise<unknown>;

type FetchCall = { url: string; init: RequestInit };

function stubFetch(response: Response): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return response;
    }),
  );
  return { calls };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function headerOf(call: FetchCall, name: string): string | null {
  return new Headers(call.init.headers as HeadersInit).get(name);
}

async function gate(event: FakeEvent): Promise<unknown> {
  testState.event = event;
  const result = await handleGate(event);
  if (result !== undefined) event.body = result;
  return result;
}

afterEach(() => {
  vi.unstubAllGlobals();
  testState.event = undefined;
});

// ---------------------------------------------------------------------------
// Legacy proxy.test.ts — the seven frozen behaviours, asserted 1:1.
// ---------------------------------------------------------------------------

describe("administration gate (legacy proxy.test.ts port)", () => {
  it("only matches administration routes", () => {
    // Frozen matcher ["/admin/:path*"] semantics.
    expect(isAdminSurfacePathname("/admin")).toBe(true);
    expect(isAdminSurfacePathname("/admin/users")).toBe(true);
    expect(isAdminSurfacePathname("/admin/dreamup")).toBe(true);
    expect(isAdminSurfacePathname("/account")).toBe(false);
    expect(isAdminSurfacePathname("/administration")).toBe(false);
    expect(isAdminSurfacePathname("/")).toBe(false);
  });

  it("redirects a request without a session before fetching permissions", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const event = fakeEvent("/admin/users");

    await gate(event);

    expect(event.redirect).toEqual({ location: "/login", code: 307 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("redirects an external user before the administration route renders", async () => {
    stubFetch(jsonResponse(NO_PERMISSIONS));
    const event = fakeEvent("/admin/users", { session: "session-token" });

    await gate(event);

    expect(event.redirect).toEqual({ location: "/account", code: 307 });
  });

  it("allows a user with administration capabilities", async () => {
    stubFetch(jsonResponse(FULL_PERMISSIONS));
    const event = fakeEvent("/admin/users", { session: "session-token" });

    const result = await gate(event);

    // NextResponse.next() equivalent: no redirect, no status override.
    expect(result).toBeUndefined();
    expect(event.redirect).toBeUndefined();
    expect(event.status).toBeUndefined();
  });

  it("checks DreamUP event authorization directly for its management surface", async () => {
    const { calls } = stubFetch(jsonResponse({
      events: [{ eventId: "dreamup-shanghai-2026", displayName: "上海站" }],
    }));
    const event = fakeEvent("/admin/dreamup", { session: "session-token" });

    const result = await gate(event);

    expect(result).toBeUndefined();
    expect(event.redirect).toBeUndefined();
    expect(String(calls[0]?.url)).toContain("/admin/dreamup/events");
  });

  it("returns a clear 403 for a signed-in user without DreamUP event access", async () => {
    stubFetch(jsonResponse({ error: { message: "forbidden" } }, 403));
    const event = fakeEvent("/admin/dreamup", { session: "session-token" });

    await gate(event);

    expect(event.status).toBe(403);
    expect(event.headers["Cache-Control"]).toBe("no-store");
    expect(event.headers["Content-Type"]).toBe("text/plain; charset=utf-8");
    expect(event.body).toBe("你没有 MoonStone DreamUP 活动管理权限。");
  });

  it("fails closed when the permission service response is malformed", async () => {
    stubFetch(jsonResponse({ userRead: true }));
    const event = fakeEvent("/admin/users", { session: "session-token" });

    await gate(event);

    expect(event.status).toBe(503);
    expect(event.headers["Cache-Control"]).toBe("no-store");
    expect(event.body).toBe("管理后台暂时不可用。");
  });
});

// ---------------------------------------------------------------------------
// Transport contract of the authorization lookup (frozen proxy header rules).
// ---------------------------------------------------------------------------

describe("administration gate authorization lookup", () => {
  it("forwards exactly the session cookie and the incoming X-Request-ID", async () => {
    const { calls } = stubFetch(jsonResponse(FULL_PERMISSIONS));
    const event = fakeEvent("/admin/users", { session: "sealed-session", requestId: "trace-123" });

    await gate(event);

    expect(calls).toHaveLength(1);
    expect(headerOf(calls[0], "Cookie")).toBe("up_session=sealed-session");
    expect(headerOf(calls[0], "X-Request-ID")).toBe("trace-123");
    expect(calls[0].init.cache).toBe("no-store");
  });

  it("redirects to /login when the permission service answers 401", async () => {
    stubFetch(jsonResponse({ error: { message: "unauthorized" } }, 401));
    const event = fakeEvent("/admin/users", { session: "expired" });

    await gate(event);

    expect(event.redirect).toEqual({ location: "/login", code: 307 });
  });

  it("fails closed when the permission service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    const event = fakeEvent("/admin/users", { session: "session-token" });

    await gate(event);

    expect(event.status).toBe(503);
    expect(event.headers["Cache-Control"]).toBe("no-store");
  });

  it("fails closed when a successful response body is not JSON", async () => {
    stubFetch(new Response("<html>", { status: 200, headers: { "Content-Type": "text/html" } }));
    const event = fakeEvent("/admin/users", { session: "session-token" });

    await gate(event);

    expect(event.status).toBe(503);
    expect(event.headers["Cache-Control"]).toBe("no-store");
  });

  it("fails closed on any other non-2xx status", async () => {
    stubFetch(jsonResponse({ error: { message: "boom" } }, 500));
    const event = fakeEvent("/admin/users", { session: "session-token" });

    await gate(event);

    expect(event.status).toBe(503);
  });

  it("returns 403 for a DreamUP 404 as well", async () => {
    stubFetch(jsonResponse({ error: { message: "not found" } }, 404));
    const event = fakeEvent("/admin/dreamup/events/event-1", { session: "session-token" });

    await gate(event);

    expect(event.status).toBe(403);
    expect(event.body).toBe("你没有 MoonStone DreamUP 活动管理权限。");
  });

  it("does not treat non-admin or dreamup-adjacent paths as DreamUP", async () => {
    const { calls } = stubFetch(jsonResponse(FULL_PERMISSIONS));
    const event = fakeEvent("/admin/dreamup-report", { session: "session-token" });

    await gate(event);

    expect(String(calls[0]?.url)).toContain("/me/permissions");
  });

  it("skips non-administration paths without any lookup", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const event = fakeEvent("/account/security", { session: "session-token" });

    await gate(event);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(event.redirect).toBeUndefined();
    expect(event.status).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Request-scoped memo: one lookup per request, shared gate/layout result.
// ---------------------------------------------------------------------------

describe("administration gate per-request memo", () => {
  it("fetches /me/permissions only once per request (gate + layout reuse)", async () => {
    const { calls } = stubFetch(jsonResponse(FULL_PERMISSIONS));
    const event = fakeEvent("/admin/users", { session: "session-token" });

    await gate(event);
    // The dashboard layout resolves the same path through the same memo.
    const { getAdminAuthorizationSnapshot } = await import("@/server/utils/admin-authorization");
    const snapshot = await getAdminAuthorizationSnapshot(
      event as unknown as Parameters<typeof getAdminAuthorizationSnapshot>[0],
      "/me/permissions",
    );

    expect(calls).toHaveLength(1);
    expect(snapshot).toEqual({ kind: "response", status: 200, body: FULL_PERMISSIONS });
  });

  it("keeps distinct authorization paths separate within one request", async () => {
    const { calls } = stubFetch(jsonResponse(FULL_PERMISSIONS));
    const event = fakeEvent("/admin/users", { session: "session-token" });
    const { getAdminAuthorizationSnapshot } = await import("@/server/utils/admin-authorization");

    await gate(event);
    await getAdminAuthorizationSnapshot(
      event as unknown as Parameters<typeof getAdminAuthorizationSnapshot>[0],
      "/admin/dreamup/events",
    );

    expect(calls).toHaveLength(2);
    expect(String(calls[0]?.url)).toContain("/me/permissions");
    expect(String(calls[1]?.url)).toContain("/admin/dreamup/events");
  });

  it("never reuses a snapshot across different requests", async () => {
    const { calls } = stubFetch(jsonResponse(FULL_PERMISSIONS));

    await gate(fakeEvent("/admin/users", { session: "session-token" }));
    await gate(fakeEvent("/admin/users", { session: "session-token" }));

    expect(calls).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Pure decision core — every branch.
// ---------------------------------------------------------------------------

describe("gate decision core", () => {
  it("selects the frozen authorization paths", () => {
    expect(getAdminAuthorizationPath("/admin")).toBe("/me/permissions");
    expect(getAdminAuthorizationPath("/admin/users")).toBe("/me/permissions");
    expect(getAdminAuthorizationPath("/admin/dreamup")).toBe("/admin/dreamup/events");
    expect(getAdminAuthorizationPath("/admin/dreamup/events/event-1")).toBe("/admin/dreamup/events");
  });

  it("detects DreamUP administration pathnames exactly", () => {
    expect(isDreamUPAdministrationPathname("/admin/dreamup")).toBe(true);
    expect(isDreamUPAdministrationPathname("/admin/dreamup/reviews")).toBe(true);
    expect(isDreamUPAdministrationPathname("/admin/dreamupx")).toBe(false);
    expect(isDreamUPAdministrationPathname("/admin")).toBe(false);
  });

  const respond = (status: number, body: unknown): AdminAuthorizationSnapshot =>
    ({ kind: "response", status, body });

  it("fails closed on a fetch failure", () => {
    expect(decideAdminGateOutcome("/admin", { kind: "fetch_failed" }))
      .toEqual({ outcome: "unavailable" });
  });

  it("redirects to /login on 401 before any body inspection", () => {
    expect(decideAdminGateOutcome("/admin", respond(401, null)))
      .toEqual({ outcome: "redirect", location: "/login" });
    expect(decideAdminGateOutcome("/admin/dreamup", respond(401, null)))
      .toEqual({ outcome: "redirect", location: "/login" });
  });

  it("returns forbidden for DreamUP 403 and 404", () => {
    expect(decideAdminGateOutcome("/admin/dreamup", respond(403, null)))
      .toEqual({ outcome: "forbidden" });
    expect(decideAdminGateOutcome("/admin/dreamup/x", respond(404, null)))
      .toEqual({ outcome: "forbidden" });
  });

  it("fails closed for non-DreamUP 403/404 and other non-2xx", () => {
    expect(decideAdminGateOutcome("/admin/users", respond(403, null)))
      .toEqual({ outcome: "unavailable" });
    expect(decideAdminGateOutcome("/admin/users", respond(404, null)))
      .toEqual({ outcome: "unavailable" });
    expect(decideAdminGateOutcome("/admin/users", respond(502, null)))
      .toEqual({ outcome: "unavailable" });
  });

  it("fails closed when the 2xx body cannot be parsed", () => {
    expect(decideAdminGateOutcome("/admin", { kind: "body_parse_failed", status: 200 }))
      .toEqual({ outcome: "unavailable" });
  });

  it("allows DreamUP access only when at least one event is granted", () => {
    expect(decideAdminGateOutcome("/admin/dreamup", respond(200, {
      events: [{ eventId: "e1", displayName: "上海站" }],
    }))).toEqual({ outcome: "allow" });
    expect(decideAdminGateOutcome("/admin/dreamup", respond(200, { events: [] })))
      .toEqual({ outcome: "forbidden" });
  });

  it("fails closed when the DreamUP body shape is invalid", () => {
    expect(decideAdminGateOutcome("/admin/dreamup", respond(200, { events: [{ eventId: 1 }] })))
      .toEqual({ outcome: "unavailable" });
    expect(decideAdminGateOutcome("/admin/dreamup", respond(200, [])))
      .toEqual({ outcome: "unavailable" });
  });

  it("fails closed when the permission body fails the capability shape check", () => {
    expect(decideAdminGateOutcome("/admin", respond(200, { userRead: true })))
      .toEqual({ outcome: "unavailable" });
    expect(decideAdminGateOutcome("/admin", respond(200, null)))
      .toEqual({ outcome: "unavailable" });
  });

  it("redirects users without any console capability to /account", () => {
    expect(decideAdminGateOutcome("/admin", respond(200, NO_PERMISSIONS)))
      .toEqual({ outcome: "redirect", location: "/account" });
  });

  it("allows users with at least one console capability", () => {
    expect(decideAdminGateOutcome("/admin", respond(200, FULL_PERMISSIONS)))
      .toEqual({ outcome: "allow" });
    expect(decideAdminGateOutcome("/admin", respond(200, { ...NO_PERMISSIONS, auditRead: true })))
      .toEqual({ outcome: "allow" });
  });

  it("never fetches for a sessionless request", async () => {
    const fetchAuthorization = vi.fn();

    const decision = await runAdminGate({
      pathname: "/admin/users",
      sessionCookie: undefined,
      fetchAuthorization,
    });

    expect(decision).toEqual({ outcome: "redirect", location: "/login" });
    expect(fetchAuthorization).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DreamUP access derivation (legacy permissions.test.ts port).
// ---------------------------------------------------------------------------

describe("hasDreamUPAdministrationAccess", () => {
  it("grants access only with at least one administered event", () => {
    expect(hasDreamUPAdministrationAccess([])).toBe(false);
    expect(hasDreamUPAdministrationAccess([{ eventId: "event", displayName: "上海站" }])).toBe(true);
  });
});
