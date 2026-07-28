/**
 * Test bed for the "semi-sticky" top banner pattern: a fixed section-nav strip
 * that fades out three seconds after the user stops scrolling and comes back on
 * the next scroll.
 *
 * This is the *naive* implementation on purpose. The scroll-spy half is done
 * properly (exactly one `aria-current="location"` at a time); the show/hide
 * half reproduces the anti-pattern so its failure modes are observable — most
 * importantly, `display: none` drops the three links out of the tab order and
 * nothing but a pointer scroll brings them back.
 */
import { assert } from "../../utils/assert.ts";
import "./index.css";

const FADE_AFTER_MS = 3000;

function el(id: string): HTMLElement {
  const found = document.getElementById(id);
  assert(found !== null, `missing element #${id}`);
  return found;
}

const banner = el("banner");
const links = [...banner.querySelectorAll<HTMLAnchorElement>("a[data-target]")];
assert(links.length > 0, "banner has no [data-target] links");
const sections = links.map((link) => el(link.dataset["target"] ?? ""));

/** Measured once: a hidden banner measures 0, which would move the threshold. */
const BANNER_OFFSET = banner.getBoundingClientRect().height + 8;

// --- fade timer -------------------------------------------------------------

type BannerState = "shown" | "fading" | "hidden";

let state: BannerState = "shown";
let fadeTimer: number | undefined;

function startFade(): void {
  state = "fading";
  banner.style.opacity = "0";
}

/* The state check is load-bearing. Showing the banner mid-fade animates opacity
   back to 1, and *that* transition also fires `transitionend` for "opacity" —
   without the guard it would hide the banner while the user is still
   scrolling. */
banner.addEventListener("transitionend", (event: TransitionEvent) => {
  if (event.propertyName !== "opacity" || state !== "fading") return;
  state = "hidden";
  banner.classList.add("hidden");
});

function showBanner(): void {
  if (state !== "shown") {
    banner.classList.remove("hidden");
    void banner.offsetWidth; // flush the display change so the transition re-runs
    banner.style.opacity = "1";
    state = "shown";
  }
  clearTimeout(fadeTimer);
  fadeTimer = window.setTimeout(startFade, FADE_AFTER_MS);
}

// Deliberately no `focusin` handler and no reveal-on-scroll-up: a keyboard user
// tabbing into the faded banner gets nothing. That is the point of the demo.

// --- scroll spy -------------------------------------------------------------

let current: HTMLAnchorElement | undefined;

function updateCurrent(): void {
  let active = links[0];
  sections.forEach((section, i) => {
    if (section.getBoundingClientRect().top <= BANNER_OFFSET) active = links[i];
  });
  if (active === current) return;
  current?.removeAttribute("aria-current");
  active.setAttribute("aria-current", "location");
  current = active;
}

// --- one coalesced pass per frame -------------------------------------------

let frame: number | undefined;

window.addEventListener(
  "scroll",
  () => {
    showBanner();
    frame ??= requestAnimationFrame(() => {
      frame = undefined;
      updateCurrent();
    });
  },
  { passive: true },
);

updateCurrent(); // so a deep-linked load (#details) starts correct
showBanner(); // and so the banner fades on its own without an initial scroll
