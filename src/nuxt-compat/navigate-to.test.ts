//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA navigateTo compat shim
//

import { afterEach, describe, expect, it, vi } from "vitest";

// The compat shim resolves the router lazily from `@/src/router`; the fake
// stands in for the real router instance so the tests run in a bare Node
// environment.
const { routerPush, routerReplace } = vi.hoisted(() => ({
  routerPush: vi.fn(async () => undefined),
  routerReplace: vi.fn(async () => undefined),
}));

vi.mock("@/src/router", () => ({
  router: { push: routerPush, replace: routerReplace },
}));

import { navigateTo } from "./navigate-to";

describe("navigateTo (SPA compat)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    routerPush.mockClear();
    routerReplace.mockClear();
  });

  it("pushes internal targets through the router by default", async () => {
    await navigateTo("/account");

    expect(routerPush).toHaveBeenCalledWith("/account");
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("replaces history for the frozen 307 redirect semantics", async () => {
    await navigateTo("/login", { redirectCode: 307 });

    expect(routerReplace).toHaveBeenCalledWith("/login");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("replaces history for 301 and 308 redirect codes", async () => {
    await navigateTo("/a", { redirectCode: 301 });
    await navigateTo("/b", { redirectCode: 308 });

    expect(routerReplace).toHaveBeenCalledTimes(2);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("keeps push semantics for other redirect codes (302 default)", async () => {
    await navigateTo("/a", { redirectCode: 302 });

    expect(routerPush).toHaveBeenCalledWith("/a");
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("honours an explicit replace option", async () => {
    await navigateTo("/somewhere", { replace: true });

    expect(routerReplace).toHaveBeenCalledWith("/somewhere");
  });

  it("supports object route locations", async () => {
    await navigateTo({ path: "/admin", query: { tab: "users" } });

    expect(routerPush).toHaveBeenCalledWith({ path: "/admin", query: { tab: "users" } });
  });

  it("performs external navigation through window.location.assign", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    await navigateTo("https://example.com/consent", { external: true });

    expect(assign).toHaveBeenCalledWith("https://example.com/consent");
    expect(routerPush).not.toHaveBeenCalled();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("rejects external navigation for non-string targets", async () => {
    vi.stubGlobal("window", { location: { assign: vi.fn() } });

    await expect(
      navigateTo({ path: "/x" }, { external: true }),
    ).rejects.toThrow(TypeError);
  });
});
