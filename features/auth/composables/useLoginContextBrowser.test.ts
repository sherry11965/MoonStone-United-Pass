//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA login-page context composable (mock skip, 401 semantics, error wrapping)
//

import type { PublicLoginProvider } from "@/shared/response-validators";
import { afterEach, describe, expect, it, vi } from "vitest";

const USER = { userId: "usr_01", displayName: "林知行" };
const FEISHU_ENABLED: PublicLoginProvider[] = [
  { providerId: "provider_feishu", displayName: "飞书", loginEnabled: true },
];
const FEISHU_DISABLED: PublicLoginProvider[] = [
  { providerId: "provider_feishu", displayName: "飞书", loginEnabled: false },
];

const queryState = vi.hoisted(() => ({
  currentUser: async () => USER as unknown,
  providers: async () => [] as PublicLoginProvider[],
  currentUserCalls: 0,
  providersCalls: 0,
}));

/**
 * Loads a fresh composable module instance under the requested data-source
 * mode. The module reads `USE_MOCK_DATA_SOURCE` at import time, so switching
 * between mock and real semantics requires a module registry reset plus
 * `vi.doMock` (same pattern as the mode-fixed `vi.mock` call sites, but
 * both branches are exercised here in one suite).
 */
async function loadUseLoginContextBrowser(useMock: boolean) {
  vi.resetModules();
  vi.doMock("@/shared/data-source-mode", () => ({ USE_MOCK_DATA_SOURCE: useMock }));
  vi.doMock("@/shared/queries/browser-queries", () => ({
    browserQueries: {
      getCurrentUser: async () => {
        queryState.currentUserCalls += 1;
        return queryState.currentUser();
      },
    },
    getPublicLoginProviders: async () => {
      queryState.providersCalls += 1;
      return queryState.providers();
    },
  }));
  const mod = await import("@/features/auth/composables/useLoginContextBrowser");
  return mod.useLoginContextBrowser;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.doUnmock("@/shared/data-source-mode");
  vi.doUnmock("@/shared/queries/browser-queries");
  queryState.currentUser = async () => USER;
  queryState.providers = async () => [];
  queryState.currentUserCalls = 0;
  queryState.providersCalls = 0;
});

describe("useLoginContextBrowser (mock mode)", () => {
  it("skips destination resolution entirely — /me is never consulted", async () => {
    // A hostile stub proves the skip: were the composable to read /me, this
    // would throw instead of returning an anonymous context.
    queryState.currentUser = async () => {
      throw new Error("must not be called in mock mode");
    };
    const useLoginContextBrowser = await loadUseLoginContextBrowser(true);

    const context = await useLoginContextBrowser("consent_demo_001");

    expect(context.destination).toBeNull();
    expect(queryState.currentUserCalls).toBe(0);
    // Providers are still resolved in mock mode (mock → []).
    expect(queryState.providersCalls).toBe(1);
    expect(context.feishuLoginEnabled).toBe(false);
  });

  it("reads the registration flag from the baked VITE variable", async () => {
    const useLoginContextBrowser = await loadUseLoginContextBrowser(true);
    expect((await useLoginContextBrowser()).registrationEnabled).toBe(false);

    vi.stubEnv("VITE_PUBLIC_REGISTRATION_ENABLED", "true");
    expect((await useLoginContextBrowser()).registrationEnabled).toBe(true);

    vi.stubEnv("VITE_PUBLIC_REGISTRATION_ENABLED", "false");
    expect((await useLoginContextBrowser()).registrationEnabled).toBe(false);
  });
});

describe("useLoginContextBrowser (real mode)", () => {
  it("treats only an explicit 401 as anonymous (destination null)", async () => {
    queryState.currentUser = async () => {
      throw { kind: "unauthorized", message: "session expired" };
    };
    const useLoginContextBrowser = await loadUseLoginContextBrowser(false);

    const context = await useLoginContextBrowser("consent_demo_001");

    expect(context.destination).toBeNull();
    expect(queryState.currentUserCalls).toBe(1);
  });

  it("resolves /account for an authenticated visitor without a requestId", async () => {
    const useLoginContextBrowser = await loadUseLoginContextBrowser(false);

    const context = await useLoginContextBrowser();

    expect(context.destination).toBe("/account");
  });

  it("resolves the /authorize continuation for an opaque requestId", async () => {
    const useLoginContextBrowser = await loadUseLoginContextBrowser(false);

    const context = await useLoginContextBrowser("req 001/ä");

    expect(context.destination).toBe(`/authorize?requestId=${encodeURIComponent("req 001/ä")}`);
  });

  it("wraps non-401 /me failures into a fatal compat error", async () => {
    queryState.currentUser = async () => {
      throw { kind: "server_error", message: "backend down" };
    };
    const useLoginContextBrowser = await loadUseLoginContextBrowser(false);

    await expect(useLoginContextBrowser()).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Failed to resolve the login session",
      fatal: true,
    });
  });

  it("wraps provider-read failures into a fatal compat error", async () => {
    queryState.providers = async () => {
      throw { kind: "network", message: "connection reset" };
    };
    const useLoginContextBrowser = await loadUseLoginContextBrowser(false);

    await expect(useLoginContextBrowser()).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Failed to resolve the login session",
      fatal: true,
    });
  });

  it("computes feishuLoginEnabled from the provider list", async () => {
    queryState.providers = async () => FEISHU_ENABLED;
    const enabled = await (await loadUseLoginContextBrowser(false))();
    expect(enabled.feishuLoginEnabled).toBe(true);

    queryState.providers = async () => FEISHU_DISABLED;
    const disabled = await (await loadUseLoginContextBrowser(false))();
    expect(disabled.feishuLoginEnabled).toBe(false);
  });
});
