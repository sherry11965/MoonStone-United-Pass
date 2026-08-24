//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Component tests for the account deletion cooling-period state machine
//

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const commandMocks = vi.hoisted(() => ({
  requestAccountDeletion: vi.fn(),
  cancelAccountDeletion: vi.fn(),
}));

const messageSpies = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@/shared/commands/browser-commands", () => ({
  browserCommands: {
    requestAccountDeletion: commandMocks.requestAccountDeletion,
    cancelAccountDeletion: commandMocks.cancelAccountDeletion,
  },
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
import type { AccountDeletion } from "@/features/account/types";
import AccountDeletionPanel from "@/features/account/components/AccountDeletionPanel.vue";

const PENDING_DELETION: Exclude<AccountDeletion, { status: "none" }> & {
  status: "pending";
} = {
  deletionId: "deletion-1",
  status: "pending",
  requestedAt: "2026-08-24T00:00:00.000Z",
  executeAfter: "2026-09-23T00:00:00.000Z",
  cancelledAt: null,
  completedAt: null,
};

function mountPanel(initialDeletion: AccountDeletion) {
  return mount(AccountDeletionPanel, {
    props: { userId: "user-1", initialDeletion },
    global: { plugins: [naive] },
  });
}

beforeEach(() => {
  commandMocks.requestAccountDeletion.mockReset();
  commandMocks.cancelAccountDeletion.mockReset();
  messageSpies.success.mockReset();
  messageSpies.error.mockReset();
});

describe("AccountDeletionPanel cooling-period state machine", () => {
  it("offers the request action only when no deletion is active", () => {
    const none = mountPanel({ status: "none" });
    expect(none.find('[data-testid="request-account-deletion"]').exists()).toBe(true);
    expect(none.find('[data-testid="deletion-status"]').exists()).toBe(false);

    const pending = mountPanel(PENDING_DELETION);
    expect(pending.find('[data-testid="request-account-deletion"]').exists()).toBe(false);
  });

  it("shows the cooling-period status card and the cancel action while pending", () => {
    const wrapper = mountPanel(PENDING_DELETION);
    expect(wrapper.find('[data-testid="deletion-status"]').text()).toBe("冷静期中");
    expect(wrapper.find('[data-testid="cancel-account-deletion"]').exists()).toBe(true);
  });

  it("locks cancellation once the worker claims the deletion (processing)", () => {
    const wrapper = mountPanel({ ...PENDING_DELETION, status: "processing" });
    expect(wrapper.find('[data-testid="deletion-status"]').text()).toBe("正在删除身份账户");
    expect(wrapper.find('[data-testid="cancel-account-deletion"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("注销已进入执行阶段，无法再取消。");
  });

  it("cancels a pending deletion and returns to the requestable state", async () => {
    commandMocks.cancelAccountDeletion.mockResolvedValue({
      ...PENDING_DELETION,
      status: "cancelled",
      cancelledAt: "2026-08-24T01:00:00.000Z",
    });
    const wrapper = mountPanel(PENDING_DELETION);

    await wrapper.find('[data-testid="cancel-account-deletion"]').trigger("click");
    await flushPromises();

    expect(commandMocks.cancelAccountDeletion).toHaveBeenCalledTimes(1);
    expect(messageSpies.success).toHaveBeenCalledWith("注销申请已取消，账户不会被删除。");
    expect(wrapper.find('[data-testid="deletion-status"]').text()).toBe("已取消");
    // cancelled -> the request action becomes available again.
    expect(wrapper.find('[data-testid="request-account-deletion"]').exists()).toBe(true);
  });

  it("reports a failure without changing state when cancellation is rejected", async () => {
    commandMocks.cancelAccountDeletion.mockRejectedValue(new Error("raced with worker"));
    const wrapper = mountPanel(PENDING_DELETION);

    await wrapper.find('[data-testid="cancel-account-deletion"]').trigger("click");
    await flushPromises();

    expect(messageSpies.error).toHaveBeenCalled();
    expect(wrapper.find('[data-testid="deletion-status"]').text()).toBe("冷静期中");
    expect(wrapper.find('[data-testid="cancel-account-deletion"]').exists()).toBe(true);
  });

  it("opens the reauthentication ceremony when requesting deletion", async () => {
    const wrapper = mountPanel({ status: "none" });

    await wrapper.find('[data-testid="request-account-deletion"]').trigger("click");
    await flushPromises();

    // The modal teleports to the document body; the reauthentication form is
    // the ceremony entry point (password first).
    expect(document.querySelector('[data-testid="reauth-password"]')).not.toBeNull();
  });
});
