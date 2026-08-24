//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Email verification panel one-time fragment handling tests
//

// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const verifyRegistrationEmail = vi.hoisted(() => vi.fn());

vi.mock("@/shared/commands/registration-commands", () => ({
  verifyRegistrationEmail,
}));

import VerifyEmailPanel from "@/features/auth/components/verify-email-panel.vue";

const globalStubs = {
  global: {
    stubs: {
      NuxtLink: { template: '<a><slot /></a>' },
      RouterLink: { template: '<a><slot /></a>' },
    },
  },
};

afterEach(() => {
  window.history.replaceState(null, "", "/verify-email");
  vi.clearAllMocks();
});

describe("verify-email-panel fragment handling", () => {
  it("erases the one-time fragment before the API call and verifies with it", async () => {
    let hashAtCallTime: string | undefined;
    verifyRegistrationEmail.mockImplementation((input: unknown) => {
      hashAtCallTime = window.location.hash;
      expect(input).toEqual({ userId: "user_1", code: "secret_code", requestId: "req_1" });
      return Promise.resolve({ requestId: "req_1" });
    });
    window.location.hash = "#userId=user_1&code=secret_code&requestId=req_1";

    const wrapper = mount(VerifyEmailPanel, { ...globalStubs });
    await flushPromises();

    expect(verifyRegistrationEmail).toHaveBeenCalledTimes(1);
    // The secret must be gone from the URL before (and after) the call.
    expect(hashAtCallTime).toBe("");
    expect(window.location.hash).toBe("");
    expect(wrapper.html()).toContain("邮箱验证成功");
    wrapper.unmount();
  });

  it("continues back into the OAuth transaction when a requestId was carried", async () => {
    verifyRegistrationEmail.mockResolvedValue({ requestId: "req/42" });
    window.location.hash = "#userId=user_1&code=secret_code&requestId=req%2F42";

    const wrapper = mount(VerifyEmailPanel, { ...globalStubs });
    await flushPromises();

    expect(verifyRegistrationEmail).toHaveBeenCalledWith({
      userId: "user_1",
      code: "secret_code",
      requestId: "req/42",
    });
    wrapper.unmount();
  });

  it("shows the invalid-link state on verification failure", async () => {
    verifyRegistrationEmail.mockRejectedValue(new Error("expired"));
    window.location.hash = "#userId=user_1&code=stale_code";

    const wrapper = mount(VerifyEmailPanel, { ...globalStubs });
    await flushPromises();

    expect(wrapper.html()).toContain("无法验证邮箱");
    wrapper.unmount();
  });

  it("shows the invalid-link state when the fragment is missing", async () => {
    const wrapper = mount(VerifyEmailPanel, { ...globalStubs });
    await flushPromises();

    expect(verifyRegistrationEmail).not.toHaveBeenCalled();
    expect(wrapper.html()).toContain("无法验证邮箱");
    wrapper.unmount();
  });
});
