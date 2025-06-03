
import { describe, test, expect, beforeEach } from "vitest";
import {page} from "@vitest/browser/context"


describe('safari behavior', ()=>{
  beforeEach(async ()=>{

  })
  test('asdf',async ()=>{
    const el = page.getByTestId('t1')
      await expect.element(el).toBeTruthy()

  })
})
