// Sourced from https://github.com/hinderlingvolkart/h123/blob/master/src/bookmarklet.js
import { digIntoIframes } from "../utils/digIntoIframes";

const containerId = "a11y-bookmarklet";
const containerStyle =
  "position: fixed; top: 0; right: 0; max-height: 100%; box-shadow: 0 0 80px rgba(0,0,0,0.3); width: 20%; min-width: 320px; max-width: 450px; z-index: 1000001;";

const highlighterEl = document.createElement("div");
highlighterEl.id = "h1-a11y-highlighterelement";
highlighterEl.style.cssText =
  "pointer-events: none; position: fixed; border: 1px dashed #0081BE; box-shadow: 0 0 54px 0 rgba(0,84,150,0.3); display: none; z-index: 1000000; transition: all 200ms;";

// remove existing instances
let container = document.getElementById(containerId) as HTMLDivElement;
if (container != null) {
  document.body.removeChild(container);
}

container = document.createElement("div");
container.id = containerId;
container.style.cssText = containerStyle;

const iframe = document.createElement("iframe");
iframe.style.width = "100%";
iframe.style.height = "100%";
iframe.style.borderWidth = "0";

const outline = getOutline();
let doc: Document;

container.appendChild(iframe);
iframe.onload = function () {
  iframe.onload = function () {};
  if (iframe.contentWindow?.document == null) throw new Error("no document");
  doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    '<html lang="en"> <head> <meta name="viewport" content="width=device-width,minimum-scale=1.0,initial-scale=1,user-scalable=yes"> <style> * { margin: 0; padding: 0; border: 0; } body { font: 14px/1.6 sans; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; color: #284900; background: rgba(255,255,255,0.95); white-space: nowrap; overflow-x: hidden; text-overflow: ellipsis; padding: 15px; padding-bottom: 30px; } ul { margin: 0 0 0 -10px; padding: 0; } li { color: #284900; list-style: none; margin-left: 20px; display: -webkit-box; display: -ms-flexbox; display: flex; } a { color: inherit; text-decoration: none; display: inline-block; max-width: 30em; overflow: hidden; text-overflow: ellipsis; padding: 2px 4px 2px 25px; position: relative; line-height: 1.3; border-radius: 3px; } a > .level { display: inline-block; background-color: currentColor; font-size: 85%; font-weight: bold; width: 2.7ex; height: 2.7ex; text-align: center; -webkit-box-sizing: border-box; box-sizing: border-box; position: absolute; left: 2px; top: 2px; padding-top: 1px; } a > .level:before { content: attr(data-level); color: white; } li.hidden { color: black; text-decoration: line-through; opacity: 0.5; } .result:not(.show-hidden) li.hidden { display: none; } .result.mark-visuallyhidden li.visuallyhidden .level:before { color: inherit; } .result.mark-visuallyhidden li.visuallyhidden .level { border: 1px dashed; background: white; } li.wrong-level { color: #AF3A37; } a.is-active { -webkit-box-shadow: 0 0 5px 1px #3CBEFF; box-shadow: 0 0 5px 1px #3CBEFF; } a:hover { background-color: currentColor; } a:hover > .text { color: white; } a:hover > .level { background-color: transparent; } header { padding-top: 5px; padding-bottom: 15px; padding-right: 5em; margin-bottom: 1em; border-bottom: 1px solid #eee; } legend { margin-right: 1em; font-weight: bold; } @media (min-width: 340px) { legend { float: left; } } .options { display: -webkit-box; display: -ms-flexbox; display: flex; -ms-flex-wrap: wrap; flex-wrap: wrap; } .options .input { margin-right: 2em; } .count { background: #ddd; border-radius: 4px; padding: 1px 3px; } .tooltip { position: relative; } .tooltip:before { content: \'ℹ️\'; } .tooltip:focus:after, .tooltip:hover:after { content: attr(title); position: absolute; background: white; padding: 4px 10px; top: 70%; left: 70%; width: 10em; -webkit-box-shadow: 0 2px 20px rgba(0,0,0,0.3); box-shadow: 0 2px 20px rgba(0,0,0,0.3); white-space: normal; border-radius: 8px; border-top-left-radius: 0; z-index: 1; pointer-events: none; } .button-close { position: absolute; top: 15px; right: 15px; padding: 5px 10px; border-radius: 5px; border: 0; font-size: inherit; color: white; background-color: #284900; cursor: pointer; } .button-close:hover { color: white; background-color: #284900; } </style> </head> <body> <header> <button class="button-close" data-action="close">Close</button> <fieldset> <legend>Options</legend> <div class="options"> <div class="input"> <input type="checkbox" name="options" id="o-hidden"> <label for="o-hidden">Show hidden <span class="count" id="o-hidden-count"></span> <span class="tooltip" title="also hidden for screenreaders" tabindex="0"></span></label> </div> <div class="input"> <input type="checkbox" name="options" id="o-visuallyhidden"> <label for="o-visuallyhidden">Mark visually hidden <span class="count" id="o-visuallyhidden-count"></span> <span class="tooltip" title="only visible for screenreaders" tabindex="0"></span></label> </div> <div class="input"> <input type="checkbox" name="options" id="o-highlight"> <label for="o-highlight">Hover-Highlight <span class="tooltip" title="Highlight the corresponding heading when hovering over elements of the page" tabindex="0"></span></label> </div> </div> </fieldset> </header> <main id="result" class="result"> </main> </body> </html> ',
  );
  doc.close();

  const quitButton = doc.querySelector('[data-action="close"]');
  if (quitButton != null) {
    quitButton.addEventListener("click", function (e: Event) {
      disableHoverHighlight();
      window.removeEventListener("resize", updateHeight);
      document.body.removeChild(container);
      if (document.getElementById(highlighterEl.id) != null) {
        document.body.removeChild(highlighterEl);
      }
    });
  }

  let targetEl: HTMLElement | null = doc.querySelector("#result");
  if (targetEl != null) {
    targetEl.innerHTML = outlineToHTML(outline);
  }

  targetEl = doc.querySelector("#o-hidden-count");
  if (targetEl != null) {
    targetEl.innerText = (outline.length - countOutline(outline, "visible")).toString();
  }

  targetEl = doc.querySelector("#o-visuallyhidden-count");
  if (targetEl != null) {
    targetEl.innerText = countOutline(outline, "visuallyhidden").toString();
  }

  switcher("o-hidden", "show-hidden");
  switcher("o-visuallyhidden", "mark-visuallyhidden");
  handleHoverHighlight(doc.getElementById("o-highlight") as HTMLInputElement);

  updateHeight();

  doc.addEventListener(
    "mouseover",
    function (event: MouseEvent) {
      let link: HTMLLinkElement | null = null;
      if ((event.target as HTMLElement)?.nodeName?.toUpperCase() === "A") {
        link = event.target as HTMLLinkElement | null;
      } else if (
        (event.target as HTMLElement).parentElement != null &&
        (event.target as HTMLElement).parentElement?.nodeName.toUpperCase() === "A"
      ) {
        link = (event.target as HTMLElement).parentElement as HTMLLinkElement | null;
      }
      if (link == null) return;
      const index = parseInt(link?.getAttribute("href")?.substr(1) ?? "-1", 10);
      const target = outline[index].el;
      highlightElement(target, undefined);
    },
    false,
  );

  window.addEventListener("resize", updateHeight);

  function switcher(id: string, className: string): void {
    const checkbox = doc.getElementById(id) as HTMLInputElement | null;
    const target = doc.querySelector(".result");
    if (target == null) throw new Error("target null");
    if (checkbox != null) {
      const check = function (e?: Event  ): void {
        if (checkbox.checked) {
          target.classList.add(className);
        } else {
          target.classList.remove(className);
        }
        if (e != null) updateHeight();
      };
      checkbox.addEventListener("change", check, false);
      checkbox.addEventListener("click", check, false);
      check();
    }
  }
};
document.body.appendChild(container);

function updateHeight(): void {
  container.style.height = "0px";
  container.style.height = `${doc.scrollingElement?.scrollHeight ?? 0}px`;
}

interface OutlineItem {
  visible: boolean;
  visuallyhidden: boolean | undefined;
  wrong: boolean;
  level: number;
  el: HTMLElement;
}

function applyToShadows(root: HTMLElement | ShadowRoot, fxn: (arg0: ShadowRoot) => void): void {
  for (const el of Array.from(root.querySelectorAll("*"))) {
    if (el.shadowRoot) {
      fxn(el.shadowRoot);
      // el.shadowRoot.appendChild(s.cloneNode(true));
      applyToShadows(el.shadowRoot, fxn);
    }
  }
}

function getOutline(): OutlineItem[] {
  let previousLevel = 0;
  const els: Element[] = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,h7,[role="heading"]'));
  applyToShadows(document.body, (root) => {
    els.push(...Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6,h7,[role="heading"]')));
  });
  digIntoIframes(document, (doc) => {
    els.push(...Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6,h7,[role="heading"]')));
  });

  const result: Array<{
    visible: boolean;
    visuallyhidden: boolean | undefined;
    wrong: boolean;
    level: number;
    el: HTMLElement;
  }> = [];
  for (const element of els) {
    let wrongLevel: boolean;
    const el = element as HTMLElement;
    const visible = isVisible(element);
    const n = parseInt((el.getAttribute("role") === "heading" ? el.getAttribute("aria-level") : el.nodeName.substring(1)) ?? "-1");
    if (visible) {
      wrongLevel = n > previousLevel && n !== previousLevel + 1;
      previousLevel = n;
    } else {
      wrongLevel = false;
    }
    result.push({
      visible,
      visuallyhidden: visible && isVisuallyHidden(el),
      wrong: wrongLevel,
      level: n,
      el,
    });
  }
  return result;
}

function countOutline(list: OutlineItem[], key: keyof OutlineItem): number {
  let count = 0;
  for (const element of list) {
    if (element[key]) count++;
  }
  return count;
}

function outlineToHTML(list: OutlineItem[]): string {
  let html = "";

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const el = item.el;
    html += '<li class="';
    html += item.wrong ? "wrong-level" : "correct-level";
    html += item.visible ? "" : " hidden";
    html += item.visuallyhidden ? " visuallyhidden" : "";
    html += `" style="margin-left: ${item.level} 'em;">`;
    html += '<a href="#' + i.toString() + '" target="_top">';
    html += '<span class="level" data-level="' + item.level.toString() + '"></span> ';
    html += '<span class="text">' + htmlEntities(el.textContent?.replace(/\s+/g, " ")) + "</span>";
    html += "</a>";
    html += "</li>";
  }

  return '<ul id="headings">' + html + "</ul>";
}

function htmlEntities(str?: string): string {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isVisible(el: Element | null): boolean {
  if (el == null) return true;
  let css = window.getComputedStyle(el);
  let cssVisible = false;
  while (el) {
    if (css.display === "none") {
      return false;
    }
    if (!cssVisible) {
      if (css.visibility === "hidden") {
        return false;
      }
      if (css.visibility === "visible") {
        cssVisible = true;
      }
    }
    if (el.getAttribute("aria-hidden") === "true") {
      return false;
    }
    el = el.parentElement;
    try {
      if (el) {
        css = window.getComputedStyle(el);
      }
    } catch (error) {
      return true; // happens on window element
    }
  }
  return true;
}

function isVisuallyHidden(el: Element): true | undefined {
  const size = el.getBoundingClientRect();
  const css = window.getComputedStyle(el);
  if (css.position === "absolute") {
    if (size.width <= 1 && size.height <= 1) {
      return true;
    }
    if (size.right <= 0) {
      return true; // although that's not the best idea ...
    }
  }
}

function highlightElement(el: HTMLElement, disableAutoScroll: boolean | undefined): void {
  if (!disableAutoScroll) {
    if ("scrollIntoViewIfNeeded" in el) {
      /** @see https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoViewIfNeeded */
      (el.scrollIntoViewIfNeeded as (this:HTMLElement, centerIfNeeded?: boolean)=>void)();
    } else {
      el.scrollIntoView();
    }
  }
  setTimeout(function () {
    let size:
      | DOMRect
      | {
          left: number;
          top: number;
          right: number;
          bottom: number;
          height?: number;
          width?: number;
        } = el.getBoundingClientRect();
    let visible = true;
    let parent = el.parentElement;
    while (!size.height && !size.width && !size.left && !size.top && parent != null) {
      size = parent.getBoundingClientRect();
      visible = false;
      parent = parent.parentElement;
    }
    if (parent == null) {
      return;
    }
    size = {
      left: size.left,
      top: size.top,
      bottom: size.bottom,
      right: size.right,
    };
    size.left = Math.min(window.innerWidth, size.left);
    size.right = Math.max(0, size.right);
    size.top = Math.min(window.innerHeight, size.top);
    size.bottom = Math.max(0, size.bottom);

    if (document.getElementById(highlighterEl.id) == null) {
      document.body.appendChild(highlighterEl);
    }

    highlighterEl.style.left = (size.left - 10).toString() + "px";
    highlighterEl.style.width = (size.right - size.left + 20).toString() + "px";
    highlighterEl.style.top = (size.top - 10).toString() + "px";
    highlighterEl.style.height = (size.bottom - size.top + 20).toString() + "px";
    highlighterEl.style.display = "block";
  }, 100);
}

function handleHoverHighlight(input: HTMLInputElement | null): void {
  const handler = function (): void {
    if (input?.checked) {
      enableHoverHighlight();
    } else {
      disableHoverHighlight();
    }
  };
  handler();
  input?.addEventListener("click", handler);
}

function highlightLink(el: HTMLElement | null): void {
  const links = doc.querySelectorAll("#headings a");
  for (let k = links.length - 1; k >= 0; k--) {
    if (links[k] === el) {
      links[k].classList.add("is-active");
    } else {
      links[k].classList.remove("is-active");
    }
  }
}

function handleElementHover(event: MouseEvent): void {
  const target = event.target;
  const all = document.body.querySelectorAll("*");
  let searchHeading = false;
  for (let i = all.length - 1; i >= 0; i--) {
    const el = all[i];
    if (searchHeading) {
      for (let j = outline.length - 1; j >= 0; j--) {
        if (outline[j].el === el && outline[j].visible) {
          // yeah, found heading
          highlightElement(outline[j].el, true);
          highlightLink(doc.querySelector('#headings a[href="#' + j.toString() + '"]'));
          return;
        }
      }
    } else if (el === target) {
      searchHeading = true;
      i++; // also handle the current element
    }
  }
  highlightLink(null);
}

function enableHoverHighlight(): void {
  document.body.addEventListener("mouseover", handleElementHover);
}

function disableHoverHighlight(): void {
  document.body.removeEventListener("mouseover", handleElementHover);
}
