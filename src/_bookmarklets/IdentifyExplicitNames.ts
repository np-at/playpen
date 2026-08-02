import CreatePointerSelector from "../utils/PointerSelectorClass";
import { getName } from "aria-api";

function IdentifyLabelTargets(x: HTMLLabelElement): HTMLElement | undefined {
  // if the label has an explicit for attribute, check that it matches the target
  // this overrides implicit labelling, so we can just return the targeted element
  if (x.htmlFor) {
    const t = document.getElementById(x.htmlFor);
    if (t != null) {
      return t;
    }
    console.warn("label has invalid for attribute, ", x);
  }
  const implicitlyLabelledEl = x.querySelectorAll(
    'input,button,select,textarea,[role="button"],[role="textarea"],[role="select"],[role="combobox"],[role="searchbox"],[role="checkbox"],[role="switch"]',
  );
  if (implicitlyLabelledEl.length > 1) {
    console.warn("label has multiple implicitly labelled elements, ", x, implicitlyLabelledEl);
  } else if (implicitlyLabelledEl.length === 1) {
    return implicitlyLabelledEl[0] as HTMLElement;
  }
  console.warn("label does not provide name for any elements", x);
  return undefined;
}

const Labelling = {
  ariaLabel: "aria-label",
  ariaLabeledBy: "aria-labelledby",
  externalLabel: "external label",
} as const;

interface LabelledElement {
  name: string | null;
  labellingMethod: (typeof Labelling)[keyof typeof Labelling];
  target: Element;
}

export function identifyExternalLabels(target: Element): LabelledElement[] {
  return Array.from(document.querySelectorAll("label"))
    .map(IdentifyLabelTargets)
    .filter((labelTarget): labelTarget is HTMLElement => labelTarget != null && target.contains(labelTarget))
    .map((labelTarget) => ({
      name: getName(labelTarget),
      labellingMethod: Labelling.externalLabel,
      target: labelTarget,
    }));
}

function IdentifyExplicitNames(target: Element): boolean {
  console.log("target: ", target);
  console.log("name: ", getName(target));
  const hasAriaLabel: LabelledElement[] = Array.from(target.querySelectorAll("[aria-label]")).map((x) => ({
    // we know this is defined because we're querying for it

    name: x.getAttribute("aria-label"),
    labellingMethod: Labelling.ariaLabel,
    target: x as HTMLElement,
  }));
  const hasAriaLabeledBy: LabelledElement[] = Array.from(target.querySelectorAll("[aria-labelledby],[aria-labeledby]"))
    .concat(target)
    .map((x) => ({
      name: getName(x),
      labellingMethod: Labelling.ariaLabeledBy,
      target: x as HTMLElement,
    }));
  if (target.getAttribute("aria-labelledby") ?? target.getAttribute("aria-labeledby")) {
    hasAriaLabeledBy.push({
      name: getName(target),
      labellingMethod: Labelling.ariaLabeledBy,
      target,
    });
  }

  const hasExternalLabel = identifyExternalLabels(target);
  console.dir("hasAriaLabel: ", hasAriaLabel);
  console.dir("hasAriaLabeledBy: ", hasAriaLabeledBy);
  console.dir("hasExternalLabel: ", hasExternalLabel);

  return true;
}

CreatePointerSelector("identify-explicit-names", IdentifyExplicitNames);
