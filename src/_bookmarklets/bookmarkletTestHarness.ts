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
  remove(): void;
};

type ObserverRecord = {
  observer: { disconnect(): void };
  disconnected: boolean;
};

export type BookmarkletState = {
  ownedNodes: Element[];
  listeners: ListenerRecord[];
  timeouts: number[];
  intervals: number[];
  animationFrames: number[];
  observers: Array<{ disconnect(): void }>;
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
      if (element.localName === "iframe") {
        try {
          const frameDocument = (element as HTMLIFrameElement).contentDocument;
          if (frameDocument !== null) pending.push(frameDocument);
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
  type ScheduledResource = { id: number; active: boolean; realm: Window; clear(): void };
  type AnimationFrameResource = { id: number; active: boolean; realm: Window; cancel(): void };
  const consoleLevels = ["debug", "info", "log", "warn", "error"] as const;
  const baselineOwnedNodes = new Set(collectOwnedNodes());
  const listeners: ListenerRecord[] = [];
  const timeouts: ScheduledResource[] = [];
  const intervals: ScheduledResource[] = [];
  const animationFrames: AnimationFrameResource[] = [];
  const observers: ObserverRecord[] = [];
  const consoleEntries: ConsoleEntry[] = [];
  const realmRestorations: Array<() => void> = [];
  const instrumentedRealms = new Set<Window>();
  let restored = false;

  function newOwnedNodes(): Element[] {
    return collectOwnedNodes().filter((node) => !baselineOwnedNodes.has(node));
  }

  function trackListener(
    target: EventTarget,
    type: string,
    listener: Listener,
    options: boolean | AddEventListenerOptions | undefined,
    remove: () => void,
  ): void {
    const existing = listeners.find(
      (record) =>
        !record.removed &&
        record.target === target &&
        record.type === type &&
        record.listener === listener &&
        record.capture === captureOptionCapture(options),
    );
    if (existing !== undefined) return;

    const record: ListenerRecord = {
      target,
      type,
      listener,
      capture: captureOptionCapture(options),
      signal: typeof options === "object" ? options.signal : undefined,
      removed: false,
      remove() {
        if (record.removed) return;
        record.removed = true;
        remove();
      },
    };
    listeners.push(record);
  }

  function markListenerRemoved(target: EventTarget, type: string, listener: Listener, options?: boolean | EventListenerOptions): void {
    const capture = captureOptionCapture(options);
    for (let index = listeners.length - 1; index >= 0; index -= 1) {
      const candidate = listeners[index];
      if (
        !candidate.removed &&
        candidate.target === target &&
        candidate.type === type &&
        candidate.listener === listener &&
        candidate.capture === capture
      ) {
        candidate.removed = true;
        break;
      }
    }
  }

  function findScheduledResource<T extends { id: number; active: boolean; realm: Window }>(
    records: T[],
    realm: Window,
    id: number | undefined,
  ): T | undefined {
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const candidate = records[index];
      if (candidate.active && candidate.realm === realm && candidate.id === id) return candidate;
    }
    return undefined;
  }

  function instrumentRealm(realmWindow: Window): void {
    if (instrumentedRealms.has(realmWindow)) return;
    instrumentedRealms.add(realmWindow);
    const realm = realmWindow as Window & typeof globalThis;
    const realmDocument = realm.document;
    const eventTargetPrototype = realm.EventTarget.prototype;
    const nativeAddEventListener: typeof eventTargetPrototype.addEventListener = Reflect.get(eventTargetPrototype, "addEventListener");
    const nativeRemoveEventListener: typeof eventTargetPrototype.removeEventListener = Reflect.get(
      eventTargetPrototype,
      "removeEventListener",
    );
    const nativeWindowAddEventListener = realm.addEventListener.bind(realm);
    const nativeWindowRemoveEventListener = realm.removeEventListener.bind(realm);
    const nativeDocumentAddEventListener = realmDocument.addEventListener.bind(realmDocument);
    const nativeDocumentRemoveEventListener = realmDocument.removeEventListener.bind(realmDocument);
    const nativeSetTimeout = realm.setTimeout.bind(realm);
    const nativeClearTimeout = realm.clearTimeout.bind(realm);
    const nativeSetInterval = realm.setInterval.bind(realm);
    const nativeClearInterval = realm.clearInterval.bind(realm);
    const nativeRequestAnimationFrame = realm.requestAnimationFrame.bind(realm);
    const nativeCancelAnimationFrame = realm.cancelAnimationFrame.bind(realm);
    const NativeMutationObserver = realm.MutationObserver;
    const NativeResizeObserver = realm.ResizeObserver;
    const NativeIntersectionObserver = realm.IntersectionObserver;
    const nativeConsole = new Map<ConsoleEntry["level"], (...args: unknown[]) => void>(
      consoleLevels.map((level) => [level, realm.console[level].bind(realm.console)]),
    );

    eventTargetPrototype.addEventListener = function (
      type: string,
      listener: Listener,
      options?: boolean | AddEventListenerOptions,
    ): void {
      trackListener(this, type, listener, options, () => {
        nativeRemoveEventListener.call(this, type, listener, options);
      });
      nativeAddEventListener.call(this, type, listener, options);
    };
    eventTargetPrototype.removeEventListener = function (
      type: string,
      listener: Listener,
      options?: boolean | EventListenerOptions,
    ): void {
      markListenerRemoved(this, type, listener, options);
      nativeRemoveEventListener.call(this, type, listener, options);
    };

    realm.addEventListener = function (type: string, listener: Listener, options?: boolean | AddEventListenerOptions): void {
      trackListener(realm, type, listener, options, () => {
        nativeWindowRemoveEventListener.call(realm, type, listener, options);
      });
      nativeWindowAddEventListener.call(realm, type, listener, options);
    };
    realm.removeEventListener = function (type: string, listener: Listener, options?: boolean | EventListenerOptions): void {
      markListenerRemoved(realm, type, listener, options);
      nativeWindowRemoveEventListener.call(realm, type, listener, options);
    };
    realmDocument.addEventListener = function (type: string, listener: Listener, options?: boolean | AddEventListenerOptions): void {
      trackListener(realmDocument, type, listener, options, () => {
        nativeDocumentRemoveEventListener.call(realmDocument, type, listener, options);
      });
      nativeDocumentAddEventListener.call(realmDocument, type, listener, options);
    };
    realmDocument.removeEventListener = function (type: string, listener: Listener, options?: boolean | EventListenerOptions): void {
      markListenerRemoved(realmDocument, type, listener, options);
      nativeDocumentRemoveEventListener.call(realmDocument, type, listener, options);
    };

    realm.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
      const record: ScheduledResource = {
        id: 0,
        active: true,
        realm,
        clear() {
          if (!record.active) return;
          record.active = false;
          nativeClearTimeout(record.id);
        },
      };
      const wrapped =
        typeof handler === "function"
          ? (...callbackArgs: unknown[]) => {
              record.active = false;
              Reflect.apply(handler, realm, callbackArgs);
            }
          : handler;
      record.id = nativeSetTimeout(wrapped, timeout, ...args);
      timeouts.push(record);
      return record.id;
    }) as typeof realm.setTimeout;
    realm.clearTimeout = ((id?: number) => {
      const record = findScheduledResource(timeouts, realm, id);
      record?.clear();
      nativeClearTimeout(id);
    }) as typeof realm.clearTimeout;

    realm.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]): number => {
      const id = nativeSetInterval(handler, timeout, ...args);
      const record: ScheduledResource = {
        id,
        active: true,
        realm,
        clear() {
          if (!record.active) return;
          record.active = false;
          nativeClearInterval(id);
        },
      };
      intervals.push(record);
      return id;
    }) as typeof realm.setInterval;
    realm.clearInterval = ((id?: number) => {
      const record = findScheduledResource(intervals, realm, id);
      record?.clear();
      nativeClearInterval(id);
    }) as typeof realm.clearInterval;

    realm.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      const record: AnimationFrameResource = {
        id: 0,
        active: true,
        realm,
        cancel() {
          if (!record.active) return;
          record.active = false;
          nativeCancelAnimationFrame(record.id);
        },
      };
      record.id = nativeRequestAnimationFrame((time) => {
        record.active = false;
        callback(time);
      });
      animationFrames.push(record);
      return record.id;
    };
    realm.cancelAnimationFrame = (id: number): void => {
      const record = findScheduledResource(animationFrames, realm, id);
      record?.cancel();
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
    realm.MutationObserver = TrackedMutationObserver;

    class TrackedResizeObserver extends NativeResizeObserver {
      readonly #record: ObserverRecord;

      constructor(callback: ResizeObserverCallback) {
        super(callback);
        this.#record = { observer: this, disconnected: false };
        observers.push(this.#record);
      }

      override observe(target: Element, options?: ResizeObserverOptions): void {
        this.#record.disconnected = false;
        super.observe(target, options);
      }

      override disconnect(): void {
        this.#record.disconnected = true;
        super.disconnect();
      }
    }
    realm.ResizeObserver = TrackedResizeObserver;

    class TrackedIntersectionObserver extends NativeIntersectionObserver {
      readonly #record: ObserverRecord;

      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        this.#record = { observer: this, disconnected: false };
        observers.push(this.#record);
      }

      override observe(target: Element): void {
        this.#record.disconnected = false;
        super.observe(target);
      }

      override disconnect(): void {
        this.#record.disconnected = true;
        super.disconnect();
      }
    }
    realm.IntersectionObserver = TrackedIntersectionObserver;

    for (const level of consoleLevels) {
      realm.console[level] = (...args: unknown[]) => {
        consoleEntries.push({ level, args });
      };
    }

    realmRestorations.push(() => {
      eventTargetPrototype.addEventListener = nativeAddEventListener;
      eventTargetPrototype.removeEventListener = nativeRemoveEventListener;
      realm.addEventListener = nativeWindowAddEventListener;
      realm.removeEventListener = nativeWindowRemoveEventListener;
      realmDocument.addEventListener = nativeDocumentAddEventListener;
      realmDocument.removeEventListener = nativeDocumentRemoveEventListener;
      realm.setTimeout = nativeSetTimeout;
      realm.clearTimeout = nativeClearTimeout;
      realm.setInterval = nativeSetInterval;
      realm.clearInterval = nativeClearInterval;
      realm.requestAnimationFrame = nativeRequestAnimationFrame;
      realm.cancelAnimationFrame = nativeCancelAnimationFrame;
      realm.MutationObserver = NativeMutationObserver;
      realm.ResizeObserver = NativeResizeObserver;
      realm.IntersectionObserver = NativeIntersectionObserver;
      for (const [level, method] of nativeConsole) realm.console[level] = method;
    });
  }

  for (const root of rootsStartingAt(document)) {
    if (root.nodeType !== Node.DOCUMENT_NODE) continue;
    const rootWindow = (root as Document).defaultView;
    if (rootWindow !== null) instrumentRealm(rootWindow);
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
        ownedNodes: newOwnedNodes(),
        listeners: activeListeners(),
        timeouts: timeouts.filter((record) => record.active).map((record) => record.id),
        intervals: intervals.filter((record) => record.active).map((record) => record.id),
        animationFrames: animationFrames.filter((record) => record.active).map((record) => record.id),
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

      for (const listener of activeListeners()) listener.remove();
      for (const record of timeouts) record.clear();
      for (const record of intervals) record.clear();
      for (const record of animationFrames) record.cancel();
      for (const record of observers) record.observer.disconnect();
      for (const ownedNode of newOwnedNodes()) ownedNode.remove();
      for (let index = realmRestorations.length - 1; index >= 0; index -= 1) realmRestorations[index]?.();
    },
  };
}
