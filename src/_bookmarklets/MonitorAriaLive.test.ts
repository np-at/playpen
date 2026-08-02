import { afterEach, expect, it } from "vitest";
import { monitorSelectorText } from "./MonitorAriaLive.ts";

const MONITOR_HOST_ID = "aria-live-monitor-host";

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
}

afterEach(() => {
  document.getElementById(MONITOR_HOST_ID)?.dispatchEvent(new CustomEvent("aria-live-monitor:close"));
});

it("renders a shadow-root selector with MonitorAriaLive root context", () => {
  const host = document.createElement("div");
  host.id = "monitor-host";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = "<div aria-live=polite>Saved</div>";

  const target = shadow.querySelector("[aria-live]");
  if (!target) throw new Error("Monitor live-region fixture was not created");
  const output = monitorSelectorText(target);

  expect(output).toContain("top-document > shadow-root(#monitor-host) :: ");
  host.remove();
});

it("labels already-connected hosts as a snapshot and updates the caveat when a later frame is skipped", async () => {
  const existingHost = document.createElement("div");
  document.body.appendChild(existingHost);
  const entryUrl = new URL("./MonitorAriaLive.ts", import.meta.url);
  entryUrl.searchParams.set("monitor-test-run", "dynamic-caveat");

  await import(/* @vite-ignore */ entryUrl.href);
  const monitorHost = document.getElementById(MONITOR_HOST_ID);
  if (monitorHost === null) throw new Error("monitor host was not created");
  const lateShadow = existingHost.attachShadow({ mode: "open" });
  lateShadow.innerHTML = "<div aria-live=polite>Later</div>";
  const blockedFrame = document.createElement("iframe");
  Object.defineProperty(blockedFrame, "contentDocument", {
    configurable: true,
    get: () => {
      throw new DOMException("Denied", "SecurityError");
    },
  });
  document.body.appendChild(blockedFrame);
  await nextFrame();
  await nextFrame();

  const caveat = monitorHost.getAttribute("data-a11y-playpen-monitor-caveat");
  expect(caveat).toContain("root scan is a snapshot");
  expect(caveat).toContain("1 cross-origin iframe");
  existingHost.remove();
  blockedFrame.remove();
});
