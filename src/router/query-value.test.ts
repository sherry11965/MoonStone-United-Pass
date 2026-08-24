//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Contract tests for firstQueryValue (mirrors the Nuxt pages' queryValue)
//

import { describe, expect, it } from "vitest";
import { firstQueryValue } from "./query-value";

describe("firstQueryValue", () => {
  it("returns a non-empty string as-is", () => {
    expect(firstQueryValue("req_01")).toBe("req_01");
  });

  it("returns the first element of a string array", () => {
    expect(firstQueryValue(["req_01", "req_02"])).toBe("req_01");
  });

  it("returns undefined for an empty string", () => {
    expect(firstQueryValue("")).toBeUndefined();
  });

  it("returns undefined when the first array element is an empty string", () => {
    // Frozen Nuxt contract: only the FIRST element is consulted.
    expect(firstQueryValue(["", "req_02"])).toBeUndefined();
  });

  it("returns undefined for an empty array", () => {
    expect(firstQueryValue([])).toBeUndefined();
  });

  it("returns undefined for null and undefined", () => {
    expect(firstQueryValue(null)).toBeUndefined();
    expect(firstQueryValue(undefined)).toBeUndefined();
  });

  it("returns undefined for arrays whose first element is null", () => {
    expect(firstQueryValue([null, "req_02"])).toBeUndefined();
  });
});
