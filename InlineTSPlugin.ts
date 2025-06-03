import type { Plugin } from "vite";
import { createFilter } from "vite";
import {join, dirname } from "node:path";
import { build } from "esbuild";

const defaults = {
  exclude: null,
  include: null,
  minify: true
};

function cleanCode(c: string) {
  return c.trim();
}

const formatAsBookmarklet = (code: string, encode = true) => {
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
    sourcemap: isDebug ? 'inline' : false,
    sourcesContent: true,
    platform: "browser",
    splitting:false,
    outdir: 'dist/',
    tsconfigRaw: {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        verbatimModuleSyntax: true,
        strict: true,
      },
    },

    ...(minify ? {
      minify: true,
      treeShaking: true,
      keepNames: false,
      legalComments: "none",
      format: "esm",
      mangleProps: /_$/,
      minifyWhitespace: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      mangleQuoted: true} : {})
  });
  const code = buildResult.outputFiles.find(x=>x.path.endsWith('.js'))
  // const sourceMap = JSON.parse(buildResult.outputFiles.find(x=>x.path.endsWith('.map'))?.text ?? '') as SourceMap | undefined
  if (!code){
    throw new Error(`code result not found during bundling of ${inputFile}`)
  }
  return formatAsBookmarklet(code.text, true)
}

export default function inlineTS(opts = {}): Plugin {
  const options = Object.assign({}, defaults, opts);
  const filter = createFilter(options.include, options.exclude);
  const resolved: { [key: string]: { content: string | null } } = {};

  return {
    name: "inlineTS",
    resolveId(source, importer) {
      if (source.indexOf("ts:") === -1) {
        return null;
      }
      if (!source.startsWith("ts:")) {
        return null;
      }
      const _src = source.slice(3);

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
    async load(this, id: string) {
      if (!filter(id)) {
        return null;
      }
      if (!resolved[id]) {
        return null;
      }

      this.addWatchFile(id);

      const code = await compile(id, options.minify, false);

      return {
        code: `export default ${code.trim()}`,
      };
    },
  };
}
