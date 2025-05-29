import {TypescriptBundler} from "@puresamari/ts-bundler";
import type {Plugin} from "vite";
import {createFilter, transformWithEsbuild} from "vite";

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
};

async function compile(inputFile: string, minify: boolean) {

    const bundler = new TypescriptBundler(resolve(import.meta.dirname, inputFile), join(import.meta.dirname, "tsconfig.json"));
    const r = await bundler.bundle();

    if (minify) {
        const minified = await transformWithEsbuild(r.output, inputFile, {
            minify: true,
            target: 'esnext',
            platform: 'browser',
            treeShaking: true,
            sourcemap: 'external',
            keepNames: false,
            legalComments: 'none',
            format: 'cjs',
            mangleProps: /_$/,
            minifyWhitespace: true,
            minifyIdentifiers: true,
            minifySyntax: true,
            loader: 'js',
            mangleQuoted: true
        })
        if (!minified.code) {
            throw new Error("Failed to minify code");
        }
        // console.info(`compiled ${inputFile} to ${minified.code.length} bytes; unminified: ${r.output.length} bytes`);
        console.info(`${inputFile}: ${r.output.length / 1000}kb  -->  ${minified.code.length / 1000}kb`)

        return {
            code: formatAsBookmarklet(minified.code, true),
            map: minified.map,
        };
    } else {
        return {
            code: formatAsBookmarklet(r.output),
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
            if (!source.startsWith('ts:')) {
                return null;
            }
            const _src = source.slice(3)

            if (!_src.startsWith(".")) {
                resolved[_src] = {content: ''}
                return _src;
            }
            if (!importer) return null;
            const newId = path.join(path.dirname(importer), _src);
            resolved[newId] = {content: ''}
            // const newId =  id.slice(3);
            // console.warn(`new id is ${newId}`)
            return newId
        },
        enforce: 'pre',
        async load(this, id: string) {
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


            this.addWatchFile(id)

            const code = await compile(id, true);

            return {
                code: `export default ${code.code.trim()}`
            };


        }
    }
}
