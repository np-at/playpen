import { afterEach, expect, it } from "vitest";
import { assert } from "./assert.ts";
import { scanNamedLinks } from "./namedLinkSemantics.ts";

const fixtures: Element[] = [];
function fixture(html: string): HTMLDivElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  fixtures.push(root);
  return root;
}
afterEach(() => {
  fixtures.splice(0).forEach((el) => {
    el.remove();
  });
});

it("reports semantic descendants of explicitly named native and ARIA links", () => {
  fixture(`<a href="#" aria-label="Read article"><h2>Title</h2><ul><li>Item</li></ul><img alt="Chart"></a>
    <span id="label">Details</span><div role="link" aria-labelledby="label"><span role="heading" aria-level="2">Topic</span></div>
    <a href="#"><h2>Unnamed by ARIA</h2></a><a aria-label="Not a link"><h2>Title</h2></a>`);
  const { results } = scanNamedLinks(document);
  expect(results).toHaveLength(2);
  expect(results[0].descendants.map((item) => item.role)).toEqual(["heading", "list", "listitem", "image"]);
  expect(results[0].naming).toEqual([{ attribute: "aria-label", value: "Read article" }]);
  expect(results[1].naming).toEqual([{ attribute: "aria-labelledby", value: "label" }]);
  expect(results[1].descendants[0].role).toBe("heading");
});

it("excludes generic, decorative, presentational, hidden, inert, and tool content", () => {
  fixture(`<a href="#" aria-label="Test"><span>Text</span><div>Wrapper</div><img alt="">
    <h2 role="none">None</h2><span role="madeup">Invalid role</span><h2 hidden>Hidden</h2>
    <div aria-hidden="true"><h2>Hidden heading</h2></div><div inert><h2>Inert</h2></div>
    <h2 style="display:none">Not rendered</h2><span data-a11y-playpen-tool="other"><h2>Tool</h2></span></a>
    <a href="#" aria-label="  "><h2>Empty label</h2></a>`);
  expect(scanNamedLinks(document).results).toEqual([]);
});

it("flags keyboard and programmatically focusable descendants, even when aria-hidden", () => {
  fixture(`<a href="#" aria-label="Card"><button id="button">Action</button><span id="negative" tabindex="-1">Focus</span>
    <span id="zero" tabindex="0">Focus</span><span id="hidden-aria" aria-hidden="true" tabindex="0">Focus</span>
    <div id="editable" contenteditable="true">Edit</div><button disabled>Disabled</button>
    <fieldset disabled><input></fieldset><input type="hidden" tabindex="0"><span tabindex="invalid">Invalid</span>
    <div inert><button>Inert</button></div><button hidden>Hidden</button></a>`);
  const result = scanNamedLinks(document).results[0];
  expect(result.descendants.filter((item) => item.focusable).map((item) => item.element.id)).toEqual([
    "button",
    "negative",
    "zero",
    "hidden-aria",
    "editable",
  ]);
  expect(result.descendants.find((item) => item.element.id === "button")).toMatchObject({ role: "button", focusable: true });
});

it("walks open shadow roots and slots without counting unrendered light DOM", () => {
  const container = fixture(`<a href="#" aria-label="Card"><x-card><h2 slot="title">Slotted</h2><h3>Unassigned</h3></x-card></a>`);
  const host = container.querySelector("x-card");
  assert(host !== null);
  host.attachShadow({ mode: "open" }).innerHTML = '<slot name="title"></slot><button>Action</button>';
  const result = scanNamedLinks(document).results[0];
  expect(result.descendants.map((item) => item.role)).toEqual(["heading", "button"]);
});

it("scans links in same-origin frames", async () => {
  const container = fixture("<iframe></iframe>");
  const frame = container.querySelector("iframe");
  assert(frame !== null);
  await new Promise<void>((resolve) => {
    frame.onload = () => {
      resolve();
    };
    frame.srcdoc = '<a href="#" aria-labelledby="title"><h2 id="title">Frame</h2><button>Action</button></a>';
  });
  const result = scanNamedLinks(document).results[0];
  expect(result.link.ownerDocument).toBe(frame.contentDocument);
  expect(result.descendants.map((item) => item.role)).toEqual(["heading", "button"]);
  expect(result.descendants[1].focusable).toBe(true);
});

it("ignores slot fallback elements when text is assigned", () => {
  const container = fixture("<x-card>Assigned text</x-card>");
  const host = container.querySelector("x-card");
  assert(host !== null);
  host.attachShadow({ mode: "open" }).innerHTML = '<a href="#" aria-label="Card"><slot><h2>Fallback</h2></slot></a>';
  expect(scanNamedLinks(document).results).toEqual([]);
});

it("honors hidden, inert, and aria-hidden slot ancestry", () => {
  const container = fixture(
    '<a href="#" aria-label="Card"><x-card><h2 slot="hidden">Hidden</h2><button slot="inert">Inert</button><h2 slot="aria">ARIA hidden</h2><span slot="focus" tabindex="-1">Focusable</span></x-card></a>',
  );
  const host = container.querySelector("x-card");
  assert(host !== null);
  host.attachShadow({ mode: "open" }).innerHTML =
    '<div style="display:none"><slot name="hidden"></slot></div><div inert><slot name="inert"></slot></div><div aria-hidden="true"><slot name="aria"></slot><slot name="focus"></slot></div>';
  const result = scanNamedLinks(document).results[0];
  expect(result.descendants).toHaveLength(1);
  expect(result.descendants[0]).toMatchObject({ role: undefined, focusable: true });
  expect(result.descendants[0].element.textContent).toBe("Focusable");
});

it("retains native semantics when presentation conflicts with focusability or global ARIA", () => {
  const root = fixture(`<a href="#" role="none" aria-label="Card"><h2>Title</h2></a>
    <a href="#" aria-label="Other"><h2 role="none" aria-label="Title">Title</h2>
      <h3 role="presentation" tabindex="-1">Focusable heading</h3>
      <h4 role="none" aria-describedby="description">Described heading</h4>
      <h5 role="none">Actually presentational</h5></a><span id="description">Description</span>`);
  const before = root.innerHTML;
  const observer = new MutationObserver(() => {});
  observer.observe(root, { attributes: true, subtree: true });
  try {
    const { results } = scanNamedLinks(document);
    expect(results).toHaveLength(2);
    expect(results[0].descendants.map((item) => item.role)).toEqual(["heading"]);
    expect(results[1].descendants.map((item) => item.role)).toEqual(["heading", "heading", "heading"]);
    expect(root.innerHTML).toBe(before);
    expect(observer.takeRecords()).toEqual([]);
  } finally {
    observer.disconnect();
  }
});

it("uses HTML integer parsing for tabindex without accepting empty or nonnumeric values", () => {
  fixture(`<a href="#" aria-label="Card"><span id="trailing" tabindex="0junk">One</span>
    <span id="negative-junk" tabindex="-1rest">Two</span><span id="plus" tabindex=" +2tail">Three</span>
    <span tabindex="junk0">Invalid</span><span tabindex="">Empty</span><span tabindex=" ">Whitespace</span></a>`);
  const result = scanNamedLinks(document).results[0];
  expect(result.descendants.filter((item) => item.focusable).map((item) => item.element.id)).toEqual([
    "trailing",
    "negative-junk",
    "plus",
  ]);
});

it("excludes slotted content of closed details but keeps its summary and open content", () => {
  const root = fixture(
    '<a href="#" aria-label="Card"><x-card><h2 slot="title">Hidden title</h2><span slot="summary" role="heading" aria-level="2">Summary heading</span></x-card></a>',
  );
  const host = root.querySelector("x-card");
  assert(host !== null);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = '<details><summary><slot name="summary"></slot></summary><slot name="title"></slot></details>';
  const headings = () =>
    scanNamedLinks(document)
      .results[0].descendants.filter((item) => item.role === "heading")
      .map((item) => item.element.textContent);
  expect(headings()).toEqual(["Summary heading"]);
  const details = shadow.querySelector("details");
  assert(details !== null);
  details.open = true;
  expect(headings()).toEqual(["Summary heading", "Hidden title"]);
});

it("does not flag display:contents as focusable but still inspects its descendants", () => {
  fixture(
    '<a href="#" aria-label="Card"><span tabindex="0" style="display:contents">Text</span><span tabindex="-1" style="display:contents"><button id="nested">Action</button></span></a>',
  );
  const result = scanNamedLinks(document).results[0];
  expect(result.descendants.map((item) => item.element.id)).toEqual(["nested"]);
  expect(result.descendants[0].focusable).toBe(true);
});

it("returns boolean focusability for SVG semantics", () => {
  fixture('<a href="#" aria-label="Chart"><svg role="img" aria-label="Trend"></svg></a>');
  expect(scanNamedLinks(document).results[0].descendants[0]).toMatchObject({ role: "image", focusable: false });
});
