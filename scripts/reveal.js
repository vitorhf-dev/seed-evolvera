function complete(element) {
  element.classList.remove("is-reveal-pending");
  element.classList.add("is-revealed");
}

export function initReveal() {
  const sections = [...document.querySelectorAll("main > section.section")];
  if (!sections.length) return;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    sections.forEach(complete);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        complete(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  sections.forEach((section) => {
    section.dataset.reveal = "safe";
    const rect = section.getBoundingClientRect();
    if (rect.top <= window.innerHeight) complete(section);
    else {
      section.classList.add("is-reveal-pending");
      observer.observe(section);
    }
  });
}
