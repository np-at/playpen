import { getDescription, getName, getRole } from "aria-api";

const focusTrace: number[][] = [];

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

function addBoundingStyle(): void {
  const boundRule =
    "div.bounding-rect { pointer-events: none; border: 3px solid red; border-radius: 4px 4px 4px 4px; position: fixed; z-index: 10000;}";
  const sht: CSSStyleSheet = document.styleSheets[0];
  try {
    sht.insertRule(boundRule, sht.cssRules.length);
  } catch {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = boundRule.valueOf();
    document.head.appendChild(styleSheet);
  }
}

function handleFocusChange(): void {
  clearTimeout(selectionChangeTimer);
  selectionChangeTimer = window.setTimeout(drawFocusBoxes, 100);
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

function redrawSelectionBoxes(): void {
  clearTimeout(redrawTimer);
  redrawTimer = window.setTimeout(drawFocusBoxes, 300);
}

function clearCurrentSelectionBoxes(): void {
  const nodes = document.querySelectorAll("div.bounding-rect, div.segment-rect");
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].parentNode?.removeChild(nodes[i]);
  }
}

function drawFocusBoxes(): void {
  clearCurrentSelectionBoxes();
  clearArrowSvgs();
  const selection = document.activeElement;
  if (selection == null) {
    return;
  }
  console.debug(selection);
  ariaDebug(selection);
  const rect = selection.getBoundingClientRect();
  if (rect.width && rect.height) {
    const outline = document.createElement("div");
    outline.classList.add("bounding-rect");
    outline.style.top = rect.top.toString(10) + "px";
    outline.style.left = rect.left.toString(10) + "px";
    outline.style.width = rect.width.toString(10) + "px";
    outline.style.height = rect.height.toString(10) + "px";
    document.body.appendChild(outline);
  }
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

function createArrowSvg(c1: number[], c2: number[], svg: HTMLElement | null): void {
  const dX = c2[0] - c1[0];
  const dY = c2[1] - c1[1];
  if (isNaN(dX) || isNaN(dY)) return;
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
  triangle.setAttribute("points", `${c2[0]},${c2[1]} ${x3},${y3} ${x4},${y4}`);
  triangle.setAttribute("fillcolor", "blue");
  if (svg == null) {
    const newSvg: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    newSvg.setAttribute("version", "1.1");
    newSvg.setAttribute("aria-hidden", "true");
    // svg.classList.add("rootFocusSvg");
    newSvg.setAttribute("id", "rootSvg");
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
    document.body.append(newSvg);
    console.log("line: ", newSvg);
  } else {
    svg.appendChild(triangle);
    svg.appendChild(line);
  }

  // Add completed svg to page
}

function drawFocusTraceArrows(): void {
  // console.log("current array:", focusTrace);
  if (focusTrace.length < 2) return;
  const svg = document.getElementById("rootSvg");
  createArrowSvg(focusTrace[focusTrace.length - 2], focusTrace[focusTrace.length - 1], svg);
  // const r = document.querySelector('svg#rootFocusSvg');
  // for (let i = 1; i < focusTrace.length; i++) {
  //   createArrowSvg(focusTrace[i - 1], focusTrace[i], null);
  // }
}


let selectionChangeTimer: number | undefined;
let redrawTimer: number | undefined;


  addBoundingStyle();
  window.addEventListener("focusin", handleFocusChange, { passive: false });
  window.addEventListener("scroll", redrawSelectionBoxes, { passive: false });
  window.addEventListener("resize", redrawSelectionBoxes, { passive: false });
