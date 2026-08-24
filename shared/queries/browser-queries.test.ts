//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Contract tests for the SPA browser query layer (mirrors server-queries)
//

import { afterEach, describe, expect, it, vi } from "vitest";

// Records every path handed to the browser transport and answers through a
// per-test responder. Mirrors the fetch-stub style of test/server/*.
const fetchState = vi.hoisted(() => ({
  calls: [] as string[],
  responder: undefined as ((path: string) => unknown) | undefined,
}));

vi.mock("@/shared/http/browser-http-client", () => ({
  browserFetch: vi.fn(async (path: string) => {
    fetchState.calls.push(path);
    if (!fetchState.responder) {
      throw new Error(`unexpected browserFetch call: ${path}`);
    }
    return fetchState.responder(path);
  }),
}));

// The contract under test is the REAL data-source branch; the mock branch is
// covered at the bottom via vi.resetModules + vi.doMock.
vi.mock("@/shared/data-source-mode", () => ({ USE_MOCK_DATA_SOURCE: false }));

import { browserQueries } from "@/shared/queries/browser-queries";
import { mockUnitedPassDataSource } from "@/shared/mock/united-pass-data-source";

const CURRENT_USER_BODY = {
  userId: "usr_01",
  displayName: "陈嘉嘉",
  email: "ariakage@example.com",
  phoneMasked: "138****0000",
  personas: ["consumer"],
};

const PERMISSIONS_BODY = {
  userRead: true,
  userDisable: false,
  employeeManage: false,
  employeeOffboard: false,
  departmentManage: false,
  applicationRead: true,
  applicationManage: false,
  applicationSecretRotate: false,
  policyRead: false,
  policyManage: false,
  policyPublish: false,
  auditRead: true,
  auditExport: false,
  providerRead: false,
  providerManage: false,
};

afterEach(() => {
  fetchState.calls = [];
  fetchState.responder = undefined;
  vi.clearAllMocks();
});

describe("browserQueries — account/consent seams (real data source)", () => {
  it("getCurrentUser issues GET /me and narrows onto the CurrentUser contract", async () => {
    fetchState.responder = () => CURRENT_USER_BODY;

    await expect(browserQueries.getCurrentUser()).resolves.toEqual({
      userId: "usr_01",
      displayName: "陈嘉嘉",
      email: "ariakage@example.com",
      phoneMasked: "138****0000",
      personas: ["consumer"],
    });
    expect(fetchState.calls).toEqual(["/me"]);
  });

  it("getCurrentUser fails closed on a malformed /me body", async () => {
    fetchState.responder = () => ({ userId: 42 });

    await expect(browserQueries.getCurrentUser()).rejects.toThrow();
  });

  it("getCurrentUser propagates transport/API errors untouched (only 401 is anonymous)", async () => {
    const serverError = { kind: "server_error" as const, message: "backend down" };
    fetchState.responder = () => {
      throw serverError;
    };

    await expect(browserQueries.getCurrentUser()).rejects.toBe(serverError);
  });

  it("getCurrentPermissions issues GET /me/permissions and narrows the capabilities", async () => {
    fetchState.responder = () => PERMISSIONS_BODY;

    await expect(browserQueries.getCurrentPermissions()).resolves.toEqual(PERMISSIONS_BODY);
    expect(fetchState.calls).toEqual(["/me/permissions"]);
  });
});

describe("browserQueries — cursor pagination encoding (real data source)", () => {
  it("getUsers encodes the full PageQuery and parses the cursor envelope", async () => {
    fetchState.responder = () => ({
      items: [
        {
          userId: "usr_01",
          displayName: "陈嘉嘉",
          email: "ariakage@example.com",
          personaLabel: "外部用户",
          status: "active",
          lastActiveAt: "2026-08-24T00:00:00Z",
        },
      ],
      page: { nextCursor: "cursor-2", hasMore: true },
    });

    const page = await browserQueries.getUsers({
      cursor: "cursor-1",
      limit: 20,
      query: "陈",
      sort: "-lastActiveAt",
      status: "active",
    });

    expect(fetchState.calls).toEqual([
      "/admin/users?cursor=cursor-1&limit=20&query=%E9%99%88&sort=-lastActiveAt&status=active",
    ]);
    expect(page.items).toHaveLength(1);
    expect(page.page).toEqual({ nextCursor: "cursor-2", hasMore: true });
  });

  it("getUsers omits the query string when no PageQuery is supplied", async () => {
    fetchState.responder = () => ({ items: [], page: { nextCursor: null, hasMore: false } });

    await browserQueries.getUsers();

    expect(fetchState.calls).toEqual(["/admin/users"]);
  });

  it("getAuditEvents encodes the audit filters", async () => {
    fetchState.responder = () => ({ items: [], page: { nextCursor: null, hasMore: false } });

    await browserQueries.getAuditEvents({
      eventType: "user.login",
      result: "success",
      actorName: "ariakage",
      from: "2026-08-01",
      to: "2026-08-24",
    });

    expect(fetchState.calls).toEqual([
      "/admin/audit-events?eventType=user.login&result=success&actorName=ariakage&from=2026-08-01&to=2026-08-24",
    ]);
  });
});

describe("browserQueries — nullable detail seams (real data source)", () => {
  it("getUserDetail resolves null on an explicit not_found (404)", async () => {
    fetchState.responder = () => {
      throw { kind: "not_found" as const, message: "user missing" };
    };

    await expect(browserQueries.getUserDetail("usr_missing")).resolves.toBeNull();
    expect(fetchState.calls).toEqual(["/admin/users/usr_missing"]);
  });

  it("getUserDetail rethrows non-not_found failures", async () => {
    const serverError = { kind: "server_error" as const, message: "backend down" };
    fetchState.responder = () => {
      throw serverError;
    };

    await expect(browserQueries.getUserDetail("usr_01")).rejects.toBe(serverError);
  });

  it("detail seams percent-encode path segments", async () => {
    fetchState.responder = () => {
      throw { kind: "not_found" as const, message: "missing" };
    };

    await browserQueries.getUserDetail("usr/needs encoding");

    expect(fetchState.calls).toEqual(["/admin/users/usr%2Fneeds%20encoding"]);
  });
});

describe("browserQueries — unmigrated seams stay on the mock source", () => {
  it("getApplications never touches the browser transport", async () => {
    const page = await browserQueries.getApplications();

    expect(fetchState.calls).toEqual([]);
    await expect(mockUnitedPassDataSource.getApplications()).resolves.toEqual(page);
  });
});

describe("browserQueries — mock data source mode", () => {
  it("delegates migrated seams to the mock source without any fetch", async () => {
    vi.resetModules();
    vi.doMock("@/shared/data-source-mode", () => ({ USE_MOCK_DATA_SOURCE: true }));

    const { browserQueries: mockBrowserQueries } = await import(
      "@/shared/queries/browser-queries"
    );

    const user = await mockBrowserQueries.getCurrentUser();
    const permissions = await mockBrowserQueries.getCurrentPermissions();

    expect(fetchState.calls).toEqual([]);
    await expect(mockUnitedPassDataSource.getCurrentUser()).resolves.toEqual(user);
    await expect(mockUnitedPassDataSource.getCurrentPermissions()).resolves.toEqual(permissions);

    vi.doUnmock("@/shared/data-source-mode");
  });
});
