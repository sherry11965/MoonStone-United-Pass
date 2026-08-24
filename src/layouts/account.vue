<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Account center layout shell (Vue port of legacy DashboardShell mode="account")
              — P1 mechanical copy of layouts/account.vue for the Vite SPA;
              template/styles unchanged; P2 wired the browser port of the
              account shell (useAccountShellBrowser).
-->

<script setup lang="ts">
// Vue port of the frozen `dashboard-shell.tsx` in account mode: fixed sidebar
// with the six account navigation items plus the permission-filtered
// management shortcuts, profile card, and logout link.
//
// P2 note: the shell data (session user + permission capabilities) resolves
// in the browser through `useAccountShellBrowser` — the SPA counterpart of
// the Nuxt `useAccountShell` SSR prelude. Its module-level promise cache
// deduplicates the /me + /me/permissions reads between this layout and the
// account pages, and keeps the session material in memory only (never in Web
// Storage).
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import type { PermissionCapabilities } from "@/shared/types/permissions";
import { isApiError } from "@/shared/api-error";
import { NO_PERMISSIONS } from "@/shared/types/permissions";
import { navigateTo } from "@/src/nuxt-compat";
import { useAccountShellBrowser } from "@/features/account/composables/useAccountShellBrowser";

type ShellNavigationItem = {
  href: string;
  label: string;
  icon: string;
  requiresPermission?: keyof PermissionCapabilities;
};

// Frozen legacy `accountNavigation` (dashboard-shell.tsx).
const accountNavigation: ShellNavigationItem[] = [
  { href: "/account", label: "账户概览", icon: "home" },
  { href: "/account/security", label: "登录与安全", icon: "shield" },
  { href: "/account/sessions", label: "活跃会话", icon: "key" },
  { href: "/account/applications", label: "授权应用", icon: "apps" },
  { href: "/account/data-export", label: "数据导出", icon: "history" },
  { href: "/account/delete", label: "注销账户", icon: "user" },
];

// Frozen legacy `adminNavigation` minus the workspace/dreamup roots; shown in
// account mode only when the matching permission capability is granted.
const managementNavigation: ShellNavigationItem[] = [
  { href: "/admin/users", label: "用户", icon: "user", requiresPermission: "userRead" },
  { href: "/admin/employees", label: "员工", icon: "users", requiresPermission: "userRead" },
  { href: "/admin/departments", label: "部门", icon: "users", requiresPermission: "userRead" },
  { href: "/admin/providers", label: "Provider", icon: "globe", requiresPermission: "providerRead" },
  { href: "/admin/applications", label: "OAuth 应用", icon: "apps", requiresPermission: "applicationRead" },
  { href: "/admin/policies", label: "授权策略", icon: "shield", requiresPermission: "policyRead" },
  { href: "/admin/audit", label: "审计事件", icon: "history", requiresPermission: "auditRead" },
];

const NAV_ICON_PATHS: Record<string, string> = {
  home: "M4 10.5 12 4l8 6.5M6 9.8V20h12V9.8",
  shield: "M12 3.5 18.5 6v4.6c0 4.2-2.7 7-6.5 9.4-3.8-2.4-6.5-5.2-6.5-9.4V6z",
  key: "M9.5 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M13.5 12H21M18.5 12v3",
  apps: "M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z",
  history: "M12 7.5V12l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  user: "M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5",
  users: "M9 9.5m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3.5 18.5c0-2.7 2.5-4.3 5.5-4.3s5.5 1.6 5.5 4.3M15.5 7a2.8 2.8 0 1 1 2.5 4.2M17.5 14.4c1.8.6 3 1.9 3 3.6",
  globe: "M12 12m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z",
};

// Session gate mirroring the legacy layout `requireSession()`: unauthenticated
// requests are redirected to /login. The browser shell resolves the session
// user + permission capabilities (in-memory cache, never persisted).
const { currentUser, shellData, shellError } = await useAccountShellBrowser();

// Client-only guards: payload missing (no session) → login; 401 → login.
if (import.meta.client) {
  const unauthorized =
    shellError.value !== null &&
    isApiError(shellError.value) &&
    (shellError.value.kind === "unauthorized" || shellError.value.kind === "reauthentication_required");
  if (shellData.value === null || unauthorized) {
    await navigateTo("/login", { redirectCode: 307 });
  }
}

const isMenuOpen = ref(false);
const route = useRoute();

function isNavigationActive(pathname: string, href: string): boolean {
  return href === "/account" ? pathname === href : pathname.startsWith(href);
}

const visibleManagementNavigation = computed(() => {
  const permissions = shellData.value?.permissions ?? NO_PERMISSIONS;
  return managementNavigation.filter(
    (item) => !item.requiresPermission || permissions[item.requiresPermission],
  );
});

// Legacy account-mode profile description (dreamUP roles belong to the admin
// surface and are resolved there once that milestone lands).
const profileDescription = computed(() => {
  const user = currentUser.value;
  if (!user) return "";
  return user.employeeProfile ? "外部用户 · 员工" : "普通外部用户";
});

// Legacy avatar rule: only media served through the avatar API seam is shown.
const sidebarAvatarSrc = computed(() => {
  const avatarUrl = currentUser.value?.avatarUrl;
  return avatarUrl?.startsWith("/api/v1/media/avatars/") ? avatarUrl : undefined;
});

function closeMenu(): void {
  isMenuOpen.value = false;
}

function handleBackdropKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    closeMenu();
  }
}
</script>

<template>
  <div class="shell">
    <header class="mobile-header">
      <BrandMark compact />
      <div class="mobile-actions">
        <ThemeToggle />
        <n-button
          quaternary
          :aria-label="isMenuOpen ? '关闭导航' : '打开导航'"
          @click="isMenuOpen = !isMenuOpen"
        >
          <template #icon>
            <svg v-if="isMenuOpen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </template>
        </n-button>
      </div>
    </header>

    <button
      v-if="isMenuOpen"
      type="button"
      class="backdrop"
      aria-label="关闭导航"
      @click="closeMenu"
      @keydown="handleBackdropKeydown"
    />

    <aside class="sidebar" :class="{ 'sidebar-open': isMenuOpen }">
      <NuxtLink class="brand-link" to="/account" external @click="closeMenu">
        <BrandMark />
      </NuxtLink>
      <div class="surface-row">
        <div class="surface-label">账户中心</div>
        <ThemeToggle />
      </div>
      <nav v-if="currentUser" class="navigation" aria-label="账户中心导航">
        <NuxtLink
          v-for="item in accountNavigation"
          :key="item.href"
          class="navigation-item"
          :class="{ 'navigation-item-active': isNavigationActive(route.path, item.href) }"
          :aria-current="isNavigationActive(route.path, item.href) ? 'page' : undefined"
          :to="item.href"
          external
          @click="closeMenu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="NAV_ICON_PATHS[item.icon]" />
          </svg>
          {{ item.label }}
        </NuxtLink>

        <template v-if="visibleManagementNavigation.length > 0">
          <div class="nav-group-label">管理</div>
          <NuxtLink
            v-for="item in visibleManagementNavigation"
            :key="item.href"
            class="navigation-item"
            :class="{ 'navigation-item-active': isNavigationActive(route.path, item.href) }"
            :aria-current="isNavigationActive(route.path, item.href) ? 'page' : undefined"
            :to="item.href"
            external
            @click="closeMenu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path :d="NAV_ICON_PATHS[item.icon]" />
            </svg>
            {{ item.label }}
          </NuxtLink>
        </template>
      </nav>

      <div class="sidebar-footer">
        <div v-if="currentUser" class="profile">
          <n-avatar
            round
            :size="34"
            :src="sidebarAvatarSrc"
          >
            <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5" />
            </svg>
          </n-avatar>
          <div>
            <strong>{{ currentUser.displayName }}</strong>
            <span>{{ profileDescription }}</span>
          </div>
        </div>
        <a class="logout-link" href="/logout">退出登录</a>
      </div>
    </aside>

    <main class="main">
      <router-view v-if="currentUser" />
    </main>
  </div>
</template>

<style scoped>
/* Vue port of the frozen dashboard-shell.module.css (account mode). */
.shell {
  min-height: 100vh;
  background: var(--up-canvas);
}

.sidebar {
  position: fixed;
  z-index: 30;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  width: 252px;
  flex-direction: column;
  border-right: 1px solid var(--up-line);
  background: var(--up-glass);
  backdrop-filter: blur(20px);
}

.brand-link {
  display: block;
  margin: 28px 28px 26px;
  color: inherit;
  text-decoration: none;
}

.surface-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 18px 12px 28px;
}

.surface-label {
  color: var(--up-muted-soft);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.11em;
}

.mobile-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navigation {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 14px;
  overflow-y: auto;
}

.nav-group-label {
  margin: 16px 14px 4px;
  color: var(--up-muted-soft);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.11em;
}

.navigation-item {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-radius: 10px;
  color: var(--up-muted);
  font-size: 14px;
  font-weight: 520;
  text-decoration: none;
  transition: color 160ms ease, background 160ms ease;
}

.navigation-item:hover {
  color: var(--up-ink);
  background: var(--up-surface-hover);
}

.navigation-item-active {
  color: var(--up-brand);
  background: var(--up-brand-soft);
  font-weight: 650;
}

.sidebar-footer {
  margin-top: auto;
  padding: 18px 18px 22px;
}

.logout-link {
  display: block;
  margin: 12px 8px 0;
  padding-top: 12px;
  border-top: 1px solid var(--up-line-soft);
  color: var(--up-muted);
  font-size: 12px;
  font-weight: 620;
  text-align: center;
  text-decoration: none;
  transition: color 160ms ease;
}

.logout-link:hover { color: var(--up-danger); }

.profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-muted);
}

.profile > div { min-width: 0; }

.profile strong,
.profile span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile strong { font-size: 13px; color: var(--up-ink); }
.profile span { margin-top: 2px; color: var(--up-muted); font-size: 11px; }

.main {
  min-height: 100vh;
  margin-left: 252px;
  padding: clamp(34px, 5vw, 64px) clamp(24px, 5vw, 64px) clamp(56px, 8vw, 96px);
}

.mobile-header,
.backdrop {
  display: none;
}

@media (max-width: 840px) {
  .mobile-header {
    position: sticky;
    z-index: 20;
    top: 0;
    display: flex;
    height: 66px;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    border-bottom: 1px solid var(--up-line);
    background: var(--up-glass);
    backdrop-filter: blur(18px);
  }

  .sidebar {
    width: min(84vw, 300px);
    transform: translateX(-102%);
    transition: transform 220ms ease;
  }

  .sidebar-open { transform: translateX(0); }

  .backdrop {
    position: fixed;
    z-index: 25;
    display: block;
    inset: 0;
    width: 100%;
    border: 0;
    background: var(--up-overlay);
    cursor: pointer;
  }

  .main {
    margin-left: 0;
    padding: 30px 20px 48px;
  }
}
</style>
