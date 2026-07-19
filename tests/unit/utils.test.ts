import { describe, it, expect } from "vitest";
import { isRecord, stringValue, numberValue, booleanValue } from "../../src/utils.js";

describe("isRecord", () => {
  it("returns true for plain objects", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns false for arrays", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isRecord("string")).toBe(false);
    expect(isRecord(42)).toBe(false);
    expect(isRecord(true)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});

describe("stringValue", () => {
  it("returns string values as-is", () => {
    expect(stringValue("hello")).toBe("hello");
  });

  it("returns undefined for non-strings", () => {
    expect(stringValue(42)).toBeUndefined();
    expect(stringValue(null)).toBeUndefined();
    expect(stringValue(undefined)).toBeUndefined();
    expect(stringValue({})).toBeUndefined();
  });
});

describe("numberValue", () => {
  it("returns finite numbers as-is", () => {
    expect(numberValue(42)).toBe(42);
    expect(numberValue(0)).toBe(0);
    expect(numberValue(-1)).toBe(-1);
  });

  it("returns undefined for NaN and Infinity", () => {
    expect(numberValue(NaN)).toBeUndefined();
    expect(numberValue(Infinity)).toBeUndefined();
    expect(numberValue(-Infinity)).toBeUndefined();
  });

  it("parses numeric strings", () => {
    expect(numberValue("42")).toBe(42);
    expect(numberValue("3.14")).toBe(3.14);
  });

  it("returns undefined for empty/whitespace strings", () => {
    expect(numberValue("")).toBeUndefined();
    expect(numberValue("   ")).toBeUndefined();
  });
});

describe("booleanValue", () => {
  it("returns boolean values as-is", () => {
    expect(booleanValue(true)).toBe(true);
    expect(booleanValue(false)).toBe(false);
  });

  it("returns undefined for non-booleans", () => {
    expect(booleanValue("true")).toBeUndefined();
    expect(booleanValue(1)).toBeUndefined();
    expect(booleanValue(null)).toBeUndefined();
  });
});
