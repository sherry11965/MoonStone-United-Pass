<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Account status badge with semantic tones
//

type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

withDefaults(defineProps<{ label: string; tone?: StatusTone }>(), { tone: "neutral" });
</script>

<template>
  <span class="badge" :class="tone">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 620;
  white-space: nowrap;
}

.success { color: var(--up-status-success-ink); background: var(--up-status-success-bg); }
.warning { color: var(--up-status-warning-ink); background: var(--up-status-warning-bg); }
.danger { color: var(--up-status-danger-ink); background: var(--up-status-danger-bg); }
.neutral { color: var(--up-status-neutral-ink); background: var(--up-status-neutral-bg); }
.info { color: var(--up-status-info-ink); background: var(--up-status-info-bg); }
</style>
