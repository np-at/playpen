import { activateBookmarklet, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle.ts";

const TOOL_NAME = "force-focus-outline";
const FOCUS_STYLE = ":focus{outline:5px solid #F07 !important;z-index:10000 !important;}";

function installStyles(lifecycle: BookmarkletLifecycle): void {
  const visited = new Set<Document | ShadowRoot>();
  const pending: Array<Document | ShadowRoot> = [document];

  while (pending.length > 0) {
    const root = pending.shift();
    if (root === undefined || visited.has(root)) continue;
    visited.add(root);
    lifecycle.style(root, FOCUS_STYLE);

    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot !== null) pending.push(element.shadowRoot);
      if (element.localName !== "iframe") continue;

      try {
        const frameDocument = (element as HTMLIFrameElement).contentDocument;
        if (frameDocument !== null) pending.push(frameDocument);
      } catch {
        // Cross-origin frames are outside the bookmarklet's readable scope.
      }
    }
  }
}

const lifecycle = activateBookmarklet(TOOL_NAME);
if (lifecycle !== null) installStyles(lifecycle);
