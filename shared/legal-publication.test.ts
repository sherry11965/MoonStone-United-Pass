//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Contract tests for the SPA legal-publication manifest verification
//

import { afterEach, describe, expect, it, vi } from "vitest";

// The browser HTTP client resolves `@/shared/constants`, which still reads
// `useRuntimeConfig` from `#imports` (frozen until P2 step 9). The stub
// mirrors the bare-vitest `#imports` defaults used by the SSR contract suite.
vi.mock("#imports", () => ({
  useEvent: () => undefined,
  getRequestHeader: (): undefined => undefined,
  useRuntimeConfig: () => ({
    apiBaseUrl: "http://localhost:8080/api/v1",
    public: { useMock: false },
  }),
}));

import { legalManifest } from "@/features/legal/data/legal-manifest";
import {
  getLegalPublication,
  legalEffectiveDate,
  verifyLegalPublication,
} from "@/shared/legal-publication";

type FetchCall = {
  url: string;
  init: RequestInit;
};

function stubFetch(response: Response): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return response;
    }),
  );
  return { calls };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function privacyItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    documentKind: "privacy",
    version: legalManifest.privacy.version,
    contentSha256: legalManifest.privacy.contentSha256,
    status: "effective",
    effectiveAt: "2026-02-28T16:00:00Z",
    publishedAt: "2026-02-20T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getLegalPublication (browserFetch) manifest verification", () => {
  it("returns the narrowed publication when version and SHA-256 both match", async () => {
    stubFetch(jsonResponse({ items: [privacyItem()] }));

    await expect(getLegalPublication("privacy")).resolves.toEqual({
      documentKind: "privacy",
      version: legalManifest.privacy.version,
      contentSha256: legalManifest.privacy.contentSha256,
      status: "effective",
      effectiveAt: "2026-02-28T16:00:00Z",
      publishedAt: "2026-02-20T00:00:00Z",
    });
  });

  it("queries the same-origin legal-documents endpoint through browserFetch", async () => {
    const { calls } = stubFetch(jsonResponse({ items: [privacyItem()] }));

    await getLegalPublication("privacy");

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("/api/v1/legal-documents");
    expect(calls[0].init.method).toBe("GET");
    expect(calls[0].init.credentials).toBe("same-origin");
  });

  it("accepts the scheduled status for a controlled future release", async () => {
    stubFetch(jsonResponse({ items: [privacyItem({ status: "scheduled" })] }));

    const publication = await getLegalPublication("privacy");

    expect(publication?.status).toBe("scheduled");
  });

  it("rejects a version mismatch with the immutable manifest", async () => {
    stubFetch(jsonResponse({ items: [privacyItem({ version: "9.9" })] }));

    await expect(getLegalPublication("privacy")).resolves.toBeNull();
  });

  it("rejects a content SHA-256 mismatch with the immutable manifest", async () => {
    stubFetch(jsonResponse({ items: [privacyItem({ contentSha256: "0".repeat(64) })] }));

    await expect(getLegalPublication("privacy")).resolves.toBeNull();
  });

  it("rejects any status outside scheduled/effective", async () => {
    stubFetch(jsonResponse({ items: [privacyItem({ status: "draft" })] }));

    await expect(getLegalPublication("privacy")).resolves.toBeNull();
  });

  it("rejects records missing string effectiveAt/publishedAt timestamps", async () => {
    stubFetch(jsonResponse({ items: [privacyItem({ effectiveAt: 12345 })] }));

    await expect(getLegalPublication("privacy")).resolves.toBeNull();
  });

  it("selects only the requested document kind", async () => {
    stubFetch(jsonResponse({ items: [privacyItem()] }));

    await expect(getLegalPublication("terms")).resolves.toBeNull();
  });

  it("fails closed on a malformed response body", async () => {
    stubFetch(jsonResponse({ unexpected: true }));

    await expect(getLegalPublication("privacy")).resolves.toBeNull();
  });

  it("fails closed on a non-OK backend response", async () => {
    stubFetch(jsonResponse({ error: { message: "backend unavailable" } }, 500));

    await expect(getLegalPublication("privacy")).resolves.toBeNull();
  });

  it("fails closed on a transport error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));

    await expect(getLegalPublication("privacy")).resolves.toBeNull();
  });
});

describe("verifyLegalPublication pure narrowing", () => {
  it("narrows a valid payload without any fetch", () => {
    expect(verifyLegalPublication({ items: [privacyItem()] }, "privacy")).toMatchObject({
      documentKind: "privacy",
      version: legalManifest.privacy.version,
    });
  });

  it("returns null for non-object payloads", () => {
    expect(verifyLegalPublication(null, "privacy")).toBeNull();
    expect(verifyLegalPublication("items", "privacy")).toBeNull();
    expect(verifyLegalPublication([], "privacy")).toBeNull();
  });
});

describe("legalEffectiveDate display contract", () => {
  it("reports the controlled-publication pending state when unpublished", () => {
    expect(legalEffectiveDate(null)).toBe("暂未生效（等待法务批准与受控发布）");
  });

  it("formats an effective publication in zh-CN Asia/Shanghai time", () => {
    const publication = {
      documentKind: "privacy",
      version: legalManifest.privacy.version,
      contentSha256: legalManifest.privacy.contentSha256,
      status: "effective",
      // 2026-03-01 00:00 UTC = 2026-03-01 08:00 Asia/Shanghai.
      effectiveAt: "2026-03-01T00:00:00Z",
      publishedAt: "2026-02-20T00:00:00Z",
    } as const;

    expect(legalEffectiveDate(publication)).toBe("2026年3月1日");
  });

  it("prefixes the scheduled date for a not-yet-effective publication", () => {
    const publication = {
      documentKind: "terms",
      version: legalManifest.terms.version,
      contentSha256: legalManifest.terms.contentSha256,
      status: "scheduled",
      effectiveAt: "2026-09-01T00:00:00Z",
      publishedAt: "2026-08-20T00:00:00Z",
    } as const;

    expect(legalEffectiveDate(publication)).toBe("计划于 2026年9月1日 生效");
  });
});
