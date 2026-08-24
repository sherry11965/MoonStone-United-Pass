//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: SPA-compatible `createError` (Nuxt compat layer, P1 migration)
//

/**
 * Shape carried by errors produced by the compat layer — the fields the
 * migrated error view (`error.vue` → `src/components/ErrorView.vue`) and the
 * migrated pages actually read.
 */
export type CompatRouteError = {
  statusCode: number;
  statusMessage?: string;
  message: string;
  fatal?: boolean;
};

export type CompatRouteErrorInstance = Error & CompatRouteError;

export type CreateErrorInput = {
  statusCode?: number;
  statusMessage?: string;
  message?: string;
  fatal?: boolean;
};

/**
 * SPA drop-in for Nuxt's `createError({ statusCode, message, ... })`.
 *
 * Returns a real `Error` instance decorated with the Nuxt error fields, so it
 * can be thrown from async `<script setup>` (caught by the app-level error
 * boundary in `src/App.vue`) and inspected by the error view. Defaults mirror
 * Nuxt: statusCode 500, message falls back to statusMessage.
 */
export function createError(
  input: CreateErrorInput | string,
): CompatRouteErrorInstance {
  const normalized: CreateErrorInput =
    typeof input === "string" ? { message: input } : input;

  const error = new Error(
    normalized.message ?? normalized.statusMessage ?? "",
  ) as CompatRouteErrorInstance;

  error.statusCode = normalized.statusCode ?? 500;
  if (normalized.statusMessage !== undefined) {
    error.statusMessage = normalized.statusMessage;
  }
  error.fatal = normalized.fatal ?? false;

  return error;
}

/** Whether an unknown thrown value is a compat-layer error. */
export function isCompatError(
  value: unknown,
): value is CompatRouteErrorInstance {
  return (
    value instanceof Error &&
    typeof (value as CompatRouteErrorInstance).statusCode === "number"
  );
}

/**
 * Normalizes any thrown value into a compat error; non-compat values surface
 * as generic 500s without leaking their internals into `statusMessage`.
 */
export function toCompatError(value: unknown): CompatRouteErrorInstance {
  if (isCompatError(value)) return value;
  return createError({
    statusCode: 500,
    message: value instanceof Error ? value.message : String(value),
  });
}
