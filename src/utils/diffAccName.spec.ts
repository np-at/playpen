import {beforeAll, describe, expect, it } from "vitest";
import { levenshtein, levenshteinEditDistance } from "./diffAccName";
import { randomString } from "./stringUtils.js";

const ARLENGTH = 1000;
const MIN_LENGTH = 15;
const MAX_LENGTH = 30;
const ITER_COUNT = 100;
describe("levenshtein perf testing", () => {
  const testStrings = new Array<string>(ARLENGTH);
  beforeAll(() => {
    for (let i = 0; i < testStrings.length; i++) {
      const strL = Math.random() * (MAX_LENGTH - MIN_LENGTH) + MIN_LENGTH;
      testStrings[i] = randomString(strL);
    }
  });

  it("test levenshtein", {concurrent: false},() => {
    // START TEST2
    // prime cache
    for (let i = 0; i < 100; i++) {
      const endIndex = testStrings.length - 1;
      for (let i1 = 0; i1 < endIndex; i1++) {
        const str = testStrings[i1];
        const str2 = testStrings[i1 + 1];
        levenshteinEditDistance(str, str2, false);
      }
    }
    let sum2 = 0;
    performance.mark("start2");
    for (let i = 0; i < ITER_COUNT; i++) {
      const endIndex = testStrings.length - 1;
      for (let i1 = 0; i1 < endIndex; i1++) {
        const str = testStrings[i1];
        const str2 = testStrings[i1 + 1];
        sum2 += levenshteinEditDistance(str, str2, false);
      }
    }
    performance.mark("end2");
    const diff2 = performance.measure("diff2", "start2", "end2").duration;
    console.log("levenshteinEditDistance", diff2);

    /// END TEST2

    // ******************************************************

    /// START TEST1
    // prime cache
    for (let i = 0; i < 100; i++) {
      const endIndex = testStrings.length - 1;
      for (let i1 = 0; i1 < endIndex; i1++) {
        const str = testStrings[i1];
        const str2 = testStrings[i1 + 1];
        levenshtein(str, str2);
      }
    }
    let sum1 = 0;
    performance.mark("start1");
    for (let i = 0; i < ITER_COUNT; i++) {
      const endIndex = testStrings.length - 1;
      for (let i1 = 0; i1 < endIndex; i1++) {
        const str = testStrings[i1];
        const str2 = testStrings[i1 + 1];
        sum1 += levenshtein(str, str2);
      }
    }
    performance.mark("end1");
    const diff1 = performance.measure("diff1", "start1", "end1").duration;
    console.log("levenshtein", diff1);

    console.log("average string length", testStrings.reduce((acc, cur) => acc + cur.length, 0) / testStrings.length);
    expect(sum1).toBe(sum2);
    expect((diff1 - diff2) / ITER_COUNT).toBeLessThan(1000);
  });
});
