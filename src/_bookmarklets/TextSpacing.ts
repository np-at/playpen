// stolen from https://codepen.io/stevef/pen/YLMqbo


function TextSpacing(): void {
  const d = document;
  const id = "phltsbkmklt";
  const el = d.getElementById(id);
  const f = d.querySelectorAll("iframe");
  let i = 0;
  const l = f.length;
  if (el != null) {
    function removeFromShadows(root: ShadowRoot | Document | undefined): void {
      for (const el of Array.from(root?.querySelectorAll("*") ?? [])) {
        if (el.shadowRoot != null) {
          el.shadowRoot.getElementById(id)?.remove();
          removeFromShadows(el.shadowRoot);
        }
      }
    }

    el.remove();
    if (l !== 0) {
      for (i = 0; i < l; i++) {
        try {
          f[i].contentWindow?.document.getElementById(id)?.remove();
          removeFromShadows(f[i].contentWindow?.document);
        } catch (e) {
          console.log(e);
        }
      }
    }
    removeFromShadows(d);
  } else {
    const s = d.createElement("style");
    s.id = id;
    s.style.display = "none";
    s.innerText =
      "*{line-height:1.5 !important;letter-spacing:0.12em !important;word-spacing:0.16em !important;}p{margin-bottom:2em !important;}";

    function applyToShadows(root: ShadowRoot | Document | undefined): void {
      for (const el of Array.from(root?.querySelectorAll("*") ?? [])) {
        if (el.shadowRoot != null) {
          el.shadowRoot.appendChild(s.cloneNode(true));
          applyToShadows(el.shadowRoot);
        }
      }
    }

    d.getElementsByTagName("head")[0].appendChild(s);
    for (i = 0; i < l; i++) {
      try {
        f[i].contentWindow?.document.getElementsByTagName("head")[0].appendChild(s.cloneNode(true));
        applyToShadows(f[i].contentWindow?.document);
      } catch (e) {
        console.log(e);
      }
    }
    applyToShadows(d);
  }
}
TextSpacing();
