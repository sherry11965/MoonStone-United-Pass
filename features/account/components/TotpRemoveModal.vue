<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: TOTP removal modal (warning + reauthentication -> delete)
//

import AccountReauthenticationForm from "@/features/account/components/AccountReauthenticationForm.vue";
import { browserCommands } from "@/shared/commands/browser-commands";
import { useMessage } from "naive-ui";

const emit = defineEmits<{
  cancel: [];
  success: [];
}>();

const message = useMessage();
const reauthFormRef = ref<InstanceType<typeof AccountReauthenticationForm>>();

function handleCancel(): void {
  reauthFormRef.value?.abort();
  emit("cancel");
}

async function handleRemove(reauthToken: string, signal: AbortSignal): Promise<void> {
  await browserCommands.removeTotp(reauthToken, { signal });
  message.success("身份验证器已删除。");
  emit("success");
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    title="删除身份验证器"
    :mask-closable="false"
    :style="{ width: '460px', maxWidth: 'calc(100vw - 32px)' }"
    @update:show="(visible: boolean) => { if (!visible) handleCancel(); }"
  >
    <n-alert type="warning" :show-icon="false" class="remove-warning">
      删除后，依赖动态验证码的二次验证将不可用。如果你没有其他验证方式，可能无法登录。
    </n-alert>
    <AccountReauthenticationForm
      ref="reauthFormRef"
      action="account.totp.remove"
      target=""
      submit-label="验证并删除"
      :perform-granted="handleRemove"
      operation-error="删除身份验证器失败，请重新开始。此次授权不会被重复使用。"
      destructive
      @cancel="handleCancel"
    />
  </n-modal>
</template>

<style scoped>
.remove-warning { margin-bottom: 18px; }
</style>
