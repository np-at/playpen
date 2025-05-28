import {TypescriptBundler} from "@puresamari/ts-bundler";
import {transformWithEsbuild} from "vite";
import type {Plugin} from "vite";
import {createFilter} from "vite";
import path, {join, resolve} from "node:path";


const defaults = {
    exclude: null,
    include: null
};

function cleanCode(c: string) {
    return c.trim();
}
const formatAsBookmarklet = (code: string, encode = true) => {
    return "'javascript:" + (encode ? encodeURIComponent : (e: string) => e)("(function(){" + cleanCode(code)).replace(/(')/g, "\\$1") + "})();'";
    // return "'javascript:" + encodeURIComponent(cleanCode(code).replace(/(['])/g, "\\$1")) +";'";

};

async function compile(inputFile: string, minify: boolean) {
    // const e = extractEntryPoint(resolve(inputFile), undefined);

    const bundler = new TypescriptBundler(resolve(import.meta.dirname,inputFile), join(import.meta.dirname, "tsconfig.json"));
    const r = await bundler.bundle();

    // const console = await import("node:console");
    // console.log(r.output);

    if (minify) {
        const minified = await transformWithEsbuild(r.output , inputFile, {
            minify: true,
            target: 'esnext',
            platform: 'browser',
            treeShaking: true,
            sourcemap: 'external',
            keepNames: false,
            legalComments: 'none',
            format: 'cjs',
            mangleProps:/_$/,
            minifyWhitespace: true,
            minifyIdentifiers: true,
            minifySyntax: true,
            loader:'js',
            mangleQuoted:true
        })
        // const minified = await terserMinify(r.output, {
        //     compress: {
        //         dead_code: true,
        //         defaults: true,
        //         ecma: 2020,
        //         keep_fnames: false,
        //         keep_fargs: false,
        //         keep_classnames: false,
        //         passes: 3,
        //         booleans_as_integers: true,
        //         drop_console: false,
        //         expression: true,
        //         module: true,
        //         toplevel: true,
        //     },
        //
        //     // mangle: true,
        //     mangle: {
        //         keep_fnames: false,
        //         toplevel: true,
        //         keep_classnames: false,
        //         properties: false,
        //         module: true,
        //     },
        //     format: {
        //         comments: false,
        //         ecma: 2020
        //     },
        //
        //     // toplevel: true,
        //     sourceMap: {
        //         asObject: false,
        //     },
        //     // format: {
        //     //   ecma: 2020,
        //     //   comments: false,
        //     //
        //     // }
        // });
        if (!minified.code) {
            throw new Error("Failed to minify code");
        }
        // console.info(`compiled ${inputFile} to ${minified.code.length} bytes; unminified: ${r.output.length} bytes`);
        console.info(`${inputFile}: ${r.output.length / 1000}kb  -->  ${minified.code.length / 1000}kb`)

        return {
            code: formatAsBookmarklet(minified.code, true),
            // code: minified.code,
            map: minified.map,
        };
    } else {
        return {
            code:formatAsBookmarklet(r.output),
            // code: formatAsBookmarklet(r.output),
            map: r.map
        };
    }
}



export default function inlineTS(opts = {}): Plugin {
    const options = Object.assign({}, defaults, opts);
    const filter = createFilter(options.include, options.exclude);
    const resolved: { [key: string]: { content: string | null } } = {};

    return {
        name: 'inlineTS',
        resolveId(source, importer) {

            if (source.indexOf('ts:') === -1) {
                return null;
            }
            // when using node16 or nodenext module resolution, we need to tell ts if
            // we are resolving to a commonjs or esnext module
            if (!source.startsWith('ts:')) {
                return null;
            }
            const _src = source.slice(3)

            // console.error(`src is ${_src}`)
            if (!_src.startsWith(".")) {
                resolved[_src] = {content:''}
                return _src;
            }
            if (!importer) return null;

            // if (!reDataUri.test(id)) {
            //     return null;
            // }
            //
            // const uri = new URL(id);
            //
            // if (uri.protocol !== 'ts:') {
            //     return null;
            // }
            const newId =  path.join(path.dirname(importer),_src);
            resolved[newId] = {content:''}
            // const newId =  id.slice(3);
            // console.warn(`new id is ${newId}`)
            return newId
        },
        enforce:'pre',
        async load(this,id:string) {
            // console.log(`id: ${id}`)
            // console.log(`resolved: ${JSON.stringify(resolved)}`)
            if (id.startsWith('ts:')) {
                console.error("BLAAAA")
            }
            if (!filter(id)) {
                return null;
            }
            if (!resolved[id]) {
                return null;
            }
            // if (!reDataUri.test(id)) {
            //     return null;
            // }
            // console.error(id)

            // // const d =
            // if (d?.protocol !== 'ts') {
            //     return null;
            // }

            this.addWatchFile(id)

            const code = await compile(id, true);

            // console.warn(`map: ${JSON.stringify(code.map)}`)
            return {
                code: `export default ${code.code.trim()}`
            };


        }
    }
}
