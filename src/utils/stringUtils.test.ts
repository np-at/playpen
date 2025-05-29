import {describe, it, expect} from "vitest"
import {randStr2} from "./stringUtils"


describe("string utils", ()=>{


    it('should work', (cxt)=>{
        const r = randStr2(5)
        console.warn(r)

        expect(r.length).toBe(5)
    })
});
