<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Application creation form (two steps + one-time credential result panel)
-->

<script setup lang="ts">
// Vue port of the frozen `application-create-form.tsx`: step 1 collects the
// application basics, step 2 configures the first OAuth client, and the
// result panel shows the one-time Client Secret (never rendered again after
// the panel leaves the screen). Field-level validation keeps the entered
// values intact; the submit button is pending-guarded against double clicks.
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader.vue";
import {
  AUDIENCE_LABELS,
  CLIENT_PROFILES,
  CONSENT_MODE_LABELS,
  getClientProfileConfig,
  type AllowedScope,
  type ApplicationAudience,
  type ApplicationWithInitialClientResult,
  type ClientProfile,
  type ConsentMode,
} from "@/features/applications/types";

defineProps<{ availableScopes: AllowedScope[] }>();

const message = useMessage();

const audienceOptions: Array<{ value: ApplicationAudience; description: string }> = [
  { value: "internal", description: "仅组织内部使用，不对外发布。" },
  { value: "external", description: "面向所有用户开放授权。" },
  { value: "hybrid", description: "同时支持内部和外部使用场景。" },
];

const consentModeOptions = (["always", "first_authorization"] as ConsentMode[]).map((mode) => ({
  label: CONSENT_MODE_LABELS[mode],
  value: mode,
}));

const step = ref<1 | 2>(1);

// Step 1 - application info
const appName = ref("");
const appDescription = ref("");
const appLogoUrl = ref("");
const audience = ref<ApplicationAudience>("internal");
const ownerId = ref("");

// Step 2 - first client
const clientName = ref("");
const profile = ref<ClientProfile>("web_server");
const redirectUris = ref<string[]>([""]);
const logoutUri = ref("");
const selectedScopes = ref<string[]>(["openid"]);
const consentMode = ref<ConsentMode>("always");

// results
const creationResult = ref<ApplicationWithInitialClientResult | undefined>(undefined);

const isSubmitting = ref(false);
const submitError = ref("");

// field-level errors (kept next to the offending field; inputs are preserved)
const nameError = ref("");
const ownerError = ref("");
const clientNameError = ref("");
const redirectError = ref("");

const profileConfig = computed(() => getClientProfileConfig(profile.value));
const openidForced = computed(() => profileConfig.value.openidRequired);
const hasUserInteraction = computed(() => profile.value !== "server_to_server");

// openid is forced when required by the profile; unavailable for server-to-server;
// optional (admin's choice) when allowed but not required.
const effectiveScopes = computed(() => {
  if (openidForced.value) {
    return selectedScopes.value.includes("openid")
      ? selectedScopes.value
      : [...selectedScopes.value, "openid"];
  }
  if (profileConfig.value.openidAllowed) {
    return selectedScopes.value;
  }
  return selectedScopes.value.filter((scope) => scope !== "openid");
});

const scopeHint = computed(() => {
  if (openidForced.value) return "OpenID 在当前 Profile 下为必选项。";
  if (profileConfig.value.openidAllowed) return "OpenID 为可选项，按需勾选。";
  return "当前 Profile 为机器对机器通信，不支持 OpenID。";
});

function addRedirectUri(): void {
  redirectUris.value = [...redirectUris.value, ""];
}

function removeRedirectUri(index: number): void {
  redirectUris.value = redirectUris.value.filter((_, uriIndex) => uriIndex !== index);
}

function toggleScope(scope: string): void {
  selectedScopes.value = selectedScopes.value.includes(scope)
    ? selectedScopes.value.filter((storedScope) => storedScope !== scope)
    : [...selectedScopes.value, scope];
}

function scopeChecked(scopeOption: AllowedScope): boolean {
  const isOpenid = scopeOption.scope === "openid";
  if (isOpenid) {
    return openidForced.value
      || (profileConfig.value.openidAllowed && selectedScopes.value.includes("openid"));
  }
  return effectiveScopes.value.includes(scopeOption.scope);
}

function scopeDisabled(scopeOption: AllowedScope): boolean {
  const isOpenid = scopeOption.scope === "openid";
  return isOpenid ? openidForced.value || !profileConfig.value.openidAllowed : false;
}

function clearStepOneErrors(): void {
  nameError.value = "";
  ownerError.value = "";
}

function validateStepOne(): boolean {
  clearStepOneErrors();
  let valid = true;
  if (appName.value.trim().length < 2) {
    nameError.value = "应用名称至少需要 2 个字符。";
    valid = false;
  }
  if (ownerId.value.trim().length === 0) {
    ownerError.value = "请填写负责人 User ID。";
    valid = false;
  }
  return valid;
}

function handleStepOneSubmit(): void {
  submitError.value = "";
  if (!validateStepOne()) return;
  step.value = 2;
}

async function handleStepTwoSubmit(): Promise<void> {
  submitError.value = "";
  nameError.value = "";
  ownerError.value = "";
  clientNameError.value = "";
  redirectError.value = "";

  let valid = true;
  if (appName.value.trim().length < 2) {
    nameError.value = "应用名称至少需要 2 个字符。";
    valid = false;
  }
  if (ownerId.value.trim().length === 0) {
    ownerError.value = "请填写负责人 User ID。";
    valid = false;
  }
  if (clientName.value.trim().length < 2) {
    clientNameError.value = "客户端名称至少需要 2 个字符。";
    valid = false;
  }

  let validRedirectUris: string[] = [];
  if (hasUserInteraction.value) {
    validRedirectUris = redirectUris.value
      .map((uri) => uri.trim())
      .filter((uri) => uri.length > 0);
    if (validRedirectUris.length === 0) {
      redirectError.value = "至少需要填写一个 Redirect URI。";
      valid = false;
    }
  }

  if (!valid) return;

  isSubmitting.value = true;
  try {
    const result = await browserCommands.createApplicationWithInitialClient({
      application: {
        name: appName.value.trim(),
        description: appDescription.value.trim(),
        logoUrl: appLogoUrl.value.trim() || null,
        audience: audience.value,
        ownerId: ownerId.value.trim(),
      },
      initialClient: {
        name: clientName.value.trim(),
        profile: profile.value,
        redirectUris: validRedirectUris,
        logoutUri: hasUserInteraction.value ? logoutUri.value.trim() : "",
        allowedScopes: effectiveScopes.value,
        consentMode: hasUserInteraction.value ? consentMode.value : "always",
      },
    });
    creationResult.value = result;
    message.success("应用与客户端已创建。");
  } catch {
    submitError.value = "创建失败，请重试。";
  } finally {
    isSubmitting.value = false;
  }
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    message.success("已复制到剪贴板。");
  }).catch(() => {
    message.error("复制失败，请手动选择并复制。");
  });
}

function goToDetail(): void {
  if (creationResult.value) {
    void navigateTo(`/admin/applications/${creationResult.value.applicationId}`, { external: true });
  }
}

function backToList(): void {
  void navigateTo("/admin/applications", { external: true });
}
</script>

<template>
  <template v-if="creationResult">
    <AdminPageHeader
      eyebrow="OAuth 2.0 / OIDC"
      title="应用与客户端已创建"
      description="请安全保存以下凭据。Client Secret 仅在创建时展示一次。"
    />
    <div class="result-panel" data-testid="application-create-result">
      <div class="result-header">
        <span class="mock-badge">MOCK</span>
        <h2>创建结果</h2>
      </div>

      <div class="result-field">
        <span>Application ID</span>
        <code>{{ creationResult.applicationId }}</code>
      </div>

      <div class="result-field">
        <span>Client ID</span>
        <div class="credential-row">
          <code>{{ creationResult.clientId }}</code>
          <n-button quaternary size="small" aria-label="复制 Client ID" @click="copyToClipboard(creationResult.clientId)">
            复制
          </n-button>
        </div>
      </div>

      <template v-if="creationResult.clientSecret !== undefined">
        <div class="result-field">
          <span>Client Secret（仅此一次展示）</span>
          <div class="credential-row">
            <code data-testid="application-create-client-secret">{{ creationResult.clientSecret }}</code>
            <n-button
              quaternary
              size="small"
              aria-label="复制 Client Secret"
              @click="copyToClipboard(creationResult.clientSecret ?? '')"
            >
              复制
            </n-button>
          </div>
        </div>
        <div class="secret-warning">
          <strong>此密钥不会再次显示</strong>
          离开此页面后无法重新查看 Client Secret。请立即复制并安全存储。如需轮换密钥，请在应用详情页操作。
        </div>
      </template>
      <n-alert v-else type="info" :show-icon="false" class="notice-block">
        <strong>公共客户端不生成 Client Secret</strong>
        此应用使用 Authorization Code + PKCE 流程。客户端密钥不会存储或展示。
      </n-alert>

      <div class="result-actions">
        <n-button type="primary" @click="goToDetail">查看应用详情</n-button>
        <n-button @click="backToList">返回应用列表</n-button>
      </div>
    </div>
  </template>

  <template v-else-if="step === 1">
    <AdminPageHeader
      eyebrow="OAuth 2.0 / OIDC"
      title="注册 OAuth 应用"
      description="第一步：填写应用基本信息。创建后再配置首个客户端。"
    />

    <form class="create-form" @submit.prevent="handleStepOneSubmit">
      <div class="field-group">
        <label class="field-label" for="application-name">应用名称</label>
        <n-input
          id="application-name"
          v-model:value="appName"
          size="large"
          placeholder="例如 United Workspace"
          :maxlength="64"
          :status="nameError ? 'error' : undefined"
          @update:value="nameError = ''"
        />
        <small v-if="nameError" class="field-error">{{ nameError }}</small>
        <small v-else class="field-hint">用户在授权确认页看到的应用名称。</small>
      </div>

      <div class="field-group">
        <label class="field-label" for="application-description">应用说明</label>
        <n-input
          id="application-description"
          v-model:value="appDescription"
          type="textarea"
          placeholder="简要描述应用用途"
          :rows="3"
          :maxlength="280"
          show-count
        />
      </div>

      <div class="field-group">
        <label class="field-label" for="application-logo">应用 Logo（可选）</label>
        <n-input id="application-logo" v-model:value="appLogoUrl" placeholder="https://example.com/logo.png" />
        <small class="field-hint">授权确认页与授权应用列表展示；留空则使用统一门户默认 Logo。</small>
      </div>

      <div class="field-group">
        <span class="field-label">应用受众</span>
        <small class="field-hint">决定可用客户端配置与授权策略范围。</small>
        <n-radio-group v-model:value="audience" class="vertical-radio-group">
          <n-radio v-for="option in audienceOptions" :key="option.value" :value="option.value">
            {{ AUDIENCE_LABELS[option.value] }}
            <span class="field-hint inline-hint">{{ option.description }}</span>
          </n-radio>
        </n-radio-group>
      </div>

      <div class="field-group">
        <label class="field-label" for="application-owner">负责人 User ID</label>
        <n-input
          id="application-owner"
          v-model:value="ownerId"
          placeholder="例如 usr_01JUP8M8B4Q7R4T6PK1D"
          :status="ownerError ? 'error' : undefined"
          @update:value="ownerError = ''"
        />
        <small v-if="ownerError" class="field-error">{{ ownerError }}</small>
        <small v-else class="field-hint">应用管理责任人的稳定用户 ID，后端据此解析显示名称。</small>
      </div>

      <n-alert v-if="submitError" type="error" :show-icon="false" class="notice-block" role="alert">
        {{ submitError }}
      </n-alert>

      <div class="form-actions">
        <n-button attr-type="submit" type="primary" size="large">继续配置客户端</n-button>
        <NuxtLink to="/admin/applications" external>
          <n-button size="large">取消</n-button>
        </NuxtLink>
      </div>
    </form>
  </template>

  <template v-else>
    <AdminPageHeader
      eyebrow="OAuth 2.0 / OIDC"
      title="配置首个客户端"
      :description="`第二步：为应用「${appName}」创建第一个 OAuth 客户端。`"
    />

    <form class="create-form" @submit.prevent="handleStepTwoSubmit">
      <div class="field-group">
        <label class="field-label" for="client-name">客户端名称</label>
        <n-input
          id="client-name"
          v-model:value="clientName"
          size="large"
          placeholder="例如 Web 端"
          :maxlength="64"
          :status="clientNameError ? 'error' : undefined"
          @update:value="clientNameError = ''"
        />
        <small v-if="clientNameError" class="field-error">{{ clientNameError }}</small>
        <small v-else class="field-hint">用于在管理界面区分同一应用的多个客户端。</small>
      </div>

      <div class="field-group">
        <span class="field-label">客户端 Profile</span>
        <small class="field-hint">Profile 决定授权类型、令牌端点认证方式与是否生成密钥。</small>
        <n-radio-group v-model:value="profile" class="vertical-radio-group">
          <n-radio
            v-for="config in CLIENT_PROFILES"
            :key="config.profile"
            :value="config.profile"
            :disabled="Boolean(config.unsupportedReason)"
          >
            {{ config.label }}
            <span class="field-hint inline-hint">
              {{ config.unsupportedReason ? `${config.description}（${config.unsupportedReason}）` : config.description }}
            </span>
          </n-radio>
        </n-radio-group>
      </div>

      <div v-if="hasUserInteraction" class="field-group">
        <span class="field-label">Redirect URI</span>
        <small class="field-hint">至少填写一个。后端将按精确安全语义校验，前端不会静默归一化。</small>
        <div class="redirect-list">
          <div v-for="(uri, index) in redirectUris" :key="index" class="credential-row">
            <n-input
              :value="uri"
              placeholder="https://your-app.example/auth/callback"
              :aria-label="`Redirect URI ${index + 1}`"
              :status="redirectError ? 'error' : undefined"
              @update:value="(value: string) => { redirectUris[index] = value; redirectError = ''; }"
            />
            <n-button
              v-if="redirectUris.length > 1"
              quaternary
              aria-label="删除此 Redirect URI"
              @click="removeRedirectUri(index)"
            >
              −
            </n-button>
          </div>
        </div>
        <small v-if="redirectError" class="field-error">{{ redirectError }}</small>
        <n-button size="small" @click="addRedirectUri">＋ 添加 Redirect URI</n-button>
      </div>

      <div v-if="hasUserInteraction" class="field-group">
        <label class="field-label" for="client-logout">Logout URI（可选）</label>
        <n-input id="client-logout" v-model:value="logoutUri" placeholder="https://your-app.example/auth/logout" />
        <small class="field-hint">用户登出时的跳转地址。</small>
      </div>

      <div class="field-group">
        <span class="field-label">允许申请的 Scope</span>
        <small class="field-hint">{{ scopeHint }}</small>
        <div class="scope-list">
          <div v-for="scopeOption in availableScopes" :key="scopeOption.scope" class="scope-item">
            <n-checkbox
              :checked="scopeChecked(scopeOption)"
              :disabled="scopeDisabled(scopeOption)"
              :aria-label="scopeOption.label"
              @update:checked="toggleScope(scopeOption.scope)"
            >
              <div>
                <strong>{{ scopeOption.label }}</strong>
                <span
                  v-if="scopeOption.scope === 'openid'"
                  class="field-hint inline-hint"
                >{{ openidForced ? "（必选）" : profileConfig.openidAllowed ? "（可选）" : "" }}</span>
                <p><code>{{ scopeOption.scope }}</code> — {{ scopeOption.description }}</p>
              </div>
            </n-checkbox>
          </div>
        </div>
      </div>

      <div v-if="hasUserInteraction" class="field-group">
        <label class="field-label" for="client-consent">授权确认模式</label>
        <n-select id="client-consent" v-model:value="consentMode" :options="consentModeOptions" />
        <small class="field-hint">选择每次授权都确认，或仅首次授权确认。跳过确认模式将在后端实现信任策略后开放。</small>
      </div>

      <n-alert v-if="submitError" type="error" :show-icon="false" class="notice-block" role="alert">
        {{ submitError }}
      </n-alert>

      <div class="form-actions">
        <n-button attr-type="submit" type="primary" size="large" :loading="isSubmitting" :disabled="isSubmitting">
          创建客户端（Mock）
        </n-button>
        <n-button size="large" :disabled="isSubmitting" @click="step = 1">返回上一步</n-button>
        <NuxtLink to="/admin/applications" external>
          <n-button size="large">取消</n-button>
        </NuxtLink>
      </div>
    </form>
  </template>
</template>

<style scoped>
.result-panel {
  padding: 22px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.result-header h2 {
  margin: 0;
  color: var(--up-ink);
  font-size: 17px;
  font-weight: 680;
}

.mock-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--up-surface-muted);
  color: var(--up-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.result-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.result-field > span {
  color: var(--up-muted);
  font-size: 12px;
  font-weight: 620;
}

.result-field code {
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--up-surface-muted);
  color: var(--up-ink);
  font-size: 13px;
  word-break: break-all;
}

.credential-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.secret-warning {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(208, 48, 80, 0.08);
  color: var(--up-ink);
  font-size: 13px;
  line-height: 1.7;
}

.secret-warning strong { color: #d03050; }

.result-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 640px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.inline-hint { margin-left: 8px; }

.field-error {
  color: #d03050;
  font-size: 12px;
  line-height: 1.6;
}

.vertical-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.redirect-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scope-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scope-item p {
  margin: 2px 0 0;
  color: var(--up-muted);
  font-size: 12px;
}

.scope-item code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--up-surface-muted);
  font-size: 11px;
}

.notice-block { margin-top: 4px; }

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
