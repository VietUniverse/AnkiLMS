/**
 * Modal của app khai aria-modal="true" trên overlay. Hàm này gắn inert cho phần nền và
 * giữ Tab trong overlay, để bàn phím không đi xuyên ra sau modal.
 */
const OVERLAY = '[aria-modal="true"]';
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function installModalFocusTrap(): () => void {
  let overlay: HTMLElement | null = null;
  const background = new Map<Element, string | null>();

  const restoreBackground = () => {
    for (const [element, previous] of background) {
      if (previous === null) element.removeAttribute("inert");
      else element.setAttribute("inert", previous);
    }
    background.clear();
  };

  const sync = () => {
    const next = document.querySelector<HTMLElement>(OVERLAY);
    if (next === overlay) return;
    restoreBackground();
    overlay = next;
    if (!overlay) return;

    let top: Element = overlay;
    while (top.parentElement && top.parentElement !== document.body) top = top.parentElement;
    for (const element of Array.from(document.body.children)) {
      if (element === top) continue;
      background.set(element, element.getAttribute("inert"));
      element.setAttribute("inert", "");
    }

    const first = overlay.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || !overlay) return;
    const items = Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.offsetParent !== null,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (!active || !overlay.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  sync();
  document.addEventListener("keydown", onKeyDown, true);

  return () => {
    observer.disconnect();
    document.removeEventListener("keydown", onKeyDown, true);
    restoreBackground();
  };
}
