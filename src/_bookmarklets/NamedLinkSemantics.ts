/** Review named links. Orange: link; purple dashed: semantic/focusable descendant. Run again to remove. */
import { activateBookmarklet, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle.ts";
import { findSelector, formatSelector, type SelectorRoot } from "../utils/finder.ts";
import { makeDraggableDisplay } from "../utils/makeDraggableOverlay.ts";
import { scanNamedLinks } from "../utils/namedLinkSemantics.ts";

const MARKER = "data-a11y-named-link";
const describe = (element: Element): string => formatSelector(findSelector(element));

function run(lifecycle: BookmarkletLifecycle): void {
  const panel = makeDraggableDisplay(lifecycle);
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Named Link Semantics");
  Object.assign(panel.style, {
    background: "white",
    color: "black",
    font: "14px system-ui, sans-serif",
    padding: "12px",
    border: "2px solid black",
    width: "min(440px, 90vw)",
    height: "auto",
    maxHeight: "80vh",
    overflowWrap: "anywhere",
  });
  const title = document.createElement("h2");
  title.textContent = "Named Link Semantics";
  const help = document.createElement("p");
  help.textContent =
    "Review candidates, not automatic failures. Orange outlines mark named links; purple dashed outlines mark semantic or focusable descendants (including tabindex=-1). Naming attributes are shown as authored; verify referenced labels and screen reader behavior. Closed shadow roots cannot be inspected.";
  const rescan = document.createElement("button");
  rescan.type = "button";
  rescan.dataset.rescan = "";
  rescan.textContent = "Re-scan";
  const close = document.createElement("button");
  close.type = "button";
  close.dataset.close = "";
  close.textContent = "Close";
  const summary = document.createElement("p");
  summary.setAttribute("role", "status");
  const list = document.createElement("ol");
  panel.append(title, help, rescan, " ", close, summary, list);
  document.body.append(panel);

  const marked = new Map<Element, string | null>();
  const styled = new Set<SelectorRoot>();
  let targets: Element[] = [];
  const clear = (): void => {
    for (const [element, original] of marked) {
      if (original === null) element.removeAttribute(MARKER);
      else element.setAttribute(MARKER, original);
    }
    marked.clear();
    for (const root of styled) lifecycle.style(root, "");
  };
  lifecycle.addCleanup(clear);
  const mark = (element: Element, kind: string): void => {
    if (!marked.has(element)) marked.set(element, element.getAttribute(MARKER));
    element.setAttribute(MARKER, kind);
    const root = element.getRootNode() as SelectorRoot;
    styled.add(root);
    lifecycle.style(
      root,
      `[${MARKER}="link"] { outline: 3px solid #b45309 !important; outline-offset: 3px !important; }
      [${MARKER}="descendant"] { outline: 2px dashed #7e22ce !important; outline-offset: 1px !important; }`,
    );
  };
  const inspectButton = (element: Element, label: string): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.inspect = String(targets.push(element) - 1);
    return button;
  };
  const scan = (): void => {
    clear();
    targets = [];
    list.replaceChildren();
    const { results, skipped } = scanNamedLinks(document);
    summary.textContent = `${String(results.length)} links to review. ${String(skipped.length)} inaccessible frames skipped.`;
    for (const result of results) {
      mark(result.link, "link");
      const row = document.createElement("li");
      row.append(
        inspectButton(result.link, describe(result.link)),
        document.createElement("br"),
        result.naming.map(({ attribute, value }) => `${attribute}="${value}"`).join("; "),
      );
      const children = document.createElement("ul");
      for (const item of result.descendants) {
        mark(item.element, "descendant");
        const child = document.createElement("li");
        const reasons = [item.role, item.focusable ? "focusable" : undefined].filter(Boolean).join(" + ");
        child.append(inspectButton(item.element, `${describe(item.element)} — ${reasons}`));
        children.append(child);
      }
      row.append(children);
      list.append(row);
    }
    console.log("Named Link Semantics — review candidates", results);
    if (skipped.length) console.warn("Named Link Semantics — inaccessible frames", skipped);
  };
  lifecycle.listen(list, "click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-inspect]");
    if (!button) return;
    const target = targets[Number(button.dataset.inspect)];
    target.scrollIntoView({ block: "center", inline: "nearest" });
    console.log("Named Link Semantics — inspect", target);
  });
  lifecycle.listen(rescan, "click", scan);
  lifecycle.listen(close, "click", () => {
    lifecycle.teardown();
  });
  scan();
}

const lifecycle = activateBookmarklet("named-link-semantics");
if (lifecycle) run(lifecycle);
