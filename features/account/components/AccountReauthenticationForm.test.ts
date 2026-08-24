//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Component tests for the account reauthentication form ceremony branches
//

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

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

vi.mock("naive-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("naive-ui")>();
  return {
    ...actual,
    useMessage: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
    useDialog: () => ({ warning: vi.fn(), error: vi.fn(), info: vi.fn() }),
  };
});

import naive from "naive-ui";
import type {
  ReauthenticationChallenge,
  ReauthenticationGrant,
} from "@/features/account/types";
import AccountReauthenticationForm from "@/features/account/components/AccountReauthenticationForm.vue";

const GRANT: ReauthenticationGrant = {
  status: "granted",
  reauthToken: "reauth-token-direct",
  expiresAt: "2026-08-24T00:10:00.000Z",
};

const CHALLENGE: ReauthenticationChallenge = {
  status: "mfa_required",
  reauthToken: "reauth-token-mfa",
  availableMethods: ["totp"],
  expiresAt: "2026-08-24T00:10:00.000Z",
};

function mountForm(overrides: Record<string, unknown> = {}) {
  const performGranted = vi.fn().mockResolvedValue(undefined);
  const wrapper = mount(AccountReauthenticationForm, {
    props: {
      action: "account.data_export",
      target: "user-1",
      submitLabel: "验证并申请",
      operationError: "操作失败，请重新验证。",
      performGranted,
      ...overrides,
    },
    global: { plugins: [naive] },
  });
  return { wrapper, performGranted };
}

beforeEach(() => {
  commandMocks.requestReauthentication.mockReset();
  commandMocks.completeReauthenticationMfa.mockReset();
});

describe("AccountReauthenticationForm", () => {
  it("submits the password and hands the one-time grant to the protected mutation", async () => {
    commandMocks.requestReauthentication.mockResolvedValue(GRANT);
    const { wrapper, performGranted } = mountForm();

    await wrapper.find('[data-testid="reauth-password-input"] input').setValue("s3cret");
    await wrapper.find('[data-testid="reauth-password"]').trigger("submit");
    await flushPromises();

    expect(commandMocks.requestReauthentication).toHaveBeenCalledWith(
      { action: "account.data_export", target: "user-1", password: "s3cret" },
      { signal: expect.any(AbortSignal) },
    );
    expect(performGranted).toHaveBeenCalledWith("reauth-token-direct", expect.any(AbortSignal));
  });

  it("keeps the typed password when the request fails and shows the failure copy", async () => {
    commandMocks.requestReauthentication.mockRejectedValue(new Error("invalid"));
    const { wrapper, performGranted } = mountForm();

    await wrapper.find('[data-testid="reauth-password-input"] input').setValue("wrong");
    await wrapper.find('[data-testid="reauth-password"]').trigger("submit");
    await flushPromises();

    expect(wrapper.find(".reauth-error").text()).toBe("身份验证失败，请重新输入密码后再试。");
    expect(performGranted).not.toHaveBeenCalled();
    // The password input is cleared by the ceremony itself.
    expect(
      (wrapper.find('[data-testid="reauth-password-input"] input').element as HTMLInputElement).value,
    ).toBe("");
  });

  it("switches to the MFA challenge and completes with the final one-time token", async () => {
    commandMocks.requestReauthentication.mockResolvedValue(CHALLENGE);
    commandMocks.completeReauthenticationMfa.mockResolvedValue({
      status: "granted",
      reauthToken: "reauth-token-final",
      expiresAt: "2026-08-24T00:12:00.000Z",
    } satisfies ReauthenticationGrant);
    const { wrapper, performGranted } = mountForm();

    await wrapper.find('[data-testid="reauth-password-input"] input').setValue("s3cret");
    await wrapper.find('[data-testid="reauth-password"]').trigger("submit");
    await flushPromises();

    expect(wrapper.find('[data-testid="reauth-challenge"]').exists()).toBe(true);

    await wrapper.find('[data-testid="reauth-challenge"] input').setValue("123456");
    await wrapper.find('[data-testid="reauth-complete-mfa"]').trigger("click");
    await flushPromises();

    expect(commandMocks.completeReauthenticationMfa).toHaveBeenCalledWith(
      { reauthToken: "reauth-token-mfa", method: "totp", code: "123456" },
      { signal: expect.any(AbortSignal) },
    );
    expect(performGranted).toHaveBeenCalledWith("reauth-token-final", expect.any(AbortSignal));
  });

  it("reports a mutation failure after the grant without losing the challenge", async () => {
    commandMocks.requestReauthentication.mockResolvedValue(GRANT);
    const performGranted = vi.fn().mockRejectedValue(new Error("boom"));
    const { wrapper } = mountForm({ performGranted });

    await wrapper.find('[data-testid="reauth-password-input"] input').setValue("s3cret");
    await wrapper.find('[data-testid="reauth-password"]').trigger("submit");
    await flushPromises();

    expect(wrapper.find(".reauth-error").text()).toBe("操作失败，请重新验证。");
    // The form returns to the password step so the ceremony can be retried.
    expect(wrapper.find('[data-testid="reauth-password"]').exists()).toBe(true);
  });

  it("emits cancel and aborts the ceremony", async () => {
    const { wrapper } = mountForm();

    await wrapper.findAll("button").find((b) => b.text() === "取消")?.trigger("click");
    await flushPromises();

    expect(wrapper.emitted("cancel")).toBeTruthy();
  });
});
