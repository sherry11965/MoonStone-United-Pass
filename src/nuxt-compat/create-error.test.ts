//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Unit tests for the SPA createError compat shim
//

import { describe, expect, it } from "vitest";
import { createError, isCompatError, toCompatError } from "./create-error";

describe("createError (SPA compat)", () => {
  it("builds a throwable Error carrying statusCode and message", () => {
    const error = createError({ statusCode: 404, message: "找不到这个页面" });

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("找不到这个页面");
    expect(error.fatal).toBe(false);
  });

  it("defaults to a 500 status code", () => {
    const error = createError({ message: "Failed to resolve the login session" });

    expect(error.statusCode).toBe(500);
  });

  it("falls back to statusMessage when message is absent", () => {
    const error = createError({ statusCode: 503, statusMessage: "Service unavailable" });

    expect(error.message).toBe("Service unavailable");
    expect(error.statusMessage).toBe("Service unavailable");
  });

  it("prefers message over statusMessage", () => {
    const error = createError({
      statusCode: 401,
      message: "会话已过期",
      statusMessage: "Unauthorized",
    });

    expect(error.message).toBe("会话已过期");
    expect(error.statusMessage).toBe("Unauthorized");
  });

  it("accepts the string shorthand", () => {
    const error = createError("boom");

    expect(error.statusCode).toBe(500);
    expect(error.message).toBe("boom");
  });

  it("preserves the fatal flag", () => {
    const error = createError({ statusCode: 500, message: "x", fatal: true });

    expect(error.fatal).toBe(true);
  });

  it("can be thrown and caught with its fields intact", () => {
    expect(() => {
      throw createError({ statusCode: 403, message: "拒绝访问" });
    }).toThrowError("拒绝访问");

    try {
      throw createError({ statusCode: 403, message: "拒绝访问" });
    } catch (caught) {
      expect(isCompatError(caught)).toBe(true);
      if (isCompatError(caught)) {
        expect(caught.statusCode).toBe(403);
      }
    }
  });
});

describe("isCompatError / toCompatError", () => {
  it("recognizes only compat-shaped Error instances", () => {
    expect(isCompatError(createError({ statusCode: 404, message: "x" }))).toBe(true);
    expect(isCompatError(new Error("plain"))).toBe(false);
    expect(isCompatError({ statusCode: 404, message: "x" })).toBe(false);
    expect(isCompatError(null)).toBe(false);
  });

  it("passes compat errors through toCompatError unchanged", () => {
    const error = createError({ statusCode: 410, message: "gone" });

    expect(toCompatError(error)).toBe(error);
  });

  it("normalizes unknown thrown values into 500 errors", () => {
    const plain = toCompatError(new Error("network down"));
    expect(plain.statusCode).toBe(500);
    expect(plain.message).toBe("network down");

    const primitive = toCompatError("weird failure");
    expect(primitive.statusCode).toBe(500);
    expect(primitive.message).toBe("weird failure");
  });
});
