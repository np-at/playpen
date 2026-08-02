import { describe, expect, it } from "vitest";
import { assert } from "./assert";

describe("assert", () => {
  it("throws the requested assertion error when Error.captureStackTrace is unavailable", () => {
    const captureStackTrace = Object.getOwnPropertyDescriptor(Error, "captureStackTrace");

    try {
      Object.defineProperty(Error, "captureStackTrace", { configurable: true, value: undefined });

      let thrown: unknown;
      try {
        assert(false, "Expected assertion failure");
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).not.toBeInstanceOf(TypeError);
      expect((thrown as Error).message).toBe("Expected assertion failure");
    } finally {
      if (captureStackTrace === undefined) {
        Reflect.deleteProperty(Error, "captureStackTrace");
      } else {
        Object.defineProperty(Error, "captureStackTrace", captureStackTrace);
      }
    }
  });
});
