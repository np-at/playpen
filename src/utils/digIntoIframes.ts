import { collectSelectorRoots, type SelectorRootCollection } from "./finder.ts";

/** Applies work to same-origin iframe documents in a synchronous traversal snapshot. */
export function digIntoIframes(
  root: Document | ShadowRoot,
  fn: (root: Document) => void,
): SelectorRootCollection {
  const snapshot = collectSelectorRoots(root);
  for (const visitedRoot of snapshot.visited) {
    if (visitedRoot.nodeType === Node.DOCUMENT_NODE && visitedRoot !== root) fn(visitedRoot as Document);
  }
  return snapshot;
}
