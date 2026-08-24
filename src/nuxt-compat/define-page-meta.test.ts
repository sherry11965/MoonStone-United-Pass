//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA definePageMeta compat shim
//

import { describe, expect, it } from "vitest";
import { definePageMeta } from "./define-page-meta";

describe("definePageMeta (SPA compat)", () => {
  it("is a no-op returning undefined", () => {
    expect(definePageMeta({ layout: "auth" })).toBeUndefined();
    expect(definePageMeta({ layout: false })).toBeUndefined();
    expect(definePageMeta()).toBeUndefined();
  });

  it("accepts the frozen call shapes without throwing", () => {
    expect(() => definePageMeta({ layout: "dashboard" })).not.toThrow();
    expect(() => definePageMeta({ layout: false })).not.toThrow();
    expect(() => definePageMeta({ layout: "account", custom: 1 })).not.toThrow();
  });
});
