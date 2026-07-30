function setVisible(card, visible) {
  card.hidden = !visible;
  card.classList.toggle("is-filtered-out", !visible);
}

export function initCatalogFilter() {
  const root = document.querySelector("[data-catalog-filter]");
  if (!root) return;
  const cards = [...document.querySelectorAll("[data-catalog-card]")];
  const buttons = [...root.querySelectorAll("[data-filter]")];
  const count = root.querySelector("[data-filter-count]");
  const empty = root.querySelector("[data-filter-empty]");
  const reset = root.querySelector("[data-filter-reset]");
  if (!cards.length || !buttons.length || !count) return;

  const failOpenMessage = "Não foi possível aplicar os filtros. Todos os itens permanecem visíveis.";
  const update = (value) => {
    const filterValues = new Set(buttons.map((button) => button.dataset.filter).filter(Boolean));
    const validData = cards.every((card) => filterValues.has(card.dataset.category?.trim()));
    if (!validData) {
      buttons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.filter === "all" ? "true" : "false"));
      cards.forEach((card) => setVisible(card, true));
      count.textContent = failOpenMessage;
      if (empty) empty.hidden = true;
      if (reset) reset.hidden = true;
      return;
    }
    buttons.forEach((button) => button.setAttribute("aria-pressed", button.dataset.filter === value ? "true" : "false"));
    const visible = cards.filter((card) => value === "all" || card.dataset.category === value);
    cards.forEach((card) => setVisible(card, value === "all" || card.dataset.category === value));
    count.textContent = `${visible.length} ${visible.length === 1 ? "família encontrada" : "famílias encontradas"}`;
    if (empty) empty.hidden = visible.length !== 0;
    if (reset) reset.hidden = value === "all";
  };

  buttons.forEach((button) => button.addEventListener("click", () => update(button.dataset.filter || "all")));
  reset?.addEventListener("click", () => update("all"));
  update("all");
}
