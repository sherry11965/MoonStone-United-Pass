<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Privacy policy document page
-->

<script setup lang="ts">
import type { PublicLegalPublication } from "@/features/legal/data/legal-manifest";
import LegalDocument from "@/features/legal/components/LegalDocument.vue";
import { legalManifest } from "@/features/legal/data/legal-manifest";
import { privacySections } from "@/features/legal/data/privacy-sections";

useHead({ title: "隐私政策" });

// Full-bleed document layout: the renderer ships its own header and footer.
definePageMeta({ layout: false });

type LegalPublicationResponse = {
  publication: PublicLegalPublication | null;
  effectiveDate: string;
};

// Controlled publication (freeze-v1 §1.4): resolved server-side; only a
// version + SHA-256 match against the Phase 8 manifest shows an effective date.
const { data } = await useAsyncData("legal-privacy-publication", () =>
  $fetch<LegalPublicationResponse>("/api/legal-publication", {
    query: { kind: "privacy" },
  }),
);

const effectiveDate = data.value?.effectiveDate ?? "暂未生效（等待法务批准与受控发布）";
</script>

<template>
  <LegalDocument
    eyebrow="Privacy"
    title="隐私政策"
    summary="我们以最小必要、目的明确和安全可控为原则处理您的个人信息。本政策详细说明我们收集的信息类型、使用目的、共享与保护措施，以及您依法享有的权利。"
    :version="legalManifest.privacy.version"
    :effective-date="effectiveDate"
    :sections="privacySections"
    related-href="/terms"
    related-label="查看服务条款"
  />
</template>
