import { resolve } from "node:path";
import type { Page, SiteConfigInput } from "../domain/site-config.js";
import { parseSiteConfig } from "../domain/validate.js";
import { renderDocument } from "./document.js";
import { canonicalJson } from "./html.js";
import { assetHrefForRoute, previewHref, routeToIndexFile } from "./routes.js";
import { preparePageOutput, prepareSiteOutput, RenderPreviewError, replaceOwnedFiles, type PagePreviewResult, type SitePreviewResult } from "./output.js";

export interface RenderPagePreviewOptions { route: string; outDir: string; }
export interface RenderSitePreviewOptions { outDir: string; }
const checkedOptions = (options: { outDir: string } | undefined): string => {
  if (!options || typeof options.outDir !== "string" || options.outDir.length === 0) throw new RenderPreviewError("outDir is required");
  return resolve(options.outDir);
};
const parse = (input: SiteConfigInput | unknown) => {
  const parsed = parseSiteConfig(input); if (!parsed.success) throw new RenderPreviewError("Invalid blueprint configuration", parsed.issues); return parsed.data;
};
const renderOne = (config: ReturnType<typeof parse>, page: Page, outDir: string, siteMode: boolean) => {
  const routes = new Set(config.pages.map((item) => item.route));
  const rendered = renderDocument(config, page, { assetRoot: outDir, assetHref: (path) => siteMode ? assetHrefForRoute(page.route, path) : path, actionHref: (href) => siteMode ? previewHref(page.route, href, routes) : href });
  return { page, rendered, outputFile: routeToIndexFile(page.route), validation: preparePageOutput(page, canonicalJson(config), rendered.html, rendered.decisions, rendered.mediaHrefs).result.validation };
};
export const renderPagePreview = (input: SiteConfigInput | unknown, options: RenderPagePreviewOptions): PagePreviewResult => {
  const config = parse(input); const outDir = checkedOptions(options);
  const page = config.pages.find((candidate) => candidate.route === options.route);
  if (!page) throw new RenderPreviewError("Unknown preview route", [{ path: ["route"], code: "unknown_route", message: "Unknown preview route" }]);
  const rendered = renderDocument(config, page, { assetRoot: outDir, assetHref: (path) => path, actionHref: (href) => href });
  const prepared = preparePageOutput(page, canonicalJson(config), rendered.html, rendered.decisions, rendered.mediaHrefs);
  replaceOwnedFiles(outDir, prepared.bytes); return prepared.result;
};
export const renderSitePreview = (input: SiteConfigInput | unknown, options: RenderSitePreviewOptions): SitePreviewResult => {
  const config = parse(input); const outDir = checkedOptions(options);
  const pages = config.pages.map((page) => renderOne(config, page, outDir, true));
  const prepared = prepareSiteOutput(config, pages.map(({ page, rendered, outputFile, validation }) => ({ page, outputFile, html: rendered.html, decisions: rendered.decisions, mediaHrefs: rendered.mediaHrefs, validation })));
  replaceOwnedFiles(outDir, prepared.bytes); return prepared.result;
};
