//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Permission-derived admin navigation (pure logic, testable without Vue)
//

import type { DreamUPAdminRole, DreamUPEventSummary } from "@/features/dreamup-admin/types";
import type { CurrentUser } from "@/shared/types/identity";
import type { PermissionCapabilities } from "@/shared/types/permissions";

export type AdminNavigationItem = {
  href: string;
  label: string;
  icon: "home" | "apps" | "key" | "user" | "users" | "globe" | "shield" | "history";
  /** Required permission to show this item; undefined means always visible. */
  requiresPermission?: keyof PermissionCapabilities;
  requiresDreamUPAccess?: boolean;
};

/** Frozen legacy `adminNavigation` (dashboard-shell.tsx). */
export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  { href: "/admin", label: "工作台", icon: "home" },
  { href: "/admin/dreamup", label: "DreamUP 上海站", icon: "apps", requiresDreamUPAccess: true },
  { href: "/admin/users", label: "用户", icon: "user", requiresPermission: "userRead" },
  { href: "/admin/employees", label: "员工", icon: "users", requiresPermission: "userRead" },
  { href: "/admin/departments", label: "部门", icon: "users", requiresPermission: "userRead" },
  { href: "/admin/providers", label: "Provider", icon: "globe", requiresPermission: "providerRead" },
  { href: "/admin/applications", label: "OAuth 应用", icon: "apps", requiresPermission: "applicationRead" },
  { href: "/admin/policies", label: "授权策略", icon: "shield", requiresPermission: "policyRead" },
  { href: "/admin/audit", label: "审计事件", icon: "history", requiresPermission: "auditRead" },
];

/** Frozen legacy account navigation group shown inside the admin surface. */
export const ADMIN_ACCOUNT_NAVIGATION: readonly AdminNavigationItem[] = [
  { href: "/account", label: "账户概览", icon: "home" },
  { href: "/account/security", label: "登录与安全", icon: "shield" },
  { href: "/account/sessions", label: "活跃会话", icon: "key" },
  { href: "/account/applications", label: "授权应用", icon: "apps" },
  { href: "/account/data-export", label: "数据导出", icon: "history" },
  { href: "/account/delete", label: "注销账户", icon: "user" },
];

/** Frozen legacy `filterByPermissions` (dashboard-shell.tsx). */
export function filterAdminNavigation(
  items: readonly AdminNavigationItem[],
  permissions: PermissionCapabilities,
  showDreamUPAdministration: boolean,
): AdminNavigationItem[] {
  return items.filter(
    (item) =>
      (!item.requiresPermission || permissions[item.requiresPermission]) &&
      (!item.requiresDreamUPAccess || showDreamUPAdministration),
  );
}

/** Frozen legacy `isNavigationActive` (dashboard-shell.tsx). */
export function isAdminNavigationActive(pathname: string, href: string): boolean {
  return href === "/account" || href === "/admin" ? pathname === href : pathname.startsWith(href);
}

/** Frozen legacy layout rule: super_admin wins, otherwise the first event role. */
export function resolveDreamUPRole(
  events: readonly DreamUPEventSummary[],
): DreamUPAdminRole | undefined {
  return events.find((event) => event.role === "super_admin")?.role ?? events[0]?.role;
}

/** Frozen legacy admin-mode profile description (dashboard-shell.tsx). */
export function getAdminProfileDescription(
  user: CurrentUser,
  dreamUPRole: DreamUPAdminRole | undefined,
): string {
  if (dreamUPRole === "super_admin") return "DreamUP 顶级管理员";
  if (dreamUPRole === "senior_admin") return "DreamUP 高级管理员";
  if (dreamUPRole === "admin") return "DreamUP 管理员";
  return user.email;
}
