<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Account overview panel — Vue port of account-overview.tsx
//

import { computed, onMounted, ref } from "vue";
import type { CurrentUser } from "@/shared/types/identity";
import type { ContactKind } from "@/features/account/utils/contact-validation";
import {
  AvatarValidationError,
  avatarDataUrlToJpegFile,
  sanitizeAvatarFile,
} from "@/features/account/utils/avatar-file";
import { browserCommands } from "@/shared/commands/browser-commands";
import { useMessage } from "naive-ui";
import AccountPageHeader from "@/features/account/components/AccountPageHeader.vue";
import AccountStatusBadge from "@/features/account/components/AccountStatusBadge.vue";
import ContactVerificationModal from "@/features/account/components/ContactVerificationModal.vue";

type EditableProfile = Pick<CurrentUser, "displayName" | "nickname"> & {
  avatarFileName?: string;
  avatarPreviewUrl?: string;
};

type ProfileErrors = {
  displayName?: string;
  avatarFile?: string;
};

type ContactDetails = Pick<CurrentUser, "email" | "phoneMasked">;

const props = defineProps<{ currentUser: CurrentUser }>();

const message = useMessage();

function getControlledAvatarUrl(avatarUrl: string | undefined): string | undefined {
  return avatarUrl?.startsWith("/api/v1/media/avatars/") ? avatarUrl : undefined;
}

function createInitialProfile(currentUser: CurrentUser): EditableProfile {
  return {
    displayName: currentUser.displayName,
    nickname: currentUser.nickname ?? "",
    avatarPreviewUrl: getControlledAvatarUrl(currentUser.avatarUrl),
  };
}

function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.startsWith("+86") && phoneNumber.length === 14) {
    return `+86 ${phoneNumber.slice(3, 6)} **** ${phoneNumber.slice(-4)}`;
  }

  return `${phoneNumber.slice(0, Math.max(3, phoneNumber.length - 8))} **** ${phoneNumber.slice(-4)}`;
}

const initialProfile = createInitialProfile(props.currentUser);
const profile = ref<EditableProfile>({ ...initialProfile });
const profileDraft = ref<EditableProfile>({ ...initialProfile });
const profileErrors = ref<ProfileErrors>({});
const contactDetails = ref<ContactDetails>({
  email: props.currentUser.email,
  phoneMasked: props.currentUser.phoneMasked,
});
const verificationKind = ref<ContactKind>();
const isEditorVisible = ref(false);
const isAvatarProcessing = ref(false);
const isSubmittingProfile = ref(false);
const avatarInputRef = ref<HTMLInputElement>();

// Non-reactive ceremony guards (mirrors the frozen useRef counters).
let avatarRequestId = 0;
let selectedFile: File | null = null;

const preferredName = computed(
  () => profile.value.nickname?.trim() || profile.value.displayName,
);

onMounted(() => {
  void (async () => {
    await Promise.resolve();
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/u, ""));
    const requestId = fragment.get("emailChangeRequestId") ?? "";
    const code = fragment.get("code") ?? "";
    if (!/^email_change_[0-9a-f]{32}$/u.test(requestId) || !code) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    try {
      const result = await browserCommands.verifyEmailChange(requestId, code);
      contactDetails.value = { ...contactDetails.value, email: result.email };
      message.success("邮箱验证成功，新邮箱现在可以用于登录。");
    } catch {
      message.error("邮箱验证链接无效、已失效或已使用。");
    }
  })();
});

function openProfileEditor(): void {
  profileDraft.value = { ...profile.value };
  profileErrors.value = {};
  isEditorVisible.value = true;
}

function closeProfileEditor(): void {
  avatarRequestId += 1;
  isAvatarProcessing.value = false;
  isEditorVisible.value = false;
  profileErrors.value = {};
  selectedFile = null;
}

async function handleAvatarSelection(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  const requestId = avatarRequestId + 1;
  avatarRequestId = requestId;
  isAvatarProcessing.value = true;
  selectedFile = file;
  profileErrors.value = { ...profileErrors.value, avatarFile: undefined };

  try {
    const sanitizedAvatar = await sanitizeAvatarFile(file);
    if (avatarRequestId !== requestId) return;
    profileDraft.value = {
      ...profileDraft.value,
      avatarFileName: sanitizedAvatar.fileName,
      avatarPreviewUrl: sanitizedAvatar.previewDataUrl,
    };
  } catch (error) {
    if (avatarRequestId !== requestId) return;
    profileErrors.value = {
      ...profileErrors.value,
      avatarFile: error instanceof AvatarValidationError ? error.message : "头像处理失败，请选择其他图片。",
    };
  } finally {
    if (avatarRequestId === requestId) isAvatarProcessing.value = false;
  }
}

function clearDraftAvatar(): void {
  avatarRequestId += 1;
  isAvatarProcessing.value = false;
  selectedFile = null;
  profileDraft.value = {
    ...profileDraft.value,
    avatarFileName: undefined,
    avatarPreviewUrl: undefined,
  };
  profileErrors.value = { ...profileErrors.value, avatarFile: undefined };
}

async function handleProfileSubmit(): Promise<void> {
  const normalizedDisplayName = profileDraft.value.displayName.trim();
  const normalizedNickname = profileDraft.value.nickname?.trim();
  const nextErrors: ProfileErrors = {};

  if (!normalizedDisplayName) {
    nextErrors.displayName = "显示名称不能为空。";
  }
  if (isAvatarProcessing.value) nextErrors.avatarFile = "头像仍在处理中，请稍候。";
  if (Object.keys(nextErrors).length > 0) {
    profileErrors.value = nextErrors;
    return;
  }

  isSubmittingProfile.value = true;
  try {
    await browserCommands.updateProfile({
      displayName: normalizedDisplayName,
      ...(normalizedNickname !== undefined && { nickname: normalizedNickname }),
    });
    let avatarUrl = profileDraft.value.avatarPreviewUrl;
    if (selectedFile && profileDraft.value.avatarPreviewUrl?.startsWith("data:")) {
      try {
        const jpegFile = await avatarDataUrlToJpegFile(profileDraft.value.avatarPreviewUrl);
        const uploadResult = await browserCommands.uploadAvatar(jpegFile);
        avatarUrl = uploadResult.avatarUrl;
      } catch {
        message.warning("头像上传失败，资料已更新但头像未变更。");
      }
    }
    profile.value = {
      displayName: normalizedDisplayName,
      nickname: normalizedNickname,
      avatarFileName: profileDraft.value.avatarFileName,
      avatarPreviewUrl: avatarUrl,
    };
    selectedFile = null;
    profileErrors.value = {};
    isEditorVisible.value = false;
    message.success("资料已更新。");
  } catch {
    message.error("资料更新失败，请稍后重试。");
  } finally {
    isSubmittingProfile.value = false;
  }
}

function handleContactVerified(nextValue: string): void {
  if (verificationKind.value === "email") {
    contactDetails.value = { ...contactDetails.value, email: nextValue };
    message.success("邮箱已更新。");
  } else if (verificationKind.value === "phone") {
    contactDetails.value = { ...contactDetails.value, phoneMasked: maskPhoneNumber(nextValue) };
    message.success("手机号已更新。");
  }

  verificationKind.value = undefined;
}
</script>

<template>
  <div>
    <AccountPageHeader
      eyebrow="My identity"
      :title="`你好，${preferredName}`"
      description="查看统一账户资料，以及与该账户关联的用户和员工身份。"
    >
      <template #action>
        <n-button type="primary" data-testid="open-profile-editor" @click="openProfileEditor">
          编辑资料
        </n-button>
      </template>
    </AccountPageHeader>

    <div class="overview-grid">
      <section class="hero-card">
        <div
          class="avatar"
          :class="profile.avatarPreviewUrl ? 'avatar-with-image' : ''"
          :style="profile.avatarPreviewUrl ? { backgroundImage: `url(${profile.avatarPreviewUrl})` } : undefined"
          role="img"
          :aria-label="`${profile.displayName}的头像`"
        >
          <svg
            v-if="!profile.avatarPreviewUrl"
            width="42%"
            height="42%"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5" />
          </svg>
        </div>
        <div class="hero-copy">
          <span class="label">统一账户</span>
          <h2>{{ profile.displayName }}</h2>
          <p>{{ profile.nickname ? `${profile.nickname} · ${contactDetails.email}` : contactDetails.email }}</p>
          <div class="badges">
            <AccountStatusBadge label="外部用户能力" tone="info" />
            <AccountStatusBadge v-if="currentUser.employeeProfile" label="员工档案已关联" tone="success" />
          </div>
        </div>
        <div class="stable-id">
          <span>稳定用户 ID</span>
          <code>{{ currentUser.userId }}</code>
        </div>
      </section>

      <section class="card">
        <div class="card-heading">
          <div>
            <span class="label">ACCOUNT DETAILS</span>
            <h2>基本资料</h2>
          </div>
          <AccountStatusBadge label="已验证" tone="success" />
        </div>
        <dl class="detail-list">
          <div><dt>显示名称</dt><dd>{{ profile.displayName }}</dd></div>
          <div><dt>昵称</dt><dd>{{ profile.nickname || "未设置" }}</dd></div>
          <div><dt>头像文件</dt><dd>{{ profile.avatarFileName || (profile.avatarPreviewUrl ? "已设置" : "未上传") }}</dd></div>
          <div>
            <dt>邮箱地址</dt>
            <dd class="contact-value">
              <span>{{ contactDetails.email }}</span>
              <n-button size="small" quaternary type="primary" @click="verificationKind = 'email'">修改邮箱</n-button>
            </dd>
          </div>
          <div>
            <dt>手机号码</dt>
            <dd class="contact-value">
              <span>{{ contactDetails.phoneMasked || "未绑定" }}</span>
              <n-button size="small" quaternary type="primary" @click="verificationKind = 'phone'">
                {{ contactDetails.phoneMasked ? "修改手机号" : "绑定手机号" }}
              </n-button>
            </dd>
          </div>
        </dl>
      </section>

      <section class="card">
        <div class="card-heading">
          <div>
            <span class="label">EMPLOYEE PERSONA</span>
            <h2>员工档案</h2>
          </div>
          <AccountStatusBadge
            :label="currentUser.employeeProfile ? '在职' : '未关联'"
            :tone="currentUser.employeeProfile ? 'success' : 'neutral'"
          />
        </div>
        <dl v-if="currentUser.employeeProfile" class="detail-list">
          <div><dt>员工编号</dt><dd>{{ currentUser.employeeProfile.employeeId }}</dd></div>
          <div><dt>所属部门</dt><dd>{{ currentUser.employeeProfile.departmentName }}</dd></div>
          <div><dt>职位</dt><dd>{{ currentUser.employeeProfile.title }}</dd></div>
        </dl>
        <p v-else class="empty-text">此账户目前没有员工档案，但仍可使用普通用户能力。</p>
      </section>
    </div>

    <n-modal
      v-model:show="isEditorVisible"
      preset="card"
      title="编辑基本资料"
      :mask-closable="false"
      :style="{ width: '520px', maxWidth: 'calc(100vw - 32px)' }"
      @update:show="(visible: boolean) => { if (!visible) closeProfileEditor(); }"
    >
      <form class="profile-form" method="post" @submit.prevent="handleProfileSubmit">
        <div class="profile-preview">
          <div
            class="avatar"
            :class="profileDraft.avatarPreviewUrl ? 'avatar-with-image' : ''"
            :style="profileDraft.avatarPreviewUrl ? { backgroundImage: `url(${profileDraft.avatarPreviewUrl})` } : undefined"
            aria-hidden="true"
          >
            <svg
              v-if="!profileDraft.avatarPreviewUrl"
              width="42%"
              height="42%"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5" />
            </svg>
          </div>
          <div>
            <strong>{{ profileDraft.displayName.trim() || "显示名称" }}</strong>
            <span>{{ profileDraft.nickname?.trim() || "尚未设置昵称" }}</span>
          </div>
        </div>

        <label class="profile-field" for="profile-display-name">
          <span>显示名称</span>
          <n-input
            id="profile-display-name"
            :value="profileDraft.displayName"
            :status="profileErrors.displayName ? 'error' : undefined"
            :maxlength="80"
            data-testid="profile-display-name"
            @update:value="(value: string) => { profileDraft = { ...profileDraft, displayName: value }; profileErrors = { ...profileErrors, displayName: undefined }; }"
          />
          <small v-if="profileErrors.displayName" id="profile-display-name-error" class="profile-error" role="alert">
            {{ profileErrors.displayName }}
          </small>
        </label>

        <label class="profile-field" for="profile-nickname">
          <span>昵称（可选）</span>
          <n-input
            id="profile-nickname"
            :value="profileDraft.nickname ?? ''"
            placeholder="希望其他用户看到的称呼"
            :maxlength="40"
            data-testid="profile-nickname"
            @update:value="(value: string) => { profileDraft = { ...profileDraft, nickname: value }; }"
          />
        </label>

        <div class="profile-field">
          <span>头像图片（可选）</span>
          <input
            ref="avatarInputRef"
            class="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-hidden="true"
            tabindex="-1"
            data-testid="avatar-file-input"
            @change="handleAvatarSelection"
          >
          <div class="avatar-upload-actions">
            <n-button :loading="isAvatarProcessing" @click="avatarInputRef?.click()">
              {{ profileDraft.avatarPreviewUrl ? "更换头像" : "选择头像" }}
            </n-button>
            <n-button
              v-if="profileDraft.avatarPreviewUrl"
              quaternary
              type="error"
              @click="clearDraftAvatar"
            >
              移除
            </n-button>
          </div>
          <small :class="profileErrors.avatarFile ? 'profile-error' : undefined" :role="profileErrors.avatarFile ? 'alert' : undefined">
            {{ profileErrors.avatarFile ?? (profileDraft.avatarFileName
              ? `已安全处理：${profileDraft.avatarFileName}`
              : "仅限 PNG、JPEG、WebP；最大 2 MiB。文件通过校验后会重新编码，不会加载外部链接或上传原文件。") }}
          </small>
        </div>

        <p class="profile-notice">邮箱和手机号码属于安全联系方式，请返回基本资料卡片通过独立验证流程修改。</p>

        <div class="profile-actions">
          <n-button :disabled="isSubmittingProfile" @click="closeProfileEditor">取消</n-button>
          <n-button
            attr-type="submit"
            type="primary"
            :disabled="isAvatarProcessing || isSubmittingProfile"
            :loading="isSubmittingProfile"
            data-testid="profile-submit"
          >
            保存修改
          </n-button>
        </div>
      </form>
    </n-modal>

    <ContactVerificationModal
      v-if="verificationKind"
      :key="verificationKind"
      :kind="verificationKind"
      :current-value="verificationKind === 'email' ? contactDetails.email : contactDetails.phoneMasked"
      @cancel="verificationKind = undefined"
      @verified="handleContactVerified"
    />
  </div>
</template>

<style scoped>
.overview-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }

.hero-card,
.card {
  border: 1px solid var(--up-line);
  border-radius: var(--up-radius-md);
  background: var(--up-surface);
  box-shadow: var(--up-card-shadow);
}

.hero-card {
  position: relative;
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  gap: 18px;
  overflow: hidden;
  padding: 30px;
}

.avatar {
  display: grid;
  width: 70px;
  height: 70px;
  flex: none;
  place-items: center;
  border-radius: 21px;
  color: white;
  background: linear-gradient(145deg, var(--up-brand-gradient-start), var(--up-brand-gradient-end));
  font-size: 26px;
  font-weight: 700;
  box-shadow: 0 12px 28px rgb(36 87 214 / 22%);
}

.avatar svg { width: 44%; height: 44%; opacity: 0.92; }

.avatar-with-image {
  background-color: var(--up-brand-soft);
  background-position: center;
  background-size: cover;
}

.hero-copy { min-width: 0; }
.label { color: var(--up-muted-soft); font-size: 12px; font-weight: 750; letter-spacing: 0.13em; }
.hero-copy h2 { margin: 4px 0 2px; font-size: 23px; }
.hero-copy p { margin: 0; color: var(--up-muted); font-size: 13px; }
.badges { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }

.stable-id {
  position: relative;
  z-index: 1;
  min-width: 240px;
  margin-left: auto;
  padding: 14px 16px;
  border: 1px solid var(--up-glass-line);
  border-radius: 11px;
  background: var(--up-glass-subtle);
  backdrop-filter: blur(8px);
}

.stable-id span,
.stable-id code { display: block; }
.stable-id span { color: var(--up-muted); font-size: 12px; }
.stable-id code { overflow: hidden; margin-top: 4px; color: var(--up-ink-secondary); font-size: 12px; text-overflow: ellipsis; }

.card { padding: 26px; }

.card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
.card-heading h2 { margin: 4px 0 0; font-size: 17px; }

.detail-list { display: grid; gap: 0; margin: 0; }
.detail-list > div { display: grid; grid-template-columns: 110px 1fr; gap: 14px; padding: 13px 0; border-top: 1px solid var(--up-line-soft); }
.detail-list dt { color: var(--up-muted); font-size: 12px; }
.detail-list dd { margin: 0; font-size: 13px; font-weight: 560; }
.contact-value { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.contact-value span { min-width: 0; overflow-wrap: anywhere; }
.empty-text { color: var(--up-muted); font-size: 13px; line-height: 1.7; }

.profile-form { display: grid; gap: 18px; padding-bottom: 16px; }

.profile-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-subtle);
}

.profile-preview .avatar { width: 54px; height: 54px; border-radius: 16px; font-size: 20px; }
.profile-preview strong,
.profile-preview span { display: block; }
.profile-preview strong { font-size: 14px; }
.profile-preview span { margin-top: 3px; color: var(--up-muted); font-size: 11px; }

.profile-field { display: grid; gap: 8px; }
.profile-field > span { color: var(--up-ink-secondary); font-size: 12px; font-weight: 620; }
.profile-field > small { color: var(--up-muted-soft); font-size: 12px; line-height: 1.55; }
.profile-field > .profile-error { color: var(--up-danger); }
.profile-error { color: var(--up-danger); font-size: 12px; }

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.avatar-upload-actions { display: flex; flex-wrap: wrap; gap: 8px; }

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

@media (max-width: 760px) {
  .overview-grid { grid-template-columns: 1fr; gap: 14px; }
  .hero-card { align-items: flex-start; flex-wrap: wrap; gap: 14px; padding: 22px 18px; }
  .avatar { width: 58px; height: 58px; border-radius: 16px; font-size: 22px; }
  .hero-copy h2 { font-size: 20px; }
  .badges { margin-top: 11px; }
  .stable-id { width: 100%; min-width: 0; margin-left: 0; }
  .card { padding: 20px 16px; }
  .detail-list > div { grid-template-columns: 1fr; gap: 6px; }
  .contact-value { align-items: flex-start; }
}
</style>
