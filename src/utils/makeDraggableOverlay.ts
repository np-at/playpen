import type { BookmarkletLifecycle } from "./bookmarkletLifecycle";

type DragState = {
  offsetX: number;
  offsetY: number;
  pointerId: number;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function makeDraggableDisplay(lifecycle: BookmarkletLifecycle): HTMLDivElement {
  const panel = lifecycle.ownNode(document.createElement("div"));
  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.right = "0";
  panel.style.width = "300px";
  panel.style.height = "300px";
  panel.style.zIndex = "999999";
  panel.style.overflowY = "scroll";

  const handle = document.createElement("button");
  handle.type = "button";
  handle.dataset.a11yDragHandle = "";
  handle.setAttribute("aria-label", "Drag panel");
  handle.style.cursor = "move";
  handle.style.touchAction = "none";
  handle.textContent = "Drag";
  panel.appendChild(handle);

  let dragState: DragState | undefined;
  const finishDrag = (event?: PointerEvent): void => {
    if (dragState === undefined || (event !== undefined && event.pointerId !== dragState.pointerId)) return;
    if (handle.hasPointerCapture(dragState.pointerId)) handle.releasePointerCapture(dragState.pointerId);
    dragState = undefined;
  };
  lifecycle.listen(handle, "pointerdown", ((event: PointerEvent) => {
    if (event.button !== 0 || dragState !== undefined) return;
    const rect = panel.getBoundingClientRect();
    panel.style.right = "auto";
    panel.style.left = `${rect.left.toString()}px`;
    panel.style.top = `${rect.top.toString()}px`;
    dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId,
    };
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  }) as EventListener);
  lifecycle.listen(handle, "pointermove", ((event: PointerEvent) => {
    if (dragState === undefined || event.pointerId !== dragState.pointerId) return;
    const rect = panel.getBoundingClientRect();
    const left = clamp(event.clientX - dragState.offsetX, 0, window.innerWidth - rect.width);
    const top = clamp(event.clientY - dragState.offsetY, 0, window.innerHeight - rect.height);
    panel.style.left = `${left.toString()}px`;
    panel.style.top = `${top.toString()}px`;
    event.preventDefault();
  }) as EventListener);
  lifecycle.listen(handle, "pointerup", finishDrag as EventListener);
  lifecycle.listen(handle, "pointercancel", finishDrag as EventListener);
  lifecycle.listen(handle, "lostpointercapture", finishDrag as EventListener);
  lifecycle.addCleanup(() => {
    finishDrag();
  });

  return panel;
}
