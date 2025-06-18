const config: MutationObserverInit = {
  attributes: true,
  subtree: true,
  childList: true,
  characterData: true,
  attributeOldValue: true,
  characterDataOldValue: true,
};

const displayContainerID = "aria-live-monitor";
const displayContainer = document.createElement("div");
displayContainer.id = displayContainerID;
displayContainer.style.position = "fixed";
displayContainer.style.top = "0";
displayContainer.style.left = "0";
displayContainer.style.width = "100%";
displayContainer.style.height = "100%";
displayContainer.style.pointerEvents = "none";

const styleContainer = document.createElement("style");
const styles = `
style {
  display: none;
}
.ripple {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 0, 0, 0.5);
  animation: ripple 2s infinite;
}
.arialive-result {
  pointer-events: all;
  background: rgba(0, 9, 0, 0.75);
  width: 25%;
  color: white;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
}

/* Circle */
.circle {
  pointer-events: none;
  height: 100vh;
  width: 100vw;
  border-radius: 50%;
  /*    */
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  overflow: hidden;
}

.circle:before,
.circle:after {
  content: '';
  display: block;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  border: 1px solid #ff4343;
  border-radius: 50%;
}


.circle:before {
  animation: ripple 2s linear;
}

.circle:after {
  animation: ripple 2s linear 1s;
}

@keyframes ripple{
  0% { transform: scale(0.1); }
  50% { transform: scale(0.7); opacity:1; }
  100% { transform: scale(1.6); opacity:0.4; }
}
`;
styleContainer.innerHTML = styles;
// document.head.appendChild(styleContainer);

displayContainer.appendChild(styleContainer);
const controlsContainer = document.createElement("div");
controlsContainer.id = "controls-container";
controlsContainer.style.display = "flex";
controlsContainer.style.width = "100%";
controlsContainer.style.justifyContent = "space-between";
controlsContainer.style.alignItems = "center";
controlsContainer.style.padding = "0.5rem";
controlsContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
controlsContainer.style.top = "0";

const resultsContainer = document.createElement("div");
resultsContainer.id = "results-container";
displayContainer.appendChild(resultsContainer);
// resultsContainer.appendChild(controlsContainer)
displayContainer.insertAdjacentElement("afterbegin", controlsContainer);

const collapseButton = document.createElement("button");
collapseButton.innerText = "toggle aria results";
collapseButton.style.display = "block";
collapseButton.style.top = "0";
collapseButton.style.left = "0";
collapseButton.style.zIndex = "1000";
collapseButton.style.pointerEvents = "all";
collapseButton.ariaExpanded = "true";
collapseButton.addEventListener("click", () => {
  resultsContainer.style.display = "none";
  const oldariaExpanded = resultsContainer.getAttribute("aria-expanded");
  const newAriaExpanded = oldariaExpanded === "false" ? "true" : "false";
  resultsContainer.setAttribute("aria-expanded", newAriaExpanded);

  resultsContainer.style.display = newAriaExpanded === "true" ? "block" : "none";
});
controlsContainer.appendChild(collapseButton);

const closeButton = document.createElement("button");
closeButton.innerText = "closeButton";
closeButton.style.position = "fixed";
closeButton.style.top = "0";
closeButton.style.right = "0";
closeButton.style.zIndex = "1000";
closeButton.addEventListener(
  "click",
  () => {
    displayContainer.remove();
  },
  { once: true },
);

function closeOnEscape(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    console.log("escape pressed");
    closeButton.removeEventListener("click", () => {
      displayContainer.remove();
    });
    displayContainer.remove();
    document.removeEventListener("keyup", closeOnEscape);
  }
}

document.addEventListener("keyup", closeOnEscape, { once: false });
displayContainer.appendChild(closeButton);
document.body.appendChild(displayContainer);

// const pingAnimation = document.createElement("div");
// pingAnimation.classList.add("circle");
// pingAnimation.style.zIndex = "1000";
// pingAnimation.style.pointerEvents = "none";
// pingAnimation.style.top = "50vh";
// pingAnimation.style.left = '50vw';

// document.body.appendChild(pingAnimation);
function ping(x: number, y: number): void {
  const pingAnimation = document.createElement("div");
  pingAnimation.classList.add("circle");
  pingAnimation.style.top = `${y}px`;
  pingAnimation.style.left = `${x}px`;
  pingAnimation.style.display = "block";
  document.body.appendChild(pingAnimation);
  setTimeout(() => {
    pingAnimation.remove();
  }, 2100);
}

const displaytemplate = (mutation: MutationRecord): string => {
  const target = mutation.target as HTMLElement;
  const attr = mutation.attributeName;
  const value = attr ? target.getAttribute(attr) : null;
  const oldValue = mutation.oldValue;
  const addedNodes = Array.from(mutation.addedNodes);
  const removedNodes = Array.from(mutation.removedNodes);
  const textContent = target.textContent;
  const oldTextContent = mutation.oldValue;
  const type = mutation.type;
  const result = `
    <div class="arialive-result">
        <div>type: ${type.toString()}</div>
        <div>target: ${target.outerText}</div>
        ${target.outerHTML ? `<div>outerHTML: ${target.outerHTML}</div>` : ""}
        ${attr ? `<div>attribute: ${attr}</div>` : ""}
        ${value ? `<div>value: ${value}</div>` : ""}
        ${oldValue ? `<div>oldValue: ${oldValue}</div>` : ""}
        ${addedNodes.length ? `<div>addedNodes: ${addedNodes.map((x) => x.nodeName).join(", ")}</div>` : ""}
        ${removedNodes.length ? `<div>removedNodes: ${removedNodes.map((x) => x.nodeName).join(", ")}</div>` : ""}
        ${textContent ? `<div>textContent: ${textContent}</div>` : ""}
        ${oldTextContent ? `<div>oldTextContent: ${oldTextContent}</div>` : ""}
    </div>
    `;
  return result;
};

function drawHighlightOverlay(element: HTMLElement): void {
  ping(element.offsetLeft + element.offsetWidth / 2, element.offsetTop + element.offsetHeight / 2);
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("data-aria-live-monitor", "true");
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.zIndex = "1000";
  // overlay.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
  overlay.style.pointerEvents = "none";
  overlay.style.background = "transparent radial-gradient(circle, transparent 1%, #47a7f5 94%) center";
  // overlay.style.animation = 'pulse 2s infinite';
  overlay.className = "ripple";
  // overlay.style.boxShadow = "0 0 0 0.5rem rgba(255, 0, 0, 0.5)";
  // overlay.style.borderRadius = "0.5rem";
  // overlay.style.transition = "all 2s ease-in-out";
  // element.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  document.body.appendChild(overlay);
  // element.appendChild(overlay);
  setTimeout(() => {
    overlay.remove();
  }, 2000);
}

const mutationObserverCallback: MutationCallback = (mutations, _observer) => {
  // if displayContainer is removed, disconnect observer
  if (!displayContainer.isConnected) {
    console.dir(displayContainer);
    console.log("displayContainer removed, disconnecting observer");
    _observer.disconnect();
    return;
  }
  if (resultsContainer.childElementCount > 4) {
    while (resultsContainer.childElementCount > 4) {
      if (resultsContainer.lastElementChild) resultsContainer.removeChild(resultsContainer.lastElementChild);
    }
  }
  mutations.forEach((mutation) => {
    drawHighlightOverlay(mutation.target as HTMLElement);
    resultsContainer.insertAdjacentHTML("afterbegin", displaytemplate(mutation));
    if (mutation.type === "childList") {
      console.debug("mutation: ", mutation);
      // const target = mutation.target as HTMLElement;
      const addedNodes = Array.from(mutation.addedNodes);
      const removedNodes = Array.from(mutation.removedNodes);
      console.debug("addedNodes: ", addedNodes);
      console.debug("removedNodes: ", removedNodes);
      addedNodes.forEach((x) => {
        if (x.nodeType === Node.TEXT_NODE) {
          console.debug("text node added: ", x.textContent);
        } else if (x.nodeType === Node.ELEMENT_NODE) {
          console.debug("element node added: ", x);
          const liveregions = Array.from((x as HTMLElement).querySelectorAll("[aria-live]"));
          if (liveregions) console.debug("found regions: ", liveregions);
          liveregions.forEach((x) => {
            if (monitoredNodes.includes(x)) {
              console.log("node already present", x);
              return;
            }
            monitoredNodes.push(x);
            const mo = new MutationObserver(mutationObserverCallback);
            mo.observe(x, config);
          });
        }
      });
      removedNodes.forEach((x) => {
        if (x.nodeType === Node.TEXT_NODE) {
          console.debug("text node removed: ", x.textContent);
        } else if (x.nodeType === Node.ELEMENT_NODE) {
          console.debug("element node removed: ", x);
          const liveRegions = Array.from((x as HTMLElement).querySelectorAll("[aria-live]"));
          if (liveRegions) console.debug("found regions: ", liveRegions);
          liveRegions.forEach((x) => {
            if (monitoredNodes.includes(x)) {
              console.log("node already present", x);
              return;
            }
            monitoredNodes.push(x);
            const mo = new MutationObserver(mutationObserverCallback);
            mo.observe(x, config);
          });
        }
      });
    }
    if (mutation.type === "characterData") {
      console.debug("mutation: ", mutation);
      const target = mutation.target as HTMLElement;
      console.debug("text node changed: ", target.textContent);
    }

    if (mutation.type === "attributes") {
      console.debug("mutation: ", mutation);
      const target = mutation.target as HTMLElement;
      const attr = mutation.attributeName;
      const value = attr ? target.getAttribute(attr) : null;
      console.debug("value: ", value);
      if (attr === "aria-live") {
        console.debug("aria-live changed");
        if (value === "off") {
          console.debug("removing node from monitoredNodes");
          const idx = monitoredNodes.indexOf(target);
          if (idx > -1) {
            monitoredNodes.splice(idx, 1);
          }
        }
      }
    }
  });
};

// const al_attr = 'data-arialive-mutatobs-set'
const monitoredNodes: Element[] = [];

// apply callback to shadow roots
function applyToShadowRoots(startNode: Element, callback: (root: ShadowRoot) => void): void {
  startNode.querySelectorAll("*").forEach((x) => {
    if (x.shadowRoot) callback(x.shadowRoot);
  });
}

function MonitorAriaLive(): void {
  //    const body = document.querySelector('body')
  //    if (body.attributes.getNamedItem(al_attr)) {
  //        console.log("Aria live mutation observers already set")
  //        return
  //    }

  console.debug("Looking for aria-live regions");
  const liveregions = Array.from(document.querySelectorAll("[aria-live]"));

  applyToShadowRoots(document.body, (root) => {
    liveregions.push(...Array.from(root.querySelectorAll("[aria-live]")));
  });
  if (liveregions) console.debug("found regions: ", liveregions);
  liveregions.forEach((x) => {
    if (monitoredNodes.includes(x)) {
      console.log("node already present", x);
      return;
    }
    monitoredNodes.push(x);
    const mo = new MutationObserver(mutationObserverCallback);
    mo.observe(x, config);
  });
  console.debug("monitoredNodes: ", monitoredNodes);
  //    body.setAttribute(al_attr, '')
}

MonitorAriaLive();
