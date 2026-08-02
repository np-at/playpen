import { activateBookmarklet, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle.ts";
import { collectSelectorRoots } from "../utils/finder.ts";

const TOOL_NAME = "force-focus-outline";
const FOCUS_STYLE = ":focus{outline:5px solid #F07 !important;z-index:10000 !important;}";

function installStyles(lifecycle: BookmarkletLifecycle): void {
  // This is intentionally a snapshot: roots added after activation need a new run.
  const snapshot = collectSelectorRoots(document);
  for (const root of snapshot.visited) {
    lifecycle.style(root, FOCUS_STYLE);
  }
  if (snapshot.skipped.length > 0) console.warn("Force Focus Outline skipped cross-origin iframes", snapshot.skipped);
}

const lifecycle = activateBookmarklet(TOOL_NAME);
if (lifecycle !== null) installStyles(lifecycle);
