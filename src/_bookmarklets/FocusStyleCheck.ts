import { getObjectDiff, type ObjectDiff } from "@donedeal0/superdiff";
import { sleep } from "../utils/sleep.ts";
import { short_uuid } from "../utils/stringUtils.ts";
import { isElRendered } from "../utils/isElRendered.ts";

function getFocusRelevantStyles(el: HTMLElement) {
  // const styleMap = el.computedStyleMap();
  const styleMap = window.getComputedStyle(el, null);
  const before = window.getComputedStyle(el, "::before");
  const after = window.getComputedStyle(el, "::after");

  return {
    // outline: {
    //   outlineColor, outlineOffset, outlineStyle, outlineWidth
    // },
    // border: styleMap.border,
    // background: styleMap.background,
    // color: styleMap.color,
    style: {
      ...styleMap,
    },
    before: {
      ...before,
    },
    after: {
      ...after,
    },
  };
}

async function testFocusStyles(el: HTMLElement): Promise<ObjectDiff | null> {
  // assume that elements with aria-hidden, or elements descended from aria-hidden are not meant to receive focus
  if (el.closest('[aria-hidden="true"]') !== null) return null;
  // same for inert
  if (el.closest('[inert]') !== null) return null
  // assume natively focusable elements with tabindex="-1" are intentionally removed from focus order (ie not going to be a programmatic focus target)
  if (el.getAttribute("tabindex") === "-1" && el.tagName in ["a", "button", "input"]) return null;

  if (el.getAttribute("id") !== undefined) {
    el.setAttribute("id", short_uuid());
  }

  // unable to test unrendered elements so skip
  if (!isElRendered(el)) {
    return null;
  }
  await sleep(100);
  const unfocused = getFocusRelevantStyles(el);

  window.location.hash = el.getAttribute("id") ?? "";
  window.location.assign(window.location.toString());
  el.scrollIntoView({ behavior: "instant" });
  if (!el.checkVisibility()) {
    return null;
  }

  // let RETRY_MAX = 5;
  // for (let i= 5; i <= RETRY_MAX; i++) {
  // }

  const focused = getFocusRelevantStyles(el);
  return getObjectDiff(unfocused, focused, {
    showOnly: {
      granularity: "deep",
      statuses: ["added", "updated", "deleted"],
    },
  });
}

async function focusStyleCheck() {
  const equal: HTMLElement[] = [];
  const untestable: HTMLElement[] = [];
  window.scrollTo({ behavior: "instant", top: document.body.scrollHeight });

  const focusableElements = document.querySelectorAll(
    `button,a[href],[tabindex],[role="option"],[role="button"],[role="gridcell"],[role="link"],[role="tab"],[role="checkbox"],[role=""]`,
  );

  for (const el of focusableElements) {
    if (!(el instanceof HTMLElement)) {
      continue;
    }
    const r = await testFocusStyles(el);
    if (r === null) {
      untestable.push(el);
      continue;
    }
    if (r.status === "equal") {
      equal.push(el);
    } else {
      console.debug(r);
    }
  }

  const res = [];
  for (const el of equal) {
    const r = await testFocusStyles(el);
    if (r === null) continue;
    if (r.status === "equal") {
      res.push(el);
    } else {
      console.debug(r);
    }
  }

  if (res) {
    console.warn("found unequal elements", res);
  }
  if (untestable) {
    console.info("untestable elements", untestable)
  }
}

await focusStyleCheck();
