//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Component tests for the client secret panel one-time rotation display
//

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const commandMocks = vi.hoisted(() => ({
  rotateClientSecret: vi.fn(),
}));

const naiveMocks = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  dialog: { warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/shared/commands/browser-commands", () => ({
  browserCommands: {
    rotateClientSecret: commandMocks.rotateClientSecret,
  },
}));

vi.mock("naive-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("naive-ui")>();
  return {
    ...actual,
    useMessage: () => naiveMocks.message,
    useDialog: () => naiveMocks.dialog,
  };
});

import naive from "naive-ui";
import ClientSecretPanel from "@/features/applications/components/ClientSecretPanel.vue";
import type { OAuthClient } from "@/features/applications/types";

const CONFIDENTIAL_CLIENT: OAuthClient = {
  clientId: "client-1",
  applicationId: "app-1",
  name: "Web 客户端",
  clientType: "confidential",
  grantTypes: ["authorization_code", "refresh_token"],
  tokenEndpointAuthMethod: "client_secret_basic",
  redirectUris: [{ uri: "https://example.com/callback", isLoopback: false, addedAt: "2026-08-01T00:00:00.000Z" }],
  logoutUri: "https://example.com/logout",
  allowedScopes: [],
  consentMode: "always",
  status: "active",
  clientSecrets: [
    {
      secretId: "secret-1",
      label: "初始密钥",
      createdAt: "2026-08-01T00:00:00.000Z",
      lastRotatedAt: null,
    },
  ],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

function mountPanel(client: OAuthClient) {
  return mount(ClientSecretPanel, {
    props: { client },
    global: { plugins: [naive] },
  });
}

/** Runs the confirm-rotation dialog callback captured from useDialog(). */
async function confirmRotation(): Promise<unknown> {
  const options = naiveMocks.dialog.warning.mock.calls.at(-1)?.[0] as {
    onPositiveClick?: () => unknown;
  };
  return options.onPositiveClick?.();
}

beforeEach(() => {
  commandMocks.rotateClientSecret.mockReset();
  naiveMocks.dialog.warning.mockReset();
  naiveMocks.message.success.mockReset();
  naiveMocks.message.error.mockReset();
});

describe("ClientSecretPanel", () => {
  it("shows the public-client notice without any rotation affordance", () => {
    const wrapper = mountPanel({ ...CONFIDENTIAL_CLIENT, clientType: "public" });
    expect(wrapper.text()).toContain("公共客户端不使用 Client Secret");
    expect(wrapper.findAll("button").some((b) => b.text() === "轮换密钥")).toBe(false);
  });

  it("shows the rotated secret exactly once after confirming the rotation dialog", async () => {
    commandMocks.rotateClientSecret.mockResolvedValue({
      secretId: "secret-2",
      clientSecret: "brand-new-one-time-secret",
      previousSecretExpiresAt: "2026-08-25T00:00:00.000Z",
    });
    const wrapper = mountPanel(CONFIDENTIAL_CLIENT);

    // Metadata only before rotation: no secret value anywhere on the page.
    expect(wrapper.text()).not.toContain("brand-new-one-time-secret");
    expect(wrapper.find('[data-testid="client-secret-rotated"]').exists()).toBe(false);

    await wrapper.findAll("button").find((b) => b.text() === "轮换密钥")?.trigger("click");
    expect(naiveMocks.dialog.warning).toHaveBeenCalledTimes(1);

    await confirmRotation();
    await flushPromises();

    expect(commandMocks.rotateClientSecret).toHaveBeenCalledWith("app-1", "client-1");
    expect(wrapper.find('[data-testid="client-secret-rotated"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="client-secret-rotated-value"]').text()).toBe(
      "brand-new-one-time-secret",
    );
    expect(wrapper.text()).toContain("新 Client Secret（仅此一次展示）");
    expect(naiveMocks.message.success).toHaveBeenCalledWith("密钥已轮换，请立即复制新密钥。");
  });

  it("keeps the dialog retryable when the rotation fails", async () => {
    commandMocks.rotateClientSecret.mockRejectedValue(new Error("boom"));
    const wrapper = mountPanel(CONFIDENTIAL_CLIENT);

    await wrapper.findAll("button").find((b) => b.text() === "轮换密钥")?.trigger("click");
    const keepOpen = await confirmRotation();
    await flushPromises();

    // Returning false tells Naive UI to keep the confirm dialog open.
    expect(keepOpen).toBe(false);
    expect(naiveMocks.message.error).toHaveBeenCalledWith("密钥轮换失败，请重试。");
    expect(wrapper.find('[data-testid="client-secret-rotated"]').exists()).toBe(false);
  });
});
