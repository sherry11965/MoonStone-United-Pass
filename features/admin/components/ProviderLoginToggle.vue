<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Provider login toggle (step-up enable/disable bound to the providerId)
-->

<script setup lang="ts">
// Vue port of the frozen `provider-detail.tsx` login toggle: enabling or
// disabling provider login requires step-up; the grant is bound to
// `provider.enable` / `provider.disable` + the providerId. Enabling is only
// offered when the App Secret is already configured (legacy parity).
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import AdminReauthenticationModal from "@/features/admin/components/AdminReauthenticationModal.vue";
import type { ProviderDetail } from "@/features/admin/types";

const props = defineProps<{ detail: ProviderDetail }>();

const route = useRoute();
const message = useMessage();
const providerAction = ref<"enable" | "disable" | null>(null);

async function updateProviderLogin(reauthToken: string, signal: AbortSignal): Promise<void> {
  if (providerAction.value === null) return;
  const enabled = providerAction.value === "enable";
  await browserCommands.updateProviderLogin(props.detail.providerId, enabled, reauthToken, { signal });
  message.success(enabled ? "飞书登录已启用。" : "飞书登录已停用。");
  void navigateTo(route.fullPath, { external: true });
}
</script>

<template>
  <n-button
    size="small"
    secondary
    :type="detail.loginEnabled ? 'error' : 'primary'"
    :disabled="!detail.loginEnabled && !detail.secretConfigured"
    @click="providerAction = detail.loginEnabled ? 'disable' : 'enable'"
  >
    {{ detail.loginEnabled ? "停用登录" : "启用登录" }}
  </n-button>

  <AdminReauthenticationModal
    :show="providerAction !== null"
    :title="providerAction === 'enable' ? '重新认证并启用飞书登录' : '重新认证并停用飞书登录'"
    :action="providerAction === 'enable' ? 'provider.enable' : 'provider.disable'"
    :target="detail.providerId"
    :submit-label="providerAction === 'enable' ? '验证并启用' : '验证并停用'"
    operation-error="Provider 状态未变更；此次单次授权不会被重复使用，请重新验证后再试。"
    :destructive="providerAction === 'disable'"
    :perform-granted="updateProviderLogin"
    @update:show="(value) => { if (!value) providerAction = null; }"
  >
    <p class="reauth-bound-notice">本次单次授权仅绑定到 Provider {{ detail.providerId }}。</p>
  </AdminReauthenticationModal>
</template>

<style scoped>
.reauth-bound-notice {
  margin: 0 0 16px;
  color: var(--up-ink-secondary);
  font-size: 13px;
  line-height: 1.7;
}
</style>
