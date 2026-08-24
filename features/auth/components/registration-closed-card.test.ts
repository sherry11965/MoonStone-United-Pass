//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Registration-closed state regression tests (port of registration-closed.test.ts)
//

// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import RegistrationClosedCard from "@/features/auth/components/registration-closed-card.vue";

const globalStubs = {
  global: {
    stubs: {
      NuxtLink: { template: '<a :href="to"><slot /></a>', props: ["to"] },
      RouterLink: { template: '<a><slot /></a>' },
    },
  },
};

describe("registration availability", () => {
  it("keeps public registration closed without rendering a credential form", () => {
    const wrapper = mount(RegistrationClosedCard, { ...globalStubs });
    const html = wrapper.html();

    expect(html).toContain("注册暂未开放");
    expect(html).toContain("/login");
    expect(html).not.toMatch(/<form\b/iu);
    expect(html).not.toMatch(/<input\b/iu);
    expect(html).not.toContain("password");
    wrapper.unmount();
  });

  it("carries the OAuth requestId back to the login page", () => {
    const wrapper = mount(RegistrationClosedCard, {
      ...globalStubs,
      props: { requestId: "req/42" },
    });
    expect(wrapper.html()).toContain("/login?requestId=req%2F42");
    wrapper.unmount();
  });

  it("contains the complete real form behind the server registration flag", () => {
    const root = resolve(process.cwd());
    const pageSource = readFileSync(resolve(root, "pages/register.vue"), "utf8");
    const endpointSource = readFileSync(resolve(root, "server/routes/register-context.get.ts"), "utf8");
    const panelSource = readFileSync(
      resolve(root, "features/auth/components/registration-panel.vue"),
      "utf8",
    );

    // The registration flag is a private runtimeConfig value resolved on the
    // server only (Nuxt equivalent of the legacy process.env gate).
    expect(pageSource).toContain("/register-context");
    expect(endpointSource).toContain("publicRegistrationEnabled");
    expect(panelSource).toContain("创建统一账户");
    for (const field of ["username", "displayName", "email", "password", "passwordConfirmation"]) {
      expect(panelSource).toContain(`name="${field}"`);
    }
  });
});
