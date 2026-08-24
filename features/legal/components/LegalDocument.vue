<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Legal document renderer component
-->

<script setup lang="ts">
import type { LegalSection, LegalTable } from "@/features/legal/components/legal-document";
import LegalSubsection from "@/features/legal/components/LegalSubsection.vue";
import { COMPANY_LEGAL_NAME, SYSTEM_NAME } from "@/shared/branding";

defineProps<{
  eyebrow: string;
  title: string;
  summary: string;
  version: string;
  effectiveDate: string;
  sections: LegalSection[];
  relatedHref: "/privacy" | "/terms";
  relatedLabel: string;
}>();

function sectionNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function tableKey(table: LegalTable, index: number): string {
  return `${index}-${table.headers.join("|")}`;
}
</script>

<template>
  <div class="page">
    <header class="header">
      <NuxtLink to="/login" :aria-label="`返回${SYSTEM_NAME}登录页`">
        <BrandMark />
      </NuxtLink>
      <ThemeToggle />
    </header>

    <main class="main">
      <section class="hero">
        <p class="eyebrow">
          {{ eyebrow }}
        </p>
        <h1>{{ title }}</h1>
        <p class="summary">
          {{ summary }}
        </p>
        <dl class="metadata">
          <div><dt>版本</dt><dd>{{ version }}</dd></div>
          <div><dt>生效日期</dt><dd>{{ effectiveDate }}</dd></div>
          <div><dt>适用系统</dt><dd>{{ SYSTEM_NAME }}</dd></div>
        </dl>
      </section>

      <article class="document">
        <nav class="contents" :aria-label="`${title}目录`">
          <strong>内容目录</strong>
          <ol>
            <li v-for="section in sections" :key="section.id">
              <a :href="`#${section.id}`">{{ section.title }}</a>
            </li>
          </ol>
        </nav>

        <div class="sections">
          <section
            v-for="(section, index) in sections"
            :id="section.id"
            :key="section.id"
            :aria-labelledby="`${section.id}-title`"
          >
            <span class="section-number">{{ sectionNumber(index) }}</span>
            <h2 :id="`${section.id}-title`">
              {{ section.title }}
            </h2>
            <p v-for="(paragraph, paragraphIndex) in section.paragraphs" :key="paragraphIndex">
              {{ paragraph }}
            </p>
            <ul v-if="section.items">
              <li v-for="item in section.items" :key="item">
                {{ item }}
              </li>
            </ul>
            <div
              v-for="(table, tableIndex) in section.tables"
              :key="tableKey(table, tableIndex)"
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
              v-for="(note, noteIndex) in section.notes"
              :key="noteIndex"
              class="note"
              :class="note.tone === 'warning' ? 'note-warning' : 'note-info'"
            >
              {{ note.text }}
            </div>
            <LegalSubsection
              v-for="(subsection, subIndex) in section.subsections"
              :key="subIndex"
              :subsection="subsection"
            />
          </section>
        </div>
      </article>

      <nav class="actions" aria-label="法律文件导航">
        <NuxtLink to="/login">
          返回登录
        </NuxtLink>
        <NuxtLink :to="relatedHref">
          {{ relatedLabel }}
        </NuxtLink>
      </nav>
    </main>

    <footer class="footer">
      © 2026 {{ COMPANY_LEGAL_NAME }}
    </footer>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 15% 0%, var(--up-brand-soft), transparent 28%),
    var(--up-canvas);
}

.header {
  display: flex;
  width: min(100% - 40px, 1120px);
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto;
  padding: 28px 0;
}

.main {
  width: min(100% - 40px, 980px);
  margin: 32px auto 0;
  padding-bottom: 24px;
}

.hero {
  padding: clamp(30px, 6vw, 62px);
  border: 1px solid var(--up-line);
  border-radius: var(--up-radius-lg);
  background: var(--up-surface);
  box-shadow: var(--up-shadow);
}

.eyebrow {
  margin: 0;
  color: var(--up-brand);
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero h1 {
  max-width: 720px;
  margin: 13px 0 0;
  font-size: clamp(34px, 6vw, 58px);
  line-height: 1.12;
  letter-spacing: -0.045em;
}

.summary {
  max-width: 700px;
  margin: 22px 0 0;
  color: var(--up-muted);
  font-size: 15px;
  line-height: 1.85;
}

.metadata {
  display: grid;
  grid-template-columns: 0.7fr 1fr 2fr;
  gap: 1px;
  overflow: hidden;
  margin: 32px 0 0;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-line);
}

.metadata > div {
  padding: 14px 16px;
  background: var(--up-surface-subtle);
}

.metadata dt {
  color: var(--up-muted-soft);
  font-size: 12px;
}

.metadata dd {
  margin: 5px 0 0;
  color: var(--up-ink-secondary);
  font-size: 13px;
  font-weight: 620;
}

.document {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  align-items: start;
  gap: 52px;
  margin-top: 52px;
}

.contents {
  position: sticky;
  top: 28px;
  padding: 20px;
  border: 1px solid var(--up-line);
  border-radius: 14px;
  background: var(--up-surface);
}

.contents strong {
  font-size: 12px;
}

.contents ol {
  display: grid;
  gap: 11px;
  margin: 14px 0 0;
  padding-left: 18px;
  color: var(--up-muted);
  font-size: 12px;
  line-height: 1.5;
}

.contents a:hover {
  color: var(--up-brand);
}

.sections {
  min-width: 0;
}

.sections > section {
  scroll-margin-top: 24px;
  padding: 0 0 42px;
}

.sections > section + section {
  padding-top: 42px;
  border-top: 1px solid var(--up-line);
}

.section-number {
  color: var(--up-brand);
  font-size: 12px;
  font-weight: 760;
  letter-spacing: 0.12em;
}

.sections h2 {
  margin: 7px 0 0;
  font-size: 22px;
  letter-spacing: -0.02em;
}

.sections p,
.sections li {
  color: var(--up-muted);
  font-size: 13px;
  line-height: 1.9;
}

.sections p {
  margin: 16px 0 0;
}

.sections ul {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
  padding-left: 20px;
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

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 28px;
  border-top: 1px solid var(--up-line);
}

.actions a {
  padding: 10px 15px;
  border: 1px solid var(--up-line);
  border-radius: 9px;
  color: var(--up-ink-secondary);
  background: var(--up-surface);
  font-size: 12px;
  font-weight: 650;
}

.actions a:last-child {
  color: var(--up-brand);
  border-color: var(--up-info-line);
  background: var(--up-info-surface);
}

.footer {
  width: min(100% - 40px, 980px);
  margin: 0 auto;
  padding: 42px 0;
  color: var(--up-muted-soft);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 760px) {
  .header,
  .main,
  .footer {
    width: min(100% - 28px, 980px);
  }

  .main {
    margin-top: 12px;
  }

  .hero {
    padding: 28px 22px;
  }

  .metadata {
    grid-template-columns: 1fr;
  }

  .document {
    grid-template-columns: 1fr;
    gap: 30px;
    margin-top: 32px;
  }

  .contents {
    position: static;
  }

  .actions {
    align-items: stretch;
    flex-direction: column;
  }

  .actions a {
    text-align: center;
  }

  .table {
    font-size: 11px;
  }

  .table th,
  .table td {
    padding: 8px 10px;
  }
}
</style>
