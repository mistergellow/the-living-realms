/*
 * Make the page feel like a game, not a web page (request #43): no browser
 * context menu on right click (except in text fields, so copy/paste still
 * works), no dragging of links and images (our own drag and drop is
 * pointer-based), no accidental text selection outside text fields.
 */
const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || t.closest('input, textarea, select, [contenteditable="true"]') !== null);

export function installAppFeel(doc: Document = document): () => void {
  const onContext = (e: MouseEvent) => {
    if (!editable(e.target)) e.preventDefault();
  };
  const onDragStart = (e: DragEvent) => {
    const t = e.target;
    if (t instanceof HTMLImageElement || t instanceof HTMLAnchorElement) e.preventDefault();
  };
  doc.addEventListener('contextmenu', onContext);
  doc.addEventListener('dragstart', onDragStart);
  doc.documentElement.classList.add('app-feel');
  return () => {
    doc.removeEventListener('contextmenu', onContext);
    doc.removeEventListener('dragstart', onDragStart);
    doc.documentElement.classList.remove('app-feel');
  };
}
