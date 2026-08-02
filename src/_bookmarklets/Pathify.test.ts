import { expect, it } from "vitest";
import { findSelector } from "../utils/finder.ts";
import { pathifySelectorText } from "./Pathify.ts";

it("exports shadow-root context with Pathify selector output", () => {
  const host = document.createElement("div");
  host.id = "pathify-host";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = "<button>Save</button>";

  const output = pathifySelectorText(findSelector(shadow.querySelector("button")!));

  expect(output).toContain("top-document > shadow-root(#pathify-host) :: button");
  host.remove();
});
