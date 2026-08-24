//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA account shell (dedup, 401 semantics, cache eviction)
//

import { afterEach, describe, expect, it, vi } from "vitest";

const queryState = vi.hoisted(() => ({
  currentUser: async () => ({ userId: "usr_01" }),
  currentPermissions: async () => ({ userRead: true }),
  currentUserCalls: 0,
  permissionsCalls: 0,
}));

vi.mock("@/shared/queries/browser-queries", () => ({
  browserQueries: {
    getCurrentUser: async () => {
      queryState.currentUserCalls += 1;
      return queryState.currentUser();
    },
    getCurrentPermissions: async () => {
      queryState.permissionsCalls += 1;
      return queryState.currentPermissions();
    },
  },
}));

import {
  ACCOUNT_SHELL_DATA_KEY,
  invalidateAccountShellCache,
  useAccountShellBrowser,
} from "@/features/account/composables/useAccountShellBrowser";

const USER = { userId: "usr_01", displayName: "陈嘉嘉" };
const PERMISSIONS = { userRead: true, policyRead: false };

afterEach(() => {
  invalidateAccountShellCache();
  queryState.currentUser = async () => USER;
  queryState.currentPermissions = async () => PERMISSIONS;
  queryState.currentUserCalls = 0;
  queryState.permissionsCalls = 0;
});

describe("useAccountShellBrowser", () => {
  it("preserves the legacy useAsyncData payload key", () => {
    expect(ACCOUNT_SHELL_DATA_KEY).toBe("account-shell");
  });

  it("resolves the session user and permission capabilities", async () => {
    const { currentUser, permissions, shellData, shellError } = await useAccountShellBrowser();

    expect(currentUser.value).toEqual(USER);
    expect(permissions.value).toEqual(PERMISSIONS);
    expect(shellData.value).toEqual({ user: USER, permissions: PERMISSIONS });
    expect(shellError.value).toBeNull();
  });

  it("deduplicates concurrent reads into a single /me + /me/permissions pair", async () => {
    const [first, second] = await Promise.all([
      useAccountShellBrowser(),
      useAccountShellBrowser(),
    ]);

    expect(queryState.currentUserCalls).toBe(1);
    expect(queryState.permissionsCalls).toBe(1);
    expect(first.currentUser.value).toEqual(second.currentUser.value);
  });

  it("reuses the cached shell across sequential navigations", async () => {
    await useAccountShellBrowser();
    await useAccountShellBrowser();

    expect(queryState.currentUserCalls).toBe(1);
    expect(queryState.permissionsCalls).toBe(1);
  });

  it("treats only an explicit 401 as anonymous and never caches it", async () => {
    queryState.currentUser = async () => {
      throw { kind: "unauthorized", message: "session expired" };
    };

    const anonymous = await useAccountShellBrowser();
    expect(anonymous.currentUser.value).toBeNull();
    expect(anonymous.shellData.value).toBeNull();
    expect(anonymous.shellError.value).toBeNull();

    // A subsequent successful session (e.g. after login) must re-resolve:
    // the anonymous outcome is not pinned into the session cache.
    queryState.currentUser = async () => USER;
    const authenticated = await useAccountShellBrowser();
    expect(authenticated.currentUser.value).toEqual(USER);
    expect(queryState.currentUserCalls).toBe(2);
  });

  it("surfaces non-401 failures through shellError and evicts the cache", async () => {
    const serverError = { kind: "server_error" as const, message: "backend down" };
    queryState.currentUser = async () => {
      throw serverError;
    };

    const failed = await useAccountShellBrowser();
    expect(failed.shellData.value).toBeNull();
    expect(failed.shellError.value).toBe(serverError);

    // Failures are never cached: the next navigation retries from scratch.
    queryState.currentUser = async () => USER;
    const recovered = await useAccountShellBrowser();
    expect(recovered.currentUser.value).toEqual(USER);
    expect(recovered.shellError.value).toBeNull();
  });

  it("evicts the cache on session.reauthentication_required and rethrows", async () => {
    const reauthError = {
      kind: "reauthentication_required" as const,
      message: "step up",
    };
    queryState.currentPermissions = async () => {
      throw reauthError;
    };

    const failed = await useAccountShellBrowser();
    expect(failed.shellError.value).toBe(reauthError);
    expect(queryState.currentUserCalls).toBe(1);

    queryState.currentPermissions = async () => PERMISSIONS;
    const recovered = await useAccountShellBrowser();
    expect(recovered.shellError.value).toBeNull();
    expect(queryState.currentUserCalls).toBe(2);
  });

  it("invalidateAccountShellCache forces a fresh lookup (logout hook)", async () => {
    await useAccountShellBrowser();
    invalidateAccountShellCache();
    await useAccountShellBrowser();

    expect(queryState.currentUserCalls).toBe(2);
    expect(queryState.permissionsCalls).toBe(2);
  });
});
