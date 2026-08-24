<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Employee profile edit modal (department / title / supervisor; no step-up required)
-->

<script setup lang="ts">
// Vue port of the frozen `employee-detail.tsx` ProfileTab edit ceremony:
// `updateEmployeeProfile` is a plain mutation (not on the 8 high-risk
// actions); the modal keeps the typed input on failure and surfaces the
// backend rejection message inline via a toast.
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import type {
  DepartmentRecord,
  EmployeeDetail,
  EmployeeRecord,
} from "@/features/admin/types";

const props = defineProps<{
  detail: EmployeeDetail;
  departments: DepartmentRecord[];
  supervisors: EmployeeRecord[];
}>();

const route = useRoute();
const message = useMessage();

const editing = ref(false);
const submitting = ref(false);
const departmentId = ref(props.detail.departmentId);
const title = ref(props.detail.title);
const supervisorUserId = ref(props.detail.supervisorUserId ?? "");

const departmentOptions = computed(() =>
  props.departments.map((department) => ({
    label: department.name,
    value: department.departmentId,
  })),
);

const supervisorOptions = computed(() => [
  { label: "不指定", value: "" },
  ...props.supervisors
    .filter((employee) => employee.status === "active" && employee.userId !== props.detail.userId)
    .map((employee) => ({
      label: `${employee.displayName} · ${employee.employeeId}`,
      value: employee.userId,
    })),
]);

function openEditor(): void {
  // Re-seed from the latest server snapshot every time the editor opens.
  departmentId.value = props.detail.departmentId;
  title.value = props.detail.title;
  supervisorUserId.value = props.detail.supervisorUserId ?? "";
  editing.value = true;
}

async function handleSubmit(): Promise<void> {
  if (!departmentId.value || !title.value.trim() || submitting.value) return;
  submitting.value = true;
  try {
    await browserCommands.updateEmployeeProfile(props.detail.userId, {
      departmentId: departmentId.value,
      title: title.value.trim(),
      supervisorUserId: supervisorUserId.value || undefined,
    });
    message.success("员工档案已更新。");
    editing.value = false;
    void navigateTo(route.fullPath, { external: true });
  } catch {
    message.error("更新失败，请检查部门与主管状态后重试。");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="editor">
    <div class="editor-actions">
      <n-button type="primary" @click="openEditor">编辑员工档案</n-button>
    </div>

    <n-modal
      :show="editing"
      preset="card"
      title="编辑员工档案"
      style="width: min(480px, 92vw)"
      :mask-closable="false"
      :auto-focus="false"
      @update:show="(value: boolean) => { if (!value && !submitting) editing = false; }"
    >
      <form class="link-form" method="post" @submit.prevent="handleSubmit">
        <label class="form-field">
          <span>部门 *</span>
          <n-select v-model:value="departmentId" :options="departmentOptions" aria-label="选择部门" />
        </label>
        <label class="form-field">
          <span>职位 *</span>
          <n-input v-model:value="title" :maxlength="120" aria-label="职位名称" />
        </label>
        <label class="form-field">
          <span>主管</span>
          <n-select v-model:value="supervisorUserId" :options="supervisorOptions" aria-label="选择主管" />
        </label>
        <div class="form-footer">
          <n-button :disabled="submitting" @click="editing = false">取消</n-button>
          <n-button attr-type="submit" type="primary" :loading="submitting" :disabled="submitting">
            保存
          </n-button>
        </div>
      </form>
    </n-modal>
  </div>
</template>

<style scoped>
.editor-actions { margin-bottom: 16px; }

.link-form { display: grid; gap: 16px; }
.form-field { display: grid; gap: 8px; }
.form-field > span { color: var(--up-ink-secondary); font-size: 12px; font-weight: 620; }
.form-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
</style>
