<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin console overview panel (metrics, recent security events, readiness card)
-->

<script setup lang="ts">
// Vue port of the frozen `admin-overview.tsx`. The dashboard data comes from
// `serverQueries.getAdminDashboard()`, which stays mock-backed by design —
// the overview is an explicit Mock seam until the backend dashboard contract
// lands (frontend-freeze-v1.md §5).
import type { AdminDashboard } from "@/shared/united-pass-data-source";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import AdminPageHeader from "./AdminPageHeader.vue";
import AdminStatusBadge from "./AdminStatusBadge.vue";

defineProps<{ dashboard: AdminDashboard }>();
</script>

<template>
  <AdminPageHeader
    eyebrow="Administration"
    title="身份管理工作台"
    description="统一查看账户、员工、OAuth 应用与授权策略的运行概况。前端可见性不是权限边界，所有管理操作仍需后端授权。"
  />

  <section class="metrics" aria-label="关键指标">
    <article v-for="metric in dashboard.metrics" :key="metric.label" class="metric-card">
      <span>{{ metric.label }}</span>
      <strong>{{ metric.value }}</strong>
      <p :class="metric.tone">{{ metric.change }}</p>
    </article>
  </section>

  <div class="dashboard-grid">
    <section class="card">
      <div class="card-heading">
        <div>
          <span>SECURITY SIGNALS</span>
          <h2>最近安全事件</h2>
        </div>
        <NuxtLink to="/admin/audit" external>查看全部</NuxtLink>
      </div>
      <div class="event-list">
        <article v-for="event in dashboard.recentEvents" :key="event.eventId" class="event-row">
          <div class="event-dot" :data-result="event.result" />
          <div class="event-body">
            <h3>{{ event.eventType }}</h3>
            <p>{{ event.actorName }} · {{ event.targetLabel }}</p>
          </div>
          <div class="event-meta">
            <AdminStatusBadge
              :label="event.result === 'success' ? '成功' : '已拒绝'"
              :tone="event.result === 'success' ? 'success' : 'danger'"
            />
            <span>{{ formatSecurityDateTime(event.occurredAt) }}</span>
          </div>
        </article>
      </div>
    </section>

    <aside class="card readiness-card">
      <div class="card-heading">
        <div>
          <span>INTEGRATION</span>
          <h2>后端接入准备</h2>
        </div>
      </div>
      <ol>
        <li><AdminStatusBadge label="已完成" tone="success" /><span>数据源接口与 mock 边界</span></li>
        <li><AdminStatusBadge label="待接入" tone="warning" /><span>OIDC 登录与授权请求校验</span></li>
        <li><AdminStatusBadge label="待接入" tone="warning" /><span>服务端会话与权限决策</span></li>
      </ol>
      <p>完整接口清单位于 <code>docs/api-contracts.md</code>。</p>
    </aside>
  </div>
</template>

<style scoped>
/* Vue port of the frozen admin.module.css (overview section). */
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.metric-card span {
  color: var(--up-muted);
  font-size: 12px;
  font-weight: 640;
  letter-spacing: 0.06em;
}

.metric-card strong {
  color: var(--up-ink);
  font-size: 28px;
  font-weight: 680;
  letter-spacing: -0.03em;
}

.metric-card p { margin: 0; font-size: 12px; font-weight: 620; }
.metric-card .positive { color: var(--up-status-success-ink); }
.metric-card .attention { color: var(--up-status-warning-ink); }
.metric-card .neutral { color: var(--up-muted); }

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.card {
  padding: 22px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.card-heading span {
  color: var(--up-brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.card-heading h2 {
  margin: 4px 0 0;
  color: var(--up-ink);
  font-size: 18px;
  font-weight: 680;
}

.card-heading a {
  color: var(--up-brand);
  font-size: 13px;
  font-weight: 620;
  text-decoration: none;
}

.event-list {
  display: flex;
  flex-direction: column;
}

.event-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid var(--up-line-soft);
}

.event-row:first-child { border-top: 0; padding-top: 0; }

.event-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--up-status-success-ink);
}

.event-dot[data-result="denied"] { background: var(--up-status-danger-ink); }

.event-body h3 {
  margin: 0;
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 640;
}

.event-body p {
  margin: 2px 0 0;
  color: var(--up-muted);
  font-size: 12px;
}

.event-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.event-meta span {
  color: var(--up-muted);
  font-size: 12px;
  white-space: nowrap;
}

.readiness-card ol {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding-left: 18px;
  color: var(--up-muted);
  font-size: 13px;
}

.readiness-card li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.readiness-card li span { color: var(--up-ink); }

.readiness-card > p {
  margin: 16px 0 0;
  color: var(--up-muted);
  font-size: 12px;
  line-height: 1.7;
}

.readiness-card code {
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--up-surface-muted);
  font-size: 12px;
}

@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
</style>
