
"use strict";


let useIDRefs = true;
let hidePanels = false;
let targetAndSourceCompilationReadable = "";
let targetAndSourceCompilationProcessed = "";
function* cartesian<T>(head: T[], ...tail: T[][]): Generator<T[], void, unknown> {
  // @ts-expect-error will be fiiine
  const remainder: T[][] = tail.length ? cartesian(...tail) : [[]];
  for (const r of remainder) for (const h of head) yield [h, ...r];
}
function findShortestUniqueClassCombination(el: Element): string | undefined {
  const classList = el.classList;
  const classListArray = Array.from(classList);
  let shortestUniqueClassCombination: string | undefined;

  for (const combo of cartesian(classListArray, classListArray)) {
    const classString = "." + combo.join(".");
    const f = document.querySelectorAll(classString);
    if (f.length === 1) {
      shortestUniqueClassCombination = classString;
      break;
    }
  }
  return shortestUniqueClassCombination;
}
function getShortestCssSelector(el: Element): string {
  let currentEl = el;
  let shortestUniqueClassCombination;

  do {
    shortestUniqueClassCombination = findShortestUniqueClassCombination(currentEl);
    if (shortestUniqueClassCombination) {
      return shortestUniqueClassCombination;
    }
    currentEl = currentEl.parentNode as Element;
  } while (currentEl.parentNode);
  const path = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += "#" + el.id;
      path.unshift(selector);
      break;
    } else {
      let sib: Element | null = el;
      let nth = 1;
      while (sib) {
        if (sib.nodeName.toLowerCase() === selector) {
          nth++;
        }
        sib = sib.previousElementSibling;
      }
      if (nth !== 1) {
        selector += ":nth-of-type(" + String(nth) + ")";
      }
    }
    path.unshift(selector);
    el = el.parentNode as Element;
  }
  return path.join(" > ");
}
function getXpath(el: Element): string {
  return getShortestCssSelector(el);
  // let currentEl = el;
  // let currentElTagName = el.tagName.toLowerCase();
  // let parentEl: HTMLElement;
  // let parentElTagName = "";
  // let xpath = "";
  // let index = "";
  // let separator = "";
  //
  // while (currentEl.parentNode) {
  //     parentEl = currentEl.parentNode as HTMLElement;
  //     if (parentEl.tagName) {
  //         parentElTagName = parentEl.tagName.toLowerCase();
  //         const elementsWithSameTagName = parentEl.querySelectorAll(":scope > " + currentEl.tagName);
  //         if (elementsWithSameTagName.length > 1) {
  //             index = "[" + parseInt(String(Array.from(elementsWithSameTagName).indexOf(currentEl) + 1)).toString() + "]";
  //         } else {
  //             index = "";
  //         }
  //         currentElTagName = currentEl.tagName.toLowerCase();
  //         const id = currentEl.getAttribute("id");
  //         if (id && useIDRefs) {
  //             xpath = '/*[@id="' + id + '"]' + separator + xpath;
  //         } else {
  //             xpath = currentElTagName + index + separator + xpath;
  //         }
  //         separator = "/";
  //     }
  //
  //     currentEl = parentEl as Element;
  // }
  // if (parentElTagName === "") {
  //     parentElTagName = currentElTagName;
  // }
  // xpath = "//" + parentElTagName + index + separator + xpath;
  //
  // const xpathSplit = xpath.split("//*");
  // if (xpathSplit.length > 1) {
  //     xpath = xpathSplit[xpathSplit.length - 1];
  //     xpath = "//*" + xpath;
  // }
  //
  // return xpath;
}

function getXpathAndSource(): void {
  let currentEl: HTMLElement;
  let parentEl: HTMLElement;
  let infoPanel: HTMLDivElement;
  let outputPanelForARC: HTMLDivElement;
  let outputPanelForARC_textarea: HTMLTextAreaElement;
  let outputPanelForARC_textarea_label: HTMLLabelElement;
  let outputPanelForARC_input: HTMLInputElement;
  let outputPanelForARC_input_label: HTMLLabelElement;
  let outputPanelForARC_closeButton: HTMLButtonElement;
  let outputPanelForARCAdded = false;
  const hasRun = false;

  if (!document.querySelector("#tempDOMDumpingGround")) {
    const tempDOMDumpingGroundNew = document.createElement("div");
    tempDOMDumpingGroundNew.setAttribute("id", "tempDOMDumpingGround");
    tempDOMDumpingGroundNew.setAttribute("hidden", "hidden");
    document.body.appendChild(tempDOMDumpingGroundNew);
  }

  const allEls = document.querySelectorAll("*");

  function downloadReadable(filename: string, text: string | number | boolean): void {
    const allTargetsFileDownloadLinkReadable = document.querySelector("#allTargetsFileDownloadLinkReadable");
    if (!allTargetsFileDownloadLinkReadable) {
      throw new Error("allTargetsFileDownloadLinkReadable not found");
    }
    allTargetsFileDownloadLinkReadable.textContent = "Download the targets (Readable, .txt file)";
    allTargetsFileDownloadLinkReadable.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    allTargetsFileDownloadLinkReadable.setAttribute("download", filename);
  }

  function downloadProcessed(filename: string, text: string | number | boolean): void {
    const allTargetsFileDownloadLinkProcessed = document.querySelector("#allTargetsFileDownloadLinkProcessed");
    if (!allTargetsFileDownloadLinkProcessed) {
      throw new Error("allTargetsFileDownloadLinkProcessed not found");
    }
    allTargetsFileDownloadLinkProcessed.textContent = "Download the targets (Processed, .txt file)";
    allTargetsFileDownloadLinkProcessed.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    allTargetsFileDownloadLinkProcessed.setAttribute("download", filename);
  }

  function addEmptyDownloadLinkReadable(): void {
    const a = document.createElement("a");
    a.setAttribute("id", "allTargetsFileDownloadLinkReadable");
    a.setAttribute("class", "allTargetsFileDownloadLink");
    a.addEventListener("click", (e) => {
      buildMarkdownFileOutput();
      const prefix = prompt("What SC do these targets relate to? (Filename will be prepended accordingly)");
      const allTargetsFileDownloadLinkReadable = document.querySelector("#allTargetsFileDownloadLinkReadable");
      if (!allTargetsFileDownloadLinkReadable) {
        throw new Error("allTargetsFileDownloadLinkReadable not found");
      }
      a.setAttribute("download", prefix ?? "" + "-xpaths-targets-selected---human-readable.txt");
      e.stopPropagation();
    });
    document.body.appendChild(a);
  }

  function addEmptyDownloadLinkProcessed(): void {
    const a = document.createElement("a");
    a.setAttribute("id", "allTargetsFileDownloadLinkProcessed");
    a.setAttribute("class", "allTargetsFileDownloadLink");
    a.addEventListener("click", (e) => {
      buildMarkdownFileOutput();
      const prefix = prompt("What SC do these targets relate to? (Filename will be prepended accordingly)");

      document
        .getElementById("allTargetsFileDownloadLinkProcessed")
        ?.setAttribute("download", prefix ?? "" + "-xpaths-targets-selected---machine-readable.txt");
      e.stopPropagation();
    });
    document.body.appendChild(a);
  }

  function addInfoPanel(): void {
    infoPanel = document.createElement("div");
    infoPanel.setAttribute("id", "infoPanel");
    infoPanel.setAttribute("role", "status");
    document.body.appendChild(infoPanel);
  }

  function addOutputPanelForARC(): void {
    function addPanelBehaviours(): void {
      outputPanelForARC_input.addEventListener("click", (e) => {
        outputPanelForARC_input.select();
        e.stopPropagation();
      });
      outputPanelForARC_textarea.addEventListener("click", (e) => {
        outputPanelForARC_textarea.select();
        e.stopPropagation();
      });

      outputPanelForARC.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      outputPanelForARC_input_label.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      outputPanelForARC_textarea_label.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      outputPanelForARC_closeButton.addEventListener("click", () => {
        removeAllTheThings();
      });
    }

    function createLabels(): void {
      outputPanelForARC_input_label = document.createElement("label");
      outputPanelForARC_input_label.setAttribute("for", "outputPanelForARC_input");
      outputPanelForARC_input_label.textContent = "Xpath locator";

      outputPanelForARC_textarea_label = document.createElement("label");
      outputPanelForARC_textarea_label.setAttribute("for", "outputPanelForARC_textarea");
      outputPanelForARC_textarea_label.textContent = "Source code";
    }

    function createInputs(): void {
      outputPanelForARC_input = document.createElement("input");
      outputPanelForARC_input.setAttribute("id", "outputPanelForARC_input");

      outputPanelForARC_textarea = document.createElement("textarea");
      outputPanelForARC_textarea.setAttribute("id", "outputPanelForARC_textarea");
      outputPanelForARC_textarea.setAttribute("aria-label", "Source code");
    }

    function createCloseButton(): void {
      outputPanelForARC_closeButton = document.createElement("button");
      outputPanelForARC_closeButton.setAttribute("type", "button");
      outputPanelForARC_closeButton.textContent = "Close";
    }

    function createInfoPanel(): void {
      outputPanelForARC = document.createElement("div");
      outputPanelForARC.setAttribute("id", "outputPanelForARC");
      outputPanelForARC.setAttribute("tabindex", "-1");
      outputPanelForARC.setAttribute("role", "region");
      outputPanelForARC.setAttribute("aria-label", "Xpath and Source values");
    }

    function addElementsToInfoPanel(): void {
      outputPanelForARC.appendChild(outputPanelForARC_input_label);
      outputPanelForARC.appendChild(outputPanelForARC_input);
      outputPanelForARC.appendChild(outputPanelForARC_textarea_label);
      outputPanelForARC.appendChild(outputPanelForARC_textarea);
      outputPanelForARC.appendChild(outputPanelForARC_closeButton);
    }

    createInfoPanel();
    createInputs();
    createLabels();
    createCloseButton();
    addElementsToInfoPanel();
    addPanelBehaviours();

    document.body.appendChild(outputPanelForARC);
    outputPanelForARCAdded = true;
  }

  function removeAllTheThings(): void {
    outputPanelForARC.remove();
    document.querySelector("#xpathGetterStyles")?.remove();
  }

  function buildMarkdownFileOutput(): void {
    downloadReadable("xpaths-targets-selected.txt", targetAndSourceCompilationReadable);
    downloadProcessed("xpaths-targets-selected-processed.txt", targetAndSourceCompilationProcessed);
  }

  function addAppStyles(): void {
    const xpathGetterStyles = document.createElement("style");
    xpathGetterStyles.setAttribute("id", "xpathGetterStyles");
    xpathGetterStyles.textContent =
      "#outputPanelForARC button {border:1px solid white;color:white;background:black;}#outputPanelForARC label {color:white;}#outputPanelForARC, #outputPanelForARC * {font-size:20px;font-family:sans-serif;}#outputPanelForARC {position:fixed;bottom:80px;right:20px;padding:20px;background:black;width:50vw;z-index:10000;outline:3px solid white;border-radius:5px;}#outputPanelForARC input, #outputPanelForARC textarea {width:100%;display:block;margin:10px 0;background:white;color:black;}#outputPanelForARC textarea {font-family:monospace;}.tempHighlight{outline:4px solid black!important;outline-offset:-4px!important;-webkit-box-shadow: 0px 0px 0px 4px #fff; box-shadow: 0px 0px 0px 4px #fff;}#infoPanel {z-index:100000;font-size:20px;background:rgba(0,0,0,0.8);color:#fff;font-weight:bold;padding:10px;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);max-width:50vw;font-family:sans-serif;overflow-wrap: break-word;outline:3px solid white;border-radius:5px;}#infoPanel:empty {visibility:hidden;}#infoPanel code {color:lime}#allTargetsFileDownloadLinkReadable {right:20px;background:rgba(41, 98, 24,0.9);}#allTargetsFileDownloadLinkProcessed {right:400px;background:rgba(135, 48, 167,0.9);outline:3px solid white;border-radius:5px;}.allTargetsFileDownloadLink {position:fixed;bottom:20px;color:white;font-weight:bold;padding:10px;font-family:sans-serif;font-size:16px;z-index:10000;outline:3px solid white;border-radius:5px;}.allTargetsFileDownloadLink:empty{visibility:hidden}#infoPanel kbd {color:yellow;}";
    // xpathGetterStyles.style.display = 'unset';
    xpathGetterStyles.style.display = "none";
    document.head.appendChild(xpathGetterStyles);
  }

  function getNodeHTML(el: Element): string {
    const wrap = document.createElement("span");
    wrap.appendChild(el.cloneNode(true));
    return wrap.innerHTML;
  }

  function getNodeDetails(el: Element): void {
    if (!outputPanelForARCAdded) {
      addOutputPanelForARC();
    }
    buildMarkdownFileOutput();
    unhighlightElement(el);
    outputPanelForARC_input.value = getXpath(el);
    let markup = getNodeHTML(el).replace(' class=""', "");

    const markupSplit = markup.split("\n");
    markup = "";
    for (const element of markupSplit) {
      if (element.trim() !== "") {
        markup += element.trim() + "\n";
      }
    }
    // const indented = indent.js(markup, { tabString: "\t" });
    // outputPanelForARC_textarea.value = indented;
    outputPanelForARC_textarea.value = markup;

    targetAndSourceCompilationReadable +=
      getXpath(el) + "\n" + markup + "🔸🔸🔸🔸🔸🔸🔸🔸🔸🔸🔸🔸 END target and source markup 🔸🔸🔸🔸🔸🔸🔸🔸🔸🔸🔸🔸\n";
    targetAndSourceCompilationProcessed += getXpath(el) + "~~~//~~~" + flatten(markup) + "\n";
    console.clear();
    console.log("targetAndSourceCompilationReadable = \n", targetAndSourceCompilationReadable);
  }

  function flatten(string: string): string {
    string = string.split("\n").join("\\n");
    return string;
  }

  function hideAllTheThings(): void {
    document.querySelector("#outputPanelForARC")?.setAttribute("hidden", "hidden");

    // if (document.querySelector("#infoPanel")) {
    //   document.querySelector("#infoPanel").setAttribute("hidden","hidden");
    // }
    if (document.querySelector("#allTargetsFileDownloadLinkProcessed")) {
      document.querySelector("#allTargetsFileDownloadLinkProcessed")?.setAttribute("hidden", "hidden");
    }
    if (document.querySelector("#allTargetsFileDownloadLinkReadable")) {
      document.querySelector("#allTargetsFileDownloadLinkReadable")?.setAttribute("hidden", "hidden");
    }
  }

  function showAllTheThings(): void {
    document.querySelector("#outputPanelForARC")?.removeAttribute("hidden");

    document.querySelector("#infoPanel")?.removeAttribute("hidden");

    document.querySelector("#allTargetsFileDownloadLinkProcessed")?.removeAttribute("hidden");

    document.querySelector("#allTargetsFileDownloadLinkReadable")?.removeAttribute("hidden");
  }

  unHighlightAll();
  Array.from(allEls).forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.getAttribute("id") !== "allTargetsFileDownloadLinkReadable") {
        e.stopPropagation();
        e.preventDefault();
        getNodeDetails(el);
        infoPanel.innerHTML = "Values captured for " + getXpath(el);
      }
    });
    el.addEventListener("focus", (e) => {
      indicateCurrentEl(el, e);
    });
    el.addEventListener("mouseover", (e) => {
      indicateCurrentEl(el, e);
    });
    el.addEventListener("mouseout", () => {
      unHighlightAll();
    });
    el.addEventListener("blur", () => {
      unHighlightAll();
    });
  });

  function unHighlightAll(): void {
    Array.from(allEls).forEach((el) => {
      unhighlightElement(el);
    });
  }

  function indicateCurrentEl(el: Element, e: Event): void {
    currentEl = el as HTMLElement;
    e.stopPropagation();
    if (!hasRun) {
      highlightElement(el);
    }
    updateInfoPanel(currentEl);
  }

  function unhighlightElement(el: Element): void {
    el.classList.remove("tempHighlight");
  }

  function highlightElement(el: Element): void {
    el.classList.add("tempHighlight");
  }

  function updateInfoPanel(el: Element): void {
    // console.clear();
    // console.log(getXpath(el));
    infoPanel.innerHTML = getXpath(el);
  }

  function checkKeyPresses(): void {
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        removeAllTheThings();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (currentEl.parentNode && currentEl.tagName !== "HTML") {
          unhighlightElement(currentEl);
          parentEl = currentEl.parentNode as HTMLElement;
          currentEl = parentEl;
          highlightElement(currentEl);
        }
        updateInfoPanel(currentEl);
        infoPanel.textContent = infoPanel.textContent ?? "" + " 👈 Press Return to get this element's details";
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (currentEl.previousElementSibling) {
          unhighlightElement(currentEl);
          currentEl = currentEl.previousElementSibling as HTMLElement;
          indicateCurrentEl(currentEl, e);
        }
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (currentEl.nextElementSibling) {
          unhighlightElement(currentEl);
          currentEl = currentEl.nextElementSibling as HTMLElement;
          indicateCurrentEl(currentEl, e);
        }
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (currentEl.childNodes.length > 1) {
          unhighlightElement(currentEl);
          let elementNodeFound = false;
          let elementToMoveTo;

          Array.from(currentEl.childNodes).forEach((thisNode) => {
            if (thisNode.nodeType === 1 && !elementNodeFound) {
              elementNodeFound = true;
              elementToMoveTo = thisNode;
            }
          });
          if (elementToMoveTo) {
            currentEl = elementToMoveTo;
            indicateCurrentEl(currentEl, e);
          }
        }
      }
      if (e.key === "x") {
        useIDRefs = !useIDRefs;
        console.log("useIDRefs = ", useIDRefs);
        if (useIDRefs) {
          infoPanel.innerHTML = "Using ID refs (where available) to get xpath";
        } else {
          infoPanel.innerHTML = "Using element position in DOM to get xpath";
        }
      }
      if (e.key === "h") {
        console.log("hidePanels = ", hidePanels);
        if (!hidePanels) {
          infoPanel.innerHTML = "Hiding panels temporarily (press h to show again or select an element)";
          hideAllTheThings();
        } else {
          showAllTheThings();
          infoPanel.innerHTML = "Showing panels";
        }
        hidePanels = !hidePanels;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        currentEl.click();
      }
    });
  }

  addAppStyles();
  addInfoPanel();
  addEmptyDownloadLinkReadable();
  addEmptyDownloadLinkProcessed();
  checkKeyPresses();
  // @ts-expect-error will be fiiine
  if (typeof infoPanel !== "undefined") {
    infoPanel.innerHTML =
      "<p>Xpath and Source getter started.</p><ul><li>Hover over on elements on the page, then click when the correct element is highlighted</li><li>Or <kbd>Tab</kbd> to a focusable element on the page and then press the arrow keys to fine tune your selection (choose parent, child and sibling elements in the DOM) and confirm that selection with <kbd>Enter</kbd></li><li>You can toggle the xpath type by (DOM position or use ID if present) pressing <kbd>x</kbd> key</li><li>Show/hide panels and download links by the <kbd>h</kbd> key</li></ul>";
  }
}

getXpathAndSource();
