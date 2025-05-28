const findDuplicateIds: () => void = () => {
  const a: string[] = Array.from(document.querySelectorAll("*"))
    .map((x) => x.id)
    .filter((x) => !!x);
  const elements = Array.from(document.querySelectorAll("*"));
  const b: HTMLElement[] = [];
  elements?.forEach((x: Element) => {
    if (a.filter((f) => f === x.id).length > 1) {
      b.push(x as HTMLElement);
    }
  });
  b.forEach((x) => {
    x.style.outline = "2px solid orange";
    x.style.border = "2px solid red";
    x.style.outlineOffset = "2px";
  });
  console.dir(b);
};
findDuplicateIds();
