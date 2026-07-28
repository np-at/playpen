import { getDescription, getName, getRole } from "aria-api";
import { activateBookmarklet, type BookmarkletLifecycle } from "../utils/bookmarkletLifecycle";
import { drawFocusBox, ensureBoundingStyleAvailable } from "../utils/drawUtils";

const focusTrace: number[][] = [];
const lifecycle: BookmarkletLifecycle | null = activateBookmarklet("focus-trace");
let traceSvg: SVGSVGElement | undefined;

const ariaDebug: (el: Element) => void = (el: Element) => {
  const role = getRole(el);
  // const state = getState(el)
  // const label = getLabel(el)
  const name = getName(el);
  // const value = getValue(el)
  // const checked = getChecked(el)
  // const selected = getSelected(el)
  // const expanded = getExpanded(el)
  // const describedby = getDescribedby(el)
  // const controls = getControls(el)
  const description = getDescription(el);
  // const errormessage = getErrormessage(el)
  // const invalid = getInvalid(el)
  // const keyshortcuts = getKeyshortcuts(el)

  console.log(`
        role: ${role}
        name: ${name}
        description: ${description}
    `);
};

function handleFocusChange(): void {
  if (lifecycle === null) return;
  clearTimeout(selectionChangeTimer);
  selectionChangeTimer = lifecycle.timeout(drawFocusBoxes, 100);
  const rect = document.activeElement?.getBoundingClientRect();
  if (!rect) throw new Error("Rect not defined");
  if (rect.top && rect.left) {
    focusTrace.push([
      rect.left + rect.width / 3 + (document.scrollingElement?.scrollLeft ?? 0),
      rect.top + rect.height / 3 + (document.scrollingElement?.scrollTop ?? 0),
    ]);
  }
  // console.log("focus array ", focusTrace);
  console.log("asdf", document.activeElement);
  drawFocusTraceArrows();
}

function drawFocusBoxes(): void {
  if (lifecycle === null) return;
  clearArrowSvgs();
  const selection = document.activeElement;
  if (selection == null) {
    return;
  }
  console.debug(selection);
  ariaDebug(selection);
  drawFocusBox(lifecycle, selection);
  // if (rect.top && rect.left)
  //   focusTrace.push([rect.left, rect.top]);
  // console.log("focus array ", focusTrace);
  // drawFocusTraceArrows();
}

function clearArrowSvgs(): void {
  // const r = document.querySelectorAll("svg.rootFocusSvg");
  // if (r)
  //   r.forEach(x => x.remove());
}

function createArrowSvg(c1: number[], c2: number[], svg?: SVGSVGElement): SVGSVGElement | undefined {
  const dX = c2[0] - c1[0];
  const dY = c2[1] - c1[1];
  if (isNaN(dX) || isNaN(dY)) return svg;
  // create base svg element

  // Arrow tail
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", String(c1[0]));
  line.setAttribute("x2", String(c2[0]));
  line.setAttribute("y1", String(c1[1]));
  line.setAttribute("y2", String(c2[1]));
  line.setAttribute("stroke", "red");
  line.setAttribute("stroke-width", "3");

  // Arrowhead
  const angleOffset = Math.PI / 6;
  const triSideLength = Math.max(Math.min(Math.sqrt(dX * dX + dY * dY) / 10, 50), 20);
  // console.log("trisidelength: ", triSideLength);
  const angle = Math.atan(dY / dX) + (Math.sign(dX) === -1 ? 0 : -1 * Math.PI);
  // console.log("angle: ", angle * 180 / Math.PI / 2);
  const x3 = triSideLength * Math.cos(angle + angleOffset) + c2[0];
  const x4 = triSideLength * Math.cos(angle - angleOffset) + c2[0];
  const y3 = triSideLength * Math.sin(angle + angleOffset) + c2[1];
  const y4 = triSideLength * Math.sin(angle - angleOffset) + c2[1];

  // console.log("x3,y3", [x3, y3]);
  const triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  triangle.setAttribute(
    "points",
    `${c2[0].toString()},${c2[1].toString()} ${x3.toString()},${y3.toString()} ${x4.toString()},${y4.toString()}`,
  );
  triangle.setAttribute("fillcolor", "blue");
  if (svg === undefined) {
    const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    newSvg.setAttribute("version", "1.1");
    newSvg.setAttribute("aria-hidden", "true");
    // svg.classList.add("rootFocusSvg");
    newSvg.style.position = "absolute";
    newSvg.style.pointerEvents = "none";
    newSvg.style.top = String(0);
    newSvg.style.left = String(0);
    newSvg.style.width = "100%";
    newSvg.style.height = "100%";
    newSvg.style.zIndex = "10000";
    // svg.style.top = `${Math.min(c1[1], c2[1])}`;
    // svg.style.left = `${Math.min(c1[0], c2[0])}`;
    newSvg.style.overflow = "overlay";
    newSvg.appendChild(triangle);
    newSvg.appendChild(line);
    lifecycle?.ownNode(newSvg);
    document.body.append(newSvg);
    console.log("line: ", newSvg);
    return newSvg;
  } else {
    svg.appendChild(triangle);
    svg.appendChild(line);
    return svg;
  }

  // Add completed svg to page
}

function drawFocusTraceArrows(): void {
  // console.log("current array:", focusTrace);
  if (focusTrace.length < 2) return;
  traceSvg = createArrowSvg(focusTrace[focusTrace.length - 2], focusTrace[focusTrace.length - 1], traceSvg);
  // const r = document.querySelector('svg#rootFocusSvg');
  // for (let i = 1; i < focusTrace.length; i++) {
  //   createArrowSvg(focusTrace[i - 1], focusTrace[i], null);
  // }
}

let selectionChangeTimer: number | undefined;

if (lifecycle !== null) {
  ensureBoundingStyleAvailable(lifecycle);
  lifecycle.listen(window, "focusin", handleFocusChange, { passive: false });
}
