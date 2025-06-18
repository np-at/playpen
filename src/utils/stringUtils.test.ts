import { describe, it, expect } from "vitest";
import { short_uuid } from "./stringUtils";

describe("string utils", () => {
  it("should output a uuid in format XXXX-XXXX-XXXX-XXXX", () => {
    const r = short_uuid();
    expect(r).match(/(?:[a-zA-Z]{4}-){3}[a-zA-Z]{4}/);
  });
  // test('fuzz uniqueness', ()=>{
  //
  //   const ITERATE_COUNT = 10000
  //   const seen = new Array<string>(ITERATE_COUNT);
  //   for (let i = 0; i < ITERATE_COUNT; i++) {
  //     seen[i] = short_uuid()
  //   }
  //   expect(seen, "non-unique value found").toHaveLength((Array.from(new Set(seen)).length))
  // })
});
