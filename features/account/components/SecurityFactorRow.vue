<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Security factor row (icon + status badge + description + action slot)
//

import AccountStatusBadge from "@/features/account/components/AccountStatusBadge.vue";

defineProps<{
  icon: string;
  label: string;
  statusLabel: string;
  active: boolean;
  description: string;
  detail?: string;
}>();
</script>

<template>
  <article class="factor-row">
    <div class="factor-icon">{{ icon }}</div>
    <div class="factor-copy">
      <div class="factor-title">
        <h3>{{ label }}</h3>
        <AccountStatusBadge :label="statusLabel" :tone="active ? 'success' : 'warning'" />
      </div>
      <p>{{ description }}</p>
      <span v-if="detail">{{ detail }}</span>
    </div>
    <slot name="action" />
  </article>
</template>

<style scoped>
.factor-row { display: flex; align-items: center; gap: 16px; padding: 20px 0; border-top: 1px solid var(--up-line-soft); }
.factor-row:first-child { border-top: 0; }

.factor-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: none;
  place-items: center;
  border-radius: 13px;
  color: var(--up-brand);
  background: var(--up-brand-soft);
  font-size: 14px;
  font-weight: 750;
}

.factor-copy { min-width: 0; flex: 1; }
.factor-title { display: flex; align-items: center; gap: 9px; }
.factor-title h3 { margin: 0; font-size: 14px; }
.factor-copy p { margin: 5px 0; color: var(--up-muted); font-size: 12px; line-height: 1.5; }
.factor-copy > span { color: var(--up-muted-soft); font-size: 12px; }

@media (max-width: 760px) {
  .factor-row { align-items: flex-start; flex-wrap: wrap; }
}
</style>
