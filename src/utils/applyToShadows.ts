export function applyToShadows(root: Document | ShadowRoot | undefined, fn: (arg0: Document | ShadowRoot) => void): void {
  for (const el of Array.from(root?.querySelectorAll("*") ?? [])) {
    if (el.shadowRoot) {
      fn(el.shadowRoot);
      applyToShadows(el.shadowRoot, fn);
    }
  }
}
