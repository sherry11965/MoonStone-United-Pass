<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Recovery codes modal (generate -> one-time display + copy)
//

import { ref } from "vue";
import { browserCommands } from "@/shared/commands/browser-commands";
import { useMessage } from "naive-ui";

const emit = defineEmits<{
  cancel: [];
  complete: [];
}>();

const message = useMessage();

const phase = ref<"generate" | "display">("generate");
const codes = ref<string[]>([]);
const isGenerating = ref(false);
const hasCopied = ref(false);

async function handleGenerate(): Promise<void> {
  isGenerating.value = true;
  try {
    const result = await browserCommands.generateRecoveryCodes();
    codes.value = result.codes;
    phase.value = "display";
  } catch {
    message.error("生成恢复代码失败，请稍后重试。");
  } finally {
    isGenerating.value = false;
  }
}

function handleCopy(): void {
  const text = codes.value.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    hasCopied.value = true;
    message.success("恢复代码已复制到剪贴板。");
  }).catch(() => {
    message.error("复制失败，请手动抄写。");
  });
}

function handleDismiss(): void {
  if (phase.value === "generate") {
    emit("cancel");
  } else {
    emit("complete");
  }
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    :title="phase === 'generate' ? '生成恢复代码' : '恢复代码'"
    :mask-closable="false"
    :style="{ width: phase === 'generate' ? '480px' : '520px', maxWidth: 'calc(100vw - 32px)' }"
    @update:show="(visible: boolean) => { if (!visible) handleDismiss(); }"
  >
    <template v-if="phase === 'generate'">
      <div class="profile-form">
        <p class="profile-notice">
          恢复代码用于在无法使用常规验证方式时恢复账户访问。每个代码仅可使用一次。
          生成后请妥善保存，关闭此窗口后将无法再次查看。
        </p>
        <div class="profile-actions">
          <n-button :disabled="isGenerating" @click="emit('cancel')">取消</n-button>
          <n-button type="primary" :loading="isGenerating" :disabled="isGenerating" data-testid="recovery-generate" @click="handleGenerate">
            生成恢复代码
          </n-button>
        </div>
      </div>
    </template>

    <template v-else>
      <n-alert type="info" :show-icon="false">
        请将恢复代码保存到安全位置。每个代码仅可使用一次。关闭此窗口后将无法再次查看这些代码。
      </n-alert>
      <div class="recovery-codes-grid">
        <code v-for="code in codes" :key="code">{{ code }}</code>
      </div>
      <p class="profile-notice">当前为 Mock 流程，生成的代码不会持久化。</p>
      <div class="profile-actions">
        <n-button :disabled="codes.length === 0" @click="handleCopy">
          {{ hasCopied ? "已复制" : "复制全部" }}
        </n-button>
        <n-button type="primary" @click="emit('complete')">已保存，关闭</n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.profile-form { display: grid; gap: 18px; padding-bottom: 16px; }

.profile-notice {
  margin: 0;
  padding: 11px 13px;
  border-radius: 9px;
  color: var(--up-muted);
  background: var(--up-surface-subtle);
  font-size: 12px;
  line-height: 1.6;
}

.profile-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }

.recovery-codes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 16px 0;
  padding: 16px;
  border: 1px solid var(--up-line);
  border-radius: 11px;
  background: var(--up-surface-subtle);
}

.recovery-codes-grid code {
  padding: 8px 12px;
  border: 1px solid var(--up-line-soft);
  border-radius: 7px;
  background: var(--up-surface);
  color: var(--up-ink-secondary);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
</style>
