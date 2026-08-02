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
