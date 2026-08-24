//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA useAsyncData compat shim
//

import { describe, expect, it, vi } from "vitest";
import { useAsyncData } from "./use-async-data";

describe("useAsyncData (SPA compat)", () => {
  it("resolves the handler result into data after await", async () => {
    const handler = vi.fn(async () => ({ effectiveDate: "2026年3月1日" }));

    const { data, pending, error } = await useAsyncData("legal-key", handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(data.value).toEqual({ effectiveDate: "2026年3月1日" });
    expect(error.value).toBeNull();
    expect(pending.value).toBe(false);
  });

  it("is thenable and resolves to the live shape (destructuring parity)", async () => {
    const asyncData = useAsyncData("key", async () => 42);
    const awaited = await asyncData;

    // The await resolves to a snapshot exposing the same live refs (the
    // thenable itself cannot be the resolution target — the await machinery
    // would recursively unwrap it).
    expect(awaited.data).toBe(asyncData.data);
    expect(awaited.pending).toBe(asyncData.pending);
    expect(awaited.error).toBe(asyncData.error);
    expect(asyncData.data.value).toBe(42);
  });

  it("starts pending and clears it once the handler settles", async () => {
    let resolve!: (value: string) => void;
    const handler = vi.fn(
      () => new Promise<string>((r) => { resolve = r; }),
    );

    const asyncData = useAsyncData("key", handler);
    expect(asyncData.pending.value).toBe(true);
    expect(asyncData.data.value).toBeNull();

    resolve("done");
    await asyncData;

    expect(asyncData.pending.value).toBe(false);
    expect(asyncData.data.value).toBe("done");
  });

  it("captures handler rejections into error without rejecting the await", async () => {
    const failure = new Error("backend unavailable");
    const handler = vi.fn(async () => {
      throw failure;
    });

    const { data, error, pending } = await useAsyncData("key", handler);

    expect(error.value).toBe(failure);
    expect(data.value).toBeNull();
    expect(pending.value).toBe(false);
  });

  it("wraps non-Error rejections into Error instances", async () => {
    const { error } = await useAsyncData("key", async () => {
      throw "plain failure";
    });

    expect(error.value).toBeInstanceOf(Error);
    expect(error.value?.message).toBe("plain failure");
  });

  it("refresh re-runs the handler and replaces data", async () => {
    let calls = 0;
    const asyncData = useAsyncData("key", async () => {
      calls += 1;
      return calls;
    });
    await asyncData;
    expect(asyncData.data.value).toBe(1);

    await asyncData.refresh();

    expect(asyncData.data.value).toBe(2);
    expect(asyncData.error.value).toBeNull();
  });

  it("clears a previous error when a refresh succeeds", async () => {
    let shouldFail = true;
    const asyncData = useAsyncData("key", async () => {
      if (shouldFail) throw new Error("first attempt fails");
      return "recovered";
    });
    await asyncData;
    expect(asyncData.error.value).not.toBeNull();

    shouldFail = false;
    await asyncData.refresh();

    expect(asyncData.error.value).toBeNull();
    expect(asyncData.data.value).toBe("recovered");
  });

  it("accepts the Nuxt options object without changing behaviour", async () => {
    const { data } = await useAsyncData("key", async () => "ok", { server: true });
    expect(data.value).toBe("ok");
  });
});
