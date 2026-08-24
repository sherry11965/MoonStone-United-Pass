<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Recursive legal-document subsection renderer
-->

<script setup lang="ts">
import type { LegalNote, LegalSubsection, LegalTable } from "@/features/legal/components/legal-document";

defineProps<{ subsection: LegalSubsection }>();

function tableKey(table: LegalTable, index: number): string {
  return `${index}-${table.headers.join("|")}`;
}

function noteKey(note: LegalNote, index: number): string {
  return `${index}-${note.text}`;
}
</script>

<template>
  <div class="subsection">
    <h3 v-if="subsection.title">
      {{ subsection.title }}
    </h3>
    <p v-for="(paragraph, index) in subsection.paragraphs" :key="index">
      {{ paragraph }}
    </p>
    <ul v-if="subsection.items">
      <li v-for="item in subsection.items" :key="item">
        {{ item }}
      </li>
    </ul>
    <div
      v-for="(table, index) in subsection.tables"
      :key="tableKey(table, index)"
      class="table-wrapper"
    >
      <table class="table">
        <thead>
          <tr>
            <th v-for="header in table.headers" :key="header">
              {{ header }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in table.rows" :key="rowIndex">
            <td v-for="(cell, cellIndex) in row" :key="cellIndex">
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-for="(note, index) in subsection.notes"
      :key="noteKey(note, index)"
      class="note"
      :class="note.tone === 'warning' ? 'note-warning' : 'note-info'"
    >
      {{ note.text }}
    </div>
    <LegalSubsection
      v-for="(sub, index) in subsection.subsections"
      :key="index"
      :subsection="sub"
    />
  </div>
</template>

<style scoped>
.subsection {
  margin-top: 24px;
}

.subsection h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 680;
  color: var(--up-ink-secondary);
}

.subsection p {
  margin: 12px 0 0;
}

.subsection ul {
  display: grid;
  gap: 8px;
  margin: 12px 0 0;
  padding-left: 20px;
}

.subsection .subsection {
  margin-top: 20px;
  padding-left: 16px;
  border-left: 2px solid var(--up-line);
}

.table-wrapper {
  margin: 16px 0 0;
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  line-height: 1.7;
}

.table th,
.table td {
  padding: 10px 12px;
  border: 1px solid var(--up-line);
  text-align: left;
  vertical-align: top;
}

.table th {
  background: var(--up-surface-subtle);
  color: var(--up-ink-secondary);
  font-weight: 680;
  white-space: nowrap;
}

.table td {
  color: var(--up-muted);
}

.table tbody tr:nth-child(even) {
  background: var(--up-surface-subtle);
}

.note {
  margin: 16px 0 0;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.8;
}

.note-info {
  border: 1px solid var(--up-info-line);
  background: var(--up-info-surface);
  color: var(--up-ink-secondary);
}

.note-warning {
  border: 1px solid var(--up-warning-line, var(--up-info-line));
  background: var(--up-warning-surface, var(--up-info-surface));
  color: var(--up-ink-secondary);
}
</style>
