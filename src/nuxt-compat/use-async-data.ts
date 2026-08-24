//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA-compatible `useAsyncData` (Nuxt compat layer, P1 migration)
//

import { ref, shallowRef, type Ref, type ShallowRef } from "vue";

/**
 * Options accepted for signature parity with Nuxt's `useAsyncData`.
 *
 * `server` is meaningless in a client-only SPA and is ignored; it is kept so
 * mechanically migrated call sites (e.g. features composables passing
 * `{ server: true }`) compile unchanged.
 */
export type AsyncDataOptions = {
  server?: boolean;
  [key: string]: unknown;
};

export type AsyncData<T> = {
  data: ShallowRef<T | null>;
  pending: Ref<boolean>;
  error: ShallowRef<Error | null>;
  refresh: () => Promise<void>;
};

/**
 * SPA drop-in for Nuxt's `useAsyncData(key, handler)`.
 *
 * Minimal surface, derived from the actual page usage in this codebase
 * (privacy/terms destructure `{ data }` after `await`; the login page reads
 * `{ data, error }`):
 *
 * - the handler runs immediately and exactly once per `refresh()` call;
 * - awaiting the return value resolves after the initial run, so
 *   `const { data } = await useAsyncData(...)` keeps working inside async
 *   `<script setup>`;
 * - handler rejections are captured into `error` (Nuxt never rejects the
 *   `useAsyncData` promise itself), and `data` resets to `null`;
 * - the `key` is accepted for signature parity. The SPA does not share a
 *   cross-component payload cache in P1 (Nuxt's de-duplication relied on SSR
 *   payload serialization); every mount re-runs the handler. TODO(P3): shared
 *   in-memory cache if page-level double fetches become visible.
 */
export function useAsyncData<T>(
  key: string,
  handler: () => Promise<T>,
  options?: AsyncDataOptions,
): AsyncData<T> & PromiseLike<AsyncData<T>> {
  void key;
  void options;

  const data = shallowRef<T | null>(null);
  const pending = ref(true);
  const error = shallowRef<Error | null>(null);

  // Guards against a slow stale refresh overwriting a newer result.
  let generation = 0;

  async function refresh(): Promise<void> {
    const current = ++generation;
    pending.value = true;
    try {
      const result = await handler();
      if (current !== generation) return;
      data.value = result;
      error.value = null;
    } catch (caught) {
      if (current !== generation) return;
      data.value = null;
      error.value =
        caught instanceof Error ? caught : new Error(String(caught));
    } finally {
      if (current === generation) pending.value = false;
    }
  }

  const initialRun = refresh();

  const asyncData: AsyncData<T> & PromiseLike<AsyncData<T>> = {
    data,
    pending,
    error,
    refresh,
    // Thenable: `await useAsyncData(...)` resumes after the initial run,
    // matching Nuxt. Handler failures do not reject — they land in `error`,
    // exactly like the Nuxt contract. The resolution is a plain snapshot of
    // the live refs (NOT the thenable itself, which the `await` machinery
    // would re-unwrap into infinite recursion).
    then(onFulfilled, onRejected) {
      return initialRun
        .then(
          () => ({ data, pending, error, refresh }),
          () => ({ data, pending, error, refresh }),
        )
        .then(onFulfilled, onRejected);
    },
  };

  return asyncData;
}
