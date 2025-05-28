import { randomString } from "./stringUtils";

declare global {
  // noinspection JSUnusedGlobalSymbols
  interface Window {
    PointerSelector: PointerSelector;
  }
}

export class PointerSelector {
  _pointerSelectorClassName = "phlffobkmklt";
  _pointerSelector: HTMLElement | undefined;
  _latestCoordinates: { x: number; y: number } = { x: 0, y: 0 };
  _debounceTimer: number  | undefined = undefined;
  private readonly _hoverHandler: ((e: HTMLElement) => void) | undefined;
  private readonly _clickHandler: ((e: HTMLElement) => boolean) | undefined;

  constructor(clickHandler?: (e: HTMLElement) => boolean, hoverHandler?: (e: HTMLElement) => void) {
    this._pointerSelectorClassName = randomString(16);
    this._clickHandler = clickHandler;
    this._hoverHandler = hoverHandler;
    if (!this.createPointerSelector(this._clickHandler)) throw new Error("Failed to create pointer selector, already exists");

    document.addEventListener("mouseover", this.mouseoverHandler, {
      passive: false,
      once: false,
      capture: false,
    });
  }

  private readonly mouseoverHandler = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    // if (target === document.firstElementChild) return;
    this.adjustPointerSelector(target);
    this._hoverHandler?.(target);
  };

  private readonly clickHandlerResolver = (e: MouseEvent): void => {
    e.stopImmediatePropagation();
    e.preventDefault();
    const t = this.getTargetFromCachedCoords(e);
    // console.debug("clickHandlerResolver target", t)
    if (t === document.firstElementChild) {
      console.debug("Target is document html, allowing retry Source Event: ", e);
      return;
    }
    if (!t) {
      console.error("Target is undefined. Source Event: ", e);
      throw new Error("Target is undefined");
    }
    let remove;
    try {
      remove = this._clickHandler?.(t);
    } catch (e) {
      console.error(e);
      remove = true;
    } finally {
      if (remove) {
        document.getElementById(this._pointerSelectorClassName)?.removeEventListener("click", this.clickHandlerResolver);
        document.getElementById(this._pointerSelectorClassName)?.removeEventListener("mouseover", this.pointerSelectorMouseEventForwarder);
        document.getElementById(this._pointerSelectorClassName)?.remove();
      }
    }
  };

  private readonly adjustPointerSelector = (target: HTMLElement): void => {
    const { x: x1, y: y1, height, width } = target.getBoundingClientRect();
    // const y2 = y1 + height;
    // const x2 = x1 + width;
    // const pointerSelector = document.getElementById(
    //   this._pointerSelectorClassName
    // ) as HTMLElement;
    if (!this._pointerSelector) throw new Error("Pointer selector does not exist");
    this._pointerSelector.style.top = `${y1 + window.scrollY}px`;
    this._pointerSelector.style.left = `${x1 + window.scrollX}px`;
    this._pointerSelector.style.width = `${width}px`;
    this._pointerSelector.style.height = `${height}px`;
  };

  private readonly getTargetFromCachedCoords: (sourceEvent: MouseEvent) => HTMLElement = (sourceEvent) => {
    if (!this._pointerSelector) throw new Error("Pointer selector does not exist");
    this._pointerSelector.style.display = "none";
    this._pointerSelector.remove();
    const t = document.elementFromPoint(
      this._latestCoordinates.x - (sourceEvent.view?.scrollX ?? 0),
      this._latestCoordinates.y - (sourceEvent.view?.scrollY ?? 0),
    ) as HTMLElement;
    this._pointerSelector.style.display = "block";
    document.body.appendChild(this._pointerSelector);
    if (!t) {
      console.error("Target is undefined", this._latestCoordinates);
    }
    return t;
  };

  private readonly createPointerSelector = (clickHandler: ((e: HTMLElement) => boolean) | undefined): boolean => {
    if (this._pointerSelector) {
      console.warn("Pointer selector already exists");
      return false;
    }

    this._pointerSelector = document.createElement("div");
    this._pointerSelector.className = this._pointerSelectorClassName;
    this._pointerSelector.style.position = "absolute";
    this._pointerSelector.id = this._pointerSelectorClassName;
    this._pointerSelector.style.zIndex = "999999999999";
    this._pointerSelector.style.border = "2px solid red";
    this._pointerSelector.style.outline = "2px solid orange";
    this._pointerSelector.style.outlineOffset = "2px";
    this._pointerSelector.style.opacity = "0.5";
    this._pointerSelector.style.margin = "0";
    this._pointerSelector.style.padding = "0";
    if (typeof clickHandler === "function") {
      this._pointerSelector.style.pointerEvents = "auto";
      this._pointerSelector.addEventListener("click", this.clickHandlerResolver, {
        passive: false,
        once: false,
        capture: true,
      });
      this._pointerSelector.addEventListener("mousemove", this.pointerSelectorMouseEventForwarder, {
        passive: false,
        once: false,
        capture: true,
      });
      this._pointerSelector.addEventListener("mouseover", this.pointerSelectorMouseEventForwarder, {
        passive: false,
        once: false,
        capture: true,
      });
    } else {
      this._pointerSelector.style.pointerEvents = "none";
    }
    this._pointerSelector = document.body.appendChild(this._pointerSelector);
    return true;
  };

  private readonly pointerSelectorMouseEventForwarder = (e: MouseEvent): void => {
    // _pointerSelector.style.pointerEvents = "none";

    e.stopPropagation();
    // console.debug("pointerSelectorMouseEventForwarder", e);
    // forwardEvent(e)
    this._latestCoordinates = {
      x: e.clientX + (e.view?.scrollX ?? 0),
      y: e.clientY + (e.view?.scrollY ?? 0),
    };
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
    if (e.type === "click") {
      this.forwardEvent(e);
    } else {
      this._debounceTimer = window.setTimeout(() => {
        this.forwardEvent(e);
      }, 100);
    }
  };

  private readonly forwardEvent = (e: MouseEvent): void => {
    // _pointerSelector.style.display = "none";
    const lowerEl = this.getTargetFromCachedCoords(e);

    let eventType = e.type;
    switch (e.type) {
      case "click":
      case "mouseover":
      case "mousemove":
        eventType = "mouseover";
        break;
      default:
        console.warn("hit default with event, ", e);
        return;
    }

    lowerEl?.dispatchEvent(
      new MouseEvent(eventType, {
        bubbles: true,
      }),
    );

    this._debounceTimer = undefined;
  };
}

export function CreatePointerSelector(clickCallback?: (t: HTMLElement) => boolean, hoverCallback?: (t: HTMLElement) => void): void {
  window.PointerSelector = new PointerSelector(clickCallback, hoverCallback);
}

export { CreatePointerSelector as default };
