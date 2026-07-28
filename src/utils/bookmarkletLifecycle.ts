const TOOL_ATTRIBUTE = "data-a11y-playpen-tool";
const REGISTRY_KEY = Symbol.for("a11y-playpen.bookmarklet-lifecycle-registry");
const VALID_TOOL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type DisconnectableObserver = {
  disconnect(): void;
};

type TimerCallback = (...args: unknown[]) => void;

export type BookmarkletLifecycle = {
  readonly active: boolean;
  readonly toolName: string;
  addCleanup(cleanup: () => void): void;
  listen(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  timeout(handler: TimerCallback, delay?: number, ...args: unknown[]): number;
  interval(handler: TimerCallback, delay?: number, ...args: unknown[]): number;
  animationFrame(callback: FrameRequestCallback): number;
  observe(observer: MutationObserver, target: Node, options?: MutationObserverInit): MutationObserver;
  ownNode<T extends Element>(node: T): T;
  style(root: Document | ShadowRoot, cssText: string): HTMLStyleElement;
  setAttribute(element: Element, name: string, value: string): void;
  addClass(element: Element, className: string): void;
  teardown(): void;
};

type LifecycleRegistry = Map<string, BookmarkletLifecycle>;

function lifecycleRegistry(): LifecycleRegistry {
  const host = globalThis as typeof globalThis & Record<symbol, unknown>;
  const existing = host[REGISTRY_KEY];
  if (existing instanceof Map) return existing as LifecycleRegistry;

  const registry: LifecycleRegistry = new Map();
  host[REGISTRY_KEY] = registry;
  return registry;
}

function styleContainer(root: Document | ShadowRoot): ParentNode {
  if (root.nodeType === Node.DOCUMENT_NODE) {
    const documentRoot = root as Document;
    return documentRoot.querySelector("head") ?? documentRoot.documentElement;
  }
  return root;
}

function documentFor(root: Document | ShadowRoot): Document {
  if (root.nodeType === Node.DOCUMENT_NODE) return root as Document;
  if (root.ownerDocument === null) throw new Error("Cannot inject a bookmarklet style without an owner document");
  return root.ownerDocument;
}

class Lifecycle implements BookmarkletLifecycle {
  readonly #abortController = new AbortController();
  readonly #animationFrames = new Set<number>();
  readonly #cleanups: Array<() => void> = [];
  readonly #intervals = new Set<number>();
  readonly #observers = new Set<DisconnectableObserver>();
  readonly #ownedNodes = new Set<Element>();
  readonly #styles = new Map<Document | ShadowRoot, HTMLStyleElement>();
  readonly #timeouts = new Set<number>();
  #active = true;

  constructor(readonly toolName: string) {}

  get active(): boolean {
    return this.#active;
  }

  addCleanup(cleanup: () => void): void {
    if (!this.#active) {
      cleanup();
      return;
    }
    this.#cleanups.push(cleanup);
  }

  listen(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const normalizedOptions = typeof options === "boolean" ? { capture: options } : options;
    target.addEventListener(type, listener, {
      ...normalizedOptions,
      signal: this.#abortController.signal,
    });
  }

  timeout(handler: TimerCallback, delay?: number, ...args: unknown[]): number {
    let id = 0;
    const wrapped = (...callbackArgs: unknown[]) => {
      this.#timeouts.delete(id);
      Reflect.apply(handler, window, callbackArgs);
    };
    id = window.setTimeout(wrapped, delay, ...args);
    this.#timeouts.add(id);
    return id;
  }

  interval(handler: TimerCallback, delay?: number, ...args: unknown[]): number {
    const id = window.setInterval(handler, delay, ...args);
    this.#intervals.add(id);
    return id;
  }

  animationFrame(callback: FrameRequestCallback): number {
    let id = 0;
    id = window.requestAnimationFrame((time) => {
      this.#animationFrames.delete(id);
      callback(time);
    });
    this.#animationFrames.add(id);
    return id;
  }

  observe(observer: MutationObserver, target: Node, options?: MutationObserverInit): MutationObserver {
    observer.observe(target, options);
    this.#observers.add(observer);
    return observer;
  }

  ownNode<T extends Element>(node: T): T {
    node.setAttribute(TOOL_ATTRIBUTE, this.toolName);
    this.#ownedNodes.add(node);
    return node;
  }

  style(root: Document | ShadowRoot, cssText: string): HTMLStyleElement {
    const existing = this.#styles.get(root);
    if (existing !== undefined) {
      existing.textContent = cssText;
      return existing;
    }

    const style = this.ownNode(documentFor(root).createElement("style"));
    style.textContent = cssText;
    styleContainer(root).appendChild(style);
    this.#styles.set(root, style);
    return style;
  }

  setAttribute(element: Element, name: string, value: string): void {
    const hadAttribute = element.hasAttribute(name);
    const originalValue = element.getAttribute(name);
    element.setAttribute(name, value);
    this.addCleanup(() => {
      if (hadAttribute && originalValue !== null) element.setAttribute(name, originalValue);
      else element.removeAttribute(name);
    });
  }

  addClass(element: Element, className: string): void {
    if (element.classList.contains(className)) return;
    element.classList.add(className);
    this.addCleanup(() => {
      element.classList.remove(className);
    });
  }

  teardown(): void {
    if (!this.#active) return;
    this.#active = false;
    const errors: unknown[] = [];
    const attempt = (cleanup: () => void): void => {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    };

    attempt(() => {
      this.#abortController.abort();
    });
    for (const id of this.#timeouts)
      attempt(() => {
        window.clearTimeout(id);
      });
    for (const id of this.#intervals)
      attempt(() => {
        window.clearInterval(id);
      });
    for (const id of this.#animationFrames)
      attempt(() => {
        window.cancelAnimationFrame(id);
      });
    for (const observer of this.#observers)
      attempt(() => {
        observer.disconnect();
      });
    for (let index = this.#cleanups.length - 1; index >= 0; index -= 1) {
      const cleanup = this.#cleanups[index];
      attempt(cleanup);
    }
    for (const node of this.#ownedNodes)
      attempt(() => {
        node.remove();
      });

    this.#timeouts.clear();
    this.#intervals.clear();
    this.#animationFrames.clear();
    this.#observers.clear();
    this.#cleanups.length = 0;
    this.#ownedNodes.clear();
    this.#styles.clear();

    const registry = lifecycleRegistry();
    if (registry.get(this.toolName) === this) registry.delete(this.toolName);

    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `Multiple ${this.toolName} cleanup operations failed`);
  }
}

export function activateBookmarklet(toolName: string): BookmarkletLifecycle | null {
  if (!VALID_TOOL_NAME.test(toolName)) {
    throw new Error(`Bookmarklet tool names must use lowercase kebab-case: ${toolName}`);
  }

  const registry = lifecycleRegistry();
  const existing = registry.get(toolName);
  if (existing !== undefined) {
    existing.teardown();
    return null;
  }

  const lifecycle = new Lifecycle(toolName);
  registry.set(toolName, lifecycle);
  return lifecycle;
}

export function teardownBookmarklet(toolName: string): boolean {
  const lifecycle = lifecycleRegistry().get(toolName);
  if (lifecycle === undefined) return false;
  lifecycle.teardown();
  return true;
}
