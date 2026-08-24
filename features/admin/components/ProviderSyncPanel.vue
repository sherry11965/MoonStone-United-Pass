<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Provider directory sync trigger + last sync result panel
-->

<script setup lang="ts">
// Vue port of the frozen `provider-detail.tsx` sync ceremony: `立即同步`
// queues a backend directory-sync job (no step-up), updates the local
// last-sync snapshot immediately, then performs a full-document reload.
// The trigger is disabled until the App Secret is configured.
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import type { DirectorySyncResult, ProviderDetail } from "@/features/admin/types";

const props = defineProps<{ detail: ProviderDetail }>();

const route = useRoute();
const message = useMessage();
const syncing = ref(false);
const lastSync = ref<DirectorySyncResult | null>(props.detail.lastSyncResult);

function syncStatusMeta(status: DirectorySyncResult["status"]): { label: string; tone: "info" | "success" | "warning" | "danger" } {
  if (status === "pending") return { label: "已排队", tone: "info" };
  if (status === "running") return { label: "处理中", tone: "info" };
  if (status === "success") return { label: "成功", tone: "success" };
  if (status === "partial") return { label: "部分成功", tone: "warning" };
  return { label: "失败", tone: "danger" };
}

async function handleSync(): Promise<void> {
  syncing.value = true;
  try {
    const result = await browserCommands.syncProviderDirectory(props.detail.providerId);
    lastSync.value = result;
    message.success("目录同步作业已排队，页面刷新后可查看进度。");
    void navigateTo(route.fullPath, { external: true });
  } catch {
    message.error("同步失败，请重试。");
  } finally {
    syncing.value = false;
  }
}
</script>

<template>
  <div class="sync-panel">
    <n-button
      type="primary"
      :loading="syncing"
      :disabled="syncing || !detail.secretConfigured"
      @click="handleSync"
    >
      立即同步
    </n-button>

    <template v-if="lastSync">
      <h3 class="section-heading">最近同步结果</h3>
      <dl class="description-list">
        <dt>同步 ID</dt>
        <dd><code>{{ lastSync.syncId }}</code></dd>

        <dt>开始时间</dt>
        <dd>{{ formatSecurityDateTime(lastSync.startedAt) }}</dd>

        <dt>完成时间</dt>
        <dd>{{ lastSync.completedAt ? formatSecurityDateTime(lastSync.completedAt) : "等待后台作业完成" }}</dd>

        <dt>状态</dt>
        <dd>
          <AdminStatusBadge
            :label="syncStatusMeta(lastSync.status).label"
            :tone="syncStatusMeta(lastSync.status).tone"
          />
        </dd>

        <dt>部门变更</dt>
        <dd>新增 {{ lastSync.departmentsAdded }} · 更新 {{ lastSync.departmentsUpdated }}</dd>

        <dt>通讯录成员变更</dt>
        <dd>
          新增 {{ lastSync.employeesAdded }} · 更新 {{ lastSync.employeesUpdated }} ·
          标记不活跃 {{ lastSync.employeesOffboarded }}
        </dd>

        <dt>冲突</dt>
        <dd>{{ lastSync.conflictsDetected }} 个待处理</dd>
      </dl>
    </template>
  </div>
</template>

<style scoped>
.sync-panel { display: block; }

.section-heading {
  margin: 24px 0 12px;
  color: var(--up-ink-secondary);
  font-size: 14px;
  font-weight: 660;
}

.description-list {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
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
</style>
