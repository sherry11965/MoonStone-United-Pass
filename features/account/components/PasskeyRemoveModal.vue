<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Passkey removal modal (warning + target-bound reauthentication -> delete)
//

import AccountReauthenticationForm from "@/features/account/components/AccountReauthenticationForm.vue";
import { browserCommands } from "@/shared/commands/browser-commands";
import { isApiError } from "@/shared/api-error";
import { useMessage } from "naive-ui";

const props = defineProps<{ passkeyId: string }>();

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

async function remove(reauthToken: string, signal: AbortSignal): Promise<void> {
  try {
    await browserCommands.removePasskey(props.passkeyId, reauthToken, { signal });
  } catch (error) {
    if (isApiError(error) && error.kind === "not_found") {
      message.info("该通行密钥已不存在，正在刷新安全状态。");
      emit("success");
      return;
    }
    throw error;
  }
  message.success("通行密钥已删除。");
  emit("success");
}
</script>

<template>
  <n-modal
    :show="true"
    preset="card"
    title="删除通行密钥"
    :mask-closable="false"
    :style="{ width: '460px', maxWidth: 'calc(100vw - 32px)' }"
    @update:show="(visible: boolean) => { if (!visible) handleCancel(); }"
  >
    <n-alert type="warning" :show-icon="false" class="remove-warning">
      删除后，使用该通行密钥的无密码登录将不可用。
    </n-alert>
    <AccountReauthenticationForm
      ref="reauthFormRef"
      action="account.passkey.remove"
      :target="passkeyId"
      submit-label="验证并删除"
      :perform-granted="remove"
      operation-error="通行密钥操作失败，请重新开始。此次授权不会被重复使用。"
      destructive
      @cancel="handleCancel"
    />
  </n-modal>
</template>

<style scoped>
.remove-warning { margin-bottom: 18px; }
</style>
