import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { findFocusCandidates, inspectFocusStyle, runFocusStyleCheck, writeFocusStyleReport } from "../utils/focusStyle.ts";
import { createBookmarkletHarness, type BookmarkletHarness } from "./bookmarkletTestHarness.ts";

const fixtures: Element[] = [];
let harness: BookmarkletHarness | undefined;
const originalHistory: { state: unknown; url: string } = {
  state: history.state as unknown,
  url: location.href,
};

function fixture(markup: string): HTMLElement {
  const container = document.createElement("div");
  container.dataset.focusStyleFixture = "";
  container.innerHTML = markup;
  document.body.appendChild(container);
  fixtures.push(container);
  return container;
}

function required(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector(selector);
  const view = element?.ownerDocument.defaultView;
  if (element === null || view === null || view === undefined || !(element instanceof view.HTMLElement)) {
    throw new Error(`no HTMLElement matched ${selector}`);
  }
  return element;
}

function addStyle(cssText: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.dataset.focusStyleFixture = "";
  style.textContent = cssText;
  document.head.appendChild(style);
  fixtures.push(style);
  return style;
}

function animationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

afterEach(() => {
  harness?.restore();
  harness = undefined;
  for (const node of fixtures) node.remove();
  fixtures.length = 0;
  history.replaceState(originalHistory.state, "", originalHistory.url);
});

describe("FocusStyleCheck candidate discovery", () => {
  it("includes native controls, links, the disclosure summary, editable content, and media controls", () => {
    const root = fixture(`
      <button data-candidate=button>Button</button>
      <input data-candidate=input>
      <select data-candidate=select><option>One</option></select>
      <textarea data-candidate=textarea></textarea>
      <a href="#destination" data-candidate=link>Link</a>
      <details><summary data-candidate=summary>Details</summary><p>Content</p></details>
      <div contenteditable="true" data-candidate=editable>Edit me</div>
      <audio controls data-candidate=audio></audio>
      <video controls data-candidate=video></video>
    `);

    expect(findFocusCandidates(root).map((element) => element.dataset["candidate"])).toEqual([
      "button",
      "input",
      "select",
      "textarea",
      "link",
      "summary",
      "editable",
      "audio",
      "video",
    ]);
  });

  it("includes programmatically focusable elements without treating ARIA roles as focusability", () => {
    const root = fixture(`
      <div tabindex="-1" data-candidate=programmatic></div>
      <div role="button" data-rejected=role-only></div>
    `);

    expect(findFocusCandidates(root)).toEqual([required(root, "[data-candidate=programmatic]")]);
  });

  it("excludes disabled, inert, visually hidden, and accessibility-hidden candidates", () => {
    const root = fixture(`
      <button data-candidate=visible>Visible</button>
      <button disabled data-rejected=disabled>Disabled</button>
      <fieldset disabled><input data-rejected=fieldset-disabled></fieldset>
      <div inert><button data-rejected=inert>Inert</button></div>
      <button hidden data-rejected=hidden>Hidden</button>
      <button style="display: none" data-rejected=display-none>Display none</button>
      <div aria-hidden="true"><button data-rejected=aria-hidden>ARIA hidden</button></div>
    `);

    expect(findFocusCandidates(root)).toEqual([required(root, "[data-candidate=visible]")]);
  });
});

describe("FocusStyleCheck focus inspection", () => {
  it("reports that it cannot isolate a baseline when a prior focus blur redirects on the next animation frame", async () => {
    const root = fixture(`
      <button data-prior-focus>Prior focus</button>
      <button data-redirected-focus>Redirected focus</button>
      <button data-inspection-target>Inspection target</button>
    `);
    const prior = required(root, "[data-prior-focus]");
    const redirected = required(root, "[data-redirected-focus]");
    const target = required(root, "[data-inspection-target]");
    prior.focus({ preventScroll: true });
    prior.addEventListener("blur", () => {
      requestAnimationFrame(() => {
        redirected.focus({ preventScroll: true });
      });
    });

    const result = await inspectFocusStyle(target);

    expect(result).toMatchObject({ status: "could-not-focus", element: target, reason: "could-not-clear-prior-focus" });
  });

  it("collects styles applied by :focus after actual focus", async () => {
    addStyle(`
      [data-focus-rule] { outline: 0 solid transparent; }
      [data-focus-rule]:focus { outline: 5px solid rgb(1, 2, 3); }
    `);
    const target = required(fixture("<button data-focus-rule>Focus target</button>"), "button");

    const result = await inspectFocusStyle(target);

    expect(result.status).toBe("style-difference");
    if (result.status !== "style-difference") throw new Error("expected a focus style difference");
    expect(result.differences).toContainEqual({
      target: "element",
      property: "outline-width",
      unfocused: "0px",
      focused: "5px",
    });
  });

  it("collects styles applied by :focus-visible", async () => {
    addStyle(`
      [data-focus-visible-rule] { outline: 0 solid transparent; }
      [data-focus-visible-rule]:focus-visible { outline: 6px solid rgb(4, 5, 6); }
    `);
    const root = fixture(`
      <button data-pointer-source>Pointer source</button>
      <button data-focus-visible-rule>Focus-visible target</button>
    `);
    const pointerSource = required(root, "[data-pointer-source]");
    const target = required(root, "[data-focus-visible-rule]");
    await userEvent.click(pointerSource);
    target.focus({ preventScroll: true });
    expect(target.matches(":focus-visible")).toBe(false);
    target.blur();

    const result = await inspectFocusStyle(target);

    expect(result.status).toBe("style-difference");
    if (result.status !== "style-difference") throw new Error("expected a focus-visible style difference");
    expect(result.differences).toContainEqual({
      target: "element",
      property: "outline-width",
      unfocused: "0px",
      focused: "6px",
    });
  });

  it("collects focus styles from pseudo-elements", async () => {
    addStyle(`
      [data-pseudo-rule]::before { content: ""; color: rgb(7, 8, 9); }
      [data-pseudo-rule]:focus::before { color: rgb(10, 11, 12); }
    `);
    const target = required(fixture("<button data-pseudo-rule>Pseudo target</button>"), "button");

    const result = await inspectFocusStyle(target);

    expect(result.status).toBe("style-difference");
    if (result.status !== "style-difference") throw new Error("expected a pseudo-element style difference");
    expect(result.differences).toContainEqual({
      target: "::before",
      property: "color",
      unfocused: "rgb(7, 8, 9)",
      focused: "rgb(10, 11, 12)",
    });
  });

  it("focuses programmatic-only targets and separates failure to focus from an unchanged focus style", async () => {
    addStyle(`
      [data-programmatic], [data-no-difference], [data-refuses-focus] { outline: none; }
      [data-programmatic]:focus { background-color: rgb(13, 14, 15); }
    `);
    const root = fixture(`
      <div tabindex="-1" data-programmatic>Programmatic</div>
      <button data-no-difference>No difference</button>
      <button data-refuses-focus>Refuses focus</button>
    `);
    const programmatic = required(root, "[data-programmatic]");
    const noDifference = required(root, "[data-no-difference]");
    const refusesFocus = required(root, "[data-refuses-focus]");
    refusesFocus.addEventListener("focus", () => {
      requestAnimationFrame(() => {
        refusesFocus.blur();
      });
    });

    const programmaticResult = await inspectFocusStyle(programmatic);
    const noDifferenceResult = await inspectFocusStyle(noDifference);
    const refusesFocusResult = await inspectFocusStyle(refusesFocus);

    expect(programmaticResult.status).toBe("style-difference");
    expect(noDifferenceResult).toMatchObject({ status: "no-visible-difference", element: noDifference });
    expect(refusesFocusResult).toMatchObject({ status: "could-not-focus", element: refusesFocus });
  });
});

describe("FocusStyleCheck page contract", () => {
  it("captures each candidate baseline after clearing the preceding candidate's focus", async () => {
    addStyle(`
      [data-baseline-second] { outline: 0 solid transparent; }
      [data-baseline-root]:focus-within [data-baseline-second] { outline: 9px solid rgb(30, 31, 32); }
      [data-baseline-second]:focus { outline: 6px solid rgb(33, 34, 35) !important; }
    `);
    const root = fixture(`
      <div data-baseline-root>
        <button data-baseline-first>First candidate</button>
        <button data-baseline-second>Second candidate</button>
      </div>
    `);
    const second = required(root, "[data-baseline-second]");

    const report = await runFocusStyleCheck(root);
    const secondResult = report.styleDifferences.find(({ element }) => element === second);

    expect(secondResult?.differences).toContainEqual({
      target: "element",
      property: "outline-width",
      unfocused: "0px",
      focused: "6px",
    });
  });

  it("restores focus and scroll after restoration-triggered animation-frame handlers settle", async () => {
    addStyle(`[data-inspection-target] { outline: none; }`);
    const original = required(fixture("<button data-original-focus>Original focus</button>"), "button");
    const root = fixture(`
      <div style="height: 2400px"></div>
      <button data-inspection-target>Inspection target</button>
      <button data-redirected-focus>Redirected focus</button>
    `);
    const redirected = required(root, "[data-redirected-focus]");
    original.focus({ preventScroll: true });
    window.scrollTo(0, 180);
    let redirectOnce = true;
    original.addEventListener("focus", () => {
      if (!redirectOnce) return;
      redirectOnce = false;
      requestAnimationFrame(() => {
        redirected.focus({ preventScroll: true });
        window.scrollTo(0, 480);
      });
    });

    await runFocusStyleCheck(root);
    await animationFrame();

    expect(document.activeElement).toBe(original);
    expect(window.scrollY).toBe(180);
  });

  it("restores current URL and state while explicitly reporting irreversible focus-handler history mutations", async () => {
    const mutations = [
      {
        name: "push",
        mutate: () => {
          history.pushState({ pushed: true }, "", "#focus-style-pushed");
        },
      },
      {
        name: "hash",
        mutate: () => {
          location.hash = "focus-style-hash";
        },
      },
      {
        name: "replace",
        mutate: () => {
          history.replaceState({ replaced: true }, "", "#focus-style-replaced");
        },
      },
    ];

    for (const { name, mutate } of mutations) {
      const root = fixture(`<button data-history-mutation>${name}</button>`);
      const target = required(root, "[data-history-mutation]");
      history.replaceState({ original: name }, "", `#focus-style-original-${name}`);
      const before = {
        historyLength: history.length,
        state: history.state as unknown,
        url: location.href,
      };
      target.addEventListener("focus", mutate);

      const report = await runFocusStyleCheck(root);

      expect(location.href).toBe(before.url);
      expect(history.state).toEqual(before.state);
      expect(report.historyMutations).toEqual([
        expect.objectContaining({
          document,
          expectedHistoryLength: before.historyLength,
          expectedUrl: before.url,
        }),
      ]);
    }
  });

  it("continues inspecting later candidates after restoring a focus-handler history mutation", async () => {
    addStyle(`
      [data-later-candidate] { outline: 0 solid transparent; }
      [data-later-candidate]:focus { outline: 5px solid rgb(40, 41, 42); }
    `);
    const root = fixture(`
      <button data-history-mutator>History mutator</button>
      <button data-later-candidate>Later candidate</button>
    `);
    const mutator = required(root, "[data-history-mutator]");
    const later = required(root, "[data-later-candidate]");
    history.replaceState({ original: true }, "", "#focus-style-continue-original");
    const beforeUrl = location.href;
    mutator.addEventListener("focus", () => {
      history.pushState({ mutated: true }, "", "#focus-style-continue-mutated");
    });

    const report = await runFocusStyleCheck(root);

    expect(report.styleDifferences).toContainEqual(expect.objectContaining({ element: later }));
    expect(report.historyMutations).toEqual([expect.objectContaining({ document, expectedUrl: beforeUrl })]);
    expect(location.href).toBe(beforeUrl);
    expect(history.state).toEqual({ original: true });
  });

  it("detects and restores a same-URL replaceState mutation with Map history state", async () => {
    const root = fixture("<button data-map-history-mutator>Map history mutator</button>");
    const target = required(root, "[data-map-history-mutator]");
    const originalState = new Map([["original", Number.NaN]]);
    history.replaceState(originalState, "", "#focus-style-map-original");
    const beforeUrl = location.href;
    target.addEventListener("focus", () => {
      history.replaceState(new Map([["mutated", Number.NaN]]), "", beforeUrl);
    });

    const report = await runFocusStyleCheck(root);

    expect(history.state).toEqual(originalState);
    expect(report.historyMutations).toEqual([expect.objectContaining({ document, expectedUrl: beforeUrl })]);
  });

  it("restores another visited document's history before inspecting its later candidate", async () => {
    const outerFrame = document.createElement("iframe");
    outerFrame.dataset.focusStyleFixture = "";
    document.body.appendChild(outerFrame);
    fixtures.push(outerFrame);
    const outerDocument = outerFrame.contentDocument;
    if (outerDocument === null) throw new Error("outer iframe document was not created");
    outerDocument.body.innerHTML = "<button data-outer-history-mutator>Outer history mutator</button><iframe></iframe>";
    const mutator = required(outerDocument, "[data-outer-history-mutator]");
    const innerFrame = required(outerDocument, "iframe") as HTMLIFrameElement;
    const innerDocument = innerFrame.contentDocument;
    if (innerDocument === null) throw new Error("inner iframe document was not created");
    innerDocument.body.innerHTML = "<button data-inner-candidate>Inner candidate</button>";
    const innerCandidate = required(innerDocument, "[data-inner-candidate]");
    innerDocument.defaultView?.history.replaceState({ original: true }, "");
    const beforeUrl = innerDocument.location.href;
    let observedStateDuringInnerFocus: unknown;
    mutator.addEventListener("focus", () => {
      innerDocument.defaultView?.history.pushState({ mutated: true }, "");
    });
    innerCandidate.addEventListener("focus", () => {
      observedStateDuringInnerFocus = innerDocument.defaultView?.history.state;
    });

    const report = await runFocusStyleCheck(outerDocument);

    expect(observedStateDuringInnerFocus).toEqual({ original: true });
    expect(innerDocument.location.href).toBe(beforeUrl);
    expect(report.historyMutations).toEqual([expect.objectContaining({ document: innerDocument, expectedUrl: beforeUrl })]);
  });

  it("inspects candidates in open shadow roots and nested same-origin frames", async () => {
    const outerFrame = document.createElement("iframe");
    outerFrame.dataset.focusStyleFixture = "";
    document.body.appendChild(outerFrame);
    fixtures.push(outerFrame);
    const outerDocument = outerFrame.contentDocument;
    if (outerDocument === null) throw new Error("outer iframe document was not created");

    const host = outerDocument.createElement("div");
    outerDocument.body.appendChild(host);
    const shadowRoot = host.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <style>
        button { outline: 0 solid transparent; }
        button:focus { outline-width: 7px; }
      </style>
      <button data-shadow-focus>Shadow focus</button>
    `;
    const shadowTarget = required(shadowRoot, "[data-shadow-focus]");

    const innerFrame = outerDocument.createElement("iframe");
    outerDocument.body.appendChild(innerFrame);
    const innerDocument = innerFrame.contentDocument;
    if (innerDocument === null) throw new Error("inner iframe document was not created");
    innerDocument.body.innerHTML = `
      <style>
        button { outline: 0 solid transparent; }
        button:focus { outline-width: 8px; }
      </style>
      <button data-frame-focus>Frame focus</button>
    `;
    const frameTarget = required(innerDocument, "[data-frame-focus]");

    const report = await runFocusStyleCheck(outerDocument);

    expect(report.styleDifferences.map(({ element }) => element)).toEqual(expect.arrayContaining([shadowTarget, frameTarget]));
    expect(report.couldNotFocus.map(({ element }) => element)).not.toEqual(expect.arrayContaining([shadowTarget, frameTarget]));
    expect(outerDocument.activeElement).toBe(outerDocument.body);
    expect(innerDocument.activeElement).toBe(innerDocument.body);
  });

  it("restores active element and scroll while preserving URL, history, and element attributes", async () => {
    addStyle(`[data-state-target], [data-state-peer] { outline: none; }`);
    const root = fixture(`
      <button data-state-target style="color: rgb(20, 21, 22)">Original focus</button>
      <div style="height: 2400px"></div>
      <div tabindex="-1" data-state-peer>Peer</div>
    `);
    const originalFocus = required(root, "[data-state-target]");
    const peer = required(root, "[data-state-peer]");
    const originalAttributes = new Map(
      [originalFocus, peer].map((element) => [
        element,
        Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]),
      ]),
    );
    history.replaceState({ focusStyleCheck: "preserve" }, "", `${location.pathname}${location.search}#focus-style-check-state`);
    originalFocus.focus({ preventScroll: true });
    window.scrollTo(0, 240);
    harness = createBookmarkletHarness();
    const before = harness.capturePageState([originalFocus, peer]);
    const historyLength = history.length;
    const historyState = history.state as unknown;

    await harness.run(async () => {
      await runFocusStyleCheck(root);
    });

    expect(harness.comparePageState(before)).toEqual({
      focus: undefined,
      scroll: undefined,
      url: undefined,
      inlineStyles: [],
    });
    expect(history.length).toBe(historyLength);
    expect(history.state).toBe(historyState);
    expect(
      new Map(
        [originalFocus, peer].map((element) => [
          element,
          Array.from(element.attributes, (attribute) => [attribute.name, attribute.value]),
        ]),
      ),
    ).toEqual(originalAttributes);
    expect(originalFocus.hasAttribute("id")).toBe(false);
    expect(peer.hasAttribute("id")).toBe(false);
  });

  it("reports could-not-focus separately from focused-with-no-visible-difference", async () => {
    addStyle(`[data-no-difference], [data-refuses-focus] { outline: none; }`);
    const root = fixture(`
      <button data-no-difference>No difference</button>
      <button data-refuses-focus>Refuses focus</button>
    `);
    const noDifference = required(root, "[data-no-difference]");
    const refusesFocus = required(root, "[data-refuses-focus]");
    refusesFocus.addEventListener("focus", () => {
      requestAnimationFrame(() => {
        refusesFocus.blur();
      });
    });
    harness = createBookmarkletHarness();
    const report = await runFocusStyleCheck(root);

    await harness.run(() => {
      writeFocusStyleReport(report);
    });

    expect(harness.snapshot().console).toEqual(
      expect.arrayContaining([
        {
          level: "warn",
          args: ["Focus Style Check: focused but no visible style difference", [noDifference]],
        },
        {
          level: "info",
          args: ["Focus Style Check: could not focus", [expect.objectContaining({ element: refusesFocus })]],
        },
      ]),
    );
  });
});
