/**
 * Test bed for the AriaLiveObserver bookmarklet: one button per branch of the
 * live-region semantics in `src/utils/ariaLive.ts`.
 */
import { assert } from "../../utils/assert.ts";

function el(id: string): HTMLElement {
  const found = document.getElementById(id);
  assert(found !== null, `missing element #${id}`);
  return found;
}

function on(id: string, handler: () => void): void {
  el(id).addEventListener("click", handler);
}

let counter = 1;
const next = (): number => (counter += 1);

// --- explicit politeness ----------------------------------------------------

on("polite-swap", () => {
  el("polite-count").textContent = String(next());
});

on("assertive-swap", () => {
  el("assertive-region").textContent = `Connection lost (${String(next())})`;
});

on("off-swap", () => {
  el("off-region").textContent = `Changed ${String(next())} times`;
});

// --- implicit live roles ----------------------------------------------------

on("alert-insert", () => {
  const host = el("alert-host");
  host.replaceChildren();
  const toast = document.createElement("div");
  toast.setAttribute("role", "alert");
  toast.textContent = `Payment failed (${String(next())})`;
  host.appendChild(toast);
});

on("status-update", () => {
  el("status-region").textContent = `Saved at ${new Date().toLocaleTimeString()}`;
});

on("log-append", () => {
  const row = document.createElement("p");
  row.textContent = `entry ${String(next())}`;
  el("log-region").appendChild(row);
});

on("output-update", () => {
  el("output-region").textContent = String(next() * 7);
});

// --- atomicity and relevance ------------------------------------------------

on("atomic-swap", () => {
  el("atomic-count").textContent = String(next());
});

on("subtree-swap", () => {
  el("subtree-score").textContent = String(next());
});

on("removal-drop", () => {
  el("removal-region").lastElementChild?.remove();
});

on("removals-drop", () => {
  el("removals-region").lastElementChild?.remove();
});

// --- suppression ------------------------------------------------------------

on("busy-batch", () => {
  const region = el("busy-region");
  region.setAttribute("aria-busy", "true");
  region.replaceChildren();
  for (let i = 1; i <= 5; i++) {
    const row = document.createElement("p");
    row.textContent = `batched row ${String(i)}`;
    region.appendChild(row);
  }
  // Release on the next frame so the busy writes and the release land in
  // separate observer batches, the way a real "loading finished" flow does.
  requestAnimationFrame(() => {
    region.setAttribute("aria-busy", "false");
    region.appendChild(document.createElement("span")).textContent = " (done)";
  });
});

on("hidden-update", () => {
  el("hidden-region").textContent = `Updated ${String(next())} times`;
});

// --- shadow DOM -------------------------------------------------------------

function buildShadowCase(hostId: string, mode: ShadowRootMode): ShadowRoot {
  const root = el(hostId).attachShadow({ mode });
  const region = document.createElement("div");
  region.setAttribute("role", "status");
  region.textContent = "Idle";
  root.appendChild(region);
  return root;
}

const openRoot = buildShadowCase("shadow-open-host", "open");
on("shadow-update", () => {
  const region = openRoot.firstElementChild;
  if (region) region.textContent = `Shadow update ${String(next())}`;
});

// Kept in a closure — a closed root is exactly what the monitor cannot reach.
const closedRoot = buildShadowCase("shadow-closed-host", "closed");
on("shadow-closed-update", () => {
  const region = closedRoot.firstElementChild;
  if (region) region.textContent = `Closed shadow update ${String(next())}`;
});
