import { expect, it } from "vitest";
import { monitorSelectorText } from "./MonitorAriaLive.ts";

it("renders a shadow-root selector with MonitorAriaLive root context", () => {
  const host = document.createElement("div");
  host.id = "monitor-host";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = "<div aria-live=polite>Saved</div>";

  const output = monitorSelectorText(shadow.querySelector("[aria-live]")!);

  expect(output).toContain("top-document > shadow-root(#monitor-host) :: ");
  host.remove();
});
