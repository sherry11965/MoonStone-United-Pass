<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin security audit explorer (URL-driven filters + cursor pagination)
-->

<script setup lang="ts">
// Vue port of the frozen `(admin)/admin/audit/page.tsx` + `audit-explorer.tsx`:
// server-side search and cursor pagination driven by the URL through
// useCursorPage; every filter change resets the cursor; never a full-table
// load. The "导出审计日志" write operation (step-up `audit.export` +
// Idempotency-Key) lives in AuditExportPanel, loaded on demand behind the
// `auditExport` capability. Free-text filters commit on debounce/Enter
// instead of the legacy per-keystroke navigation.
import { defineAsyncComponent, h } from "vue";
import type { DataTableColumns, SelectOption } from "naive-ui";
import AdminDirectory from "@/features/admin/components/AdminDirectory.vue";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { useCursorPage } from "@/features/admin/composables/useCursorPage";
import { useAdminShell } from "@/features/admin/composables/useAdminShell";
import { readQueryString, type RouteQueryLike } from "@/features/admin/cursor-page";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type { AuditEvent, AuditQuery } from "@/features/admin/types";
import type { PageQuery } from "@/shared/types/pagination";

// Heavy write panel loads on demand so the step-up/export command seam stays
// out of the common chunk.
const AuditExportPanel = defineAsyncComponent(
  () => import("@/features/admin/components/AuditExportPanel.vue"),
);

definePageMeta({ layout: "dashboard" });
useHead({ title: "审计事件" });

const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "", label: "全部事件类型" },
  { value: "policy.published", label: "策略发布" },
  { value: "policy.publication_failed", label: "策略发布失败" },
  { value: "authorization.denied", label: "管理操作拒绝" },
  { value: "session.revoked", label: "会话撤销" },
  { value: "consent.grant_allowed", label: "OAuth 授权同意" },
  { value: "oauth_client.secret_rotated", label: "Client Secret 轮换" },
  { value: "application.disabled", label: "应用停用" },
  { value: "employee.linked", label: "员工档案关联" },
  { value: "provider.directory_sync_completed", label: "Provider 同步" },
  { value: "account.password_changed", label: "密码修改" },
  { value: "audit.export_requested", label: "审计导出" },
];

const RESULT_OPTIONS: SelectOption[] = [
  { value: "", label: "全部结果" },
  { value: "success", label: "成功" },
  { value: "denied", label: "已拒绝" },
];

const route = useRoute();

const { permissions } = await useAdminShell();
const canExport = computed(() => permissions.value.auditExport);
const exportPanelRef = ref<InstanceType<typeof AuditExportPanel> | null>(null);

const currentEventType = computed(() => readQueryString(route.query as RouteQueryLike, "eventType") ?? "");
const currentResult = computed(() => readQueryString(route.query as RouteQueryLike, "result") ?? "");
const currentActorName = computed(() => readQueryString(route.query as RouteQueryLike, "actorName") ?? "");
const currentRequestId = computed(() => readQueryString(route.query as RouteQueryLike, "requestId") ?? "");

const dateRange = computed<[number, number] | null>(() => {
  const from = readQueryString(route.query as RouteQueryLike, "from");
  const to = readQueryString(route.query as RouteQueryLike, "to");
  if (from && to) {
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();
    if (Number.isFinite(fromTime) && Number.isFinite(toTime)) return [fromTime, toTime];
  }
  return null;
});

const fetchAuditEvents = async (query: AuditQuery) => {
  if (import.meta.server) {
    const { serverQueries } = await import("@/server/queries/server-queries");
    return serverQueries.getAuditEvents(query);
  }
  return { items: [], page: { nextCursor: null, hasMore: false } };
};

function buildAuditQuery(base: PageQuery, routeQuery: RouteQueryLike): AuditQuery {
  return {
    ...base,
    eventType: readQueryString(routeQuery, "eventType") ?? undefined,
    result: readQueryString(routeQuery, "result") ?? undefined,
    actorName: readQueryString(routeQuery, "actorName") ?? undefined,
    requestId: readQueryString(routeQuery, "requestId") ?? undefined,
    from: readQueryString(routeQuery, "from") ?? undefined,
    to: readQueryString(routeQuery, "to") ?? undefined,
  };
}

const { items, pageInfo, hasPrevious, search, loading, navigate, next, previous } =
  await useCursorPage<AuditEvent, AuditQuery>("/admin/audit", fetchAuditEvents, {
    limit: 25,
    buildQuery: buildAuditQuery,
  });

/** Filter changes always reset the cursor (legacy `updateFilter` contract). */
function updateFilter(key: string, value: string): void {
  void navigate({ [key]: value || null, cursor: null });
}

function handleDateRange(value: [number, number] | null): void {
  if (value && value.length === 2) {
    void navigate({
      from: new Date(value[0]).toISOString(),
      to: new Date(value[1]).toISOString(),
      cursor: null,
    });
    return;
  }
  void navigate({ from: null, to: null, cursor: null });
}

// Free-text filters commit on debounce/Enter (external navigation makes the
// legacy per-keystroke URL push unusable).
const actorNameDraft = ref(currentActorName.value);
const requestIdDraft = ref(currentRequestId.value);
let actorNameTimer: ReturnType<typeof setTimeout> | undefined;
let requestIdTimer: ReturnType<typeof setTimeout> | undefined;

watch(currentActorName, (value) => { actorNameDraft.value = value; });
watch(currentRequestId, (value) => { requestIdDraft.value = value; });

function commitActorName(): void {
  if (actorNameDraft.value !== currentActorName.value) updateFilter("actorName", actorNameDraft.value);
}

function commitRequestId(): void {
  if (requestIdDraft.value !== currentRequestId.value) updateFilter("requestId", requestIdDraft.value);
}

function handleActorNameInput(value: string): void {
  actorNameDraft.value = value;
  clearTimeout(actorNameTimer);
  actorNameTimer = setTimeout(commitActorName, 350);
}

function handleRequestIdInput(value: string): void {
  requestIdDraft.value = value;
  clearTimeout(requestIdTimer);
  requestIdTimer = setTimeout(commitRequestId, 350);
}

onBeforeUnmount(() => {
  clearTimeout(actorNameTimer);
  clearTimeout(requestIdTimer);
});

const selectedEvent = ref<AuditEvent | null>(null);
const drawerVisible = computed({
  get: () => selectedEvent.value !== null,
  set: (value) => { if (!value) selectedEvent.value = null; },
});

const columns: DataTableColumns<AuditEvent> = [
  {
    title: "事件",
    key: "eventType",
    width: 220,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h("strong", null, record.eventType),
        h("span", null, record.eventId),
      ]),
  },
  {
    title: "操作者",
    key: "actorName",
    width: 140,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h("strong", null, record.actorName),
        h("span", null, record.actorId),
      ]),
  },
  {
    title: "目标",
    key: "targetLabel",
    width: 200,
    render: (record) =>
      h("span", { class: "primary-cell" }, [
        h("strong", null, record.targetLabel),
        h("span", null, record.targetId),
      ]),
  },
  {
    title: "结果",
    key: "result",
    width: 100,
    render: (record) =>
      h(AdminStatusBadge, {
        label: record.result === "success" ? "成功" : "已拒绝",
        tone: record.result === "success" ? "success" : "danger",
      }),
  },
  {
    title: "Request ID",
    key: "requestId",
    width: 160,
    render: (record) => h("code", { class: "request-id" }, record.requestId),
  },
  {
    title: "发生时间",
    key: "occurredAt",
    width: 200,
    render: (record) => formatSecurityDateTime(record.occurredAt),
  },
  {
    title: "操作",
    key: "actions",
    width: 90,
    render: (record) =>
      h("button", {
        type: "button",
        class: "row-action",
        onClick: () => { selectedEvent.value = record; },
      }, "详情"),
  },
];
</script>

<template>
  <AdminPageHeader
    eyebrow="Security audit"
    title="审计事件"
    description="查看重要身份、安全和管理操作。支持按事件类型、操作者、结果和时间范围筛选。"
  >
    <template v-if="canExport" #action>
      <n-button
        type="primary"
        :loading="exportPanelRef?.exporting ?? false"
        :disabled="exportPanelRef?.exporting ?? false"
        @click="exportPanelRef?.open()"
      >
        导出审计日志
      </n-button>
    </template>
  </AdminPageHeader>

  <AdminDirectory
    directory-label="审计事件目录"
    search-placeholder="搜索事件、操作者或目标"
    :search-value="search"
    :has-previous="hasPrevious"
    :has-next="pageInfo.hasMore"
    @search="navigate({ q: $event, cursor: null })"
    @previous="previous"
    @next="next"
  >
    <template #filters>
      <n-select
        class="filter-control filter-select"
        :value="currentEventType"
        :options="EVENT_TYPE_OPTIONS"
        aria-label="按事件类型筛选"
        @update:value="(value: string) => updateFilter('eventType', value)"
      />
      <n-select
        class="filter-control filter-select-sm"
        :value="currentResult"
        :options="RESULT_OPTIONS"
        aria-label="按结果筛选"
        @update:value="(value: string) => updateFilter('result', value)"
      />
      <n-input
        class="filter-control filter-input"
        :value="actorNameDraft"
        placeholder="操作者"
        clearable
        aria-label="按操作者筛选"
        @update:value="handleActorNameInput"
        @keyup.enter="commitActorName"
        @clear="() => { actorNameDraft = ''; commitActorName(); }"
      />
      <n-input
        class="filter-control filter-input-lg"
        :value="requestIdDraft"
        placeholder="Request ID"
        clearable
        aria-label="按 Request ID 筛选"
        @update:value="handleRequestIdInput"
        @keyup.enter="commitRequestId"
        @clear="() => { requestIdDraft = ''; commitRequestId(); }"
      />
      <n-date-picker
        class="filter-control filter-date"
        type="daterange"
        :value="dateRange"
        clearable
        aria-label="按日期范围筛选"
        @update:value="handleDateRange"
      />
    </template>

    <p class="count-line">共 {{ items.length }} 条审计事件</p>

    <n-data-table
      remote
      :columns="columns"
      :data="items"
      :loading="loading"
      :row-key="(row: AuditEvent) => row.eventId"
      :scroll-x="1200"
    />
  </AdminDirectory>

  <AuditExportPanel v-if="canExport" ref="exportPanelRef" />

  <n-drawer v-model:show="drawerVisible" :width="480" placement="right">
    <n-drawer-content title="审计事件详情" closable>
      <dl v-if="selectedEvent" class="detail-list">
        <div>
          <dt>事件 ID</dt>
          <dd><code>{{ selectedEvent.eventId }}</code></dd>
        </div>
        <div>
          <dt>事件类型</dt>
          <dd>{{ selectedEvent.eventType }}</dd>
        </div>
        <div>
          <dt>操作者</dt>
          <dd>{{ selectedEvent.actorName }} · <code>{{ selectedEvent.actorId }}</code></dd>
        </div>
        <div>
          <dt>目标</dt>
          <dd>{{ selectedEvent.targetLabel }} · <code>{{ selectedEvent.targetId }}</code></dd>
        </div>
        <div>
          <dt>结果</dt>
          <dd>
            <AdminStatusBadge
              :label="selectedEvent.result === 'success' ? '成功' : '已拒绝'"
              :tone="selectedEvent.result === 'success' ? 'success' : 'danger'"
            />
          </dd>
        </div>
        <div>
          <dt>Request ID</dt>
          <dd><code>{{ selectedEvent.requestId }}</code></dd>
        </div>
        <div>
          <dt>发生时间</dt>
          <dd>{{ formatSecurityDateTime(selectedEvent.occurredAt) }}</dd>
        </div>
        <div>
          <dt>事件详情</dt>
          <dd>{{ selectedEvent.details }}</dd>
        </div>
      </dl>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.filter-control { flex: none; }
.filter-select { width: 180px; }
.filter-select-sm { width: 140px; }
.filter-input { width: 140px; }
.filter-input-lg { width: 180px; }
.filter-date { width: 280px; }

.count-line {
  margin: 0 0 12px;
  color: var(--up-muted);
  font-size: 13px;
}

:deep(.primary-cell) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:deep(.primary-cell strong) {
  color: var(--up-ink);
  font-size: 13px;
  font-weight: 640;
}

:deep(.primary-cell span) {
  color: var(--up-muted);
  font-size: 12px;
}

:deep(.request-id) {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--up-surface-muted);
  color: var(--up-muted);
  font-size: 12px;
}

:deep(.row-action) {
  padding: 0;
  border: none;
  background: none;
  color: var(--up-brand);
  cursor: pointer;
  font-size: 13px;
  font-weight: 620;
}

.detail-list {
  display: grid;
  gap: 12px;
  margin: 0;
}

.detail-list dt {
  color: var(--up-muted);
  font-size: 13px;
  font-weight: 600;
}

.detail-list dd {
  margin: 4px 0 0;
  color: var(--up-ink);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
}
</style>
