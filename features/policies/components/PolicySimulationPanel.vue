<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Policy simulation panel (evaluate sample attributes against the policy set)
-->

<script setup lang="ts">
// Vue port of the frozen `policy-simulation-panel.tsx`: fixed sample inputs
// (action / role / department) evaluated through the simulate seam; the
// result panel shows the decision badge, matched policy, reasons and time.
import { ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import AdminStatusBadge from "@/features/admin/components/AdminStatusBadge.vue";
import { formatSecurityDateTime } from "@/features/account/utils/date-time";
import type { PolicySimulationResult } from "@/features/policies/types";

const props = defineProps<{ policyId: string }>();

const message = useMessage();

const action = ref("application.manage");
const role = ref("application_admin");
const department = ref("identity_platform");
const simulating = ref(false);
const result = ref<PolicySimulationResult | null>(null);

async function handleSimulate(): Promise<void> {
  simulating.value = true;
  try {
    const simulationResult = await browserCommands.simulatePolicy(props.policyId, {
      principalAttributes: { role: role.value, department: department.value },
      resourceAttributes: {},
      action: action.value,
    });
    result.value = simulationResult;
  } catch {
    message.error("模拟失败，请重试。");
  } finally {
    simulating.value = false;
  }
}
</script>

<template>
  <div class="simulate-card">
    <h3>策略模拟</h3>
    <div class="simulate-form">
      <div class="field">
        <label class="field-label" for="simulate-action">操作</label>
        <n-input id="simulate-action" v-model:value="action" placeholder="例如：application.manage" />
      </div>
      <div class="field">
        <label class="field-label" for="simulate-role">Principal · role</label>
        <n-input id="simulate-role" v-model:value="role" placeholder="例如：application_admin" />
      </div>
      <div class="field">
        <label class="field-label" for="simulate-department">Principal · department</label>
        <n-input id="simulate-department" v-model:value="department" placeholder="例如：identity_platform" />
      </div>
      <div>
        <n-button type="primary" :loading="simulating" :disabled="simulating" @click="handleSimulate">
          模拟评估
        </n-button>
      </div>
    </div>

    <div v-if="result" class="simulate-result" data-testid="policy-simulation-result">
      <h4>
        决策：
        <AdminStatusBadge
          :label="result.decision === 'allow' ? '允许' : result.decision === 'deny' ? '拒绝' : '无匹配'"
          :tone="result.decision === 'allow' ? 'success' : 'danger'"
        />
      </h4>
      <p v-if="result.matchedPolicyName" class="matched-policy">
        匹配策略：{{ result.matchedPolicyName }}
      </p>
      <ul>
        <li v-for="(reason, index) in result.reasons" :key="index">{{ reason }}</li>
      </ul>
      <p class="evaluated-at">评估时间：{{ formatSecurityDateTime(result.evaluatedAt) }}</p>
    </div>
  </div>
</template>

<style scoped>
.simulate-card {
  padding: 20px;
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
}

.simulate-card h3 {
  margin: 0 0 16px;
  color: var(--up-ink-secondary);
  font-size: 14px;
  font-weight: 660;
}

.simulate-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  color: var(--up-ink);
  font-size: 13px;
  font-weight: 640;
}

.simulate-result { margin-top: 16px; }

.simulate-result h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--up-ink);
  font-size: 14px;
}

.matched-policy {
  margin: 4px 0 8px;
  color: var(--up-ink-secondary);
  font-size: 13px;
}

.simulate-result ul {
  margin: 8px 0;
  padding-left: 20px;
  color: var(--up-ink);
  font-size: 13px;
  line-height: 1.8;
}

.evaluated-at {
  margin: 8px 0 0;
  color: var(--up-muted);
  font-size: 12px;
}
</style>
