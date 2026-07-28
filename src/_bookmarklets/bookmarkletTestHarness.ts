export type ConsoleEntry = {
  level: "debug" | "info" | "log" | "warn" | "error";
  args: unknown[];
};

export type PageState = {
  activeElement: Element | null;
  scrollX: number;
  scrollY: number;
  url: string;
  inlineStyles: Map<Element, string | null>;
};

export type PageStateChanges = {
  focus: { before: Element | null; after: Element | null } | undefined;
  scroll: { before: { x: number; y: number }; after: { x: number; y: number } } | undefined;
  url: { before: string; after: string } | undefined;
  inlineStyles: Array<{ element: Element; before: string | null; after: string | null }>;
};

type Listener = EventListenerOrEventListenerObject;
type ListenerRecord = {
  target: EventTarget;
  type: string;
  listener: Listener;
  capture: boolean;
  signal: AbortSignal | undefined;
  removed: boolean;
};

type ObserverRecord = {
  observer: MutationObserver;
  disconnected: boolean;
};

export type BookmarkletState = {
  ownedNodes: Element[];
  listeners: ListenerRecord[];
  timeouts: number[];
  animationFrames: number[];
  observers: MutationObserver[];
  console: ConsoleEntry[];
};

export type BookmarkletHarness = {
  run(activate: () => void | Promise<void>): Promise<void>;
  runRepeated(activate: () => void | Promise<void>): Promise<{ active: BookmarkletState; teardown: BookmarkletState }>;
  snapshot(): BookmarkletState;
  capturePageState(elements?: Iterable<Element>): PageState;
  comparePageState(before: PageState): PageStateChanges;
  restore(): void;
};

export type BookmarkletFixture = {
  root: HTMLElement;
  shadowRoot: ShadowRoot;
  sameOriginFrame: HTMLIFrameElement;
  inaccessibleFrame: HTMLIFrameElement;
  stateTarget: HTMLButtonElement;
  readInaccessibleFrame(): Document | null;
  restore(): void;
};

const TOOL_SELECTOR = "[data-a11y-playpen-tool]";

function captureOptionCapture(options?: boolean | AddEventListenerOptions | EventListenerOptions): boolean {
  return typeof options === "boolean" ? options : (options?.capture ?? false);
}

function rootsStartingAt(root: Document | ShadowRoot): Array<Document | ShadowRoot> {
  const roots: Array<Document | ShadowRoot> = [];
  const pending: Array<Document | ShadowRoot> = [root];
  const visited = new Set<Document | ShadowRoot>();

  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    roots.push(current);

    for (const element of current.querySelectorAll("*")) {
      if (element.shadowRoot !== null) pending.push(element.shadowRoot);
      if (element instanceof HTMLIFrameElement) {
        try {
          if (element.contentDocument !== null) pending.push(element.contentDocument);
        } catch {
          // Cross-origin and deliberately inaccessible fixture frames are expected.
        }
      }
    }
  }

  return roots;
}

function collectOwnedNodes(): Element[] {
  return rootsStartingAt(document).flatMap((root) => Array.from(root.querySelectorAll(TOOL_SELECTOR)));
}

function waitForFrame(frame: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    frame.addEventListener(
      "load",
      () => {
        resolve();
      },
      { once: true },
    );
    frame.addEventListener(
      "error",
      () => {
        reject(new Error("fixture iframe failed to load"));
      },
      { once: true },
    );
  });
}

export async function mountBookmarkletFixture(): Promise<BookmarkletFixture> {
  const originalHash = location.hash;
  const originalFocus = document.activeElement;
  const originalScroll = { x: window.scrollX, y: window.scrollY };
  const root = document.createElement("main");
  root.dataset.bookmarkletFixture = "";
  root.innerHTML = `
    <button data-fixture="state-target" style="color: rgb(0, 0, 255)">State target</button>
    <button data-fixture="other-focus">Other focus target</button>
    <div id="duplicate-page-id" class="duplicate-page-class">First collision</div>
    <div id="duplicate-page-id" class="duplicate-page-class">Second collision</div>
    <div data-fixture="shadow-host"></div>
    <div aria-hidden="true" style="width: 2400px; height: 2400px"></div>
  `;
  document.body.appendChild(root);

  const shadowHost = root.querySelector<HTMLElement>("[data-fixture=shadow-host]");
  if (shadowHost === null) throw new Error("shadow fixture host was not created");
  const shadowRoot = shadowHost.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = `<button data-fixture="shadow-target">Shadow target</button>`;

  const sameOriginFrame = document.createElement("iframe");
  sameOriginFrame.dataset.fixture = "same-origin-frame";
  sameOriginFrame.srcdoc = `<!doctype html><html><body><button data-fixture="iframe-target">Iframe target</button></body></html>`;
  root.appendChild(sameOriginFrame);
  await waitForFrame(sameOriginFrame);

  const inaccessibleFrame = document.createElement("iframe");
  inaccessibleFrame.dataset.fixture = "inaccessible-frame";
  inaccessibleFrame.src = "about:blank";
  root.appendChild(inaccessibleFrame);
  Object.defineProperty(inaccessibleFrame, "contentDocument", {
    configurable: true,
    get() {
      throw new DOMException("Blocked a frame with origin from accessing a cross-origin frame.", "SecurityError");
    },
  });

  const stateTarget = root.querySelector<HTMLButtonElement>("[data-fixture=state-target]");
  if (stateTarget === null) throw new Error("state fixture target was not created");

  window.scrollTo(40, 60);

  return {
    root,
    shadowRoot,
    sameOriginFrame,
    inaccessibleFrame,
    stateTarget,
    readInaccessibleFrame: () => inaccessibleFrame.contentDocument,
    restore() {
      root.remove();
      history.replaceState(history.state, "", originalHash || `${location.pathname}${location.search}`);
      window.scrollTo(originalScroll.x, originalScroll.y);
      if (originalFocus instanceof HTMLElement && originalFocus.isConnected) originalFocus.focus({ preventScroll: true });
    },
  };
}

export function createBookmarkletHarness(): BookmarkletHarness {
  const nativeAddEventListener: typeof EventTarget.prototype.addEventListener = Reflect.get(EventTarget.prototype, "addEventListener");
  const nativeRemoveEventListener: typeof EventTarget.prototype.removeEventListener = Reflect.get(
    EventTarget.prototype,
    "removeEventListener",
  );
  const nativeWindowAddEventListener = window.addEventListener.bind(window);
  const nativeWindowRemoveEventListener = window.removeEventListener.bind(window);
  const nativeDocumentAddEventListener = document.addEventListener.bind(document);
  const nativeDocumentRemoveEventListener = document.removeEventListener.bind(document);
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeClearTimeout = window.clearTimeout.bind(window);
  const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
  const nativeCancelAnimationFrame = window.cancelAnimationFrame.bind(window);
  const NativeMutationObserver = window.MutationObserver;
  const consoleLevels = ["debug", "info", "log", "warn", "error"] as const;
  const nativeConsole = new Map<ConsoleEntry["level"], (...args: unknown[]) => void>(
    consoleLevels.map((level) => [level, console[level].bind(console)]),
  );

  const listeners: ListenerRecord[] = [];
  const timeouts = new Set<number>();
  const animationFrames = new Set<number>();
  const observers: ObserverRecord[] = [];
  const consoleEntries: ConsoleEntry[] = [];
  let restored = false;

  function trackListener(target: EventTarget, type: string, listener: Listener, options?: boolean | AddEventListenerOptions): void {
    listeners.push({
      target,
      type,
      listener,
      capture: captureOptionCapture(options),
      signal: typeof options === "object" ? options.signal : undefined,
      removed: false,
    });
  }

  function markListenerRemoved(target: EventTarget, type: string, listener: Listener, options?: boolean | EventListenerOptions): void {
    const capture = captureOptionCapture(options);
    let record: ListenerRecord | undefined;
    for (let index = listeners.length - 1; index >= 0; index -= 1) {
      const candidate = listeners[index];
      if (
        !candidate.removed &&
        candidate.target === target &&
        candidate.type === type &&
        candidate.listener === listener &&
        candidate.capture === capture
      ) {
        record = candidate;
        break;
      }
    }
    if (record !== undefined) record.removed = true;
  }

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: Listener,
    options?: boolean | AddEventListenerOptions,
  ): void {
    trackListener(this, type, listener, options);
    nativeAddEventListener.call(this, type, listener, options);
  };

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: Listener,
    options?: boolean | EventListenerOptions,
  ): void {
    markListenerRemoved(this, type, listener, options);
    nativeRemoveEventListener.call(this, type, listener, options);
  };

  window.addEventListener = function (type: string, listener: Listener, options?: boolean | AddEventListenerOptions): void {
    trackListener(window, type, listener, options);
    nativeWindowAddEventListener.call(window, type, listener, options);
  };
  window.removeEventListener = function (type: string, listener: Listener, options?: boolean | EventListenerOptions): void {
    markListenerRemoved(window, type, listener, options);
    nativeWindowRemoveEventListener.call(window, type, listener, options);
  };
  document.addEventListener = function (type: string, listener: Listener, options?: boolean | AddEventListenerOptions): void {
    trackListener(document, type, listener, options);
    nativeDocumentAddEventListener.call(document, type, listener, options);
  };
  document.removeEventListener = function (type: string, listener: Listener, options?: boolean | EventListenerOptions): void {
    markListenerRemoved(document, type, listener, options);
    nativeDocumentRemoveEventListener.call(document, type, listener, options);
  };

  window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
    let id = 0;
    const wrapped =
      typeof handler === "function"
        ? (...callbackArgs: unknown[]) => {
            timeouts.delete(id);
            Reflect.apply(handler, window, callbackArgs);
          }
        : handler;
    id = nativeSetTimeout(wrapped, timeout, ...args);
    timeouts.add(id);
    return id;
  }) as typeof window.setTimeout;

  window.clearTimeout = ((id?: number) => {
    if (id !== undefined) timeouts.delete(id);
    nativeClearTimeout(id);
  }) as typeof window.clearTimeout;

  window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    let id = 0;
    id = nativeRequestAnimationFrame((time) => {
      animationFrames.delete(id);
      callback(time);
    });
    animationFrames.add(id);
    return id;
  };

  window.cancelAnimationFrame = (id: number): void => {
    animationFrames.delete(id);
    nativeCancelAnimationFrame(id);
  };

  class TrackedMutationObserver extends NativeMutationObserver {
    readonly #record: ObserverRecord;

    constructor(callback: MutationCallback) {
      super(callback);
      this.#record = { observer: this, disconnected: false };
      observers.push(this.#record);
    }

    override observe(target: Node, options?: MutationObserverInit): void {
      this.#record.disconnected = false;
      super.observe(target, options);
    }

    override disconnect(): void {
      this.#record.disconnected = true;
      super.disconnect();
    }
  }
  window.MutationObserver = TrackedMutationObserver;

  for (const level of consoleLevels) {
    console[level] = (...args: unknown[]) => {
      consoleEntries.push({ level, args });
    };
  }

  function activeListeners(): ListenerRecord[] {
    return listeners.filter((listener) => !listener.removed && listener.signal?.aborted !== true);
  }

  return {
    async run(activate) {
      await activate();
    },
    async runRepeated(activate) {
      await activate();
      const active = this.snapshot();
      await activate();
      return { active, teardown: this.snapshot() };
    },
    snapshot() {
      return {
        ownedNodes: collectOwnedNodes(),
        listeners: activeListeners(),
        timeouts: [...timeouts],
        animationFrames: [...animationFrames],
        observers: observers.filter((record) => !record.disconnected).map((record) => record.observer),
        console: [...consoleEntries],
      };
    },
    capturePageState(elements = []) {
      return {
        activeElement: document.activeElement,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        url: location.href,
        inlineStyles: new Map(Array.from(elements, (element) => [element, element.getAttribute("style")])),
      };
    },
    comparePageState(before) {
      const activeElement = document.activeElement;
      const focus = activeElement === before.activeElement ? undefined : { before: before.activeElement, after: activeElement };
      const scroll =
        window.scrollX === before.scrollX && window.scrollY === before.scrollY
          ? undefined
          : {
              before: { x: before.scrollX, y: before.scrollY },
              after: { x: window.scrollX, y: window.scrollY },
            };
      const url = location.href === before.url ? undefined : { before: before.url, after: location.href };
      const inlineStyles = Array.from(before.inlineStyles, ([element, originalStyle]) => ({
        element,
        before: originalStyle,
        after: element.getAttribute("style"),
      })).filter(({ before: originalStyle, after }) => originalStyle !== after);
      return { focus, scroll, url, inlineStyles };
    },
    restore() {
      if (restored) return;
      restored = true;

      for (const listener of activeListeners()) {
        nativeRemoveEventListener.call(listener.target, listener.type, listener.listener, listener.capture);
        listener.removed = true;
      }
      for (const id of timeouts) nativeClearTimeout(id);
      for (const id of animationFrames) nativeCancelAnimationFrame(id);
      for (const record of observers) record.observer.disconnect();
      for (const ownedNode of collectOwnedNodes()) ownedNode.remove();

      EventTarget.prototype.addEventListener = nativeAddEventListener;
      EventTarget.prototype.removeEventListener = nativeRemoveEventListener;
      window.addEventListener = nativeWindowAddEventListener;
      window.removeEventListener = nativeWindowRemoveEventListener;
      document.addEventListener = nativeDocumentAddEventListener;
      document.removeEventListener = nativeDocumentRemoveEventListener;
      window.setTimeout = nativeSetTimeout;
      window.clearTimeout = nativeClearTimeout;
      window.requestAnimationFrame = nativeRequestAnimationFrame;
      window.cancelAnimationFrame = nativeCancelAnimationFrame;
      window.MutationObserver = NativeMutationObserver;
      for (const [level, method] of nativeConsole) console[level] = method;
    },
  };
}
