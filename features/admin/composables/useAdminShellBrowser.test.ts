//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA admin shell (dedup, fail-closed degradation, cache eviction)
//

import { afterEach, describe, expect, it, vi } from "vitest";

const queryState = vi.hoisted(() => ({
  currentUser: async () => ({ userId: "usr_01" }),
  currentPermissions: async () => ({ userRead: true }),
  currentUserCalls: 0,
  dreamupResponse: undefined as unknown,
  dreamupError: undefined as unknown,
  dreamupCalls: 0,
}));

vi.mock("@/shared/queries/browser-queries", () => ({
  browserQueries: {
    getCurrentUser: async () => {
      queryState.currentUserCalls += 1;
      return queryState.currentUser();
    },
    getCurrentPermissions: async () => queryState.currentPermissions(),
  },
}));

vi.mock("@/shared/http/browser-http-client", () => ({
  browserFetch: vi.fn(async (path: string) => {
    if (path !== "/admin/dreamup/events") {
      throw new Error(`unexpected browserFetch call: ${path}`);
    }
    queryState.dreamupCalls += 1;
    if (queryState.dreamupError !== undefined) throw queryState.dreamupError;
    return queryState.dreamupResponse;
  }),
}));

import {
  ADMIN_SHELL_DATA_KEY,
  invalidateAdminShellCache,
  useAdminShellBrowser,
} from "@/features/admin/composables/useAdminShellBrowser";
import { NO_PERMISSIONS } from "@/shared/types/permissions";

const USER = { userId: "usr_01", displayName: "管理员" };
const PERMISSIONS = { userRead: true, auditRead: true };
const DREAMUP_EVENT = { eventId: "evt_01", displayName: "DreamUP 2026" };

afterEach(() => {
  invalidateAdminShellCache();
  queryState.currentUser = async () => USER;
  queryState.currentPermissions = async () => PERMISSIONS;
  queryState.currentUserCalls = 0;
  queryState.dreamupResponse = { events: [DREAMUP_EVENT] };
  queryState.dreamupError = undefined;
  queryState.dreamupCalls = 0;
});

describe("useAdminShellBrowser", () => {
  it("preserves the legacy useAsyncData payload key", () => {
    expect(ADMIN_SHELL_DATA_KEY).toBe("admin-shell");
  });

  it("resolves user, permissions and DreamUP events", async () => {
    const shell = await useAdminShellBrowser();

    expect(shell.currentUser.value).toEqual(USER);
    expect(shell.permissions.value).toEqual(PERMISSIONS);
    expect(shell.dreamUPEvents.value).toEqual([DREAMUP_EVENT]);
    expect(shell.showDreamUPAdministration.value).toBe(true);
    expect(shell.shellError.value).toBeNull();
  });

  it("deduplicates concurrent reads into one shell lookup", async () => {
    await Promise.all([useAdminShellBrowser(), useAdminShellBrowser()]);

    expect(queryState.currentUserCalls).toBe(1);
    expect(queryState.dreamupCalls).toBe(1);
  });

  it("treats only an explicit 401 as anonymous", async () => {
    queryState.currentUser = async () => {
      throw { kind: "unauthorized", message: "session expired" };
    };

    const anonymous = await useAdminShellBrowser();
    expect(anonymous.currentUser.value).toBeNull();
    expect(anonymous.shellData.value).toBeNull();
    expect(anonymous.shellError.value).toBeNull();
    expect(anonymous.permissions.value).toEqual(NO_PERMISSIONS);
    expect(anonymous.showDreamUPAdministration.value).toBe(false);
  });

  it("surfaces non-401 session failures through shellError", async () => {
    const serverError = { kind: "server_error" as const, message: "backend down" };
    queryState.currentUser = async () => {
      throw serverError;
    };

    const failed = await useAdminShellBrowser();
    expect(failed.shellData.value).toBeNull();
    expect(failed.shellError.value).toBe(serverError);
  });

  it("degrades a failing permissions lookup to NO_PERMISSIONS (fail closed)", async () => {
    queryState.currentPermissions = async () => {
      throw { kind: "server_error", message: "permissions down" };
    };

    const shell = await useAdminShellBrowser();
    expect(shell.currentUser.value).toEqual(USER);
    expect(shell.permissions.value).toEqual(NO_PERMISSIONS);
    expect(shell.shellError.value).toBeNull();
  });

  it("degrades a failing DreamUP lookup to an empty event list (fail closed)", async () => {
    queryState.dreamupError = { kind: "server_error", message: "dreamup down" };

    const shell = await useAdminShellBrowser();
    expect(shell.dreamUPEvents.value).toEqual([]);
    expect(shell.showDreamUPAdministration.value).toBe(false);
    expect(shell.shellError.value).toBeNull();
  });

  it("invalidateAdminShellCache forces a fresh lookup (logout hook)", async () => {
    await useAdminShellBrowser();
    invalidateAdminShellCache();
    await useAdminShellBrowser();

    expect(queryState.currentUserCalls).toBe(2);
    expect(queryState.dreamupCalls).toBe(2);
  });
});
