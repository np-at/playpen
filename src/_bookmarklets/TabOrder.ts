/**
 * Tab order visualizer.
 *
 * Computed layer: numbers every tabbable element in its expected sequential
 * focus order and joins them with a path. Red = positive tabindex, orange =
 * a backward jump in reading order.
 *
 * Recorded layer: as you press Tab, each focused element gets a ring badge with
 * the order it actually received focus. Purple = it differs from the computed order.
 *
 * Run again to remove.
 */
import { activateBookmarklet, isToolNode, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle.ts";
import { drawBox } from "../utils/drawUtils.ts";
import { findSelector, formatSelector } from "../utils/finder.ts";
import { computeTabOrder, findBackwardJumps } from "../utils/tabOrder.ts";

const TOOL_NAME = "tab-order";
const SVG_NS = "http://www.w3.org/2000/svg";
const COLORS = { plain: "#0a58ca", positive: "#d00000", backward: "#e85d04", divergent: "#7b2cbf" } as const;
type Flag = Exclude<keyof typeof COLORS, "plain">;

function badge(lifecycle: BookmarkletLifecycle, target: Element, group: string, step: number, flag?: Flag): void {
  const color = COLORS[flag ?? "plain"];
  const box = drawBox(lifecycle, target, {
    append: true,
    group,
    utilityName: TOOL_NAME,
    style: { borderColor: color, borderStyle: group === "recorded" ? "dashed" : "solid", outline: "none", overflow: "visible" },
  });
  const label = document.createElement("span");
  label.textContent = String(step);
  label.dataset.tabOrderStep = String(step);
  if (flag !== undefined) label.dataset.tabOrderFlag = flag;
  Object.assign(label.style, {
    position: "absolute",
    top: "-12px",
    [group === "recorded" ? "right" : "left"]: "-12px",
    minWidth: "20px",
    padding: "0 4px",
    borderRadius: "10px",
    font: "bold 12px/20px system-ui, sans-serif",
    textAlign: "center",
    color: group === "recorded" ? color : "white",
    background: group === "recorded" ? "white" : color,
    boxShadow: `0 0 0 2px ${group === "recorded" ? color : "white"}`,
  });
  box.appendChild(label);
}

function drawPath(lifecycle: BookmarkletLifecycle, order: Element[]): void {
  const svg = lifecycle.ownNode(document.createElementNS(SVG_NS, "svg"));
  svg.setAttribute("style", "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999");
  const line = document.createElementNS(SVG_NS, "polyline");
  line.setAttribute("style", `fill:none;stroke:${COLORS.plain};stroke-width:2;stroke-dasharray:6 4;opacity:.8`);
  svg.appendChild(line);
  document.body.appendChild(svg);
  const redraw = (): void => {
    if (!lifecycle.active) return;
    const points = order.map((el) => {
      const r = el.getBoundingClientRect();
      return `${String(r.left + r.width / 2)},${String(r.top + r.height / 2)}`;
    });
    line.setAttribute("points", points.join(" "));
    lifecycle.animationFrame(redraw);
  };
  redraw();
}

function run(lifecycle: BookmarkletLifecycle): void {
  const order = computeTabOrder(document);
  const backward = new Set(findBackwardJumps(order.map((el) => el.getBoundingClientRect())));
  const flags: { step: number; flag: Flag; selector: string }[] = [];

  order.forEach((el, i) => {
    const flag: Flag | undefined = el.tabIndex > 0 ? "positive" : backward.has(i) ? "backward" : undefined;
    if (flag !== undefined) flags.push({ step: i + 1, flag, selector: formatSelector(findSelector(el)) });
    badge(lifecycle, el, "computed", i + 1, flag);
  });
  drawPath(lifecycle, order);
  if (flags.length > 0) console.table(flags);

  const recorded: Element[] = [];
  lifecycle.listen(
    document,
    "focusin",
    (event) => {
      const target = event.composedPath()[0];
      if (!(target instanceof Element) || isToolNode(target) || target === recorded.at(-1)) return;
      const divergent = target !== order[recorded.length];
      recorded.push(target);
      badge(lifecycle, target, "recorded", recorded.length, divergent ? "divergent" : undefined);
      if (divergent) console.warn(`Tab order step ${String(recorded.length)} diverges from computed order`, target);
    },
    true,
  );
}

const lifecycle = activateBookmarklet(TOOL_NAME);
if (lifecycle !== null) run(lifecycle);
