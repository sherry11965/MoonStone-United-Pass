//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the reauthentication flow state machine
//

import { beforeEach, describe, expect, it, vi } from "vitest";

const commandMocks = vi.hoisted(() => ({
  requestReauthentication: vi.fn(),
  completeReauthenticationMfa: vi.fn(),
}));

vi.mock("@/shared/commands/browser-commands", () => ({
  browserCommands: {
    requestReauthentication: commandMocks.requestReauthentication,
    completeReauthenticationMfa: commandMocks.completeReauthenticationMfa,
  },
}));

import type {
  ReauthenticationChallenge,
  ReauthenticationGrant,
} from "@/features/account/types";
import { useReauthenticationFlow } from "@/features/account/composables/useReauthenticationFlow";

const GRANT: ReauthenticationGrant = {
  status: "granted",
  reauthToken: "reauth-token-direct",
  expiresAt: "2026-08-24T00:10:00.000Z",
};

const CHALLENGE: ReauthenticationChallenge = {
  status: "mfa_required",
  reauthToken: "reauth-token-mfa",
  availableMethods: ["totp", "passkey"],
  expiresAt: "2026-08-24T00:10:00.000Z",
};

const FINAL_GRANT: ReauthenticationGrant = {
  status: "granted",
  reauthToken: "reauth-token-final",
  expiresAt: "2026-08-24T00:12:00.000Z",
};

function createFlow(performGranted = vi.fn().mockResolvedValue(undefined)) {
  return {
    performGranted,
    flow: useReauthenticationFlow({
      action: "account.data_export",
      target: "user-1",
      operationError: "操作失败，请重新验证。",
      performGranted,
    }),
  };
}

beforeEach(() => {
  commandMocks.requestReauthentication.mockReset();
  commandMocks.completeReauthenticationMfa.mockReset();
});

describe("useReauthenticationFlow", () => {
  it("completes immediately when the password alone earns the grant", async () => {
    commandMocks.requestReauthentication.mockResolvedValue(GRANT);
    const { flow, performGranted } = createFlow();
    flow.password.value = "current-password";

    await flow.requestGrant();

    expect(commandMocks.requestReauthentication).toHaveBeenCalledWith(
      { action: "account.data_export", target: "user-1", password: "current-password" },
      { signal: expect.any(AbortSignal) },
    );
    expect(performGranted).toHaveBeenCalledWith("reauth-token-direct", expect.any(AbortSignal));
    expect(flow.error.value).toBeUndefined();
    expect(flow.isSubmitting.value).toBe(false);
    // The password never survives the ceremony.
    expect(flow.password.value).toBe("");
  });

  it("surfaces the configured operation error when the granted mutation fails", async () => {
    commandMocks.requestReauthentication.mockResolvedValue(GRANT);
    const performGranted = vi.fn().mockRejectedValue(new Error("boom"));
    const { flow } = createFlow(performGranted);
    flow.password.value = "current-password";

    await flow.requestGrant();

    expect(flow.error.value).toBe("操作失败，请重新验证。");
    expect(flow.isSubmitting.value).toBe(false);
  });

  it("shows the MFA challenge when the backend answers mfa_required", async () => {
    commandMocks.requestReauthentication.mockResolvedValue(CHALLENGE);
    const { flow } = createFlow();
    flow.password.value = "current-password";

    await flow.requestGrant();

    expect(flow.challenge.value).toEqual(CHALLENGE);
    expect(flow.method.value).toBe("totp");
    expect(flow.password.value).toBe("");
  });

  it("completes the totp challenge and hands the final single-use token to the mutation", async () => {
    commandMocks.requestReauthentication.mockResolvedValue(CHALLENGE);
    commandMocks.completeReauthenticationMfa.mockResolvedValue(FINAL_GRANT);
    const { flow, performGranted } = createFlow();
    flow.password.value = "current-password";
    await flow.requestGrant();
    flow.totpCode.value = "123456";

    await flow.completeMfa();

    expect(commandMocks.completeReauthenticationMfa).toHaveBeenCalledWith(
      { reauthToken: "reauth-token-mfa", method: "totp", code: "123456" },
      { signal: expect.any(AbortSignal) },
    );
    expect(performGranted).toHaveBeenCalledWith("reauth-token-final", expect.any(AbortSignal));
    expect(flow.challenge.value).toBeNull();
    expect(flow.error.value).toBeUndefined();
  });

  it("keeps the challenge open and reports failure when MFA completion is rejected", async () => {
    commandMocks.requestReauthentication.mockResolvedValue(CHALLENGE);
    commandMocks.completeReauthenticationMfa.mockRejectedValue(new Error("bad code"));
    const { flow, performGranted } = createFlow();
    flow.password.value = "current-password";
    await flow.requestGrant();
    flow.totpCode.value = "000000";

    await flow.completeMfa();

    expect(flow.error.value).toBe("二次验证失败，请重试或选择其他验证方式。");
    expect(flow.challenge.value).toEqual(CHALLENGE);
    expect(performGranted).not.toHaveBeenCalled();
    expect(flow.isSubmitting.value).toBe(false);
  });

  it("reports a verification failure when the password request itself fails", async () => {
    commandMocks.requestReauthentication.mockRejectedValue(new Error("401"));
    const { flow, performGranted } = createFlow();
    flow.password.value = "wrong-password";

    await flow.requestGrant();

    expect(flow.error.value).toBe("身份验证失败，请重新输入密码后再试。");
    expect(flow.password.value).toBe("");
    expect(performGranted).not.toHaveBeenCalled();
    expect(flow.isSubmitting.value).toBe(false);
  });

  it("aborts the in-flight ceremony controller", async () => {
    let capturedSignal: AbortSignal | undefined;
    commandMocks.requestReauthentication.mockImplementation((_input, options) => {
      capturedSignal = options?.signal;
      return new Promise((_resolve, reject) => {
        // Mirrors browserFetch: the in-flight request rejects on abort.
        options?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    const { flow } = createFlow();
    flow.password.value = "current-password";

    const pending = flow.requestGrant();
    flow.abort();

    expect(capturedSignal?.aborted).toBe(true);
    // The catch path resolves the pending ceremony promise.
    await pending;
    expect(flow.isSubmitting.value).toBe(false);
  });
});
