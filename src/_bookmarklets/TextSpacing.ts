// stolen from https://codepen.io/stevef/pen/YLMqbo
import { collectSelectorRoots } from "../utils/finder.ts";
import { activateBookmarklet } from "../utils/bookmarkletLifecycle.ts";

const TOOL_NAME = "text-spacing";
const TEXT_SPACING_STYLE =
  "*{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important;}p{margin-bottom:2em !important;}";

const lifecycle = activateBookmarklet(TOOL_NAME);
if (lifecycle !== null) {
  // This is intentionally a snapshot: re-run the bookmarklet after new roots are attached.
  const snapshot = collectSelectorRoots(document);
  for (const root of snapshot.visited) lifecycle.style(root, TEXT_SPACING_STYLE);
  if (snapshot.skipped.length > 0) console.warn("Text Spacing skipped cross-origin iframes", snapshot.skipped);
}
