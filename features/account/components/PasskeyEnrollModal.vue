<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Passkey enrollment modal (reauthentication -> WebAuthn ceremony)
//

import AccountReauthenticationForm from "@/features/account/components/AccountReauthenticationForm.vue";
import { browserCommands } from "@/shared/commands/browser-commands";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import {
  passkeyCredentialCreator,
  runPasskeyEnrollmentCeremony,
} from "@/features/account/utils/passkey-enrollment";
import { useMessage } from "naive-ui";

const emit = defineEmits<{
  cancel: [];
  success: [passkeyId: string];
}>();

const message = useMessage();
const reauthFormRef = ref<InstanceType<typeof AccountReauthenticationForm>>();

function handleCancel(): void {
  reauthFormRef.value?.abort();
  emit("cancel");
}

async function enroll(reauthToken: string, signal: AbortSignal): Promise<void> {
  const passkeyId = await runPasskeyEnrollmentCeremony({
    reauthToken,
    signal,
    commands: browserCommands,
    createCredential: passkeyCredentialCreator(USE_MOCK_DATA_SOURCE),
  });
  message.success("通行密钥已添加。");
  emit("success", passkeyId);
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    title="添加通行密钥"
    :mask-closable="false"
    :style="{ width: '480px', maxWidth: 'calc(100vw - 32px)' }"
    @update:show="(visible: boolean) => { if (!visible) handleCancel(); }"
  >
    <div class="profile-form">
      <div class="ceremony-copy">
        <p>使用设备生物识别或安全密钥注册通行密钥，实现抗钓鱼无密码登录。</p>
      </div>
      <AccountReauthenticationForm
        ref="reauthFormRef"
        action="account.passkey.enroll"
        target=""
        submit-label="验证并开始注册"
        :perform-granted="enroll"
        operation-error="通行密钥操作失败，请重新开始。此次授权不会被重复使用。"
        @cancel="handleCancel"
      />
    </div>
  </n-modal>
</template>

<style scoped>
.profile-form { display: grid; gap: 18px; padding-bottom: 16px; }

.ceremony-copy {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--up-line);
  border-radius: 11px;
  background: var(--up-surface-subtle);
}

.ceremony-copy p { margin: 0; color: var(--up-muted); font-size: 12px; line-height: 1.6; }
</style>
