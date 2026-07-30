export function initFaq() {
  document.querySelectorAll("details:not(.mobile-nav)").forEach((details) => {
    const summary = details.querySelector("summary");
    if (!summary) return;
    summary.setAttribute("aria-expanded", details.open ? "true" : "false");
    summary.dataset.stateLabel = details.open ? "Recolher resposta" : "Expandir resposta";
    details.addEventListener("toggle", () => {
      summary.setAttribute("aria-expanded", details.open ? "true" : "false");
      summary.dataset.stateLabel = details.open ? "Recolher resposta" : "Expandir resposta";
    });
  });
}
