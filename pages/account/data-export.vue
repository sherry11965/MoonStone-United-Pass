<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Account data export page (reauthentication + 202 bounded polling)
-->

<script setup lang="ts">
// Vue port of the frozen `(account)/account/data-export/page.tsx`: the user
// identity comes from the shared account-shell payload (layouts/account.vue),
// so the client never issues a second request.
import AccountPageHeader from "@/features/account/components/AccountPageHeader.vue";
import PersonalDataExportPanel from "@/features/account/components/PersonalDataExportPanel.vue";
import { useAccountShell } from "@/features/account/composables/useAccountShell";

definePageMeta({ layout: "account" });
useHead({ title: "数据导出" });

const { currentUser } = await useAccountShell();
</script>

<template>
  <template v-if="currentUser">
    <AccountPageHeader
      eyebrow="Account privacy"
      title="数据导出"
      description="导出与当前账户关联的个人数据副本。"
    />
    <PersonalDataExportPanel :user-id="currentUser.userId" />
  </template>
</template>
