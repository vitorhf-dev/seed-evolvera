import { acquireScrollLock, releaseScrollLock } from "./scroll-lock.js";

function focusable(details) {
  return [...details.querySelectorAll("a, button, [tabindex]:not([tabindex='-1'])")].filter((element) => !element.hasAttribute("disabled"));
}

export function initMobileNav() {
  const menus = [...document.querySelectorAll("details.mobile-nav")];
  menus.forEach((menu, index) => {
    const summary = menu.querySelector("summary");
    const panel = menu.querySelector("nav");
    const links = panel ? focusable(panel) : [];
    if (!summary || !panel || !links.length) return;

    const owner = `mobile-nav-${index}`;
    const panelId = panel.id || `mobile-nav-panel-${index}`;
    panel.id = panelId;
    summary.setAttribute("aria-controls", panelId);
    summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
    summary.setAttribute("aria-label", menu.open ? "Fechar menu" : "Abrir menu");

    const close = (restoreFocus = true) => {
      if (!menu.open) return;
      menu.open = false;
      releaseScrollLock(owner);
      summary.setAttribute("aria-expanded", "false");
      summary.setAttribute("aria-label", "Abrir menu");
      if (restoreFocus) summary.focus();
    };

    menu.addEventListener("toggle", () => {
      summary.setAttribute("aria-expanded", menu.open ? "true" : "false");
      summary.setAttribute("aria-label", menu.open ? "Fechar menu" : "Abrir menu");
      if (menu.open) {
        acquireScrollLock(owner);
        queueMicrotask(() => focusable(panel)[0]?.focus());
      } else {
        releaseScrollLock(owner);
      }
    });

    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !menu.open) return;
      const current = focusable(menu);
      if (!current.length) return;
      const first = current[0];
      const last = current[current.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) close(false);
    });

    document.addEventListener("pointerdown", (event) => {
      if (!menu.open || menu.contains(event.target)) return;
      const outsideControl = event.target instanceof Element
        ? event.target.closest("a, button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])")
        : null;
      close(false);
      if (!outsideControl) setTimeout(() => summary.focus(), 0);
    });
  });
}
