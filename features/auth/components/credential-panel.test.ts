//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Credential login panel behavior tests (no-JS form, error mapping, MFA filter)
//

// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

vi.mock("@/shared/data-source-mode", () => ({ USE_MOCK_DATA_SOURCE: false }));
vi.mock("@/shared/commands/auth-commands", () => ({
  submitLogin: vi.fn(),
  beginPasskeyLogin: vi.fn(),
  completeLoginMfa: vi.fn(),
}));

import CredentialPanel from "@/features/auth/components/credential-panel.vue";
import { submitLogin } from "@/shared/commands/auth-commands";

const globalStubs = {
  global: {
    stubs: {
      NuxtLink: { template: '<a><slot /></a>' },
      RouterLink: { template: '<a><slot /></a>' },
    },
  },
};

async function fillAndSubmit(wrapper: ReturnType<typeof mount>, identifier: string, password: string) {
  await wrapper.find("input[name='identifier']").setValue(identifier);
  await wrapper.find("input[name='password']").setValue(password);
  await wrapper.find("form").trigger("submit");
  await flushPromises();
}

describe("credential-panel no-JavaScript degradation", () => {
  it("keeps a native POST form so credentials never travel in the URL", () => {
    const wrapper = mount(CredentialPanel, {
      ...globalStubs,
      props: { csrfToken: "csrf_seed_1", resumeRequestId: "req/42" },
    });
    const form = wrapper.find("form");
    expect(form.attributes("method")).toBe("post");
    expect(form.attributes("action")).toBe("/login");
    expect(wrapper.find("input[name='csrfToken']").element.getAttribute("value")).toBe("csrf_seed_1");
    expect(wrapper.find("input[name='resumeRequestId']").element.getAttribute("value")).toBe("req/42");
    // Credentials live in named body fields only.
    expect(wrapper.find("input[name='identifier']").exists()).toBe(true);
    expect(wrapper.find("input[name='password']").exists()).toBe(true);
    wrapper.unmount();
  });

  it("maps opaque no-JS error codes back from login.post.ts to inline messages", () => {
    const cases: Array<[string, string]> = [
      ["invalid_credentials", "账户名、邮箱或密码错误，请重试。"],
      ["mfa_required", "当前账户需要二次验证，请在启用脚本的浏览器中完成验证。"],
      ["rate_limited", "尝试次数过多，请稍后再试。"],
      ["network", "网络异常，请检查连接后重试。"],
      ["server_error", "登录服务暂时不可用，请稍后重试。"],
    ];
    for (const [code, expected] of cases) {
      const wrapper = mount(CredentialPanel, { ...globalStubs, props: { loginErrorCode: code } });
      expect(wrapper.html()).toContain(expected);
      wrapper.unmount();
    }
  });

  it("maps the feishu identity_unlinked provider error", () => {
    const wrapper = mount(CredentialPanel, {
      ...globalStubs,
      props: { providerError: "identity_unlinked" },
    });
    expect(wrapper.html()).toContain("该飞书身份尚未关联统一门户账户");
    wrapper.unmount();
  });
});

describe("credential-panel MFA handoff (real mode)", () => {
  it("refuses challenges that cannot be completed in this surface", async () => {
    vi.mocked(submitLogin).mockResolvedValue({
      status: "mfa_required",
      mfaToken: "mfa_token_9",
      availableMethods: ["recovery_code"],
    } as never);

    const wrapper = mount(CredentialPanel, { ...globalStubs });
    await fillAndSubmit(wrapper, "ari@example.com", "correct-horse-battery");

    expect(wrapper.html()).toContain("当前账户要求二次验证，但可用的验证方式暂不支持在此完成");
    // No challenge panel may render for unsupported methods.
    expect(wrapper.html()).not.toContain("验证器动态码");
    wrapper.unmount();
  });

  it("keeps entered credentials and shows the challenge panel for completable methods", async () => {
    vi.mocked(submitLogin).mockResolvedValue({
      status: "mfa_required",
      mfaToken: "mfa_token_9",
      availableMethods: ["totp"],
    } as never);

    const wrapper = mount(CredentialPanel, { ...globalStubs });
    await fillAndSubmit(wrapper, "ari@example.com", "correct-horse-battery");

    expect(wrapper.html()).toContain("验证器动态码");
    expect(submitLogin).toHaveBeenCalledWith({
      identifier: "ari@example.com",
      password: "correct-horse-battery",
      remember: true,
      resumeRequestId: undefined,
    });
    wrapper.unmount();
  });

  it("shows the inline rate-limit message with the retryAfter hint", async () => {
    vi.mocked(submitLogin).mockRejectedValue({
      kind: "rate_limited",
      message: "too many attempts",
      retryAfter: 45,
    });

    const wrapper = mount(CredentialPanel, { ...globalStubs });
    await fillAndSubmit(wrapper, "ari@example.com", "wrong-password");

    expect(wrapper.html()).toContain("尝试次数过多，请在 45 秒后再试。");
    wrapper.unmount();
  });
});
