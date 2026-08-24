<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin directory shell (URL-driven search + cursor pagination footer)
-->

<script setup lang="ts">
// Vue port of the frozen `management-directory.tsx` shell: a directory card
// with the URL-bound search input, the page-specific table slot and the
// cursor pagination footer (legacy: previous = history back, disabled on the
// first page; next = envelope cursor, disabled when there is no more).
//
// Difference from legacy: the legacy input navigated on every keystroke via
// Next client transitions; full-document navigation would reload the page
// per character, so the search term is debounced before it reaches the URL
// (Enter commits immediately).
import { ref, watch } from "vue";

const props = defineProps<{
  directoryLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  hasPrevious: boolean;
  hasNext: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  search: [value: string];
  previous: [];
  next: [];
}>();

const draft = ref(props.searchValue);

// Keep the local draft in sync when the URL-driven value changes elsewhere.
watch(
  () => props.searchValue,
  (value) => {
    draft.value = value;
  },
);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(draft, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (value !== props.searchValue) emit("search", value);
  }, 350);
});

function commitNow(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (draft.value !== props.searchValue) emit("search", draft.value);
}

function clearSearch(): void {
  draft.value = "";
  commitNow();
}
</script>

<template>
  <section class="directory-card" :aria-label="directoryLabel">
    <div class="toolbar">
      <n-input
        :value="draft"
        :placeholder="searchPlaceholder"
        class="search-input"
        clearable
        aria-label="搜索"
        @update:value="draft = $event"
        @keydown.enter="commitNow"
        @clear="clearSearch"
      />
      <slot name="filters" />
    </div>

    <slot />

    <footer class="pagination">
      <n-button
        secondary
        :disabled="!hasPrevious"
        aria-label="上一页"
        @click="emit('previous')"
      >
        上一页
      </n-button>
      <n-button
        secondary
        :disabled="!hasNext"
        aria-label="下一页"
        @click="emit('next')"
      >
        下一页
      </n-button>
    </footer>
  </section>
</template>

<style scoped>
.directory-card {
  border: 1px solid var(--up-line);
  border-radius: 16px;
  background: var(--up-surface);
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--up-line-soft);
}

.search-input { width: 260px; max-width: 100%; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--up-line-soft);
}
</style>
