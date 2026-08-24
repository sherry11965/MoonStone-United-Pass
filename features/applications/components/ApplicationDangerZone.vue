<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Application danger zone (disable/enable confirmation + name-matched delete)
-->

<script setup lang="ts">
// Vue port of the frozen `application-detail.tsx` DangerTab: status toggling
// goes through a confirmation dialog (warning for disable, info for enable)
// and deletion requires typing the application name exactly. Neither action
// is part of the 8 step-up actions, matching the legacy behaviour where the
// backend enforces the policy.
import { computed, h, ref } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import type { OAuthApplicationDetail } from "@/features/applications/types";

const props = defineProps<{ detail: OAuthApplicationDetail }>();

const route = useRoute();
const message = useMessage();
const dialog = useDialog();

const isActive = computed(() => props.detail.status === "active");
const toggling = ref(false);
const deleting = ref(false);
const confirmDeleteName = ref("");

function refresh(): void {
  void navigateTo(route.fullPath, { external: true });
}

async function runToggle(): Promise<boolean> {
  toggling.value = true;
  try {
    await browserCommands.updateApplicationStatus(
      props.detail.applicationId,
      isActive.value ? "disabled" : "active",
    );
    message.success(isActive.value ? "应用已停用。" : "应用已启用。");
    refresh();
    return true;
  } catch {
    message.error("操作失败，请重试。");
    return false;
  } finally {
    toggling.value = false;
  }
}

function handleToggleStatus(): void {
  if (isActive.value) {
    dialog.warning({
      title: "停用此应用？",
      content: () =>
        h("div", { class: "app-toggle-warning" }, [
          h("p", null, ["停用 ", h("strong", null, props.detail.name), " 后："]),
          h("ul", null, [
            h("li", null, "用户将无法发起新的授权请求"),
            h("li", null, "已有授权不会立即失效，但仍受后端策略控制"),
            h("li", null, "已签发的 Access Token 在过期前仍然有效"),
            h("li", null, "Refresh Token 的续签将被阻止"),
          ]),
          h("p", null, "此操作需要重认证。当前为 Mock 实现。"),
        ]),
      positiveText: "确认停用",
      negativeText: "取消",
      onPositiveClick: async () => !(await runToggle()),
    });
  } else {
    dialog.info({
      title: "启用此应用？",
      content: "恢复后用户可重新发起新的授权请求。已过期的授权不会自动恢复。",
      positiveText: "确认启用",
      negativeText: "取消",
      onPositiveClick: async () => !(await runToggle()),
    });
  }
}

async function handleDeleteApplication(): Promise<void> {
  if (confirmDeleteName.value !== props.detail.name) {
    message.warning("输入的应用名称不匹配。");
    return;
  }

  deleting.value = true;
  try {
    await browserCommands.deleteApplication(props.detail.applicationId);
    message.success("应用已删除。");
    void navigateTo("/admin/applications", { external: true });
  } catch {
    message.error("删除失败，请重试。");
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="danger-zone">
    <n-alert type="error" :show-icon="false" class="danger-notice">
      <strong>危险操作</strong>
      以下操作会影响此应用的所有用户授权和登录流程，且不可在前端撤销。后端将强制执行并记录审计事件。
    </n-alert>

    <div class="danger-item">
      <div>
        <strong>{{ isActive ? "停用应用" : "启用应用" }}</strong>
        <p>
          {{ isActive
            ? "停用后用户将无法发起新的授权请求，已有授权不会立即失效。"
            : "恢复后用户可重新发起新的授权请求。" }}
        </p>
      </div>
      <n-button
        :type="isActive ? 'error' : 'primary'"
        :loading="toggling"
        :disabled="toggling"
        @click="handleToggleStatus"
      >
        {{ isActive ? "停用应用" : "启用应用" }}
      </n-button>
    </div>

    <div class="danger-item delete-item">
      <div class="delete-info">
        <strong>删除应用</strong>
        <p>删除后所有 Client、Secret、授权记录将被永久清除。审计日志将按合规策略保留。此操作不可逆。</p>
        <p class="delete-confirm-label">
          请输入应用名称 <code>{{ detail.name }}</code> 以确认：
        </p>
        <n-input
          v-model:value="confirmDeleteName"
          :placeholder="detail.name"
          :disabled="deleting"
          class="delete-confirm-input"
          aria-label="输入应用名称以确认删除"
        />
      </div>
      <n-button
        type="error"
        :loading="deleting"
        :disabled="confirmDeleteName !== detail.name || deleting"
        @click="handleDeleteApplication"
      >
        永久删除应用
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.danger-zone { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }

.danger-notice { line-height: 1.7; font-size: 13px; }
.danger-notice strong { margin-right: 8px; }

.danger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-muted);
}

.delete-item { align-items: flex-end; }

.danger-item strong {
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 640;
}

.danger-item p {
  margin: 4px 0 0;
  color: var(--up-muted);
  font-size: 12px;
  line-height: 1.6;
}

.delete-info { flex: 1; min-width: 0; }

.delete-confirm-label code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--up-surface);
  font-size: 12px;
}

.delete-confirm-input { margin-top: 6px; max-width: 320px; }
</style>

<style>
.app-toggle-warning ul {
  margin: 8px 0;
  padding-left: 20px;
}

.app-toggle-warning li { line-height: 1.8; }
</style>
