<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Access policy editor (draft save with expectedVersion + step-up publish)
-->

<script setup lang="ts">
// Vue port of the frozen `policy-editor.tsx`: draft save carries
// `expectedVersion` (sent as a quoted strong If-Match ETag by the command
// seam; a 412 answer surfaces as a "conflict" ApiError and keeps the inputs
// intact), and publishing is a two-phase flow — save the draft first, then
// complete step-up (`policy.publish` bound to policyId+version) with the
// one-time target-bound grant before the publish command fires.
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { isApiError } from "@/shared/api-error";
import { browserCommands } from "@/shared/commands/browser-commands";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import AdminReauthenticationModal from "@/features/admin/components/AdminReauthenticationModal.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type {
  PolicyCondition,
  PolicyDetail,
  PolicyDraftInput,
  PolicyEffect,
  PolicyPrincipal,
} from "@/features/policies/types";

const props = withDefaults(
  defineProps<{
    detail?: PolicyDetail | null;
    canManage?: boolean;
    canPublish?: boolean;
  }>(),
  { detail: null, canManage: true, canPublish: true },
);

const message = useMessage();
const isEditing = computed(() => props.detail !== null);

const name = ref(props.detail?.name ?? "");
const description = ref(props.detail?.description ?? "");
const resource = ref(props.detail?.resource ?? "");
const action = ref(props.detail?.action ?? "");
const effect = ref<PolicyEffect>(props.detail?.effect ?? "allow");
const principals = ref<PolicyPrincipal[]>(props.detail?.principals ?? []);
const conditions = ref<PolicyCondition[]>(props.detail?.conditions ?? []);
const policyId = ref<string | undefined>(props.detail?.policyId);
const currentVersion = ref(props.detail?.version ?? 0);
const saving = ref(false);
const publishing = ref(false);
const publishTarget = ref<{ policyId: string; version: number } | null>(null);

const nameError = ref("");
const resourceError = ref("");
const actionError = ref("");

const EFFECT_OPTIONS: Array<{ value: PolicyEffect; label: string }> = [
  { value: "allow", label: "允许" },
  { value: "deny", label: "拒绝" },
];

const OPERATOR_OPTIONS = ["eq", "neq", "in", "not_in", "gt", "lt", "contains"].map((op) => ({
  label: op,
  value: op,
}));

function addPrincipal(): void {
  principals.value = [...principals.value, { attribute: "", operator: "eq", value: "" }];
}

function removePrincipal(index: number): void {
  principals.value = principals.value.filter((_, i) => i !== index);
}

function addCondition(): void {
  conditions.value = [...conditions.value, { attribute: "", operator: "eq", value: "" }];
}

function removeCondition(index: number): void {
  conditions.value = conditions.value.filter((_, i) => i !== index);
}

function buildInput(): PolicyDraftInput | null {
  nameError.value = "";
  resourceError.value = "";
  actionError.value = "";

  let valid = true;
  if (!name.value.trim()) {
    nameError.value = "请填写策略名称。";
    valid = false;
  }
  if (!resource.value.trim()) {
    resourceError.value = "请填写资源标识。";
    valid = false;
  }
  if (!action.value.trim()) {
    actionError.value = "请填写操作标识。";
    valid = false;
  }
  if (!valid) return null;

  return {
    policyId: policyId.value,
    ...(policyId.value !== undefined && { expectedVersion: currentVersion.value }),
    name: name.value.trim(),
    description: description.value.trim(),
    resource: resource.value.trim(),
    action: action.value.trim(),
    effect: effect.value,
    principals: principals.value.filter((p) => p.attribute && p.value),
    conditions: conditions.value.filter((c) => c.attribute && c.value),
  };
}

function reportDraftError(error: unknown, fallback: string): void {
  if (isApiError(error) && error.kind === "conflict") {
    message.error("策略版本已被他人变更，请重新加载页面获取最新版本后再试。");
    return;
  }
  message.error(fallback);
}

async function handleSaveDraft(): Promise<void> {
  if (!props.canManage) return;
  const input = buildInput();
  if (!input) return;

  saving.value = true;
  try {
    const result = await browserCommands.savePolicyDraft(input);
    policyId.value = result.policyId;
    currentVersion.value = result.version;
    message.success(`草稿已保存（v${result.version}）。`);
    // Legacy navigates to the detail page after the first save and soft-
    // refreshes afterwards; both collapse to a full reload here because the
    // page data is server-fetched.
    void navigateTo(`/admin/policies/${result.policyId}`, { external: true });
  } catch (error) {
    reportDraftError(error, "保存失败，请重试。");
  } finally {
    saving.value = false;
  }
}

async function handlePublish(): Promise<void> {
  if (!props.canManage || !props.canPublish) return;
  const input = buildInput();
  if (!input) return;

  publishing.value = true;
  try {
    const draftResult = await browserCommands.savePolicyDraft(input);
    policyId.value = draftResult.policyId;
    currentVersion.value = draftResult.version;
    publishTarget.value = draftResult;
  } catch (error) {
    reportDraftError(error, "保存发布草稿失败，请刷新后重试。");
  } finally {
    publishing.value = false;
  }
}

async function publishWithGrant(reauthToken: string, signal: AbortSignal): Promise<void> {
  const target = publishTarget.value;
  if (!target) return;
  await browserCommands.publishPolicy(target.policyId, target.version, reauthToken, { signal });
  message.success(`策略已发布（v${target.version}）。`);
  publishTarget.value = null;
  void navigateTo(`/admin/policies/${target.policyId}`, { external: true });
}

function handlePublishModalClose(): void {
  publishTarget.value = null;
}
</script>

<template>
  <NuxtLink class="back-link" to="/admin/policies" external>← 返回策略列表</NuxtLink>

  <AdminPageHeader
    eyebrow="ABAC Policy"
    :title="isEditing && detail ? detail.name : '新建策略'"
    :description="isEditing && detail ? `策略 ID：${detail.policyId} · v${detail.version}` : '定义基于属性的访问控制策略'"
  />

  <div v-if="detail" class="header-card">
    <div class="header-info">
      <h1>{{ detail.name }}</h1>
      <p>{{ detail.description }}</p>
    </div>
    <div class="header-meta">
      <span>版本：v{{ detail.version }}</span>
      <AdminStatusBadge
        :label="detail.status === 'published' ? '已发布' : '草稿'"
        :tone="detail.status === 'published' ? 'success' : 'warning'"
      />
    </div>
  </div>

  <div class="editor-card">
    <form class="policy-form" @submit.prevent="handleSaveDraft">
      <div class="field">
        <label class="field-label" for="policy-name">策略名称 *</label>
        <n-input
          id="policy-name"
          v-model:value="name"
          placeholder="例如：应用管理员维护 OAuth 应用"
          :status="nameError ? 'error' : undefined"
          data-testid="policy-editor-name"
          @update:value="nameError = ''"
        />
        <small v-if="nameError" class="field-error">{{ nameError }}</small>
      </div>

      <div class="field">
        <label class="field-label" for="policy-description">说明</label>
        <n-input
          id="policy-description"
          v-model:value="description"
          type="textarea"
          placeholder="描述策略的用途和影响范围"
          :rows="2"
        />
      </div>

      <div class="field-row">
        <div class="field">
          <label class="field-label" for="policy-resource">资源 *</label>
          <n-input
            id="policy-resource"
            v-model:value="resource"
            placeholder="例如：application:*"
            :status="resourceError ? 'error' : undefined"
            @update:value="resourceError = ''"
          />
          <small v-if="resourceError" class="field-error">{{ resourceError }}</small>
          <small v-else class="field-hint">支持通配符。例如 <code>application:*</code> 匹配所有应用操作。</small>
        </div>

        <div class="field">
          <label class="field-label" for="policy-action">操作 *</label>
          <n-input
            id="policy-action"
            v-model:value="action"
            placeholder="例如：application.manage"
            :status="actionError ? 'error' : undefined"
            @update:value="actionError = ''"
          />
          <small v-if="actionError" class="field-error">{{ actionError }}</small>
          <small v-else class="field-hint">与 OAuth Scope 独立。例如 <code>application.manage</code>。</small>
        </div>

        <div class="field">
          <label class="field-label" for="policy-effect">效果 *</label>
          <n-select id="policy-effect" v-model:value="effect" :options="EFFECT_OPTIONS" />
        </div>
      </div>

      <div class="statement-section">
        <div class="section-header">
          <h3>Principal 属性</h3>
          <n-button quaternary size="small" type="primary" @click="addPrincipal">+ 添加</n-button>
        </div>
        <p v-if="principals.length === 0" class="empty-text">尚未添加 Principal 属性。</p>
        <div v-for="(principal, index) in principals" :key="index" class="condition-row">
          <n-input
            v-model:value="principal.attribute"
            placeholder="属性名（如 role）"
            :aria-label="`Principal 属性名 ${index + 1}`"
          />
          <n-select
            v-model:value="principal.operator"
            :options="OPERATOR_OPTIONS"
            class="operator-select"
            :aria-label="`Principal 操作符 ${index + 1}`"
          />
          <n-input
            v-model:value="principal.value"
            placeholder="值（如 admin）"
            :aria-label="`Principal 值 ${index + 1}`"
          />
          <n-button quaternary type="error" size="small" :aria-label="`删除 Principal ${index + 1}`" @click="removePrincipal(index)">
            ×
          </n-button>
        </div>
      </div>

      <div class="statement-section">
        <div class="section-header">
          <h3>条件</h3>
          <n-button quaternary size="small" type="primary" @click="addCondition">+ 添加</n-button>
        </div>
        <p v-if="conditions.length === 0" class="empty-text">尚未添加条件。无条件时仅按 Principal 匹配。</p>
        <div v-for="(condition, index) in conditions" :key="index" class="condition-row">
          <n-input
            v-model:value="condition.attribute"
            placeholder="属性名（如 department）"
            :aria-label="`条件属性名 ${index + 1}`"
          />
          <n-select
            v-model:value="condition.operator"
            :options="OPERATOR_OPTIONS"
            class="operator-select"
            :aria-label="`条件操作符 ${index + 1}`"
          />
          <n-input
            v-model:value="condition.value"
            placeholder="值（如 identity_platform）"
            :aria-label="`条件值 ${index + 1}`"
          />
          <n-button quaternary type="error" size="small" :aria-label="`删除条件 ${index + 1}`" @click="removeCondition(index)">
            ×
          </n-button>
        </div>
      </div>

      <div class="form-actions">
        <NuxtLink to="/admin/policies" external>
          <n-button quaternary>取消</n-button>
        </NuxtLink>
        <n-button
          v-if="canManage"
          attr-type="submit"
          quaternary
          type="primary"
          :loading="saving"
          :disabled="saving || publishing"
          data-testid="policy-editor-save-draft"
        >
          保存草稿
        </n-button>
        <n-button
          v-if="canManage && canPublish"
          type="primary"
          :loading="publishing"
          :disabled="saving || publishing"
          data-testid="policy-editor-publish"
          @click="handlePublish"
        >
          发布策略
        </n-button>
      </div>
    </form>
  </div>

  <div v-if="detail && detail.versionHistory.length > 0" class="editor-card">
    <div class="statement-section">
      <h3 class="history-title">版本历史</h3>
      <div
        v-for="entry in detail.versionHistory"
        :key="`${entry.version}-${entry.updatedAt}`"
        class="version-row"
      >
        <div class="version-heading">
          <strong>v{{ entry.version }}</strong>
          <AdminStatusBadge
            :label="entry.status === 'published' ? '已发布' : '草稿'"
            :tone="entry.status === 'published' ? 'success' : 'warning'"
          />
        </div>
        <div class="version-body">
          <p>{{ entry.changeSummary }}</p>
          <span>{{ entry.updatedBy }} · {{ formatSecurityDateTime(entry.updatedAt) }}</span>
        </div>
      </div>
    </div>
  </div>

  <AdminReauthenticationModal
    :show="publishTarget !== null"
    title="重新认证并发布策略"
    action="policy.publish"
    :target="publishTarget ? publishTarget.policyId : ''"
    submit-label="验证并发布"
    operation-error="策略发布失败。授权不会被重复使用，请刷新策略版本后重试。"
    destructive
    :perform-granted="publishWithGrant"
    @update:show="(value) => { if (!value) handlePublishModalClose(); }"
  >
    <p v-if="publishTarget" class="reauth-bound-notice">
      发布后，Cerbos 将立即对匹配请求使用版本 v{{ publishTarget.version }}。已发布版本不可修改。
    </p>
  </AdminReauthenticationModal>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 16px;
  color: var(--up-muted);
  font-size: 13px;
  font-weight: 620;
  text-decoration: none;
  transition: color 160ms ease;
}

.back-link:hover { color: var(--up-brand); }

.header-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 22px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.header-info h1 {
  margin: 0;
  color: var(--up-ink);
  font-size: 22px;
  font-weight: 680;
}

.header-info p {
  margin: 4px 0 0;
  color: var(--up-muted);
  font-size: 13px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--up-muted);
  font-size: 13px;
}

.editor-card {
  padding: 20px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.editor-card + .editor-card { margin-top: 16px; }

.policy-form { display: flex; flex-direction: column; gap: 18px; }

.field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }

.field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.field-label {
  color: var(--up-ink);
  font-size: 13px;
  font-weight: 640;
}

.field-hint {
  color: var(--up-muted);
  font-size: 12px;
  line-height: 1.6;
}

.field-hint code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--up-surface-muted);
  font-size: 11px;
}

.field-error {
  color: #d03050;
  font-size: 12px;
  line-height: 1.6;
}

.statement-section { display: flex; flex-direction: column; gap: 10px; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header h3 {
  margin: 0;
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 660;
}

.empty-text {
  margin: 0;
  color: var(--up-muted);
  font-size: 12px;
}

.condition-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.history-title {
  margin: 0;
  color: var(--up-ink);
  font-size: 15px;
  font-weight: 660;
}

.version-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding: 12px 14px;
  border: 1px solid var(--up-line);
  border-radius: 10px;
  background: var(--up-surface-muted);
}

.version-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.version-heading strong {
  color: var(--up-ink);
  font-size: 14px;
}

.version-body p {
  margin: 0;
  color: var(--up-ink);
  font-size: 13px;
  line-height: 1.6;
}

.version-body span {
  color: var(--up-muted);
  font-size: 12px;
}

.reauth-bound-notice {
  margin: 0 0 16px;
  color: var(--up-ink-secondary);
  font-size: 13px;
  line-height: 1.7;
}
</style>
