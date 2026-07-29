import { renderSite, type RenderResult, type SiteConfig } from "../src/index.js";

/**
 * Seed-side seam: bostoide supplies the already validated SiteConfig and its
 * existing siteDir (for example, out/gerados/<slug>). No bostoide type or
 * orchestration module is imported here.
 */
export const renderBostoideSite = (siteConfig: SiteConfig, siteDir: string): RenderResult =>
  renderSite(siteConfig, { outDir: siteDir });
