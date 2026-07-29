import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { SiteConfigInput } from "../domain/site-config.js";
import { parseRootHomeConfig } from "../domain/validate.js";
import { renderDocument } from "./document.js";
import { canonicalJson } from "./html.js";
import { prepareOutput, RenderSiteError, replaceOwnedFiles, type RenderResult } from "./output.js";

export interface RenderSiteOptions { outDir: string; }
export const renderSite = (input: SiteConfigInput | unknown, options: RenderSiteOptions): RenderResult => {
  const parsed = parseRootHomeConfig(input); if (!parsed.success) throw new RenderSiteError("Invalid root Home configuration", parsed.issues);
  if (!options || typeof options.outDir !== "string" || options.outDir.length === 0) throw new RenderSiteError("outDir is required");
  const outDir = resolve(options.outDir); const rendered = renderDocument(parsed.data, outDir); const prepared = prepareOutput(rendered.html, canonicalJson(parsed.data), rendered.decisions);
  mkdirSync(outDir, { recursive: true }); replaceOwnedFiles(outDir, prepared.bytes); return prepared.result;
};
