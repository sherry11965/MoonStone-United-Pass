//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: URL-driven cursor pagination composable for the read-only admin surface
//

import { computed } from "vue";
import type { CursorPage, PageQuery } from "@/shared/types/pagination";
import {
  buildPageQuery,
  hasPreviousPage,
  patchQueryParams,
  readQueryCursor,
  readQuerySearch,
  readQueryString,
  type RouteQueryLike,
} from "@/features/admin/cursor-page";

/** Server list query returning a cursor-paginated envelope. */
export type CursorPageFetcher<T, Q extends PageQuery = PageQuery> = (query: Q) => Promise<CursorPage<T>>;

export type UseCursorPageOptions<Q extends PageQuery = PageQuery> = {
  limit?: number;
  sort?: string;
  status?: string;
  /**
   * Optional extension point for queries richer than PageQuery (e.g. the
   * audit explorer filters). Receives the base query and the raw route query.
   */
  buildQuery?: (base: PageQuery, routeQuery: RouteQueryLike) => Q;
};

/**
 * URL-driven cursor pagination, Vue port of the legacy `ManagementDirectory`
 * navigation contract: the search term (`q`) and the opaque `cursor` live in
 * the URL, every filter change resets the cursor, and page metadata comes
 * from the `CursorPage<T>` envelope — never a full-table load.
 *
 * The list read runs server-side inside `useAsyncData` (server: true); the
 * fetcher usually wraps `server/queries/server-queries.ts` behind
 * `import.meta.server`, so server-only modules never reach the browser
 * bundle. Pagination navigates externally (full-document), mirroring the
 * legacy Next.js directories where every page went through the server layer.
 */
export async function useCursorPage<T, Q extends PageQuery = PageQuery>(
  basePath: string,
  fetchPage: CursorPageFetcher<T, Q>,
  options: UseCursorPageOptions<Q> = {},
) {
  const route = useRoute();

  const search = computed(() => readQuerySearch(route.query as RouteQueryLike));
  const cursor = computed(() => readQueryCursor(route.query as RouteQueryLike));
  const hasPrevious = computed(() => hasPreviousPage(cursor.value));

  const pageQuery = computed<Q>(() => {
    const base = buildPageQuery({
      query: search.value,
      cursor: cursor.value,
      limit: options.limit,
      sort: options.sort,
      status: options.status,
    });
    return options.buildQuery
      ? options.buildQuery(base, route.query as RouteQueryLike)
      : (base as Q);
  });

  /** Async-data key derived from the full URL so each page state is unique. */
  const dataKey = computed(() => `${basePath}?${new URLSearchParams(
    currentQueryRecord(route.query as RouteQueryLike),
  ).toString()}`);

  const { data, pending, error, refresh } = await useAsyncData<CursorPage<T> | null>(
    dataKey,
    () => (import.meta.server ? fetchPage(pageQuery.value) : Promise.resolve(null)),
    { server: true, watch: [() => route.fullPath] },
  );

  const items = computed<T[]>(() => data.value?.items ?? []);
  const pageInfo = computed<CursorPage<unknown>["page"]>(
    () => data.value?.page ?? { nextCursor: null, hasMore: false },
  );

  function currentQueryRecord(query: RouteQueryLike): Record<string, string> {
    const record: Record<string, string> = {};
    for (const key of Object.keys(query)) {
      const value = readQueryString(query, key);
      if (value) record[key] = value;
    }
    return record;
  }

  function buildUrl(patch: Record<string, string | null | undefined>): string {
    const params = patchQueryParams(currentQueryRecord(route.query as RouteQueryLike), patch);
    const querystring = new URLSearchParams(params).toString();
    return querystring ? `${basePath}?${querystring}` : basePath;
  }

  /** Legacy `navigate(query, cursor)` / `navigateCursor(cursor)`. */
  async function navigate(patch: Record<string, string | null | undefined>): Promise<void> {
    await navigateTo(buildUrl(patch), { external: true });
  }

  /** Advance to the next page using the envelope cursor. */
  async function next(): Promise<void> {
    const nextCursor = pageInfo.value.nextCursor;
    if (nextCursor) await navigate({ cursor: nextCursor });
  }

  /** Legacy directories go back via history; disabled when on page one. */
  async function previous(): Promise<void> {
    if (hasPrevious.value) window.history.back();
  }

  return {
    items,
    pageInfo,
    hasPrevious,
    search,
    cursor,
    pageQuery,
    loading: pending,
    error,
    refresh,
    navigate,
    next,
    previous,
  };
}
