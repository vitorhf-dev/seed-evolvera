import { acquireScrollLock, releaseScrollLock } from "./scroll-lock.js";

function focusable(dialog) {
  return [...dialog.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])")].filter((element) => !element.disabled && element.getClientRects().length);
}

export function initGallery() {
  const items = [...document.querySelectorAll(".gallery a[href]")];
  if (!items.length || !items.some((item) => item.querySelector("img"))) return;
  const dialog = document.createElement("dialog");
  dialog.className = "gallery-dialog";
  dialog.setAttribute("aria-label", "Visualização de mídia");
  dialog.innerHTML = `
    <div class="gallery-dialog__inner">
      <button type="button" class="gallery-dialog__close" data-gallery-close>Fechar visualização</button>
      <p class="gallery-dialog__counter" data-gallery-counter aria-live="polite"></p>
      <figure>
        <img data-gallery-image alt="">
        <figcaption data-gallery-caption></figcaption>
      </figure>
      <p class="gallery-dialog__unavailable" data-gallery-unavailable role="status" aria-live="polite" hidden>Esta mídia não está disponível.</p>
      <div class="gallery-dialog__controls">
        <button type="button" data-gallery-prev>Imagem anterior</button>
        <button type="button" data-gallery-next>Próxima imagem</button>
      </div>
    </div>`;
  document.body.append(dialog);
  const image = dialog.querySelector("[data-gallery-image]");
  const caption = dialog.querySelector("[data-gallery-caption]");
  const counter = dialog.querySelector("[data-gallery-counter]");
  const unavailable = dialog.querySelector("[data-gallery-unavailable]");
  const previous = dialog.querySelector("[data-gallery-prev]");
  const next = dialog.querySelector("[data-gallery-next]");
  const closeButton = dialog.querySelector("[data-gallery-close]");
  let current = 0;
  let opener = null;
  const owner = "gallery";

  const show = (index) => {
    current = Math.max(0, Math.min(index, items.length - 1));
    const item = items[current];
    const source = item.getAttribute("href");
    const sourceImage = item.querySelector("img");
    const text = sourceImage?.alt || item.textContent.trim();
    image.hidden = false;
    unavailable.hidden = true;
    image.alt = sourceImage?.alt || "";
    image.src = source;
    caption.textContent = text;
    counter.textContent = `Imagem ${current + 1} de ${items.length}`;
    previous.disabled = current === 0;
    next.disabled = current === items.length - 1;
    dialog.setAttribute("aria-label", `Visualização de mídia: ${text}`);
    image.onerror = () => {
      image.hidden = true;
      unavailable.hidden = false;
    };
  };
  const close = () => {
    if (dialog.open) dialog.close();
  };
  items.forEach((item, index) => {
    const imageAlt = item.querySelector("img")?.alt || item.textContent.trim();
    item.setAttribute("aria-label", `Abrir imagem: ${imageAlt}`);
    item.addEventListener("click", (event) => {
      event.preventDefault();
      opener = item;
      show(index);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      acquireScrollLock(owner);
      closeButton.focus();
    });
  });
  closeButton.addEventListener("click", close);
  previous.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    releaseScrollLock(owner);
    opener?.focus();
    opener = null;
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
    if (event.key !== "Tab") return;
    const controls = focusable(dialog);
    if (!controls.length) return;
    if (event.shiftKey && document.activeElement === controls[0]) {
      event.preventDefault();
      controls.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
      event.preventDefault();
      controls[0].focus();
    }
  });
}
