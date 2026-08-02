// stolen from https://codepen.io/stevef/pen/YLMqbo
import { collectSelectorRoots } from "../utils/finder.ts";

function TextSpacing(): void {
  const d = document;
  const id = "phltsbkmklt";
  const el = d.getElementById(id);
  // This is intentionally a snapshot: re-run the bookmarklet after new roots are attached.
  const snapshot = collectSelectorRoots(d);
  if (el != null) {
    for (const root of snapshot.visited) {
      root.getElementById(id)?.remove();
    }
  } else {
    const s = d.createElement("style");
    s.id = id;
    s.style.display = "none";
    s.innerText =
      "*{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important;}p{margin-bottom:2em !important;}";

    for (const root of snapshot.visited) {
      if (root.nodeType === Node.DOCUMENT_NODE) {
        const frameDocument = root as Document;
        frameDocument.head.appendChild(s.cloneNode(true));
      } else {
        root.appendChild(s.cloneNode(true));
      }
    }
  }
  if (snapshot.skipped.length > 0) console.warn("Text Spacing skipped cross-origin iframes", snapshot.skipped);
}
TextSpacing();
