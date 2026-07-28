import { activateBookmarklet, type BookmarkletLifecycle } from "./bookmarkletLifecycle";

export class PointerSelector {
  _pointerSelector: HTMLElement | undefined;
  _debounceTimer: number | undefined = undefined;
  private _destroyed = false;
  private readonly _hoverHandler: ((e: Element) => void) | undefined;
  private readonly _clickHandler: ((e: Element) => boolean) | undefined;
  private readonly _lifecycle: BookmarkletLifecycle | undefined;

  constructor(
    readonly clickHandler?: (e: Element) => boolean,
    hoverHandler?: (e: Element) => void,
    lifecycle?: BookmarkletLifecycle,
  ) {
    this._clickHandler = clickHandler;
    this._hoverHandler = hoverHandler;
    this._lifecycle = lifecycle;
    this.createPointerSelector();

    if (lifecycle === undefined) {
      document.addEventListener("pointermove", this.pointermoveHandler, { capture: true });
      document.addEventListener("keydown", this.keydownHandler, { capture: true });
      if (this._clickHandler !== undefined) document.addEventListener("click", this.clickHandlerResolver, { capture: true });
    } else {
      lifecycle.listen(document, "pointermove", this.pointermoveHandler as EventListener, { capture: true });
      lifecycle.listen(document, "keydown", this.keydownHandler as EventListener, { capture: true });
      if (this._clickHandler !== undefined) {
        lifecycle.listen(document, "click", this.clickHandlerResolver as EventListener, { capture: true });
      }
      lifecycle.addCleanup(this.destroyResources);
    }
  }

  private readonly pointermoveHandler = (e: PointerEvent): void => {
    if (this._destroyed) return;
    if ((e.target as Node | null)?.nodeType !== Node.ELEMENT_NODE) return;
    const target = e.target as Element;
    this.adjustPointerSelector(target);
    if (this._hoverHandler === undefined) return;
    if (this._debounceTimer !== undefined) window.clearTimeout(this._debounceTimer);
    this._debounceTimer = window.setTimeout(() => {
      this._debounceTimer = undefined;
      if (!this._destroyed) this._hoverHandler?.(target);
    }, 100);
  };

  private readonly keydownHandler = (event: KeyboardEvent): void => {
    if (event.key === "Escape") this.destroy();
  };

  destroy(): void {
    if (this._lifecycle?.active === true) {
      this._lifecycle.teardown();
      return;
    }
    this.destroyResources();
  }

  private readonly destroyResources = (): void => {
    if (this._destroyed) return;
    this._destroyed = true;
    document.removeEventListener("pointermove", this.pointermoveHandler, true);
    document.removeEventListener("keydown", this.keydownHandler, true);
    document.removeEventListener("click", this.clickHandlerResolver, true);
    if (this._debounceTimer !== undefined) {
      window.clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
    }
    this._pointerSelector?.remove();
  };

  private readonly clickHandlerResolver = (e: MouseEvent): void => {
    e.stopImmediatePropagation();
    e.preventDefault();
    const target = e.composedPath().find((candidate) => (candidate as Node).nodeType === Node.ELEMENT_NODE) as Element | undefined;
    if (target === document.firstElementChild) {
      console.debug("Target is document html, allowing retry Source Event: ", e);
      return;
    }
    if (target === undefined) {
      console.error("Target is undefined. Source Event: ", e);
      throw new Error("Target is undefined");
    }
    let remove;
    try {
      remove = this._clickHandler?.(target);
    } catch (e) {
      console.error(e);
      remove = true;
    } finally {
      if (remove) {
        this.destroy();
      }
    }
  };

  private readonly adjustPointerSelector = (target: Element): void => {
    const { x: x1, y: y1, height, width } = target.getBoundingClientRect();
    if (!this._pointerSelector) throw new Error("Pointer selector does not exist");
    this._pointerSelector.style.top = `${(y1 + window.scrollY).toString()}px`;
    this._pointerSelector.style.left = `${(x1 + window.scrollX).toString()}px`;
    this._pointerSelector.style.width = `${width.toString()}px`;
    this._pointerSelector.style.height = `${height.toString()}px`;
  };

  private readonly createPointerSelector = (): void => {
    this._pointerSelector = document.createElement("div");
    this._pointerSelector.style.position = "absolute";
    this._pointerSelector.style.zIndex = "999999999999";
    this._pointerSelector.style.border = "2px solid red";
    this._pointerSelector.style.outline = "2px solid orange";
    this._pointerSelector.style.outlineOffset = "2px";
    this._pointerSelector.style.opacity = "0.5";
    this._pointerSelector.style.margin = "0";
    this._pointerSelector.style.padding = "0";
    this._pointerSelector.style.pointerEvents = "none";
    if (this._lifecycle !== undefined) this._lifecycle.ownNode(this._pointerSelector);
    this._pointerSelector = document.body.appendChild(this._pointerSelector);
  };
}

export function CreatePointerSelector(
  toolName: string,
  clickCallback?: (t: Element) => boolean,
  hoverCallback?: (t: Element) => void,
): PointerSelector | null {
  const lifecycle = activateBookmarklet(toolName);
  if (lifecycle === null) return null;

  try {
    return new PointerSelector(clickCallback, hoverCallback, lifecycle);
  } catch (error) {
    lifecycle.teardown();
    throw error;
  }
}

export { CreatePointerSelector as default };
