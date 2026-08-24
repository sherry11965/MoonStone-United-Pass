//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Component tests for the policy editor (If-Match 412 conflict + step-up publish)
//

// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, type PropType } from "vue";
import { flushPromises, mount } from "@vue/test-utils";

const commandMocks = vi.hoisted(() => ({
  savePolicyDraft: vi.fn(),
  publishPolicy: vi.fn(),
}));

const naiveMocks = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  dialog: { warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/shared/commands/browser-commands", () => ({
  browserCommands: {
    savePolicyDraft: commandMocks.savePolicyDraft,
    publishPolicy: commandMocks.publishPolicy,
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

// The step-up modal is replaced by a transparent stub that exposes the
// ceremony completion as a button, so the publish branch under test is the
// editor wiring (target-bound action/target, one-time grant hand-off),
// while the ceremony itself is covered by AdminReauthenticationForm tests.
vi.mock("@/features/admin/components/AdminReauthenticationModal.vue", () => ({
  default: defineComponent({
    name: "AdminReauthenticationModalStub",
    props: {
      show: Boolean,
      action: { type: String, default: "" },
      target: { type: String, default: "" },
      performGranted: {
        type: Function as PropType<(token: string, signal: AbortSignal) => Promise<void>>,
        default: undefined,
      },
    },
    emits: ["update:show"],
    setup(props, { emit }) {
      async function finish(): Promise<void> {
        // The real ceremony keeps the modal open on failure; the stub mirrors
        // that by only emitting update:show after the grant flow resolves.
        try {
          await props.performGranted?.("reauth-grant-token", new AbortController().signal);
          emit("update:show", false);
        } catch {
          // Swallowed: the failure branch is asserted via emitted events.
        }
      }
      return { finish };
    },
    template:
      '<div v-if="show" class="reauth-modal-stub" :data-action="action" :data-target="target"><button type="button" data-testid="stepup-complete" @click="finish">完成验证</button><slot /></div>',
  }),
}));

import naive from "naive-ui";
import PolicyEditor from "@/features/policies/components/PolicyEditor.vue";
import type { PolicyDetail } from "@/features/policies/types";

const navigateToMock = vi.fn();
vi.stubGlobal("navigateTo", navigateToMock);

// PolicyEditor uses the Nuxt auto-imported <NuxtLink>.
const NuxtLinkStub = { template: '<a><slot /></a>' };

const DETAIL: PolicyDetail = {
  policyId: "policy-1",
  name: "应用管理员管理应用",
  description: "应用管理员维护 OAuth 应用",
  resource: "application:*",
  action: "application.manage",
  effect: "allow",
  version: 3,
  status: "draft",
  principals: [{ attribute: "role", operator: "eq", value: "application_admin" }],
  conditions: [],
  updatedBy: "admin",
  updatedAt: "2026-08-20T00:00:00.000Z",
  versionHistory: [],
};

function mountEditor(detail: PolicyDetail | null = DETAIL) {
  return mount(PolicyEditor, {
    props: { detail, canManage: true, canPublish: true },
    global: { plugins: [naive], components: { NuxtLink: NuxtLinkStub } },
  });
}

function submitDraft(wrapper: ReturnType<typeof mount>): Promise<void> {
  // The save-draft button is attr-type="submit"; happy-dom does not relay
  // the click to a form submission, so trigger the form submit directly.
  return wrapper.find("form.policy-form").trigger("submit");
}

beforeEach(() => {
  commandMocks.savePolicyDraft.mockReset();
  commandMocks.publishPolicy.mockReset();
  naiveMocks.message.success.mockReset();
  naiveMocks.message.error.mockReset();
  navigateToMock.mockReset();
});

describe("PolicyEditor", () => {
  it("saves the draft with expectedVersion for optimistic If-Match guarding", async () => {
    commandMocks.savePolicyDraft.mockResolvedValue({ policyId: "policy-1", version: 4 });
    const wrapper = mountEditor();

    await submitDraft(wrapper);
    await flushPromises();

    expect(commandMocks.savePolicyDraft).toHaveBeenCalledWith(
      expect.objectContaining({ policyId: "policy-1", expectedVersion: 3 }),
    );
    expect(naiveMocks.message.success).toHaveBeenCalledWith("草稿已保存（v4）。");
    expect(navigateToMock).toHaveBeenCalledWith("/admin/policies/policy-1", { external: true });
  });

  it("surfaces the If-Match conflict (412) copy and keeps the typed inputs", async () => {
    commandMocks.savePolicyDraft.mockRejectedValue({
      kind: "conflict",
      message: "version mismatch",
    });
    const wrapper = mountEditor();

    await submitDraft(wrapper);
    await flushPromises();

    expect(naiveMocks.message.error).toHaveBeenCalledWith(
      "策略版本已被他人变更，请重新加载页面获取最新版本后再试。",
    );
    // Inputs survive the conflict so the admin can review and retry.
    const nameInput = wrapper.find('[data-testid="policy-editor-name"]').find("input, textarea");
    expect((nameInput.element as HTMLInputElement | HTMLTextAreaElement).value).toBe(
      "应用管理员管理应用",
    );
    expect(navigateToMock).not.toHaveBeenCalled();
  });

  it("falls back to the generic save error for non-conflict failures", async () => {
    commandMocks.savePolicyDraft.mockRejectedValue(new Error("boom"));
    const wrapper = mountEditor();

    await submitDraft(wrapper);
    await flushPromises();

    expect(naiveMocks.message.error).toHaveBeenCalledWith("保存失败，请重试。");
  });

  it("publishes via step-up: draft save first, then the one-time grant fires the publish command", async () => {
    commandMocks.savePolicyDraft.mockResolvedValue({ policyId: "policy-1", version: 4 });
    commandMocks.publishPolicy.mockResolvedValue({ version: 4 });
    const wrapper = mountEditor();

    await wrapper.find('[data-testid="policy-editor-publish"]').trigger("click");
    await flushPromises();

    expect(commandMocks.savePolicyDraft).toHaveBeenCalledWith(
      expect.objectContaining({ policyId: "policy-1", expectedVersion: 3 }),
    );

    // The ceremony modal is bound to `policy.publish` + the policy id target.
    const modal = wrapper.findComponent({ name: "AdminReauthenticationModalStub" });
    expect(modal.exists()).toBe(true);
    expect(modal.attributes("data-action")).toBe("policy.publish");
    expect(modal.attributes("data-target")).toBe("policy-1");
    expect(modal.text()).toContain("发布后，Cerbos 将立即对匹配请求使用版本 v4");

    await modal.find('[data-testid="stepup-complete"]').trigger("click");
    await flushPromises();

    expect(commandMocks.publishPolicy).toHaveBeenCalledWith(
      "policy-1",
      4,
      "reauth-grant-token",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(naiveMocks.message.success).toHaveBeenCalledWith("策略已发布（v4）。");
    expect(navigateToMock).toHaveBeenCalledWith("/admin/policies/policy-1", { external: true });
  });

  it("keeps the ceremony open when the publish command fails after the grant", async () => {
    commandMocks.savePolicyDraft.mockResolvedValue({ policyId: "policy-1", version: 4 });
    commandMocks.publishPolicy.mockRejectedValue(new Error("denied"));
    const wrapper = mountEditor();

    await wrapper.find('[data-testid="policy-editor-publish"]').trigger("click");
    await flushPromises();

    const modal = wrapper.findComponent({ name: "AdminReauthenticationModalStub" });
    await modal.find('[data-testid="stepup-complete"]').trigger("click");
    await flushPromises();

    // The stub emits update:show=false only after performGranted resolves; a
    // rejection must keep the modal open so the ceremony can be retried.
    expect(commandMocks.publishPolicy).toHaveBeenCalled();
    expect(modal.emitted("update:show")).toBeFalsy();
    expect(modal.exists()).toBe(true);
  });

  it("requires both capabilities to expose the publish button", () => {
    const wrapper = mount(PolicyEditor, {
      props: { detail: DETAIL, canManage: true, canPublish: false },
      global: { plugins: [naive], components: { NuxtLink: NuxtLinkStub } },
    });
    expect(wrapper.find('[data-testid="policy-editor-save-draft"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="policy-editor-publish"]').exists()).toBe(false);
  });
});
