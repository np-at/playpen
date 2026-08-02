import { collectSelectorRoots, type SelectorRootCollection } from "./finder.ts";

/** Applies work to open shadow roots in a synchronous traversal snapshot. */
export function applyToShadows(
  root: Document | ShadowRoot | undefined,
  fn: (root: ShadowRoot) => void,
): SelectorRootCollection {
  if (root === undefined) return { visited: [], skipped: [], supported: [], unsupported: [] };
  const snapshot = collectSelectorRoots(root);
  for (const visitedRoot of snapshot.visited) {
    if (visitedRoot.nodeType === Node.DOCUMENT_FRAGMENT_NODE) fn(visitedRoot as ShadowRoot);
  }
  return snapshot;
}
