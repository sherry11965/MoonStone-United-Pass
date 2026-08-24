<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules } from "naive-ui";
import type { ColorTheme } from "@/shared/theme";

useHead({ title: "United Pass · Naive UI SSR Spike" });

const colorTheme = inject<Ref<ColorTheme>>("colorTheme");
const setColorTheme = inject<(theme: ColorTheme) => void>("setColorTheme");

function toggleTheme(): void {
  setColorTheme?.(colorTheme?.value === "dark" ? "light" : "dark");
}

// --- n-form ---------------------------------------------------------------
const formRef = ref<FormInst | null>(null);
const formModel = ref({ name: "", channel: "" });
const formRules: FormRules = {
  name: [{ required: true, message: "请输入名称", trigger: "blur" }],
  channel: [{ required: true, message: "请选择渠道", trigger: "change" }],
};
const formSubmitted = ref(false);
function submitForm(): void {
  formSubmitted.value = true;
}

// --- n-data-table ---------------------------------------------------------
type SpikeRow = { key: string; component: string; ssr: string };
const tableColumns: DataTableColumns<SpikeRow> = [
  { title: "组件", key: "component" },
  { title: "SSR 状态", key: "ssr" },
];
const tableData: SpikeRow[] = [
  { key: "1", component: "n-form", ssr: "已验证" },
  { key: "2", component: "n-data-table", ssr: "已验证" },
  { key: "3", component: "n-modal", ssr: "已验证" },
];

// --- n-modal --------------------------------------------------------------
const showModal = ref(false);
</script>

<template>
  <main class="spike" data-testid="spike-page">
    <n-space vertical size="large">
      <n-space justify="space-between" align="center">
        <n-h1 prefix="bar">Naive UI SSR 验证页</n-h1>
        <n-button data-testid="theme-toggle" @click="toggleTheme">
          切换主题（当前：{{ colorTheme === "dark" ? "暗色" : "亮色" }}）
        </n-button>
      </n-space>

      <n-card title="表单（n-form）" data-testid="spike-form-card">
        <n-form ref="formRef" :model="formModel" :rules="formRules" label-placement="left">
          <n-form-item label="名称" path="name">
            <n-input v-model:value="formModel.name" placeholder="请输入名称" data-testid="spike-name-input" />
          </n-form-item>
          <n-form-item label="渠道" path="channel">
            <n-select
              v-model:value="formModel.channel"
              placeholder="请选择渠道"
              :options="[
                { label: '内部应用', value: 'internal' },
                { label: '外部应用', value: 'external' },
              ]"
            />
          </n-form-item>
          <n-button type="primary" data-testid="spike-submit" @click="submitForm">
            提交
          </n-button>
          <n-text v-if="formSubmitted" depth="3" data-testid="spike-submit-echo">
            已提交（spike 仅验证渲染，不发送请求）
          </n-text>
        </n-form>
      </n-card>

      <n-card title="数据表格（n-data-table）" data-testid="spike-table-card">
        <n-data-table :columns="tableColumns" :data="tableData" :bordered="false" />
      </n-card>

      <n-card title="模态框（n-modal）" data-testid="spike-modal-card">
        <n-button data-testid="spike-open-modal" @click="showModal = true">
          打开模态框
        </n-button>
        <n-modal
          v-model:show="showModal"
          preset="dialog"
          title="SSR 模态框"
          content="该模态框由客户端交互触发，验证 Naive UI 弹层与样式收集。"
          positive-text="确认"
          negative-text="关闭"
          data-testid="spike-modal"
          @positive-click="showModal = false"
          @negative-click="showModal = false"
        />
      </n-card>
    </n-space>
  </main>
</template>

<style scoped>
.spike {
  max-width: 860px;
  margin: 4vh auto 0;
}
</style>
