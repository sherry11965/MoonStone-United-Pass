//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Browser-side read-only API queries (SPA counterpart of server/queries/server-queries.ts)
//

import type { UnitedPassQueries } from "@/shared/united-pass-data-source";
import type { AuditQuery } from "@/features/admin/types";
import type { PageQuery } from "@/shared/types/pagination";
import { mockUnitedPassDataSource } from "@/shared/mock/united-pass-data-source";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { browserFetch } from "@/shared/http/browser-http-client";
import { isApiError } from "@/shared/api-error";
import {
  parseAccountDeletion,
  parseAuthorizedApplications,
  parseAuditEvents,
  parseConsentResolution,
  parseCurrentUser,
  parseDepartmentDetail,
  parseDepartments,
  parseEmployeeDetail,
  parseEmployees,
  parseDirectorySyncHistory,
  parseIdentityProviders,
  parseManagedUsers,
  parsePermissionCapabilities,
  parsePolicies,
  parsePolicyDetail,
  parseSecuritySummary,
  parseProviderDetail,
  parseSyncConflicts,
  parseUserDetail,
  parseUserSessions,
} from "@/shared/response-validators";

/**
 * Browser-side query layer (SPA stack).
 *
 * Mechanical port of `server/queries/server-queries.ts` for the Vite SPA:
 * every seam keeps the SAME `USE_MOCK_DATA_SOURCE ? mock : fetch` branch
 * structure, the SAME cursor-pagination helpers (`withPageQuery` /
 * `withAuditQuery`) and the SAME error semantics (`nullableBrowserQuery`
 * narrows an explicit `not_found` onto `null`, every other failure stays
 * visible). The only difference is the transport: migrated seams call
 * `browser-http-client.ts` (same-origin `/api/v1`, `credentials:
 * "same-origin"`) instead of `api-fetch.ts` (server cookie forwarding).
 *
 * During the dual-stack period this module and `server-queries.ts` coexist:
 * the Nuxt SSR stack keeps importing the server variant, the SPA stack
 * imports this one. Seams without a backend implementation stay on the mock
 * source exactly like their server counterparts.
 *
 * See ADR-0004 for the full architecture.
 * See ADR-0006 for the deployment topology.
 */
function withPageQuery(path: string, query?: PageQuery): string {
  if (!query) return path;
  const parameters = new URLSearchParams();
  if (query.cursor) parameters.set("cursor", query.cursor);
  if (query.limit !== undefined) parameters.set("limit", String(query.limit));
  if (query.query) parameters.set("query", query.query);
  if (query.sort) parameters.set("sort", query.sort);
  if (query.status) parameters.set("status", query.status);
  const encoded = parameters.toString();
  return encoded ? `${path}?${encoded}` : path;
}

function withAuditQuery(path: string, query?: AuditQuery): string {
  if (!query) return path;
  const parameters = new URLSearchParams();
  if (query.cursor) parameters.set("cursor", query.cursor);
  if (query.limit !== undefined) parameters.set("limit", String(query.limit));
  if (query.query) parameters.set("query", query.query);
  if (query.eventType) parameters.set("eventType", query.eventType);
  if (query.result) parameters.set("result", query.result);
  if (query.actorName) parameters.set("actorName", query.actorName);
  if (query.requestId) parameters.set("requestId", query.requestId);
  if (query.from) parameters.set("from", query.from);
  if (query.to) parameters.set("to", query.to);
  const encoded = parameters.toString();
  return encoded ? `${path}?${encoded}` : path;
}

async function nullableBrowserQuery<T>(
  path: string,
  parser: (value: unknown) => T,
): Promise<T | null> {
  try {
    return parser(await browserFetch<unknown>(path));
  } catch (error) {
    if (isApiError(error) && error.kind === "not_found") return null;
    throw error;
  }
}

export const browserQueries: UnitedPassQueries = {
  getCurrentUser: USE_MOCK_DATA_SOURCE
    ? () => mockUnitedPassDataSource.getCurrentUser()
    : async () => parseCurrentUser(await browserFetch<unknown>("/me")),
  getCurrentPermissions: USE_MOCK_DATA_SOURCE
    ? () => mockUnitedPassDataSource.getCurrentPermissions()
    : async () => parsePermissionCapabilities(await browserFetch<unknown>("/me/permissions")),
  getSecuritySummary: USE_MOCK_DATA_SOURCE
    ? () => mockUnitedPassDataSource.getSecuritySummary()
    : async () => parseSecuritySummary(await browserFetch<unknown>("/me/security")),
  getSessions: USE_MOCK_DATA_SOURCE
    ? () => mockUnitedPassDataSource.getSessions()
    : async () => parseUserSessions(await browserFetch<unknown>("/me/sessions")),
  getConsentResolution: USE_MOCK_DATA_SOURCE
    ? (requestId) => mockUnitedPassDataSource.getConsentResolution(requestId)
    : async (requestId) =>
        parseConsentResolution(
          await browserFetch<unknown>(
            `/authorization/requests/${encodeURIComponent(requestId)}`,
          ),
        ),
  getAuthorizedApplications: USE_MOCK_DATA_SOURCE
    ? () => mockUnitedPassDataSource.getAuthorizedApplications()
    : async () =>
        parseAuthorizedApplications(
          await browserFetch<unknown>("/me/authorized-applications"),
        ),
  getAccountDeletion: USE_MOCK_DATA_SOURCE
    ? () => mockUnitedPassDataSource.getAccountDeletion()
    : async () => parseAccountDeletion(
        await browserFetch<unknown>("/me/account-deletion"),
      ),
  getAdminDashboard: () => mockUnitedPassDataSource.getAdminDashboard(),
  getUsers: USE_MOCK_DATA_SOURCE
    ? (query?: PageQuery) => mockUnitedPassDataSource.getUsers(query)
    : async (query?: PageQuery) => parseManagedUsers(
        await browserFetch<unknown>(withPageQuery("/admin/users", query)),
      ),
  getUserDetail: USE_MOCK_DATA_SOURCE
    ? (userId) => mockUnitedPassDataSource.getUserDetail(userId)
    : (userId) => nullableBrowserQuery(
        `/admin/users/${encodeURIComponent(userId)}`,
        parseUserDetail,
      ),
  getEmployees: USE_MOCK_DATA_SOURCE
    ? (query?: PageQuery) => mockUnitedPassDataSource.getEmployees(query)
    : async (query?: PageQuery) => parseEmployees(
        await browserFetch<unknown>(withPageQuery("/admin/employees", query)),
      ),
  getEmployeeDetail: USE_MOCK_DATA_SOURCE
    ? (userId) => mockUnitedPassDataSource.getEmployeeDetail(userId)
    : (userId) => nullableBrowserQuery(
        `/admin/users/${encodeURIComponent(userId)}/employee-profile`,
        parseEmployeeDetail,
      ),
  getDepartments: USE_MOCK_DATA_SOURCE
    ? (query?: PageQuery) => mockUnitedPassDataSource.getDepartments(query)
    : async (query?: PageQuery) => parseDepartments(
        await browserFetch<unknown>(withPageQuery("/admin/departments", query)),
      ),
  getDepartmentDetail: USE_MOCK_DATA_SOURCE
    ? (departmentId) => mockUnitedPassDataSource.getDepartmentDetail(departmentId)
    : (departmentId) => nullableBrowserQuery(
        `/admin/departments/${encodeURIComponent(departmentId)}`,
        parseDepartmentDetail,
      ),
  getIdentityProviders: USE_MOCK_DATA_SOURCE
    ? (query?: PageQuery) => mockUnitedPassDataSource.getIdentityProviders(query)
    : async (query?: PageQuery) => parseIdentityProviders(
        await browserFetch<unknown>(withPageQuery("/admin/identity-providers", query)),
      ),
  getProviderDetail: USE_MOCK_DATA_SOURCE
    ? (providerId) => mockUnitedPassDataSource.getProviderDetail(providerId)
    : (providerId) => nullableBrowserQuery(
        `/admin/identity-providers/${encodeURIComponent(providerId)}`,
        parseProviderDetail,
      ),
  getDirectorySyncHistory: USE_MOCK_DATA_SOURCE
    ? (providerId) => mockUnitedPassDataSource.getDirectorySyncHistory(providerId)
    : async (providerId) => parseDirectorySyncHistory(
        await browserFetch<unknown>(
          `/admin/identity-providers/${encodeURIComponent(providerId)}/directory-syncs`,
        ),
      ),
  getSyncConflicts: USE_MOCK_DATA_SOURCE
    ? (providerId) => mockUnitedPassDataSource.getSyncConflicts(providerId)
    : async (providerId) => parseSyncConflicts(
        await browserFetch<unknown>(
          `/admin/identity-providers/${encodeURIComponent(providerId)}/sync-conflicts`,
        ),
      ),
  getApplications: (query?: PageQuery) => mockUnitedPassDataSource.getApplications(query),
  getApplicationDetail: (applicationId) =>
    mockUnitedPassDataSource.getApplicationDetail(applicationId),
  getClientDetail: (applicationId, clientId) =>
    mockUnitedPassDataSource.getClientDetail(applicationId, clientId),
  getAvailableScopes: () => mockUnitedPassDataSource.getAvailableScopes(),
  getPolicies: USE_MOCK_DATA_SOURCE
    ? (query?: PageQuery) => mockUnitedPassDataSource.getPolicies(query)
    : async (query?: PageQuery) => parsePolicies(
        await browserFetch<unknown>(withPageQuery("/admin/policies", query)),
      ),
  getPolicyDetail: USE_MOCK_DATA_SOURCE
    ? (policyId) => mockUnitedPassDataSource.getPolicyDetail(policyId)
    : (policyId) => nullableBrowserQuery(
        `/admin/policies/${encodeURIComponent(policyId)}`,
        parsePolicyDetail,
      ),
  getAuditEvents: USE_MOCK_DATA_SOURCE
    ? (query?: AuditQuery) => mockUnitedPassDataSource.getAuditEvents(query)
    : async (query?: AuditQuery) => parseAuditEvents(
        await browserFetch<unknown>(withAuditQuery("/admin/audit-events", query)),
      ),
};
