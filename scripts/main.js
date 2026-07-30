import { initCatalogFilter } from "./catalog-filter.js";
import { initFaq } from "./faq.js";
import { initGallery } from "./gallery.js";
import { initInquiryForm } from "./inquiry-form.js";
import { initMobileNav } from "./mobile-nav.js";
import { initReveal } from "./reveal.js";
import { initVideo } from "./video.js";

const initializers = [
  initMobileNav,
  initCatalogFilter,
  initGallery,
  initFaq,
  initReveal,
  initVideo,
  initInquiryForm,
];

function init() {
  document.documentElement.classList.add("js");
  document.body?.classList.add("js-enhanced");
  initializers.forEach((initializer) => {
    try {
      initializer();
    } catch {
      // A malformed optional component must leave its static fallback readable.
    }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
