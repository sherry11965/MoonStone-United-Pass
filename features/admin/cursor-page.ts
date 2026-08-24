//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Pure cursor-pagination helpers shared by the read-only admin surface
//

import type { CursorPage, PageQuery } from "@/shared/types/pagination";

/** Route-query values as exposed by `useRoute().query`. */
export type RouteQueryLike = Record<string, string | Array<string | null> | null | undefined>;

/** Page metadata half of a CursorPage envelope. */
export type CursorPageInfo = CursorPage<unknown>["page"];

/**
 * Normalizes a router query value to a plain string (empty string when the
 * parameter is absent or malformed).
 */
export function readQueryString(query: RouteQueryLike, key: string): string {
  const value = query[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0] as string;
  return "";
}

/** Reads the free-text search term (`q`) from a router query. */
export function readQuerySearch(query: RouteQueryLike): string {
  return readQueryString(query, "q");
}

/** Reads the opaque pagination cursor from a router query. */
export function readQueryCursor(query: RouteQueryLike): string {
  return readQueryString(query, "cursor");
}

/** The legacy directory only knows a previous page when a cursor is active. */
export function hasPreviousPage(cursor: string): boolean {
  return cursor.length > 0;
}

/** Builds the PageQuery contract input for a server list query. */
export function buildPageQuery(input: {
  query?: string;
  cursor?: string;
  limit?: number;
  sort?: string;
  status?: string;
}): PageQuery {
  const pageQuery: PageQuery = {};
  if (input.query) pageQuery.query = input.query;
  if (input.cursor) pageQuery.cursor = input.cursor;
  if (input.limit !== undefined) pageQuery.limit = input.limit;
  if (input.sort) pageQuery.sort = input.sort;
  if (input.status) pageQuery.status = input.status;
  return pageQuery;
}

/**
 * Pure patch used by URL-driven navigation: sets non-empty values, deletes
 * empty ones. Returns a new object; never mutates the input.
 */
export function patchQueryParams(
  params: Record<string, string | null | undefined>,
  patch: Record<string, string | null | undefined>,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) next[key] = value;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) next[key] = value;
    else delete next[key];
  }
  return next;
}

/**
 * Filter change navigation (legacy `updateFilter`): set/remove the filter and
 * always drop the pagination cursor so the new filter restarts on page one.
 */
export function buildFilterPatch(
  params: Record<string, string | null | undefined>,
  key: string,
  value: string,
): Record<string, string> {
  return patchQueryParams(params, { [key]: value, cursor: null });
}

/**
 * Pagination navigation (legacy `navigate`/`navigateCursor`): set the cursor
 * when advancing, drop it when returning to the first page.
 */
export function buildCursorPatch(
  params: Record<string, string | null | undefined>,
  cursor: string | null | undefined,
): Record<string, string> {
  return patchQueryParams(params, { cursor: cursor ?? null });
}
