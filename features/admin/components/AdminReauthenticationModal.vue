<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin step-up ceremony modal (title + target-bound notice + reauthentication form)
-->

<script setup lang="ts">
import type { AdminReauthenticationAction } from "@/features/account/types";
import AdminReauthenticationForm from "@/features/admin/components/AdminReauthenticationForm.vue";

/**
 * Shared step-up dialog for admin write operations. Mirrors the legacy
 * Semi `Modal` + `AccountReauthenticationForm` pair: the modal cannot be
 * dismissed by mask click while a ceremony runs, and closing it aborts the
 * in-flight grant exchange / protected mutation. After `performGranted`
 * resolves the modal closes itself; on failure the form surfaces
 * `operationError` and stays open so the ceremony can be retried.
 */
const props = withDefaults(
  defineProps<{
    show: boolean;
    title: string;
    action: AdminReauthenticationAction;
    target: string;
    submitLabel: string;
    operationError: string;
    destructive?: boolean;
    performGranted: (reauthToken: string, signal: AbortSignal) => Promise<void>;
  }>(),
  { destructive: false },
);

const emit = defineEmits<{ "update:show": [value: boolean] }>();

const formRef = ref<InstanceType<typeof AdminReauthenticationForm> | null>(null);

function close(): void {
  emit("update:show", false);
}

function handleCancel(): void {
  formRef.value?.abort();
  close();
}

async function handleGranted(reauthToken: string, signal: AbortSignal): Promise<void> {
  await props.performGranted(reauthToken, signal);
  close();
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    :title="title"
    style="width: min(480px, 92vw)"
    :mask-closable="false"
    :auto-focus="false"
    @update:show="(value: boolean) => { if (!value) handleCancel(); }"
  >
    <slot />
    <AdminReauthenticationForm
      v-if="show"
      ref="formRef"
      :action="action"
      :target="target"
      :submit-label="submitLabel"
      :operation-error="operationError"
      :destructive="destructive"
      :perform-granted="handleGranted"
      @cancel="handleCancel"
    />
  </n-modal>
</template>
