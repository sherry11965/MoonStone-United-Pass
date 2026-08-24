//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Component tests for session revocation — the current device is preserved
//

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const commandMocks = vi.hoisted(() => ({
  revokeOwnSession: vi.fn(),
}));

const messageSpies = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@/shared/commands/browser-commands", () => ({
  browserCommands: { revokeOwnSession: commandMocks.revokeOwnSession },
}));

vi.mock("naive-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("naive-ui")>();
  return {
    ...actual,
    useMessage: () => messageSpies,
    useDialog: () => ({ warning: vi.fn(), error: vi.fn(), info: vi.fn() }),
  };
});

import naive from "naive-ui";
import type { UserSession } from "@/features/account/types";
import SessionList from "@/features/account/components/SessionList.vue";
import { useSessionList } from "@/features/account/composables/useSessionList";

function session(overrides: Partial<UserSession>): UserSession {
  return {
    sessionId: "session-1",
    deviceName: "Chrome · Windows",
    clientName: "砾石进化统一登陆门户平台",
    approximateLocation: "北京",
    ipAddressMasked: "10.0.*.*",
    lastActiveAt: "2026-08-24T00:00:00.000Z",
    createdAt: "2026-08-20T00:00:00.000Z",
    authenticationMethods: ["password"],
    isCurrent: false,
    ...overrides,
  };
}

const CURRENT_SESSION = session({ sessionId: "session-current", isCurrent: true });
const OTHER_SESSION = session({ sessionId: "session-other", deviceName: "Safari · iPhone" });

beforeEach(() => {
  commandMocks.revokeOwnSession.mockReset();
  messageSpies.success.mockReset();
  messageSpies.info.mockReset();
  messageSpies.error.mockReset();
});

describe("SessionList — current device preservation", () => {
  it("marks the current device and hides its revocation action", () => {
    const wrapper = mount(SessionList, {
      props: { sessions: [CURRENT_SESSION, OTHER_SESSION] },
      global: { plugins: [naive] },
    });

    expect(wrapper.text()).toContain("当前设备");
    expect(wrapper.find('[data-testid="revoke-session-session-current"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="revoke-session-session-other"]').exists()).toBe(true);
  });

  it("revokes another device through the confirmation popover", async () => {
    commandMocks.revokeOwnSession.mockResolvedValue(undefined);
    const refreshSessions = vi.fn();
    const wrapper = mount(SessionList, {
      props: { sessions: [CURRENT_SESSION, OTHER_SESSION], refreshSessions },
      global: { plugins: [naive], stubs: {} },
      attachTo: document.body,
    });

    await wrapper.find('[data-testid="revoke-session-session-other"]').trigger("click");
    await flushPromises();

    // The popconfirm content teleports to the document body.
    const confirmButton = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认撤销"),
    );
    expect(confirmButton).toBeDefined();
    confirmButton?.click();
    await flushPromises();

    expect(commandMocks.revokeOwnSession).toHaveBeenCalledWith("session-other");
    expect(refreshSessions).toHaveBeenCalledTimes(1);
    expect(messageSpies.success).toHaveBeenCalledWith("会话已撤销。");
    // The current device is untouched.
    expect(commandMocks.revokeOwnSession).not.toHaveBeenCalledWith("session-current");
    wrapper.unmount();
  });
});

describe("useSessionList — current device guard", () => {
  it("refuses to revoke the current session and never calls the command seam", async () => {
    const { revokeSession, displayedSessions } = useSessionList([CURRENT_SESSION, OTHER_SESSION]);

    const outcome = await revokeSession("session-current");

    expect(outcome).toBe("protected");
    expect(commandMocks.revokeOwnSession).not.toHaveBeenCalled();
    expect(displayedSessions.value).toHaveLength(2);
  });

  it("revokes a remote session and keeps the current one in the list", async () => {
    commandMocks.revokeOwnSession.mockResolvedValue(undefined);
    const refreshSessions = vi.fn();
    const { revokeSession } = useSessionList([CURRENT_SESSION, OTHER_SESSION], refreshSessions);

    const outcome = await revokeSession("session-other");

    expect(outcome).toBe("revoked");
    expect(commandMocks.revokeOwnSession).toHaveBeenCalledWith("session-other");
    expect(refreshSessions).toHaveBeenCalledTimes(1);
  });

  it("maps a vanished session to not_found and refreshes the authoritative list", async () => {
    commandMocks.revokeOwnSession.mockRejectedValue({ kind: "not_found", message: "gone" });
    const refreshSessions = vi.fn();
    const { revokeSession } = useSessionList([CURRENT_SESSION, OTHER_SESSION], refreshSessions);

    const outcome = await revokeSession("session-other");

    expect(outcome).toBe("not_found");
    expect(refreshSessions).toHaveBeenCalledTimes(1);
  });
});
