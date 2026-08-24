//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the dual-stack router base seam
//

import { afterEach, describe, expect, it, vi } from "vitest";

// Static imports resolve through the REAL adapter: bare vitest is not the
// Vite SPA stack (`__UP_SPA_BUILD__` absent), so ROUTER_BASE must degrade
// to the root base — the exact default-build and Nuxt-stack behaviour.
import { applyRouterBase, normalizeRouterBase, ROUTER_BASE } from "@/shared/router-base";

describe("normalizeRouterBase", () => {
  it("keeps an absolute base with trailing slash unchanged", () => {
    expect(normalizeRouterBase("/MoonStone-United-Pass/")).toBe("/MoonStone-United-Pass/");
    expect(normalizeRouterBase("/")).toBe("/");
  });

  it("appends the trailing slash to an absolute base without one", () => {
    expect(normalizeRouterBase("/MoonStone-United-Pass")).toBe("/MoonStone-United-Pass/");
  });

  it("degrades non-absolute values to the root base", () => {
    expect(normalizeRouterBase("")).toBe("/");
    expect(normalizeRouterBase("MoonStone-United-Pass/")).toBe("/");
    expect(normalizeRouterBase(undefined)).toBe("/");
    expect(normalizeRouterBase(42)).toBe("/");
  });
});

describe("applyRouterBase", () => {
  it("returns the target unchanged under the root base", () => {
    expect(applyRouterBase("/account", "/")).toBe("/account");
    expect(applyRouterBase("/authorize?requestId=req%2F42", "/")).toBe(
      "/authorize?requestId=req%2F42",
    );
  });

  it("prefixes absolute internal paths with the sub-path base", () => {
    expect(applyRouterBase("/account", "/MoonStone-United-Pass/")).toBe(
      "/MoonStone-United-Pass/account",
    );
    expect(applyRouterBase("/authorize?requestId=req_1", "/MoonStone-United-Pass/")).toBe(
      "/MoonStone-United-Pass/authorize?requestId=req_1",
    );
  });

  it("never produces a double slash at the join", () => {
    expect(applyRouterBase("/login", "/MoonStone-United-Pass/")).toBe(
      "/MoonStone-United-Pass/login",
    );
    // A base passed without its trailing slash is normalized first.
    expect(applyRouterBase("/login", "/MoonStone-United-Pass")).toBe(
      "/MoonStone-United-Pass/login",
    );
  });

  it("leaves full URLs untouched", () => {
    expect(applyRouterBase("https://workspace.example/callback", "/MoonStone-United-Pass/")).toBe(
      "https://workspace.example/callback",
    );
    expect(applyRouterBase("http://example.com/x", "/MoonStone-United-Pass/")).toBe(
      "http://example.com/x",
    );
  });

  it("leaves protocol-relative URLs untouched", () => {
    expect(applyRouterBase("//cdn.example.com/app.js", "/MoonStone-United-Pass/")).toBe(
      "//cdn.example.com/app.js",
    );
  });

  it("defaults to the stack-resolved ROUTER_BASE", () => {
    // Bare vitest is not the SPA stack: the default base is the root.
    expect(applyRouterBase("/account")).toBe("/account");
  });
});

describe("ROUTER_BASE stack resolution", () => {
  afterEach(() => {
    vi.doUnmock("@/shared/runtime-config-adapter");
    vi.resetModules();
  });

  it("resolves the root base outside the Vite SPA stack", () => {
    expect(ROUTER_BASE).toBe("/");
  });

  it("bakes the deployment base inside the Vite SPA stack", async () => {
    vi.resetModules();
    vi.doMock("@/shared/runtime-config-adapter", () => ({
      readRouterBaseRaw: () => "/MoonStone-United-Pass/",
    }));

    const { ROUTER_BASE: spaRouterBase } = await import("@/shared/router-base");

    expect(spaRouterBase).toBe("/MoonStone-United-Pass/");
  });
});
