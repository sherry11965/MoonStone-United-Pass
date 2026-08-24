//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the post-authentication hard navigation helper
//

import { afterEach, describe, expect, it, vi } from "vitest";

// Static imports resolve through the REAL adapter: bare vitest is not the
// Vite SPA stack, so hardNavigate must keep its exact legacy targets here
// (root base) — the Nuxt-stack and default-build behaviour.
import { hardNavigate, loginDestination } from "@/features/auth/auth-navigation";

describe("loginDestination", () => {
  it("returns the account center without an OAuth transaction", () => {
    expect(loginDestination()).toBe("/account");
    expect(loginDestination(undefined)).toBe("/account");
  });

  it("resumes the opaque authorization transaction at /authorize", () => {
    expect(loginDestination("req_1")).toBe("/authorize?requestId=req_1");
    // Only an opaque server-issued ID is ever encoded — never a raw URL.
    expect(loginDestination("req/42")).toBe("/authorize?requestId=req%2F42");
  });
});

describe("hardNavigate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("@/shared/runtime-config-adapter");
    vi.resetModules();
  });

  it("keeps internal targets unchanged under the root base", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    hardNavigate("/account");
    hardNavigate("/login");
    hardNavigate("/authorize?requestId=req_1");

    expect(assign).toHaveBeenNthCalledWith(1, "/account");
    expect(assign).toHaveBeenNthCalledWith(2, "/login");
    expect(assign).toHaveBeenNthCalledWith(3, "/authorize?requestId=req_1");
  });

  it("leaves external URLs untouched", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    hardNavigate("https://workspace.example/callback?code=abc");

    expect(assign).toHaveBeenCalledWith("https://workspace.example/callback?code=abc");
  });

  it("prefixes the deployment base onto internal targets in the SPA stack", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    vi.resetModules();
    vi.doMock("@/shared/runtime-config-adapter", () => ({
      readRouterBaseRaw: () => "/MoonStone-United-Pass/",
    }));

    const { hardNavigate: spaHardNavigate } = await import("@/features/auth/auth-navigation");

    spaHardNavigate("/account");
    spaHardNavigate("/login");
    spaHardNavigate("/authorize?requestId=req_1");
    spaHardNavigate("https://workspace.example/callback");

    expect(assign).toHaveBeenNthCalledWith(1, "/MoonStone-United-Pass/account");
    expect(assign).toHaveBeenNthCalledWith(2, "/MoonStone-United-Pass/login");
    expect(assign).toHaveBeenNthCalledWith(3, "/MoonStone-United-Pass/authorize?requestId=req_1");
    expect(assign).toHaveBeenNthCalledWith(4, "https://workspace.example/callback");
  });
});
