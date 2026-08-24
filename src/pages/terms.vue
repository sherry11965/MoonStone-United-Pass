<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of pages/terms.vue (P1 pilot route — terms of service document page)
-->

<script setup lang="ts">
import type { PublicLegalPublication } from "@/features/legal/data/legal-manifest";
import LegalDocument from "@/features/legal/components/LegalDocument.vue";
import { legalManifest } from "@/features/legal/data/legal-manifest";
import { termsSections } from "@/features/legal/data/terms-sections";
import { getLegalPublication, legalEffectiveDate } from "@/shared/legal-publication";
import { useAsyncData, useHead } from "@/src/nuxt-compat";

useHead({ title: "服务条款" });

// Full-bleed document layout: the renderer ships its own header and footer
// (definePageMeta({ layout: false }) is expressed by the top-level route).

type LegalPublicationResponse = {
  publication: PublicLegalPublication | null;
  effectiveDate: string;
};

// Controlled publication (freeze-v1 §1.4): in the Nuxt stack the manifest
// verification runs on the SSR endpoint; in the SPA the identical
// version + SHA-256 verification runs in the browser through browserFetch
// (shared/legal-publication.ts).
const { data } = await useAsyncData("legal-terms-publication", async (): Promise<LegalPublicationResponse> => {
  const publication = await getLegalPublication("terms");
  return { publication, effectiveDate: legalEffectiveDate(publication) };
});

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
