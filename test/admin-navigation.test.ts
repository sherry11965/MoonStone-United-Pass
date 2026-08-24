//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Tests for the permission-derived admin navigation (legacy dashboard-shell rules)
//

import { describe, expect, it } from "vitest";
import {
  ADMIN_ACCOUNT_NAVIGATION,
  ADMIN_NAVIGATION,
  filterAdminNavigation,
  getAdminProfileDescription,
  isAdminNavigationActive,
  resolveDreamUPRole,
} from "@/features/admin/navigation";
import type { DreamUPEventSummary } from "@/features/dreamup-admin/types";
import type { CurrentUser } from "@/shared/types/identity";
import { FULL_PERMISSIONS, NO_PERMISSIONS } from "@/shared/types/permissions";

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    userId: "usr_1",
    email: "alice@example.com",
    displayName: "Alice",
    phoneMasked: "138****0001",
    personas: ["consumer"],
    ...overrides,
  };
}

function makeEvent(overrides: Partial<DreamUPEventSummary> = {}): DreamUPEventSummary {
  return { eventId: "evt_1", displayName: "DreamUP 上海站", ...overrides };
}

describe("ADMIN_NAVIGATION", () => {
  it("freezes the legacy admin menu order and guards", () => {
    expect(ADMIN_NAVIGATION.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/dreamup",
      "/admin/users",
      "/admin/employees",
      "/admin/departments",
      "/admin/providers",
      "/admin/applications",
      "/admin/policies",
      "/admin/audit",
    ]);
    expect(ADMIN_NAVIGATION.find((item) => item.href === "/admin/dreamup")?.requiresDreamUPAccess).toBe(true);
    expect(ADMIN_NAVIGATION.find((item) => item.href === "/admin")?.requiresPermission).toBeUndefined();
  });
});

describe("filterAdminNavigation", () => {
  it("keeps only the workspace with no permissions and no DreamUP access", () => {
    const visible = filterAdminNavigation(ADMIN_NAVIGATION, NO_PERMISSIONS, false);
    expect(visible.map((item) => item.href)).toEqual(["/admin"]);
  });

  it("shows every item with full permissions and DreamUP access", () => {
    const visible = filterAdminNavigation(ADMIN_NAVIGATION, FULL_PERMISSIONS, true);
    expect(visible).toHaveLength(ADMIN_NAVIGATION.length);
  });

  it("filters by individual permission capabilities", () => {
    const visible = filterAdminNavigation(
      ADMIN_NAVIGATION,
      { ...NO_PERMISSIONS, auditRead: true },
      false,
    );
    expect(visible.map((item) => item.href)).toEqual(["/admin", "/admin/audit"]);
  });

  it("shows the DreamUP entry only when DreamUP administration is granted", () => {
    const without = filterAdminNavigation(ADMIN_NAVIGATION, FULL_PERMISSIONS, false);
    expect(without.map((item) => item.href)).not.toContain("/admin/dreamup");
    const withAccess = filterAdminNavigation(ADMIN_NAVIGATION, NO_PERMISSIONS, true);
    expect(withAccess.map((item) => item.href)).toContain("/admin/dreamup");
  });

  it("keeps the frozen account group always visible inside the admin surface", () => {
    const visible = filterAdminNavigation(ADMIN_ACCOUNT_NAVIGATION, NO_PERMISSIONS, false);
    expect(visible).toHaveLength(ADMIN_ACCOUNT_NAVIGATION.length);
  });
});

describe("isAdminNavigationActive", () => {
  it("matches roots exactly", () => {
    expect(isAdminNavigationActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavigationActive("/admin/users", "/admin")).toBe(false);
    expect(isAdminNavigationActive("/account", "/account")).toBe(true);
    expect(isAdminNavigationActive("/account/security", "/account")).toBe(false);
  });

  it("matches nested surfaces by prefix", () => {
    expect(isAdminNavigationActive("/admin/users/usr_1", "/admin/users")).toBe(true);
    expect(isAdminNavigationActive("/admin/users", "/admin/employees")).toBe(false);
  });
});

describe("resolveDreamUPRole", () => {
  it("prefers super_admin over any other role", () => {
    const events = [makeEvent({ role: "admin" }), makeEvent({ eventId: "evt_2", role: "super_admin" })];
    expect(resolveDreamUPRole(events)).toBe("super_admin");
  });

  it("falls back to the first event role", () => {
    expect(resolveDreamUPRole([makeEvent({ role: "senior_admin" })])).toBe("senior_admin");
    expect(resolveDreamUPRole([makeEvent()])).toBeUndefined();
    expect(resolveDreamUPRole([])).toBeUndefined();
  });
});

describe("getAdminProfileDescription", () => {
  it("uses the DreamUP role label when present", () => {
    expect(getAdminProfileDescription(makeUser(), "super_admin")).toBe("DreamUP 顶级管理员");
    expect(getAdminProfileDescription(makeUser(), "senior_admin")).toBe("DreamUP 高级管理员");
    expect(getAdminProfileDescription(makeUser(), "admin")).toBe("DreamUP 管理员");
  });

  it("falls back to the email for console administrators", () => {
    expect(getAdminProfileDescription(makeUser(), undefined)).toBe("alice@example.com");
  });
});
