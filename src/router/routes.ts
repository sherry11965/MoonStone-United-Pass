//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Explicit 38-route table for the Vite SPA (P1 migration)
//

import type { RouteRecordRaw } from "vue-router";

/**
 * Placeholder for the 34 pages that still live on the Nuxt stack.
 *
 * P1 wires the four pilot routes (`/`, `/spike`, `/privacy`, `/terms`);
 * every other record points at this stub so the SPA never pulls the
 * auto-import-driven Nuxt page sources into its bundle or type graph.
 * TODO(P2): swap each record back to the migrated page component.
 */
const notMigrated = () => import("@/src/pages/not-migrated.vue");

/**
 * Route meta recorded for migration traceability:
 * - `pageSource`: the Nuxt `pages/` file the record corresponds to
 *   (consumed by the route-manifest parity test);
 * - `nuxtLayout`: the frozen `definePageMeta({ layout })` value, expressed
 *   here through route nesting.
 */
type UpPageMeta = {
  pageSource: string;
  nuxtLayout: string | false;
};

function pageMeta(pageSource: string, nuxtLayout: string | false): UpPageMeta {
  return { pageSource, nuxtLayout };
}

/**
 * All 38 routes of the frozen Nuxt file tree, declared explicitly.
 *
 * Order notes (also enforced by vue-router's scoring, but kept explicit per
 * the migration contract): static segments precede dynamic ones —
 * `/admin/employees/link` before `:userId`, `/admin/policies/new` before
 * `:policyId`, `/admin/applications/new` before `:applicationId`. Dynamic
 * parameter names mirror the Nuxt `[param]` file names verbatim.
 */
export const appRoutes: RouteRecordRaw[] = [
  // -- layout: false (full-bleed legal documents) ---------------------------
  {
    path: "/privacy",
    name: "privacy",
    component: () => import("@/src/pages/privacy.vue"),
    meta: pageMeta("pages/privacy.vue", false),
  },
  {
    path: "/terms",
    name: "terms",
    component: () => import("@/src/pages/terms.vue"),
    meta: pageMeta("pages/terms.vue", false),
  },

  // -- default layout group ---------------------------------------------------
  {
    path: "/",
    component: () => import("@/src/layouts/default.vue"),
    children: [
      {
        // pages/index.vue performs `navigateTo("/login", { redirectCode: 307 })`
        // in SSR; the route-level redirect is the SPA counterpart (it navigates
        // with history replacement, same as the 307 semantics).
        path: "",
        name: "index",
        redirect: { path: "/login" },
        meta: pageMeta("pages/index.vue", "default"),
      },
      {
        path: "spike",
        name: "spike",
        component: () => import("@/src/pages/spike.vue"),
        meta: pageMeta("pages/spike.vue", "default"),
      },
    ],
  },

  // -- auth layout group --------------------------------------------------------
  {
    path: "/",
    component: () => import("@/src/layouts/auth.vue"),
    children: [
      {
        path: "login",
        name: "login",
        component: () => import("@/src/pages/login.vue"),
        meta: pageMeta("pages/login.vue", "auth"),
      },
      {
        path: "register",
        name: "register",
        component: () => import("@/src/pages/register.vue"),
        meta: pageMeta("pages/register.vue", "auth"),
      },
      {
        path: "authorize",
        name: "authorize",
        component: () => import("@/src/pages/authorize.vue"),
        meta: pageMeta("pages/authorize.vue", "auth"),
      },
      {
        path: "forgot-password",
        name: "forgot-password",
        component: () => import("@/src/pages/forgot-password.vue"),
        meta: pageMeta("pages/forgot-password.vue", "auth"),
      },
      {
        path: "reset-password",
        name: "reset-password",
        component: () => import("@/src/pages/reset-password.vue"),
        meta: pageMeta("pages/reset-password.vue", "auth"),
      },
      {
        path: "verify-email",
        name: "verify-email",
        component: () => import("@/src/pages/verify-email.vue"),
        meta: pageMeta("pages/verify-email.vue", "auth"),
      },
      {
        path: "logout",
        name: "logout",
        component: () => import("@/src/pages/logout.vue"),
        meta: pageMeta("pages/logout.vue", "auth"),
      },
    ],
  },

  // -- account layout group -------------------------------------------------------
  {
    path: "/account",
    component: () => import("@/src/layouts/account.vue"),
    children: [
      {
        path: "",
        name: "account",
        component: notMigrated,
        meta: pageMeta("pages/account/index.vue", "account"),
      },
      {
        path: "security",
        name: "account-security",
        component: notMigrated,
        meta: pageMeta("pages/account/security.vue", "account"),
      },
      {
        path: "sessions",
        name: "account-sessions",
        component: notMigrated,
        meta: pageMeta("pages/account/sessions.vue", "account"),
      },
      {
        path: "applications",
        name: "account-applications",
        component: notMigrated,
        meta: pageMeta("pages/account/applications.vue", "account"),
      },
      {
        path: "data-export",
        name: "account-data-export",
        component: notMigrated,
        meta: pageMeta("pages/account/data-export.vue", "account"),
      },
      {
        path: "delete",
        name: "account-delete",
        component: notMigrated,
        meta: pageMeta("pages/account/delete.vue", "account"),
      },
    ],
  },

  // -- dashboard (admin) layout group ------------------------------------------------
  {
    path: "/admin",
    component: () => import("@/src/layouts/dashboard.vue"),
    children: [
      {
        path: "",
        name: "admin",
        component: notMigrated,
        meta: pageMeta("pages/admin/index.vue", "dashboard"),
      },
      {
        path: "audit",
        name: "admin-audit",
        component: notMigrated,
        meta: pageMeta("pages/admin/audit/index.vue", "dashboard"),
      },
      {
        path: "users",
        name: "admin-users",
        component: notMigrated,
        meta: pageMeta("pages/admin/users/index.vue", "dashboard"),
      },
      {
        path: "users/:id",
        name: "admin-users-id",
        component: notMigrated,
        meta: pageMeta("pages/admin/users/[id].vue", "dashboard"),
      },
      {
        path: "employees",
        name: "admin-employees",
        component: notMigrated,
        meta: pageMeta("pages/admin/employees/index.vue", "dashboard"),
      },
      {
        // Static segment before the `:userId` dynamic record.
        path: "employees/link",
        name: "admin-employees-link",
        component: notMigrated,
        meta: pageMeta("pages/admin/employees/link.vue", "dashboard"),
      },
      {
        path: "employees/:userId",
        name: "admin-employees-userId",
        component: notMigrated,
        meta: pageMeta("pages/admin/employees/[userId].vue", "dashboard"),
      },
      {
        path: "departments",
        name: "admin-departments",
        component: notMigrated,
        meta: pageMeta("pages/admin/departments/index.vue", "dashboard"),
      },
      {
        path: "departments/:departmentId",
        name: "admin-departments-departmentId",
        component: notMigrated,
        meta: pageMeta("pages/admin/departments/[departmentId].vue", "dashboard"),
      },
      {
        path: "providers",
        name: "admin-providers",
        component: notMigrated,
        meta: pageMeta("pages/admin/providers/index.vue", "dashboard"),
      },
      {
        path: "providers/:providerId",
        name: "admin-providers-providerId",
        component: notMigrated,
        meta: pageMeta("pages/admin/providers/[providerId].vue", "dashboard"),
      },
      {
        path: "policies",
        name: "admin-policies",
        component: notMigrated,
        meta: pageMeta("pages/admin/policies/index.vue", "dashboard"),
      },
      {
        // Static segment before the `:policyId` dynamic record.
        path: "policies/new",
        name: "admin-policies-new",
        component: notMigrated,
        meta: pageMeta("pages/admin/policies/new.vue", "dashboard"),
      },
      {
        path: "policies/:policyId",
        name: "admin-policies-policyId",
        component: notMigrated,
        meta: pageMeta("pages/admin/policies/[policyId].vue", "dashboard"),
      },
      {
        path: "applications",
        name: "admin-applications",
        component: notMigrated,
        meta: pageMeta("pages/admin/applications/index.vue", "dashboard"),
      },
      {
        // Static segment before the `:applicationId` dynamic record.
        path: "applications/new",
        name: "admin-applications-new",
        component: notMigrated,
        meta: pageMeta("pages/admin/applications/new.vue", "dashboard"),
      },
      {
        path: "applications/:applicationId",
        name: "admin-applications-applicationId",
        component: notMigrated,
        meta: pageMeta("pages/admin/applications/[applicationId]/index.vue", "dashboard"),
      },
      {
        path: "applications/:applicationId/clients/:clientId",
        name: "admin-applications-applicationId-clients-clientId",
        component: notMigrated,
        meta: pageMeta(
          "pages/admin/applications/[applicationId]/clients/[clientId].vue",
          "dashboard",
        ),
      },
      {
        path: "dreamup",
        name: "admin-dreamup",
        component: notMigrated,
        meta: pageMeta("pages/admin/dreamup/index.vue", "dashboard"),
      },
      {
        path: "dreamup/:eventId",
        name: "admin-dreamup-eventId",
        component: notMigrated,
        meta: pageMeta("pages/admin/dreamup/[eventId]/index.vue", "dashboard"),
      },
      {
        path: "dreamup/:eventId/applications/:applicationId",
        name: "admin-dreamup-eventId-applications-applicationId",
        component: notMigrated,
        meta: pageMeta(
          "pages/admin/dreamup/[eventId]/applications/[applicationId].vue",
          "dashboard",
        ),
      },
    ],
  },
];
