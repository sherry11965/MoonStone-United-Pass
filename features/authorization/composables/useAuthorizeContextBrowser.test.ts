//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA authorize-page context composable (mock fallback, missing-id guard, error wrapping)
//

import type { ConsentResolution } from "@/features/authorization/types";
import type { CurrentUser } from "@/shared/types/identity";
import { afterEach, describe, expect, it, vi } from "vitest";

const USER = { userId: "usr_01" } as unknown as CurrentUser;

const VALID_RESOLUTION: ConsentResolution = {
  status: "valid",
  request: {
    requestId: "consent_demo_001",
    applicationName: "United Workspace",
    applicationDescription: "团队协作与项目管理工作台",
    applicationOwner: "协作产品团队",
    redirectHost: "workspace.united.example",
    scopes: [],
  },
};

const EXPIRED_RESOLUTION: ConsentResolution = {
  status: "expired",
  requestId: "consent_demo_002",
  expiredAt: "2026-08-01T00:00:00Z",
};

const queryState = vi.hoisted(() => ({
  resolution: async (_requestId: string) => VALID_RESOLUTION,
  currentUser: async () => USER,
  resolutionCalls: [] as string[],
  currentUserCalls: 0,
}));

/**
 * Loads a fresh composable module instance under the requested data-source
 * mode (the module reads `USE_MOCK_DATA_SOURCE` at import time; both the
 * mock-fallback branch and the real-mode guard are covered in this suite).
 */
async function loadUseAuthorizeContextBrowser(useMock: boolean) {
  vi.resetModules();
  vi.doMock("@/shared/data-source-mode", () => ({ USE_MOCK_DATA_SOURCE: useMock }));
  vi.doMock("@/shared/queries/browser-queries", () => ({
    browserQueries: {
      getConsentResolution: async (requestId: string) => {
        queryState.resolutionCalls.push(requestId);
        return queryState.resolution(requestId);
      },
      getCurrentUser: async () => {
        queryState.currentUserCalls += 1;
        return queryState.currentUser();
      },
    },
  }));
  const mod = await import("@/features/authorization/composables/useAuthorizeContextBrowser");
  return mod.useAuthorizeContextBrowser;
}

afterEach(() => {
  vi.doUnmock("@/shared/data-source-mode");
  vi.doUnmock("@/shared/queries/browser-queries");
  queryState.resolution = async () => VALID_RESOLUTION;
  queryState.currentUser = async () => USER;
  queryState.resolutionCalls = [];
  queryState.currentUserCalls = 0;
});

describe("useAuthorizeContextBrowser (mock mode)", () => {
  it("falls back to consent_demo_001 when no requestId is supplied", async () => {
    const useAuthorizeContextBrowser = await loadUseAuthorizeContextBrowser(true);

    const context = await useAuthorizeContextBrowser(undefined);

    expect(context.shouldResolve).toBe(true);
    expect(queryState.resolutionCalls).toEqual(["consent_demo_001"]);
    expect(context.resolution).toEqual(VALID_RESOLUTION);
  });

  it("fetches the current identity for a valid resolution", async () => {
    const useAuthorizeContextBrowser = await loadUseAuthorizeContextBrowser(true);

    const context = await useAuthorizeContextBrowser(undefined);

    expect(queryState.currentUserCalls).toBe(1);
    expect(context.currentUser).toBe(USER);
  });

  it("prefers a caller-supplied requestId over the mock fallback", async () => {
    queryState.resolution = async () => EXPIRED_RESOLUTION;
    const useAuthorizeContextBrowser = await loadUseAuthorizeContextBrowser(true);

    const context = await useAuthorizeContextBrowser("consent_demo_002");

    expect(queryState.resolutionCalls).toEqual(["consent_demo_002"]);
    expect(context.resolution?.status).toBe("expired");
    // Non-valid resolutions never trigger a /me read.
    expect(queryState.currentUserCalls).toBe(0);
    expect(context.currentUser).toBeNull();
  });
});

describe("useAuthorizeContextBrowser (real mode)", () => {
  it("renders the missing-request-id state without touching the data source", async () => {
    const useAuthorizeContextBrowser = await loadUseAuthorizeContextBrowser(false);

    const context = await useAuthorizeContextBrowser(undefined);

    expect(context.shouldResolve).toBe(false);
    expect(context.resolution).toBeNull();
    expect(context.currentUser).toBeNull();
    expect(queryState.resolutionCalls).toEqual([]);
    expect(queryState.currentUserCalls).toBe(0);
  });

  it("resolves a caller-supplied requestId and its identity", async () => {
    const useAuthorizeContextBrowser = await loadUseAuthorizeContextBrowser(false);

    const context = await useAuthorizeContextBrowser("req_123");

    expect(context.shouldResolve).toBe(true);
    expect(queryState.resolutionCalls).toEqual(["req_123"]);
    expect(context.resolution).toEqual(VALID_RESOLUTION);
    expect(context.currentUser).toBe(USER);
  });

  it("never substitutes the mock fallback ID for a missing requestId", async () => {
    // A hostile stub proves real mode never guesses request IDs.
    queryState.resolution = async () => {
      throw new Error("must not resolve without a caller-supplied requestId");
    };
    const useAuthorizeContextBrowser = await loadUseAuthorizeContextBrowser(false);

    const context = await useAuthorizeContextBrowser(undefined);
    expect(context.shouldResolve).toBe(false);
    expect(queryState.resolutionCalls).toEqual([]);
  });

  it("wraps resolution failures into a fatal compat error", async () => {
    queryState.resolution = async () => {
      throw { kind: "server_error", message: "backend down" };
    };
    const useAuthorizeContextBrowser = await loadUseAuthorizeContextBrowser(false);

    await expect(useAuthorizeContextBrowser("req_123")).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Failed to resolve the authorization request",
      fatal: true,
    });
  });

  it("wraps identity-read failures into a fatal compat error", async () => {
    queryState.currentUser = async () => {
      throw { kind: "network", message: "connection reset" };
    };
    const useAuthorizeContextBrowser = await loadUseAuthorizeContextBrowser(false);

    await expect(useAuthorizeContextBrowser("req_123")).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Failed to resolve the authorization request",
      fatal: true,
    });
  });
});
