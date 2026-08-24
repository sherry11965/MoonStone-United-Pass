<script setup lang="ts">
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Account page header (eyebrow, title, description, action)
//

defineProps<{ eyebrow?: string; title: string; description: string }>();
</script>

<template>
  <header class="header">
    <div>
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p class="description">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="action">
      <slot name="action" />
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--up-brand);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.header h1 {
  margin: 0;
  color: var(--up-ink);
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 680;
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.description {
  max-width: 720px;
  margin: 10px 0 0;
  color: var(--up-muted);
  font-size: 14px;
  line-height: 1.7;
}

.action { flex: none; }

@media (max-width: 640px) {
  .header { flex-direction: column; }
  .action { width: 100%; }
}
</style>
