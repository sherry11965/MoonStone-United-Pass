<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Employee offboarding danger zone (step-up `employee.offboard` bound to the userId)
-->

<script setup lang="ts">
// Vue port of the frozen `employee-detail.tsx` DangerTab: offboarding is the
// only high-risk workforce action and requires step-up; the grant is bound
// to `employee.offboard` + the stable userId. An employee already in
// offboarding shows the read-only notice instead of the action row.
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import AdminReauthenticationModal from "@/features/admin/components/AdminReauthenticationModal.vue";
import type { EmployeeDetail } from "@/features/admin/types";

const props = defineProps<{ detail: EmployeeDetail }>();

const route = useRoute();
const message = useMessage();
const offboarding = ref(false);
const reauthVisible = ref(false);

async function handleOffboard(reauthToken: string, signal: AbortSignal): Promise<void> {
  offboarding.value = true;
  try {
    await browserCommands.offboardEmployee(props.detail.userId, reauthToken, { signal });
    message.success("离职流程已启动；管理访问已立即拒绝，会话撤销正在收敛。");
  } finally {
    offboarding.value = false;
  }
  void navigateTo(route.fullPath, { external: true });
}
</script>

<template>
  <div v-if="detail.status === 'offboarding'" class="danger-zone">
    <n-alert type="warning" :show-icon="false" class="danger-notice">
      <strong>离职处理中</strong>
      该员工的离职流程已启动。管理端访问已撤销，消费者人格保留。
    </n-alert>
  </div>

  <div v-else class="danger-zone">
    <n-alert type="warning" :show-icon="false" class="danger-notice">
      <strong>危险操作</strong>
      离职将撤销该员工的管理端访问和活跃会话。消费者人格不受影响。操作不可逆。
    </n-alert>

    <div class="danger-item">
      <div>
        <strong>启动离职流程</strong>
        <p>撤销管理端访问、终止活跃会话。消费者人格和功能保留不变。</p>
      </div>
      <n-button type="error" :loading="offboarding" @click="reauthVisible = true">
        确认离职
      </n-button>
    </div>

    <AdminReauthenticationModal
      :show="reauthVisible"
      title="重新认证并启动离职"
      action="employee.offboard"
      :target="detail.userId"
      submit-label="验证并启动离职"
      operation-error="离职操作未完成；此次单次授权不会被重复使用，请重新验证后再试。"
      destructive
      :perform-granted="handleOffboard"
      @update:show="(value) => { if (!value) reauthVisible = false; }"
    >
      <div class="reauth-bound-notice">
        <p>离职会立即拒绝管理端访问并启动全部会话撤销。</p>
        <p>消费者人格和 OAuth 授权不会被删除。本次授权仅绑定到 {{ detail.userId }}。</p>
      </div>
    </AdminReauthenticationModal>
  </div>
</template>

<style scoped>
.danger-zone { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }

.danger-notice { line-height: 1.7; font-size: 13px; }
.danger-notice strong { margin-right: 8px; }

.danger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-muted);
}

.danger-item strong {
  color: var(--up-ink);
  font-size: 14px;
  font-weight: 640;
}

.danger-item p {
  margin: 4px 0 0;
  color: var(--up-muted);
  font-size: 12px;
  line-height: 1.6;
}

.reauth-bound-notice p {
  margin: 0 0 10px;
  color: var(--up-ink-secondary);
  font-size: 13px;
  line-height: 1.7;
}
</style>
