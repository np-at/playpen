import { resolve } from "node:path";
import { Script } from "node:vm";
import { describe, expect, it } from "vitest";
import inlineTS from "../vite_plugins/InlineTSPlugin.ts";

describe("InlineTSPlugin", () => {
  it.each(["ShowImageAlt", "FocusStyleCheck"])("emits an executable classic-script payload for %s", async (name) => {
    const plugin = inlineTS();
    const resolveId = plugin.resolveId;
    if (typeof resolveId !== "function") throw new Error("InlineTS plugin needs a resolveId hook");
    const entry = resolveId.call(
      {} as never,
      `./_bookmarklets/${name}.ts?inlineTS`,
      resolve("src/main.ts"),
      {} as never,
    );

    expect(typeof entry).toBe("string");

    const load = plugin.load;
    if (typeof load !== "function") throw new Error("InlineTS plugin needs a load hook");
    const loaded = await load.call(
      { addWatchFile() {} } as never,
      entry as string,
      {} as never,
    );

    if (typeof loaded !== "object" || loaded === null || !("code" in loaded) || typeof loaded.code !== "string") {
      throw new Error("InlineTS plugin must load a JavaScript module");
    }
    expect(loaded.code).toMatch(/^export default 'javascript:/);
    const generatedModule = (await import(`data:text/javascript,${encodeURIComponent(loaded.code)}`)) as unknown as {
      default: unknown;
    };
    const bookmarklet = generatedModule.default;

    expect(typeof bookmarklet).toBe("string");
    expect(() => new Script(decodeURIComponent((bookmarklet as string).slice("javascript:".length)))).not.toThrow();
  });
});
