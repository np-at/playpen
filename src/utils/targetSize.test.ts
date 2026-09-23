import { afterEach, describe, expect, it } from "vitest";
import { scanTargets, type TargetResult } from "./targetSize.ts";

const fixtures: Element[] = [];

function fixture(markup: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  document.body.appendChild(container);
  fixtures.push(container);
  return container;
}

/** A fixed-position button with an exact box. */
const btn = (id: string, left: number, top: number, w: number, h = w, extra = ""): string =>
  `<button id="${id}" style="position:fixed;left:${String(left)}px;top:${String(top)}px;width:${String(w)}px;height:${String(h)}px;margin:0;padding:0;border:0;min-width:0;min-height:0;${extra}"></button>`;

function statuses(root: HTMLElement, min: 24 | 44 = 24): Record<string, TargetResult> {
  const out: Record<string, TargetResult> = {};
  for (const result of scanTargets(document, min)) {
    if (root.contains(result.el) && result.el.id !== "") out[result.el.id] = result;
  }
  return out;
}

afterEach(() => {
  for (const node of fixtures) node.remove();
  fixtures.length = 0;
});

describe("size and spacing (2.5.8)", () => {
  it("passes 24×24 and gives an isolated 16×16 the spacing exception", () => {
    const s = statuses(fixture(btn("big", 10, 10, 24) + btn("small", 200, 10, 16)));
    expect(s.big.status).toBe("pass");
    expect(s.small.status).toBe("pass-spacing");
  });

  it("treats circles that just touch as passing and overlapping circles as failing", () => {
    // 20×20 with a 4px gap: centres 24 apart (pass). 3px gap: centres 23 apart (fail).
    const s = statuses(fixture(btn("a", 10, 10, 20) + btn("b", 34, 10, 20) + btn("c", 10, 100, 20) + btn("d", 33, 100, 20)));
    expect([s.a.status, s.b.status]).toEqual(["pass-spacing", "pass-spacing"]);
    expect([s.c.status, s.d.status]).toEqual(["fail", "fail"]);
  });

  it("fails an undersized target whose circle reaches another target's box", () => {
    const s = statuses(fixture(btn("big", 10, 10, 100, 40) + btn("near", 113, 20, 16)));
    expect(s.near.status).toBe("fail");
    expect(s.near.conflict).toBe(document.getElementById("big"));
    expect(s.big.status).toBe("pass");
  });

  it("uses the other target's full box, not just its circle", () => {
    // tall is 10×30; its box reaches within 10px of short's centre, but their circles are 25px apart.
    const s = statuses(fixture(btn("tall", 100, 100, 10, 30) + btn("short", 100, 135, 10)));
    expect(s.tall.status).toBe("pass-spacing");
    expect(s.short.status).toBe("fail");
  });

  it("fails a small button nested inside a large link", () => {
    const root = fixture(
      `<a id="card" href="#" style="position:fixed;left:10px;top:10px;width:200px;height:100px;display:block">card ${btn("inner", 20, 20, 16)}</a>`,
    );
    const s = statuses(root);
    expect(s.card.status).toBe("pass");
    expect(s.inner.status).toBe("fail");
  });

  it("measures the largest square that fits inside rounded targets", () => {
    const s = statuses(
      fixture(btn("circle24", 10, 10, 24, 24, "border-radius:50%") + btn("circle34", 100, 10, 34, 34, "border-radius:50%")),
    );
    expect(s.circle24.status).toBe("pass-spacing");
    expect(s.circle34.status).toBe("pass");
  });
});

describe("2.5.5 AAA", () => {
  it("uses 44×44 with no spacing exception", () => {
    const s = statuses(fixture(btn("mid", 10, 10, 30) + btn("large", 200, 10, 44)), 44);
    expect(s.mid.status).toBe("fail");
    expect(s.large.status).toBe("pass");
  });
});

describe("exceptions and non-targets", () => {
  it("exempts a link inside a sentence but not links separated only by punctuation", () => {
    const root = fixture(`
      <p style="position:fixed;left:10px;top:10px;font-size:12px;margin:0">Read the <a id="prose" href="#">policy</a> before continuing.</p>
      <p style="position:fixed;left:10px;top:100px;font-size:12px;margin:0"><a id="home" href="#">A</a>|<a id="about" href="#">B</a></p>
    `);
    const s = statuses(root);
    expect([s.prose.status, s.prose.reason]).toEqual(["exempt", "inline"]);
    expect(s.home.status).toBe("fail");
  });

  it("exempts unstyled native checkboxes but not restyled ones", () => {
    const root = fixture(`
      <div style="position:fixed;left:10px;top:10px"><input id="ua1" type="checkbox"><input id="ua2" type="checkbox"></div>
      <div style="position:fixed;left:10px;top:100px">
        <input id="styled1" type="checkbox" style="appearance:none;width:12px;height:12px;margin:0;border:1px solid"><input id="styled2" type="checkbox" style="appearance:none;width:12px;height:12px;margin:0;border:1px solid">
      </div>
    `);
    const s = statuses(root);
    expect([s.ua1.status, s.ua1.reason]).toEqual(["exempt", "ua-control"]);
    expect(s.styled1.status).toBe("fail");
  });

  it("measures a custom checkbox by its label, not its sr-only input", () => {
    const root = fixture(`
      <input id="custom" type="checkbox" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">
      <label for="custom" style="position:fixed;left:10px;top:10px;width:30px;height:30px;display:block"></label>
      ${btn("neighbour", 42, 10, 16)}
    `);
    const s = statuses(root);
    expect(s.custom.status).toBe("pass");
    // The label counts as part of the checkbox's target, so it is an obstacle for others.
    expect(s.neighbour.status).toBe("fail");
  });

  it("does not treat an sr-only skip link as a target", () => {
    const root = fixture(
      `<a id="skip" href="#main" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">Skip</a>`,
    );
    expect(statuses(root).skip.status).toBe("not-target");
  });

  it("flags transformed and overlapping targets for manual review", () => {
    const root = fixture(
      btn("rotated", 10, 10, 30, 30, "transform:rotate(45deg)") +
        btn("moved", 100, 10, 30, 30, "transform:translateX(5px)") +
        btn("under", 10, 100, 40) +
        btn("over", 30, 100, 40),
    );
    const s = statuses(root);
    expect([s.rotated.status, s.rotated.reason]).toEqual(["verify", "transformed"]);
    expect(s.moved.status).toBe("pass");
    expect([s.over.status, s.over.reason]).toEqual(["verify", "overlapped"]);
  });

  it("uses each line of a wrapped link as an obstacle rather than its bounding box", () => {
    const root = fixture(
      `<p style="position:fixed;left:10px;top:10px;width:150px;margin:0;font:16px/20px monospace">xxxxxxx <a id="wrapped" href="#">aaaaaaa bb</a></p>${btn("icon", 0, 0, 16)}`,
    );
    const link = document.getElementById("wrapped");
    const icon = document.getElementById("icon");
    if (link === null || icon === null) throw new Error("fixture missing");
    const [first, second] = Array.from(link.getClientRects());
    // Inside the link's bounding box, below line 1 by 12px+, well right of line 2.
    icon.style.left = `${String(first.right - 16)}px`;
    icon.style.top = `${String(first.bottom + 12)}px`;
    const box = link.getBoundingClientRect();
    expect(second.right).toBeLessThan(first.right - 40);
    expect(box.bottom).toBeGreaterThan(first.bottom + 12);
    expect(statuses(root).icon.status).toBe("pass-spacing");
  });
});

describe("target discovery", () => {
  it("finds role=button and tabindex=-1 buttons, and ignores generic tabindex containers and tool UI", () => {
    const root = fixture(`
      <div id="region" role="region" tabindex="0" style="position:fixed;left:10px;top:10px;width:300px;height:100px">
        ${btn("roving", 20, 20, 16).replace("<button", '<button tabindex="-1"')}
        <div id="fake" role="button" tabindex="0" style="position:fixed;left:100px;top:20px;width:16px;height:16px"></div>
      </div>
      <div data-a11y-playpen-tool="x">${btn("tool", 200, 200, 10)}</div>
    `);
    const s = statuses(root);
    expect(Object.keys(s).sort()).toEqual(["fake", "roving"]);
    expect([s.roving.status, s.fake.status]).toEqual(["pass-spacing", "pass-spacing"]);
  });
});
