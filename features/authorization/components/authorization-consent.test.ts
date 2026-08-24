//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Consent screen one-shot completion and decision behavior tests
//

// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

const decideConsent = vi.hoisted(() => vi.fn());

vi.mock("@/shared/data-source-mode", () => ({ USE_MOCK_DATA_SOURCE: false }));
vi.mock("@/shared/commands/browser-commands", () => ({
  browserCommands: { decideConsent },
}));

import AuthorizationConsent from "@/features/authorization/components/authorization-consent.vue";
import type { ConsentResolution } from "@/features/authorization/types";

const globalStubs = {
  global: {
    stubs: {
      NuxtLink: { template: '<a><slot /></a>' },
      RouterLink: { template: '<a><slot /></a>' },
    },
  },
};

const alreadyAuthorized: ConsentResolution = {
  status: "already_authorized",
  requestId: "reentry_request_001",
  applicationName: "DreamUP",
  redirectHost: "app.example.com",
};

const terminalFailureResolution: ConsentResolution = {
  ...alreadyAuthorized,
  requestId: "terminal_request_001",
};

const reloginFailureResolution: ConsentResolution = {
  ...alreadyAuthorized,
  requestId: "relogin_request_001",
};

const validResolution: ConsentResolution = {
  status: "valid",
  request: {
    requestId: "valid_request_001",
    applicationName: "DreamUP",
    applicationDescription: "报名平台",
    applicationOwner: "砾石进化",
    redirectHost: "app.example.com",
    scopes: [],
  },
};

const currentUser = {
  userId: "user_1",
  username: "ari",
  displayName: "Ari",
  email: "ari@example.com",
  role: "external_user",
} as never;

let assignSpy: ReturnType<typeof vi.spyOn>;

function stubLocationAssign(): ReturnType<typeof vi.fn> {
  const assign = vi.fn();
  assignSpy = vi
    .spyOn(window.location, "assign")
    .mockImplementation((url: string | URL) => {
      assign(String(url));
    });
  return assign;
}

afterEach(() => {
  assignSpy?.mockRestore();
  // resetAllMocks (not clear) so leftover once-queue implementations never
  // leak between tests; each test declares its own decideConsent behavior.
  vi.resetAllMocks();
});

describe("authorization-consent one-shot completion", () => {
  it("does not re-POST a completed decision when the page is left and re-entered", async () => {
    const assign = stubLocationAssign();
    decideConsent.mockResolvedValue({ redirectUrl: "https://app.example.com/cb?code=abc" });

    // First visit: the silent allow POST runs once and navigates.
    const first = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: alreadyAuthorized },
    });
    await flushPromises();
    expect(decideConsent).toHaveBeenCalledTimes(1);
    expect(decideConsent).toHaveBeenCalledWith("reentry_request_001", "allow");
    expect(assign).toHaveBeenCalledWith("https://app.example.com/cb?code=abc");
    first.unmount();

    // Back/forward or a fresh navigation remounts the page: the settled
    // single-flight Promise is reused instead of a second POST.
    const second = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: alreadyAuthorized },
    });
    await flushPromises();
    expect(decideConsent).toHaveBeenCalledTimes(1);
    second.unmount();
  });

  it("keeps a terminal completion failure from re-POSTing on remount", async () => {
    stubLocationAssign();
    decideConsent.mockRejectedValue({ kind: "conflict", message: "already completed" });

    const first = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: terminalFailureResolution },
    });
    await flushPromises();
    expect(decideConsent).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: terminalFailureResolution },
    });
    await flushPromises();
    expect(decideConsent).toHaveBeenCalledTimes(1);
    second.unmount();
  });

  it("evicts a 401 relogin rejection so a fresh POST may proceed after login", async () => {
    stubLocationAssign();
    decideConsent
      .mockRejectedValueOnce({ kind: "unauthorized", message: "session required" })
      .mockResolvedValueOnce({ redirectUrl: "https://app.example.com/cb?code=abc" });

    const first = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: reloginFailureResolution },
    });
    await flushPromises();
    expect(decideConsent).toHaveBeenCalledTimes(1);
    first.unmount();

    // After logging in, the page remounts: the session gate rejected before
    // applying anything, so one new POST is allowed.
    const second = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: reloginFailureResolution },
    });
    await flushPromises();
    expect(decideConsent).toHaveBeenCalledTimes(2);
    second.unmount();
  });
});

describe("authorization-consent explicit decision (real mode)", () => {
  it("navigates with the backend-validated redirectUrl and never renders it", async () => {
    const assign = stubLocationAssign();
    decideConsent.mockResolvedValue({ redirectUrl: "https://app.example.com/cb?code=secret" });

    const wrapper = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: validResolution, currentUser },
    });
    await flushPromises();

    await wrapper.find("button[data-testid='consent-allow']").trigger("click");
    await flushPromises();

    expect(decideConsent).toHaveBeenCalledWith("valid_request_001", "allow");
    expect(assign).toHaveBeenCalledWith("https://app.example.com/cb?code=secret");
    // The callback URL must stay out of the DOM.
    expect(wrapper.html()).not.toContain("code=secret");
    wrapper.unmount();
  });

  it("is idempotent while submitting: a second click does not double-POST", async () => {
    stubLocationAssign();
    let release: (value: { redirectUrl: string }) => void = () => undefined;
    decideConsent.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const wrapper = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: validResolution, currentUser },
    });
    await flushPromises();

    // Two clicks before the re-render hides the button: the composable guard
    // (not the DOM) must prevent the double POST.
    const allowButton = wrapper.find("button[data-testid='consent-allow']");
    await allowButton.trigger("click");
    await allowButton.trigger("click");
    await flushPromises();

    expect(decideConsent).toHaveBeenCalledTimes(1);
    release({ redirectUrl: "https://app.example.com/cb" });
    await flushPromises();
    wrapper.unmount();
  });

  it("renders a terminal failure card without offering a same-request retry", async () => {
    stubLocationAssign();
    decideConsent.mockRejectedValue({ kind: "server_error", message: "boom" });

    const wrapper = mount(AuthorizationConsent, {
      ...globalStubs,
      props: { resolution: validResolution, currentUser },
    });
    await flushPromises();

    await wrapper.find("button[data-testid='consent-allow']").trigger("click");
    await flushPromises();

    expect(wrapper.html()).toContain("无法继续此授权请求");
    wrapper.unmount();
  });
});
