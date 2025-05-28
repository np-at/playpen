export function digIntoIframes(root: Document | ShadowRoot, fxn: (arg0: Document) => void): void {
  for (const el of Array.from(root.querySelectorAll("iframe"))) {
    if (el.contentDocument) {
      fxn(el.contentDocument);
      digIntoIframes(el.contentDocument, fxn);
    } else {
      fetch(el.src, {
        mode: "no-cors",
      })
        .then((response) => {
          response
            .text()
            .then((text) => {
              const parser = new DOMParser();
              const doc = parser.parseFromString(text, "text/html");
              fxn(doc);
              digIntoIframes(doc, fxn);
            })
            .catch((err) => {
              console.error(err);
            });
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }
}
