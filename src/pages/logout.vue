<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: SPA copy of pages/logout.vue (P3a wave 1 — revokes the session, then redirects to /login)
-->

<script setup lang="ts">
import { invalidateAccountShellCache } from "@/features/account/composables/useAccountShellBrowser";
import { invalidateAdminShellCache } from "@/features/admin/composables/useAdminShellBrowser";
import LogoutRedirect from "@/features/auth/components/logout-redirect.vue";
import { useHead } from "@/src/nuxt-compat";

// Explicit defence-in-depth: `LogoutRedirect` ends in `hardNavigate("/login")`,
// a full-page reload that drops every in-memory cache anyway — including the
// memoised account/admin shell promises. Invalidating them here as well makes
// the logout contract visible at the page level (mirrors the plan's rejected
// alternative #3: never touch the shared component used by the Nuxt build).
invalidateAccountShellCache();
invalidateAdminShellCache();

useHead({ title: "退出登录" });
</script>

<template>
  <LogoutRedirect />
</template>
