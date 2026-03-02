import { type KnipConfig } from "knip";

import { htmlFiles } from "./vite.config";

import { dirname, join, relative } from "node:path";
import { readFileSync } from "node:fs";

function loadFile(filePath: string) {
  try {
    const contents = readFileSync(filePath);
    return contents.toString();
  } catch (error) {
    throw new Error(`Error loading ${filePath}`, { cause: error });
  }
}
const moduleScriptPattern = /<script\b(?=[^>]*\btype\s*=\s*["']?module["']?)(?=[^>]*\bsrc\s*=\s*["']?([^"' >]+)["']?)[^>]*>/gi;

const normalizeModuleScriptSrc = (value: string) => value.trim().replace(/^\//, "");

const htmlCommentTagPattern = /<!--|-->/g;
function isMatchInHTMLComment(html: string, matchIndex: number): boolean {
  const commentMatches = html.matchAll(htmlCommentTagPattern); // [...openMatches, ...closeMatches].sort((a, b) => a.index - b.index);
  let openCount = 0;
  let isInsideComment = false;
  for (const m of commentMatches) {
    if (m.index > matchIndex) {
      break;
    }
    if (m[0] === "<!--") {
      openCount++;
    } else if (m[0] === "-->") {
      openCount--;
    }
    isInsideComment = openCount > 0;
  }
  return isInsideComment;
}
const getModuleScriptSources = (html: string): string[] => {
  const matches: RegExpStringIterator<RegExpExecArray> = html.matchAll(moduleScriptPattern);
  const sources = [];

  for (const match of matches) {
    // check if it's enclosed in a comment tag
    if (isMatchInHTMLComment(html, match.index)) {
      // console.debug(`Skipping module script ${match[0]} because it's inside a comment`);
      continue;
    }
    const src = normalizeModuleScriptSrc(match[1]).trim();
    if (!src) {
      // console.debug(`Skipping module script ${match[0]} because it has no src`);
      continue;
    }
    if (/^https?:\/\//i.test(src)) {
      // console.debug(`Skipping module script ${match[0]} because it's an external URL`);
      continue;
    }
    if (src) sources.push(src);
  }

  return sources;
};
const styleLinkPattern = /<link\b(?=[^>]*\brel\s*=\s*["']?stylesheet["']?)(?=[^>]*\bhref\s*=\s*["']?([^"' >]+)["']?)[^>]*>/gi;
function getModuleStyleSources(html: string): string[] {
  const sources: string[] = [];
  for (const match of html.matchAll(styleLinkPattern)) {
    if (isMatchInHTMLComment(html, match.index)) {
      // console.debug(`Skipping stylesheet link ${match[0]} because it's inside a comment`);
      continue;
    }
    const href = normalizeModuleScriptSrc(match[1]);
    if (href) sources.push(href);
  }
  return sources;
}

export const getIndexHtmlEntries = (indexPath: string) => {
  const dir = dirname(indexPath);
  const html = loadFile(indexPath);
  const scriptEntries = getModuleScriptSources(html).map((src) => join(dir, src));

  const styleEntries = getModuleStyleSources(html).map((src) => join(dir, src));
  return [...scriptEntries, ...styleEntries];
};

function getEntries() {
  const cwd = dirname(import.meta.url.replace("file://", ""));
  const relHtmlFiles = Object.values(htmlFiles).map((x) => relative(cwd, x));
  const entries = relHtmlFiles.flatMap(getIndexHtmlEntries).map((x) => relative(cwd, x));

  return entries.concat(relHtmlFiles);
}

const config: KnipConfig = {
  entry: getEntries(),
  project: ["./**/*.{ts,tsx,html,css,scss,json}"],
  treatConfigHintsAsErrors: true,
  pnpm: true,
  compilers: {
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join("\n"),
  },
  // entry: ["src/_bookmarklets/*.ts","src/index.html", "{eslint,playwright,vite}.config.{ts,js,mjs,cjs}", ...Object.values(htmlFiles)],
  // entry:['eslint.config.mjs', 'playwright.config.ts'],
  // project: ["./src/**/*.{ts,tsx,html,css, scss}", "./*.{ts,tsx,html,css, scss}"],
  // vite: "./vite.config.ts",
  // vite: false,
  // eslint: './eslint.config.mjs',
};

export default config;
