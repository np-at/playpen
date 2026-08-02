import type { Plugin, Rollup } from "vite";
import { createFilter } from "vite";
import { join, dirname, basename } from "node:path";
import { build, type OutputFile } from "esbuild";
import { ok as assert } from "node:assert";

const defaults = {
  exclude: null,
  include: null,
  minify: true,
};

function cleanCode(c: string) {
  return c.trim();
}

const formatAsBookmarklet = (output: OutputFile, encode = true) => {
  const { text: code } = output;
  return (
    "'javascript:" +
    (encode ? encodeURIComponent : (e: string) => e)("(async ()=>{" + cleanCode(code)).replace(/(')/g, "\\$1") +
    "})();'"
  );
};

async function compile(inputFile: string, minify: boolean, isDebug = false) {
  // const bundler = new TypescriptBundler(resolve(import.meta.dirname, inputFile), join(import.meta.dirname, "tsconfig.json"));
  // const r = await bundler.bundle();

  const buildResult = await build({
    bundle: true,
    entryPoints: [inputFile],
    treeShaking: true,

    write: false,
    sourcemap: isDebug ? "external" : false,
    sourcesContent: true,
    format: "iife",
    platform: "browser",
    splitting: false,
    outdir: "dist/",
    tsconfigRaw: {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        verbatimModuleSyntax: true,
        strict: true,
      },
    },

    ...(minify
      ? {
          minify: true,
          treeShaking: true,
          keepNames: false,
          legalComments: "none",
          mangleProps: /_$/,
          minifyWhitespace: true,
          minifyIdentifiers: true,
          minifySyntax: true,
          mangleQuoted: true,
        }
      : {}),
  });
  const code = buildResult.outputFiles.find((x) => x.path.endsWith(".js"));

  assert(typeof code !== "undefined", "code should be defined");

  const sourceMapFile = buildResult.outputFiles.find((x) => x.path.endsWith(basename(code.path) + ".map"));

  return { code: formatAsBookmarklet(code, true), map: sourceMapFile?.text };
}

export default function inlineTS(opts = {}): Plugin<void> {
  const options = Object.assign({}, defaults, opts);
  const filter = createFilter(options.include, options.exclude);
  const resolved: { [key: string]: { content: string | null } } = {};

  return {
    name: "inlineTS",
    resolveId(source, importer) {
      // if (source.includes('_bookmarklets')) {
      //   console.log(`${source} since type is ${JSON.stringify(opts)}`);
      //
      // }
      // if (!opts.attributes.inline) {
      //   // console.log(`skipping ${source} since type is ${JSON.stringify(opts)}`);
      //   return null;
      // }
      if (!source.endsWith("?inlineTS")) {
        return null;
      }

      // if (source.indexOf("ts:") === -1) {
      //   return null;
      // }
      // if (!source.startsWith("ts:")) {
      //   return null;
      // }
      const _src = source.slice(0, source.length - "?inlineTS".length);

      if (!_src.startsWith(".")) {
        resolved[_src] = { content: "" };
        return _src;
      }
      if (!importer) return null;
      const newId = join(dirname(importer), _src);
      resolved[newId] = { content: "" };
      // const newId =  id.slice(3);
      // console.warn(`new id is ${newId}`)
      return newId;
    },
    enforce: "pre",
    async load(this, id: string): Promise<Rollup.LoadResult> {
      if (!filter(id)) {
        return null;
      }
      if (!(id in resolved) || typeof resolved[id] === "undefined") {
        return null;
      }

      this.addWatchFile(id);

      const { code } = await compile(id, options.minify, false);

      // No `map` is returned: the emitted module is a single string literal holding the
      // bookmarklet URL, so esbuild's sourcemap for the bundled JS has no positional
      // relationship to it. Returning it (even parsed) yields a garbage sourcemap.
      return {
        code: `export default ${code.trim()}`,
        map: null,
      };
    },
  };
}
