// @vitest-environment happy-dom
//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA useHead title compat shim
//

import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it } from "vitest";
import { SYSTEM_NAME } from "@/shared/branding";
import {
  currentHeadTitle,
  documentTitleTemplate,
  resetHeadTitle,
  useApplyDocumentTitle,
  useHead,
} from "./use-head";

describe("documentTitleTemplate", () => {
  it("applies the frozen '<页面> | <系统名>' template", () => {
    expect(documentTitleTemplate("隐私政策")).toBe(`隐私政策 | ${SYSTEM_NAME}`);
  });

  it("falls back to the bare system name without a page title", () => {
    expect(documentTitleTemplate(undefined)).toBe(SYSTEM_NAME);
    expect(documentTitleTemplate(null)).toBe(SYSTEM_NAME);
    expect(documentTitleTemplate("")).toBe(SYSTEM_NAME);
  });
});

describe("useHead (SPA compat)", () => {
  beforeEach(() => {
    resetHeadTitle();
    document.title = "";
  });

  it("writes the page title override", () => {
    useHead({ title: "服务条款" });
    expect(currentHeadTitle()).toBe("服务条款");
  });

  it("ignores calls without a title field", () => {
    useHead();
    expect(currentHeadTitle()).toBeUndefined();
  });

  it("follows a reactive title source", async () => {
    const title = ref<string | null>("找不到这个页面");
    useHead({ title });

    expect(currentHeadTitle()).toBe("找不到这个页面");

    title.value = null;
    await nextTick();

    expect(currentHeadTitle()).toBeUndefined();
  });

  it("resets the override between route changes", () => {
    useHead({ title: "登录" });
    expect(currentHeadTitle()).toBe("登录");

    resetHeadTitle();

    expect(currentHeadTitle()).toBeUndefined();
  });

  it("mirrors the template-applied title onto document.title", async () => {
    useApplyDocumentTitle();

    useHead({ title: "United Pass · Naive UI SSR Spike" });
    await nextTick();

    expect(document.title).toBe(
      `United Pass · Naive UI SSR Spike | ${SYSTEM_NAME}`,
    );

    resetHeadTitle();
    await nextTick();

    expect(document.title).toBe(SYSTEM_NAME);
  });
});
