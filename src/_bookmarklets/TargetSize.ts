/**
 * Target Size (WCAG 2.5.8 AA, or 2.5.5 AAA via the panel toggle).
 *
 * Red = fails. Green dashed = undersized but passes on spacing (its 24px circle
 * is drawn). Grey = exempt (inline in a sentence, or an unstyled native control):
 * double-check. Orange = transformed or overlapping: measure by hand. Passing
 * targets are not drawn. Details go to console.table.
 *
 * Results are a snapshot: use Re-scan after the page changes. Run again to remove.
 */
import { activateBookmarklet, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle.ts";
import { findSelector, formatSelector } from "../utils/finder.ts";
import { makeDraggableDisplay } from "../utils/makeDraggableOverlay.ts";
import { scanTargets, type TargetResult, type TargetStatus } from "../utils/targetSize.ts";

const TOOL_NAME = "target-size";
const SVG_NS = "http://www.w3.org/2000/svg";
const SPACING = 24;
const COLORS: Partial<Record<TargetStatus, string>> = {
  fail: "#d00000",
  verify: "#e85d04",
  exempt: "#6c757d",
  "pass-spacing": "#2b9348",
};

const describe = (el: Element): string => formatSelector(findSelector(el));

function run(lifecycle: BookmarkletLifecycle): void {
  const panel = makeDraggableDisplay(lifecycle);
  Object.assign(panel.style, {
    background: "white",
    color: "black",
    font: "13px system-ui, sans-serif",
    padding: "8px",
    border: "2px solid black",
    height: "auto",
  });
  const toggle = document.createElement("label");
  const aaa = document.createElement("input");
  aaa.type = "checkbox";
  toggle.append(aaa, " AAA (44×44)");
  const rescan = document.createElement("button");
  rescan.type = "button";
  rescan.textContent = "Re-scan";
  rescan.dataset.rescan = "";
  const summary = document.createElement("p");
  summary.style.margin = "8px 0 0";
  panel.append(" ", rescan, document.createElement("br"), toggle, summary);
  document.body.appendChild(panel);

  const svg = lifecycle.ownNode(document.createElementNS(SVG_NS, "svg"));
  svg.setAttribute("style", "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:999998");
  document.body.appendChild(svg);

  let drawn: { result: TargetResult; box: SVGRectElement; circle?: SVGCircleElement }[] = [];

  // Read every rect first, then write, so the page lays out once per frame.
  const redraw = (): void => {
    const rects = drawn.map(({ result }) => result.member.getBoundingClientRect());
    drawn.forEach(({ box, circle }, i) => {
      const r = rects[i];
      box.setAttribute("x", String(r.left));
      box.setAttribute("y", String(r.top));
      box.setAttribute("width", String(r.width));
      box.setAttribute("height", String(r.height));
      circle?.setAttribute("cx", String(r.left + r.width / 2));
      circle?.setAttribute("cy", String(r.top + r.height / 2));
    });
  };
  let pending = false;
  const scheduleRedraw = (): void => {
    if (pending) return;
    pending = true;
    lifecycle.animationFrame(() => {
      pending = false;
      redraw();
    });
  };
  // ponytail: layout shifts without a scroll or resize are not redrawn until the next one.
  lifecycle.listen(window, "resize", scheduleRedraw);
  lifecycle.listen(document, "scroll", scheduleRedraw, { capture: true, passive: true });

  const scan = (): void => {
    const min = aaa.checked ? 44 : 24;
    const results = scanTargets(document, min);
    svg.replaceChildren();
    drawn = results.flatMap((result) => {
      const color = COLORS[result.status];
      if (color === undefined) return [];
      const box = document.createElementNS(SVG_NS, "rect");
      box.dataset.status = result.status;
      box.setAttribute(
        "style",
        `fill:none;stroke:${color};stroke-width:2;${result.status === "pass-spacing" ? "stroke-dasharray:4 3" : ""}`,
      );
      svg.appendChild(box);
      if (min !== SPACING || result.size >= SPACING || result.status === "exempt" || result.status === "verify")
        return [{ result, box }];
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("r", String(SPACING / 2));
      circle.setAttribute("style", `fill:${color};fill-opacity:.15;stroke:${color};stroke-width:1`);
      svg.appendChild(circle);
      return [{ result, box, circle }];
    });
    redraw();

    const tally = new Map<TargetStatus, number>();
    for (const { status } of results) tally.set(status, (tally.get(status) ?? 0) + 1);
    summary.textContent =
      `${String(min)}×${String(min)}: ` +
      (["fail", "verify", "exempt", "pass-spacing", "pass"] as const)
        .map((status) => `${String(tally.get(status) ?? 0)} ${status}`)
        .join(", ") +
      ". Exempt and verify need a manual check.";

    const rows = results
      .filter(({ status }) => status !== "pass" && status !== "not-target")
      .map(({ el, status, reason, size, conflict }) => ({
        status,
        reason: reason ?? "",
        size: Math.round(size * 10) / 10,
        element: describe(el),
        conflict: conflict === undefined ? "" : describe(conflict),
      }));
    if (rows.length > 0) console.table(rows);
  };

  lifecycle.listen(aaa, "change", scan);
  lifecycle.listen(rescan, "click", scan);
  scan();
}

const lifecycle = activateBookmarklet(TOOL_NAME);
if (lifecycle !== null) run(lifecycle);
