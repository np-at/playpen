import { afterEach, expect, it } from "vitest";
import * as identifyExplicitNames from "./IdentifyExplicitNames.ts";

afterEach(() => {
  document.querySelectorAll("[data-identify-explicit-names-test]").forEach((element) => element.remove());
});

it("finds a label outside the selected target", () => {
  const label = document.createElement("label");
  label.htmlFor = "external-label-target";
  label.textContent = "Search";
  label.dataset.identifyExplicitNamesTest = "";
  const target = document.createElement("input");
  target.id = "external-label-target";
  target.dataset.identifyExplicitNamesTest = "";
  document.body.append(label, target);

  expect(identifyExplicitNames.identifyExternalLabels(target)).toMatchObject([
    { name: "Search", labellingMethod: "external label", target },
  ]);
});
