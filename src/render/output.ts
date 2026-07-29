import { closeSync, openSync, renameSync, unlink, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SiteConfigIssue } from "../domain/validate.js";
import { canonicalJson, sha256 } from "./html.js";
import type { MediaDecision } from "./media.js";

export interface RenderReceipt { schemaVersion: "1"; preset: string; htmlSha256: string; configSha256: string; decisions: MediaDecision[]; warnings: { assetId: string; reason: string }[]; }
export interface RenderValidation { schemaVersion: "1"; valid: boolean; htmlBytes: number; htmlSha256: string; checks: Record<string, boolean>; }
export interface RenderResult { files: readonly ["index.html", "seed-receipt.json", "seed-validation.json"]; receipt: RenderReceipt; validation: RenderValidation; }
export class RenderSiteError extends Error { constructor(message: string, public readonly issues: readonly SiteConfigIssue[] = []) { super(message); this.name = "RenderSiteError"; } }

export const validateRenderedHtml = (html: string, decisions: readonly MediaDecision[]): RenderValidation => {
  const checks = {
    doctype: /^<!doctype html>/i.test(html), complete: /<\/html>\s*$/.test(html), minimumBytes: Buffer.byteLength(html) >= 3000,
    ptBr: /<html lang="pt-BR">/.test(html), inlineCss: /<style>/.test(html), main: /<main\b/.test(html), focusVisible: /focus-visible/.test(html), reducedMotion: /prefers-reduced-motion/.test(html),
    noInlineSvg: !/<svg\b/i.test(html), noPageScript: !/<script\b/i.test(html), noLazyAsync: !/loading="lazy"|decoding="async"/i.test(html), localSelectedMedia: decisions.filter((item) => item.selected).every((item) => !!item.path && html.includes(`src="${item.path}"`)),
  };
  return { schemaVersion: "1", valid: Object.values(checks).every(Boolean), htmlBytes: Buffer.byteLength(html), htmlSha256: sha256(html), checks };
};

export const prepareOutput = (html: string, configCanonical: string, decisions: readonly MediaDecision[]): { result: RenderResult; bytes: Record<string, string> } => {
  const validation = validateRenderedHtml(html, decisions); if (!validation.valid) throw new RenderSiteError("Rendered Home failed independent invariants");
  const receipt: RenderReceipt = { schemaVersion: "1", preset: JSON.parse(configCanonical).preset as string, htmlSha256: validation.htmlSha256, configSha256: sha256(configCanonical), decisions: [...decisions], warnings: decisions.filter((item) => !item.selected).map((item) => ({ assetId: item.assetId, reason: item.reason })) };
  const bytes = { "index.html": html, "seed-receipt.json": canonicalJson(receipt), "seed-validation.json": canonicalJson(validation) };
  return { result: { files: ["index.html", "seed-receipt.json", "seed-validation.json"], receipt, validation }, bytes };
};

export const replaceOwnedFiles = (outDir: string, bytes: Readonly<Record<string, string>>): void => {
  const prepared: { final: string; temp: string }[] = [];
  try {
    for (const [name, content] of Object.entries(bytes)) {
      const final = join(outDir, name); const temp = join(outDir, `.${name}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`); const descriptor = openSync(temp, "wx");
      try { writeFileSync(descriptor, content, "utf8"); } finally { closeSync(descriptor); }
      prepared.push({ final, temp });
    }
    for (const item of prepared) renameSync(item.temp, item.final);
  } catch (error) { for (const item of prepared) { unlink(item.temp, () => {}) } throw error; }
};
