//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Tests for the pure cursor-pagination helpers (legacy ManagementDirectory contract)
//

import { describe, expect, it } from "vitest";
import {
  buildCursorPatch,
  buildFilterPatch,
  buildPageQuery,
  hasPreviousPage,
  patchQueryParams,
  readQueryCursor,
  readQueryString,
  readQuerySearch,
} from "@/features/admin/cursor-page";

describe("readQueryString", () => {
  it("returns string values", () => {
    expect(readQueryString({ q: "alice" }, "q")).toBe("alice");
  });

  it("returns the first array entry when present", () => {
    expect(readQueryString({ q: ["alice", "bob"] }, "q")).toBe("alice");
  });

  it("returns empty string for absent or malformed values", () => {
    expect(readQueryString({}, "q")).toBe("");
    expect(readQueryString({ q: null }, "q")).toBe("");
    expect(readQueryString({ q: [null] }, "q")).toBe("");
  });
});

describe("readQuerySearch / readQueryCursor", () => {
  it("reads the documented URL parameters", () => {
    expect(readQuerySearch({ q: "alice", cursor: "c1" })).toBe("alice");
    expect(readQueryCursor({ q: "alice", cursor: "c1" })).toBe("c1");
    expect(readQuerySearch({})).toBe("");
    expect(readQueryCursor({})).toBe("");
  });
});

describe("hasPreviousPage", () => {
  it("is true only when a cursor is active (legacy behaviour)", () => {
    expect(hasPreviousPage("")).toBe(false);
    expect(hasPreviousPage("cursor-2")).toBe(true);
  });
});

describe("buildPageQuery", () => {
  it("omits empty fields so the backend sees a clean PageQuery", () => {
    expect(buildPageQuery({ query: "", cursor: "" })).toEqual({});
  });

  it("carries every provided field", () => {
    expect(
      buildPageQuery({ query: "alice", cursor: "c1", limit: 25, sort: "-updatedAt", status: "active" }),
    ).toEqual({ query: "alice", cursor: "c1", limit: 25, sort: "-updatedAt", status: "active" });
  });
});

describe("patchQueryParams", () => {
  it("sets non-empty values and deletes empty ones without mutating the input", () => {
    const params = { q: "alice", cursor: "c1" };
    const next = patchQueryParams(params, { q: "", cursor: "c2" });
    expect(next).toEqual({ cursor: "c2" });
    expect(params).toEqual({ q: "alice", cursor: "c1" });
  });

  it("drops null values from the patch", () => {
    expect(patchQueryParams({ q: "a", cursor: "c1" }, { cursor: null })).toEqual({ q: "a" });
  });
});

describe("buildFilterPatch (legacy updateFilter)", () => {
  it("sets the filter and resets the cursor", () => {
    expect(buildFilterPatch({ q: "old", cursor: "c1" }, "eventType", "session.revoked")).toEqual({
      q: "old",
      eventType: "session.revoked",
    });
  });

  it("removes the filter when the value is cleared", () => {
    expect(buildFilterPatch({ q: "old", eventType: "session.revoked", cursor: "c1" }, "eventType", "")).toEqual({
      q: "old",
    });
  });
});

describe("buildCursorPatch (legacy navigateCursor)", () => {
  it("sets the cursor when advancing", () => {
    expect(buildCursorPatch({ q: "alice" }, "c2")).toEqual({ q: "alice", cursor: "c2" });
  });

  it("drops the cursor when returning to the first page", () => {
    expect(buildCursorPatch({ q: "alice", cursor: "c1" }, null)).toEqual({ q: "alice" });
    expect(buildCursorPatch({ q: "alice", cursor: "c1" }, undefined)).toEqual({ q: "alice" });
  });
});
