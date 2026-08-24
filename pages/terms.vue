<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Terms of service document page
-->

<script setup lang="ts">
import type { PublicLegalPublication } from "@/features/legal/data/legal-manifest";
import LegalDocument from "@/features/legal/components/LegalDocument.vue";
import { legalManifest } from "@/features/legal/data/legal-manifest";
import { termsSections } from "@/features/legal/data/terms-sections";

useHead({ title: "服务条款" });

// Full-bleed document layout: the renderer ships its own header and footer.
definePageMeta({ layout: false });

type LegalPublicationResponse = {
  publication: PublicLegalPublication | null;
  effectiveDate: string;
};

// Controlled publication (freeze-v1 §1.4): resolved server-side; only a
// version + SHA-256 match against the Phase 8 manifest shows an effective date.
const { data } = await useAsyncData("legal-terms-publication", () =>
  $fetch<LegalPublicationResponse>("/api/legal-publication", {
    query: { kind: "terms" },
  }),
);

const effectiveDate = data.value?.effectiveDate ?? "暂未生效（等待法务批准与受控发布）";
</script>

<template>
  <LegalDocument
    eyebrow="Terms"
    title="服务条款"
    summary="请您在注册或使用本服务前仔细阅读并充分理解本服务条款。您一旦注册或使用本服务，即视为您已同意接受本条款的全部约束。本条款与《隐私政策》共同构成您与我们之间关于本服务的完整协议。"
    :version="legalManifest.terms.version"
    :effective-date="effectiveDate"
    :sections="termsSections"
    related-href="/privacy"
    related-label="查看隐私政策"
  />
</template>
