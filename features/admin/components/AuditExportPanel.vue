<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Audit export panel (step-up ceremony + idempotent async export with polling)
-->

<script setup lang="ts">
// Vue port of the frozen `audit-explorer.tsx` export flow: the export is a
// step-up action (`audit.export` bound to the fixed target "audit") whose
// single-use grant rides one POST carrying a caller-generated Idempotency-Key
// (64-hex, within `[A-Za-z0-9_-]{32,128}`), then polls the export job at
// 1-second intervals (max 30 attempts) until it completes, fails or the
// ceremony aborts. The page owns the trigger button (header action slot);
// this panel owns the modal, the polling lifecycle and the "最近导出" card.
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import { createIdempotencyKey } from "@/features/admin/utils/idempotency-key";
import { readQueryString, type RouteQueryLike } from "@/features/admin/cursor-page";
import AdminReauthenticationModal from "@/features/admin/components/AdminReauthenticationModal.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type { AuditExportResult, AuditQuery } from "@/features/admin/types";

const route = useRoute();
const message = useMessage();

const exporting = ref(false);
const exportResult = ref<AuditExportResult | null>(null);
const dialogVisible = ref(false);

function buildExportQuery(): AuditQuery {
  const query = route.query as RouteQueryLike;
  return {
    query: readQueryString(query, "q") ?? undefined,
    eventType: readQueryString(query, "eventType") ?? undefined,
    result: readQueryString(query, "result") ?? undefined,
    actorName: readQueryString(query, "actorName") ?? undefined,
    requestId: readQueryString(query, "requestId") ?? undefined,
    from: readQueryString(query, "from") ?? undefined,
    to: readQueryString(query, "to") ?? undefined,
  };
}

function waitForPoll(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timeout = setTimeout(resolve, 1000);
    signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

async function handleExport(reauthToken: string, signal: AbortSignal): Promise<void> {
  exporting.value = true;
  try {
    let result = await browserCommands.exportAuditEvents(
      buildExportQuery(),
      reauthToken,
      { signal, idempotencyKey: createIdempotencyKey() },
    );
    exportResult.value = result;
    for (
      let attempt = 0;
      attempt < 30 && (result.status === "pending" || result.status === "processing");
      attempt += 1
    ) {
      await waitForPoll(signal);
      result = await browserCommands.getAuditExport(result.exportId, { signal });
      exportResult.value = result;
    }
    if (result.status === "failed") throw new Error("audit export failed");
    if (result.status !== "completed") {
      message.info("导出仍在后台处理中，可稍后刷新查看。");
    } else {
      message.success(`导出完成，共 ${result.totalEvents} 条事件。`);
    }
    dialogVisible.value = false;
  } catch (error) {
    // Closing the modal aborts the ceremony; no failure toast in that case.
    if (!signal.aborted) {
      message.error("导出失败，请重试。");
    }
    throw error instanceof Error ? error : new Error("audit export failed");
  } finally {
    exporting.value = false;
  }
}

function open(): void {
  dialogVisible.value = true;
}

defineExpose({ open, exporting });
</script>

<template>
  <div v-if="exportResult" class="export-card">
    <h3>最近导出</h3>
    <p>
      导出 ID：<code>{{ exportResult.exportId }}</code> ·
      状态：{{ exportResult.status === "completed" ? "已完成" : exportResult.status }} ·
      事件数：{{ exportResult.totalEvents }} ·
      请求时间：{{ formatSecurityDateTime(exportResult.requestedAt) }}
    </p>
    <p v-if="exportResult.downloadUrl" class="download-row">
      <a :href="exportResult.downloadUrl">下载 CSV（链接 15 分钟内有效）</a>
    </p>
  </div>

  <AdminReauthenticationModal
    :show="dialogVisible"
    title="重新认证并导出审计日志"
    action="audit.export"
    target="audit"
    submit-label="验证并导出"
    operation-error="审计导出失败。授权不会被重复使用，请重新验证后再试。"
    :perform-granted="handleExport"
    @update:show="(value) => { if (!value) dialogVisible = false; }"
  >
    <p class="reauth-bound-notice">
      将按当前筛选条件创建后端异步 CSV 导出任务。导出内容仅包含固定、脱敏的审计字段。
    </p>
  </AdminReauthenticationModal>
</template>

<style scoped>
.export-card {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface);
}

.export-card h3 {
  margin: 0 0 8px;
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 660;
}

.export-card p {
  margin: 0;
  color: var(--up-muted);
  font-size: 13px;
  line-height: 1.7;
  word-break: break-all;
}

.export-card code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--up-surface-muted);
  font-size: 12px;
}

.download-row { margin-top: 8px; }

.download-row a {
  color: var(--up-brand);
  font-size: 13px;
  font-weight: 620;
  text-decoration: none;
}

.download-row a:hover { text-decoration: underline; }

.reauth-bound-notice {
  margin: 0 0 16px;
  color: var(--up-ink-secondary);
  font-size: 13px;
  line-height: 1.7;
}
</style>
