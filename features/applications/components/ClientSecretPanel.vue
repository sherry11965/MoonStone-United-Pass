<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Client secret panel (metadata + one-time rotation result display)
-->

<script setup lang="ts">
// Vue port of the frozen `client-detail.tsx` ClientSecrets block: metadata
// only, plus a rotate flow that warns about the 24-hour grace window and
// then shows the new secret exactly once. The one-time display survives the
// rotation on purpose: unlike the legacy soft refresh (which kept React
// state alive), a full page reload here would erase the secret, so the panel
// keeps it in local state until the admin leaves; metadata refreshes on the
// next page load.
import { ref } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type { OAuthClient, SecretRotationResult } from "@/features/applications/types";

const props = defineProps<{ client: OAuthClient }>();

const message = useMessage();
const dialog = useDialog();

const rotating = ref(false);
const rotatedSecret = ref<SecretRotationResult | undefined>(undefined);

function handleRotateSecret(): void {
  dialog.warning({
    title: "轮换 Client Secret",
    content: "轮换后旧密钥将在 24 小时内保持有效，到期后自动失效。新密钥仅在此页面展示一次，离开后无法再次查看。此操作需要重认证。当前为 Mock 实现，不会真实校验。",
    positiveText: "确认轮换",
    negativeText: "取消",
    onPositiveClick: async () => {
      rotating.value = true;
      try {
        const result = await browserCommands.rotateClientSecret(props.client.applicationId, props.client.clientId);
        rotatedSecret.value = result;
        message.success("密钥已轮换，请立即复制新密钥。");
        return true;
      } catch {
        message.error("密钥轮换失败，请重试。");
        return false;
      } finally {
        rotating.value = false;
      }
    },
  });
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    message.success("已复制到剪贴板。");
  }).catch(() => {
    message.error("复制失败，请手动选择并复制。");
  });
}
</script>

<template>
  <div v-if="client.clientType === 'public'" class="notice notice-info">
    <div>
      <strong>公共客户端不使用 Client Secret</strong>
      此客户端使用 Authorization Code + PKCE 流程，客户端密钥不会存储或展示。
    </div>
  </div>

  <div v-else class="secret-panel">
    <n-empty v-if="client.clientSecrets.length === 0" description="暂无密钥记录。" />
    <dl v-else class="description-list">
      <template v-for="secret in client.clientSecrets" :key="secret.secretId">
        <dt>密钥标签</dt>
        <dd>{{ secret.label }}</dd>

        <dt>密钥 ID</dt>
        <dd><code>{{ secret.secretId }}</code></dd>

        <dt>创建时间</dt>
        <dd>{{ formatSecurityDateTime(secret.createdAt) }}</dd>

        <dt>上次轮换</dt>
        <dd>{{ secret.lastRotatedAt ? formatSecurityDateTime(secret.lastRotatedAt) : "从未轮换" }}</dd>
      </template>
    </dl>

    <div v-if="rotatedSecret" class="notice notice-danger rotated-secret" data-testid="client-secret-rotated">
      <div>
        <strong>新 Client Secret（仅此一次展示）</strong>
        <p class="rotated-secret-row">
          <code data-testid="client-secret-rotated-value">{{ rotatedSecret.clientSecret }}</code>
          <n-button quaternary size="small" @click="copyToClipboard(rotatedSecret?.clientSecret ?? '')">复制</n-button>
        </p>
        <p>旧密钥将在 {{ formatSecurityDateTime(rotatedSecret.previousSecretExpiresAt) }} 后失效。</p>
      </div>
    </div>

    <div class="notice notice-danger">
      <div>
        <strong>Client Secret 不会再次展示</strong>
        创建或轮换时展示一次后即从系统中移除明文。此处仅显示密钥元数据，不包含密钥值。
      </div>
    </div>

    <div>
      <n-button type="warning" :loading="rotating" :disabled="rotating" @click="handleRotateSecret">
        轮换密钥
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.secret-panel { display: flex; flex-direction: column; gap: 12px; }

.description-list {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 10px 16px;
  margin: 0;
}

.description-list dt {
  color: var(--up-muted);
  font-size: 13px;
  font-weight: 620;
}

.description-list dd {
  margin: 0;
  color: var(--up-ink);
  font-size: 13px;
  line-height: 1.7;
  word-break: break-all;
}

.description-list code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--up-surface-muted);
  font-size: 12px;
}

.notice {
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.7;
}

.notice strong {
  display: block;
  margin-bottom: 2px;
  font-size: 13px;
}

.notice p { margin: 4px 0 0; }

.notice-info {
  border: 1px solid var(--up-info-line, #bcd6ff);
  background: var(--up-info-bg, #f2f7ff);
  color: var(--up-info-ink, #214a9e);
}

.notice-danger {
  border: 1px solid var(--up-danger-line, #f0b6b6);
  background: var(--up-danger-bg, #fdf0f0);
  color: var(--up-danger-ink, #9e2121);
}

.rotated-secret-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.rotated-secret-row code {
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--up-surface);
  font-size: 12px;
  word-break: break-all;
}
</style>
