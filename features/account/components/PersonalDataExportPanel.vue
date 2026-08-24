<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Personal data export panel (reauthentication -> 202 bounded polling)
//

import { onScopeDispose, ref } from "vue";
import type { PersonalDataExport } from "@/features/account/types";
import AccountReauthenticationForm from "@/features/account/components/AccountReauthenticationForm.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import { browserCommands } from "@/shared/commands/browser-commands";
import { useMessage } from "naive-ui";

defineProps<{ userId: string }>();

const message = useMessage();

const isDialogOpen = ref(false);
const result = ref<PersonalDataExport | null>(null);
const reauthFormRef = ref<InstanceType<typeof AccountReauthenticationForm>>();

// The polling loop keeps a panel-owned controller: after the 202 grant the
// reauthentication form unmounts, so closing the dialog (or leaving the
// page) must still abort the bounded poll exactly like the frozen React
// panel (`operation.current?.abort()` on close/unmount).
let operation: AbortController | null = null;

onScopeDispose(() => {
  operation?.abort();
});

function openDialog(): void {
  isDialogOpen.value = true;
}

function closeDialog(): void {
  reauthFormRef.value?.abort();
  operation?.abort();
  operation = null;
  isDialogOpen.value = false;
}

async function requestExport(reauthToken: string, signal: AbortSignal): Promise<void> {
  const pollController = new AbortController();
  operation = pollController;
  signal.addEventListener("abort", () => pollController.abort(), { once: true });
  const pollSignal = pollController.signal;

  let next = await browserCommands.requestPersonalDataExport(reauthToken, { signal });
  result.value = next;
  isDialogOpen.value = false;
  for (
    let attempt = 0;
    attempt < 30 && (next.status === "pending" || next.status === "processing");
    attempt += 1
  ) {
    await waitForPoll(pollSignal);
    next = await browserCommands.getPersonalDataExport(next.exportId, { signal: pollSignal });
    result.value = next;
  }
  if (next.status === "failed") throw new Error("personal data export failed");
  if (next.status === "completed") {
    message.success("个人数据副本已生成，下载链接将在 15 分钟后失效。");
  } else {
    message.info("导出仍在后台处理中，请稍后重新打开此页面查看。");
  }
}

function exportStatusLabel(status: PersonalDataExport["status"]): string {
  return { pending: "等待处理", processing: "生成中", completed: "已完成", failed: "失败" }[status];
}

function waitForPoll(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, 1000);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}
</script>

<template>
  <div>
    <section class="card">
      <div>
        <p class="eyebrow">Personal data</p>
        <h2>获取个人数据副本</h2>
        <p class="description">
          导出账户资料、身份关联、员工档案和应用授权。导出文件不包含密码、令牌或密钥。
        </p>
      </div>
      <n-button type="primary" data-testid="request-data-export" @click="openDialog">
        申请导出
      </n-button>
    </section>

    <section v-if="result" class="status-card" aria-live="polite">
      <h2>最近一次导出</h2>
      <dl class="details">
        <div><dt>状态</dt><dd data-testid="export-status">{{ exportStatusLabel(result.status) }}</dd></div>
        <div><dt>申请时间</dt><dd>{{ formatSecurityDateTime(result.requestedAt) }}</dd></div>
        <div><dt>数据分区</dt><dd>{{ result.totalSections }}</dd></div>
        <div v-if="result.expiresAt"><dt>链接失效</dt><dd>{{ formatSecurityDateTime(result.expiresAt) }}</dd></div>
      </dl>
      <a v-if="result.downloadUrl" class="download-link" :href="result.downloadUrl" download>
        下载 JSON 数据副本
      </a>
      <p v-else-if="result.status === 'completed'" class="muted">Mock 模式不会生成真实文件；真实环境将显示一次性下载链接。</p>
    </section>

    <n-modal
      v-model:show="isDialogOpen"
      preset="card"
      title="验证身份并申请数据导出"
      :mask-closable="false"
      :close-on-esc="false"
      :style="{ width: '520px', maxWidth: 'calc(100vw - 32px)' }"
      @update:show="(visible: boolean) => { if (!visible) closeDialog(); }"
    >
      <p class="modal-copy">为防止他人获取你的个人数据，需要重新验证当前账户。</p>
      <AccountReauthenticationForm
        v-if="isDialogOpen"
        ref="reauthFormRef"
        action="account.data_export"
        :target="userId"
        submit-label="验证并申请"
        :perform-granted="requestExport"
        operation-error="数据导出申请失败。授权不会被重复使用，请重新验证后再试。"
        @cancel="closeDialog"
      />
    </n-modal>
  </div>
</template>

<style scoped>
.card,
.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 18px;
  padding: 26px;
  border: 1px solid var(--up-line);
  border-radius: var(--up-radius-md);
  background: var(--up-surface);
  box-shadow: var(--up-card-shadow);
}

.card h2,
.status-card h2 { margin: 4px 0 0; font-size: 17px; }

.eyebrow {
  margin: 0;
  color: var(--up-brand);
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.description,
.modal-copy,
.muted { margin: 8px 0 0; color: var(--up-muted); font-size: 13px; line-height: 1.7; }

.status-card { display: block; }
.details { display: grid; gap: 0; margin: 16px 0; }
.details > div { display: grid; grid-template-columns: 110px 1fr; gap: 14px; padding: 11px 0; border-top: 1px solid var(--up-line-soft); }
.details dt { color: var(--up-muted); font-size: 12px; }
.details dd { margin: 0; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }

.download-link { display: inline-flex; color: var(--up-brand); font-size: 13px; font-weight: 650; }

@media (max-width: 760px) {
  .card { align-items: stretch; flex-direction: column; }
  .details > div { grid-template-columns: 1fr; gap: 6px; }
}
</style>
