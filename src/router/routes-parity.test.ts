//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Route-manifest parity test — pages/ file tree vs SPA route table
//

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import { appRoutes } from "./routes";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const pagesDir = path.join(projectRoot, "pages");

/**
 * Derives the frozen Nuxt route paths from the `pages/` file tree using the
 * file-router conventions actually used by this project:
 * - `index.vue` maps to the parent path;
 * - `[param].vue` / `[param]/` map to `:param` segments.
 */
function collectNuxtRoutes(dir: string, prefix = "/"): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry);
    if (statSync(absolute).isDirectory()) {
      const segment = entry.replace(/^\[(.+)\]$/, ":$1");
      const childPrefix = prefix === "/" ? `/${segment}` : `${prefix}/${segment}`;
      routes.push(...collectNuxtRoutes(absolute, childPrefix));
      continue;
    }
    if (!entry.endsWith(".vue")) continue;
    const base = entry.slice(0, -".vue".length);
    if (base === "index") {
      routes.push(prefix);
      continue;
    }
    const segment = base.replace(/^\[(.+)\]$/, ":$1");
    routes.push(prefix === "/" ? `/${segment}` : `${prefix}/${segment}`);
  }
  return routes;
}

function tablePaths(): string[] {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: appRoutes,
  });
  return router
    .getRoutes()
    .filter((record) => typeof record.meta.pageSource === "string")
    .map((record) => record.path)
    .sort();
}

describe("38-route manifest parity (pages/ file tree vs SPA route table)", () => {
  it("derives exactly the frozen 38 routes from the pages/ file tree", () => {
    const fileTree = collectNuxtRoutes(pagesDir).sort();
    expect(fileTree).toHaveLength(38);
    expect(fileTree).toEqual([
      "/",
      "/account",
      "/account/applications",
      "/account/data-export",
      "/account/delete",
      "/account/security",
      "/account/sessions",
      "/admin",
      "/admin/applications",
      "/admin/applications/:applicationId",
      "/admin/applications/:applicationId/clients/:clientId",
      "/admin/applications/new",
      "/admin/audit",
      "/admin/departments",
      "/admin/departments/:departmentId",
      "/admin/dreamup",
      "/admin/dreamup/:eventId",
      "/admin/dreamup/:eventId/applications/:applicationId",
      "/admin/employees",
      "/admin/employees/:userId",
      "/admin/employees/link",
      "/admin/policies",
      "/admin/policies/:policyId",
      "/admin/policies/new",
      "/admin/providers",
      "/admin/providers/:providerId",
      "/admin/users",
      "/admin/users/:id",
      "/authorize",
      "/forgot-password",
      "/login",
      "/logout",
      "/privacy",
      "/register",
      "/reset-password",
      "/spike",
      "/terms",
      "/verify-email",
    ]);
  });

  it("declares every file-tree route exactly once in the SPA route table", () => {
    const fileTree = collectNuxtRoutes(pagesDir).sort();
    const routes = tablePaths();

    expect(routes).toHaveLength(38);
    expect(routes).toEqual(fileTree);
  });

  it("keeps the frozen dynamic parameter names", () => {
    const routes = tablePaths();
    expect(routes).toContain("/admin/users/:id");
    expect(routes).toContain("/admin/employees/:userId");
    expect(routes).toContain("/admin/departments/:departmentId");
    expect(routes).toContain("/admin/providers/:providerId");
    expect(routes).toContain("/admin/policies/:policyId");
    expect(routes).toContain("/admin/applications/:applicationId");
    expect(routes).toContain("/admin/applications/:applicationId/clients/:clientId");
    expect(routes).toContain("/admin/dreamup/:eventId");
    expect(routes).toContain("/admin/dreamup/:eventId/applications/:applicationId");
  });

  it("declares static segments before their dynamic siblings", () => {
    const admin = appRoutes.find((route) => route.path === "/admin");
    const children = admin?.children ?? [];
    const paths = children.map((child) => child.path);

    expect(paths.indexOf("employees/link")).toBeLessThan(
      paths.indexOf("employees/:userId"),
    );
    expect(paths.indexOf("policies/new")).toBeLessThan(
      paths.indexOf("policies/:policyId"),
    );
    expect(paths.indexOf("applications/new")).toBeLessThan(
      paths.indexOf("applications/:applicationId"),
    );
  });

  it("points every route meta at an existing pages/ source file", () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: appRoutes,
    });
    const records = router
      .getRoutes()
      .filter((record) => typeof record.meta.pageSource === "string");

    expect(records).toHaveLength(38);
    for (const record of records) {
      const source = path.join(projectRoot, record.meta.pageSource as string);
      expect(statSync(source).isFile(), `${record.path} → ${record.meta.pageSource}`).toBe(true);
    }
  });
});
