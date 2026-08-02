import { expect, it } from "vitest";
import { monitorSelectorText } from "./MonitorAriaLive.ts";

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
