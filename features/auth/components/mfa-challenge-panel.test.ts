//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: MFA challenge panel state-machine behavior tests
//

// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import type { ApiError } from "@/shared/api-error";
import MfaChallengePanel from "@/features/auth/components/mfa-challenge-panel.vue";

const globalStubs = {
  global: {
    stubs: {
      NuxtLink: { template: '<a><slot /></a>' },
      RouterLink: { template: '<a><slot /></a>' },
    },
  },
};

const baseProps = {
  mfaToken: "mfa_token_001",
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
};

describe("mfa-challenge-panel state machine", () => {
  it("rejects malformed TOTP input without consuming an attempt or hitting the backend", async () => {
    const onVerify = vi.fn();
    const wrapper = mount(MfaChallengePanel, {
      ...globalStubs,
      props: { ...baseProps, availableMethods: ["totp"], onVerify },
    });

    const input = wrapper.find("input[autocomplete='one-time-code']");
    await input.setValue("12ab56");
    // Non-digits are sanitized away on input; submit still enforces the format.
    expect((input.element as HTMLInputElement).value).toBe("1256");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(onVerify).not.toHaveBeenCalled();
    expect(wrapper.html()).toContain("请输入 6 位数字验证码。");
    wrapper.unmount();
  });

  it("submits a well-formed TOTP code to the real verification seam", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const wrapper = mount(MfaChallengePanel, {
      ...globalStubs,
      props: { ...baseProps, onSuccess, availableMethods: ["totp"], onVerify },
    });

    await wrapper.find("input[autocomplete='one-time-code']").setValue("492817");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(onVerify).toHaveBeenCalledWith("totp", "492817");
    expect(onSuccess).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("locks into too_many_attempts after MAX_ATTEMPTS recovery-code failures", async () => {
    const onVerify = vi.fn().mockRejectedValue({
      kind: "unauthorized",
      message: "恢复代码无效。",
    } satisfies ApiError);
    const wrapper = mount(MfaChallengePanel, {
      ...globalStubs,
      props: { ...baseProps, availableMethods: ["recovery_code"], onVerify },
    });

    const form = wrapper.find("form");
    const input = () => wrapper.find("input[autocomplete='off']");

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await input().setValue("ABCD1234");
      await form.trigger("submit");
      await flushPromises();
      // Intermediate failures keep the form active and count attempts.
      expect(wrapper.html()).toContain("恢复代码无效。");
    }
    expect(wrapper.html()).toContain("已失败 4 次");

    await input().setValue("ABCD1234");
    await form.trigger("submit");
    await flushPromises();

    expect(onVerify).toHaveBeenCalledTimes(5);
    expect(wrapper.html()).toContain("尝试次数过多");
    // The locked state offers no further input.
    expect(wrapper.find("input[autocomplete='off']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shortcodes recovery codes below 8 characters as local failures that count attempts", async () => {
    const onVerify = vi.fn();
    const wrapper = mount(MfaChallengePanel, {
      ...globalStubs,
      props: { ...baseProps, availableMethods: ["recovery_code"], onVerify },
    });

    await wrapper.find("input[autocomplete='off']").setValue("SHORT");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(onVerify).not.toHaveBeenCalled();
    expect(wrapper.html()).toContain("恢复代码无效。剩余尝试次数 4 次。");
    wrapper.unmount();
  });

  it("transitions straight to too_many_attempts on a backend 429 with the retry hint", async () => {
    const onVerify = vi.fn().mockRejectedValue({
      kind: "rate_limited",
      message: "尝试次数过多，请在 60 秒后再试。",
      retryAfter: 60,
    } satisfies ApiError);
    const wrapper = mount(MfaChallengePanel, {
      ...globalStubs,
      props: { ...baseProps, availableMethods: ["totp"], onVerify },
    });

    await wrapper.find("input[autocomplete='one-time-code']").setValue("492817");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(onVerify).toHaveBeenCalledTimes(1);
    expect(wrapper.html()).toContain("尝试次数过多");
    expect(wrapper.find("input[autocomplete='one-time-code']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("auto-triggers the passkey prompt on mount for passkey-only challenges", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const credential = { id: "cred_1" };
    // happy-dom ships no CredentialsContainer; install one before spying.
    const credentialsGet = vi.fn().mockResolvedValue(credential);
    Object.defineProperty(window.navigator, "credentials", {
      value: { get: credentialsGet },
      configurable: true,
    });

    const wrapper = mount(MfaChallengePanel, {
      ...globalStubs,
      props: {
        ...baseProps,
        onSuccess,
        availableMethods: ["passkey"],
        passkeyRequestOptions: { challenge: new Uint8Array([1, 2, 3]) },
        onVerify,
      },
    });
    await flushPromises();

    expect(credentialsGet).toHaveBeenCalledTimes(1);
    expect(onVerify).toHaveBeenCalledWith("passkey", "", credential);
    expect(onSuccess).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("shows the expired notice only via the mock demo control", async () => {
    const wrapper = mount(MfaChallengePanel, {
      ...globalStubs,
      props: { ...baseProps, availableMethods: ["totp"] },
    });

    await wrapper.findAll(".auth-demo-block button")[0].trigger("click");
    await flushPromises();

    expect(wrapper.html()).toContain("验证已过期");
    wrapper.unmount();
  });
});
