import { renderPagePreview, type PagePreviewResult, type SiteConfig } from "../src/index.js";

/**
 * Seed-side seam: bostoide supplies the already validated SiteConfig and its
 * existing siteDir (for example, out/gerados/<slug>). No bostoide type or
 * orchestration module is imported here.
 */
export const renderBostoideSite = (siteConfig: SiteConfig, siteDir: string): PagePreviewResult =>
  renderPagePreview(siteConfig, { route: "/", outDir: siteDir });
