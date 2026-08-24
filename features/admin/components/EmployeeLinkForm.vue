<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Employee identity linking form (bind an existing unified account to an employee profile)
-->

<script setup lang="ts">
// Vue port of the frozen `employee-link-form.tsx`: link an employee profile
// onto an existing stable userId (never creates accounts). Field-level errors
// render next to the offending input, typed input is preserved on failure,
// and the submit button carries a pending state to block duplicate intents.
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { browserCommands } from "@/shared/commands/browser-commands";
import type {
  DepartmentRecord,
  EmployeeRecord,
  ManagedUser,
} from "@/features/admin/types";

const props = defineProps<{
  users: ManagedUser[];
  departments: DepartmentRecord[];
  supervisors: EmployeeRecord[];
  initialSearch: string;
}>();

const message = useMessage();

const userId = ref("");
const departmentId = ref("");
const title = ref("");
const supervisorUserId = ref("");
const submitting = ref(false);
const errors = ref<Record<string, string>>({});
const searchQuery = ref(props.initialSearch);

const eligibleUsers = computed(() => props.users.filter((user) => user.status === "active"));

const userOptions = computed(() => [
  { label: "请选择用户", value: "" },
  ...eligibleUsers.value.map((user) => ({
    label: `${user.displayName} · ${user.email} · ${user.userId}`,
    value: user.userId,
  })),
]);

const departmentOptions = computed(() => [
  { label: "请选择部门", value: "" },
  ...props.departments.map((department) => ({
    label: department.parentName
      ? `${department.name}（上级：${department.parentName}）`
      : department.name,
    value: department.departmentId,
  })),
]);

const supervisorOptions = computed(() => [
  { label: "不指定", value: "" },
  ...props.supervisors
    .filter((employee) => employee.status === "active" && employee.userId !== userId.value)
    .map((employee) => ({
      label: `${employee.displayName} · ${employee.employeeId}`,
      value: employee.userId,
    })),
]);

function handleSearch(): void {
  const query = searchQuery.value.trim();
  void navigateTo(`/admin/employees/link${query ? `?q=${encodeURIComponent(query)}` : ""}`, {
    external: true,
  });
}

async function handleSubmit(): Promise<void> {
  const nextErrors: Record<string, string> = {};
  if (!userId.value) nextErrors.userId = "请选择要关联的用户。";
  if (!departmentId.value) nextErrors.departmentId = "请选择部门。";
  if (!title.value.trim()) nextErrors.title = "请填写职位名称。";

  if (Object.keys(nextErrors).length > 0) {
    errors.value = nextErrors;
    return;
  }

  errors.value = {};
  submitting.value = true;
  try {
    await browserCommands.linkEmployeeProfile({
      userId: userId.value,
      departmentId: departmentId.value,
      title: title.value.trim(),
      supervisorUserId: supervisorUserId.value || undefined,
    });
    message.success("员工档案已关联。");
    void navigateTo(`/admin/employees/${userId.value}`, { external: true });
  } catch {
    message.error("关联失败，请重试。");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="link-page">
    <n-alert type="info" :show-icon="false" class="link-notice">
      <strong>关联原则</strong>
      员工档案关联到已有的统一账户。外部用户升级为员工时，相同的 userId 保持不变，
      消费者人格和功能保留。不会仅凭邮箱或域名自动合并账户。
    </n-alert>

    <form class="search-form" @submit.prevent="handleSearch">
      <label class="form-field">
        <span>搜索现有用户</span>
        <n-input
          v-model:value="searchQuery"
          placeholder="姓名、邮箱或稳定 userId"
        />
      </label>
      <div class="form-footer">
        <n-button attr-type="submit" secondary>搜索用户</n-button>
      </div>
    </form>

    <form class="link-form" method="post" @submit.prevent="handleSubmit">
      <label class="form-field">
        <span>用户 *</span>
        <n-select
          v-model:value="userId"
          :options="userOptions"
          aria-label="选择用户"
          :disabled="submitting"
          @update:value="delete errors.userId"
        />
        <small v-if="errors.userId" class="field-error">{{ errors.userId }}</small>
      </label>

      <label class="form-field">
        <span>部门 *</span>
        <n-select
          v-model:value="departmentId"
          :options="departmentOptions"
          aria-label="选择部门"
          :disabled="submitting"
          @update:value="delete errors.departmentId"
        />
        <small v-if="errors.departmentId" class="field-error">{{ errors.departmentId }}</small>
      </label>

      <label class="form-field">
        <span>职位 *</span>
        <n-input
          v-model:value="title"
          :maxlength="120"
          placeholder="例如：产品设计师"
          aria-label="职位名称"
          :disabled="submitting"
          @update:value="delete errors.title"
        />
        <small v-if="errors.title" class="field-error">{{ errors.title }}</small>
      </label>

      <label class="form-field">
        <span>主管（可选）</span>
        <n-select
          v-model:value="supervisorUserId"
          :options="supervisorOptions"
          aria-label="选择主管"
          :disabled="submitting"
        />
        <small class="field-hint">主管需为系统中已有关联员工档案的用户。</small>
      </label>

      <div class="form-footer">
        <n-button quaternary @click="navigateTo('/admin/employees', { external: true })">
          取消
        </n-button>
        <n-button
          attr-type="submit"
          type="primary"
          :loading="submitting"
          :disabled="submitting"
        >
          确认关联
        </n-button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.link-page { display: grid; gap: 20px; max-width: 640px; }

.link-notice { line-height: 1.7; font-size: 13px; }
.link-notice strong { margin-right: 8px; }

.search-form { display: grid; gap: 12px; }
.link-form { display: grid; gap: 16px; }

.form-field { display: grid; gap: 8px; }
.form-field > span { color: var(--up-ink-secondary); font-size: 12px; font-weight: 620; }

.field-error { color: var(--up-danger); font-size: 12px; line-height: 1.5; }
.field-hint { color: var(--up-muted); font-size: 12px; line-height: 1.5; }

.form-footer { display: flex; justify-content: flex-end; gap: 10px; padding-top: 4px; }
</style>
