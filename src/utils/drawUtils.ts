import type { BookmarkletLifecycle } from "./bookmarkletLifecycle";

type OwnedOverlay = {
  element: HTMLDivElement;
  group: string;
  target: Element;
};

type OverlayState = {
  animationFrameActive: boolean;
  overlays: Set<OwnedOverlay>;
  resizeObserver: ResizeObserver;
};

const overlayStates = new WeakMap<BookmarkletLifecycle, OverlayState>();

function installOverlayStyle(lifecycle: BookmarkletLifecycle): void {
  lifecycle.style(
    document,
    `div.segment-rect[data-a11y-playpen-tool="${lifecycle.toolName}"] {
        pointer-events: none;
        position: fixed;
        z-index: 10000;
      }
      div.bounding-rect[data-a11y-playpen-tool="${lifecycle.toolName}"] {
        pointer-events: none;
        border: 3px solid red;
        border-radius: 4px;
        position: fixed;
        z-index: 10000;
      }`,
  );
}

function positionOverlay(overlay: HTMLDivElement, target: Element): void {
  const coords = target.getBoundingClientRect();
  overlay.style.left = `${coords.left.toString()}px`;
  overlay.style.top = `${coords.top.toString()}px`;
  overlay.style.width = `${coords.width.toString()}px`;
  overlay.style.height = `${coords.height.toString()}px`;
  overlay.style.maxWidth = `${coords.width.toString()}px`;
  overlay.style.maxHeight = `${coords.height.toString()}px`;
}

function stateFor(lifecycle: BookmarkletLifecycle): OverlayState {
  const existing = overlayStates.get(lifecycle);
  if (existing !== undefined) return existing;
  installOverlayStyle(lifecycle);
  const overlays = new Set<OwnedOverlay>();
  const redraw = (): void => {
    for (const overlay of overlays) positionOverlay(overlay.element, overlay.target);
  };
  const resizeObserver = new ResizeObserver(redraw);
  const state = { animationFrameActive: false, overlays, resizeObserver };
  overlayStates.set(lifecycle, state);
  lifecycle.listen(window, "resize", redraw);
  lifecycle.listen(document, "scroll", redraw, { capture: true, passive: true });
  lifecycle.addCleanup(() => {
    resizeObserver.disconnect();
    overlays.clear();
  });
  return state;
}

function trackGeometry(lifecycle: BookmarkletLifecycle, state: OverlayState): void {
  if (state.animationFrameActive) return;
  state.animationFrameActive = true;
  const redraw = (): void => {
    if (!lifecycle.active || state.overlays.size === 0) {
      state.animationFrameActive = false;
      return;
    }
    for (const overlay of state.overlays) positionOverlay(overlay.element, overlay.target);
    lifecycle.animationFrame(redraw);
  };
  lifecycle.animationFrame(redraw);
}

function clearOwnedOverlays(lifecycle: BookmarkletLifecycle, group?: string): void {
  const { overlays, resizeObserver } = stateFor(lifecycle);
  for (const overlay of overlays) {
    if (group !== undefined && overlay.group !== group) continue;
    overlay.element.remove();
    overlays.delete(overlay);
    if (![...overlays].some((candidate) => candidate.target === overlay.target)) {
      resizeObserver.unobserve(overlay.target);
    }
  }
}

export function clearCurrentSelectionBoxes(lifecycle: BookmarkletLifecycle): void {
  clearOwnedOverlays(lifecycle);
}

export function drawFocusBox(lifecycle: BookmarkletLifecycle, selection: Element | null): void {
  clearCurrentSelectionBoxes(lifecycle);
  if (selection == null) {
    return;
  }
  console.debug(selection);
  const rect = selection.getBoundingClientRect();
  if (rect.width && rect.height) {
    const outline = drawBox(lifecycle, selection, { utilityName: "focus-box" });
    outline.classList.remove("segment-rect");
    outline.classList.add("bounding-rect");
  }
  // if (rect.top && rect.left)
  //   focusTrace.push([rect.left, rect.top]);
  // console.log("focus array ", focusTrace);
  // drawFocusTraceArrows();
}

export function ensureBoundingStyleAvailable(lifecycle: BookmarkletLifecycle): void {
  installOverlayStyle(lifecycle);
}
export type DrawStyleProps = Partial<CSSStyleDeclaration>;
const defaultStyle: DrawStyleProps = {
  backgroundColor: "transparent",
  color: "white",
  borderColor: "black",
  borderWidth: "2px",
  borderStyle: "solid",
  outline: "2px solid white",
};
/**
 * Draws a box around the specified element with optional content and styling.
 *
 * @param lifecycle - Lifecycle that owns the overlay, listeners, observer, and stylesheet.
 * @param element - Element around which the box will be drawn.
 * @param options - Display content, styling, and lifecycle-local grouping.
 */

export type DrawBoxOptions = {
  append?: boolean;
  content?: string;
  group?: string;
  style?: DrawStyleProps;
  utilityName: string;
};

export function drawBox(
  lifecycle: BookmarkletLifecycle,
  element: Element,
  { append = false, content, group, style, utilityName }: DrawBoxOptions,
): HTMLDivElement {
  const blockDiv = document.createElement("div");

  const overlayGroup = group ?? utilityName;
  if (!append) clearOwnedOverlays(lifecycle, overlayGroup);
  blockDiv.dataset.a11yOverlayGroup = overlayGroup;
  lifecycle.ownNode(blockDiv);
  const state = stateFor(lifecycle);
  state.overlays.add({ element: blockDiv, group: overlayGroup, target: element });
  state.resizeObserver.observe(element);
  trackGeometry(lifecycle, state);
  blockDiv.setAttribute("rel", utilityName);
  blockDiv.className = "segment-rect";
  blockDiv.style.position = "fixed";
  blockDiv.style.zIndex = "10000";
  blockDiv.style.display = "block";
  // blockDiv.style.minWidth = "200px";
  blockDiv.style.overflowWrap = "break-word";
  blockDiv.style.padding = "0px";
  blockDiv.style.pointerEvents = "none";
  Object.assign(blockDiv.style, defaultStyle, style);
  // blockDiv.style.backgroundColor = style?.backgroundColor ?? 'black';
  // blockDiv.style.color = style?.color ?? 'white';
  // blockDiv.style.border = `2px solid ${style?.borderColor ?? 'black'}`;
  blockDiv.innerText = content ?? "";
  positionOverlay(blockDiv, element);
  document.body.appendChild(blockDiv);
  return blockDiv;
}
