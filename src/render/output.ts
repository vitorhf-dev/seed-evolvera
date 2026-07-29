import { closeSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { Page, SiteConfig } from "../domain/site-config.js";
import type { SiteConfigIssue } from "../domain/validate.js";
import { canonicalJson, sha256 } from "./html.js";
import type { MediaDecision } from "./media.js";

export interface RenderReceipt { schemaVersion: "1"; mode: "page"; preset: string; pageId: string; route: string; pageType: Page["pageType"]; htmlSha256: string; configSha256: string; decisions: MediaDecision[]; warnings: { assetId: string; reason: string }[]; }
export interface RenderValidation { schemaVersion: "1"; mode: "page"; valid: boolean; htmlBytes: number; htmlSha256: string; checks: Record<string, boolean>; }
export interface PagePreviewResult { mode: "page"; files: readonly ["index.html", "seed-receipt.json", "seed-validation.json"]; receipt: RenderReceipt; validation: RenderValidation; }
export interface SitePageReceipt { pageId: string; route: string; pageType: Page["pageType"]; outputFile: string; htmlSha256: string; decisions: MediaDecision[]; warnings: { assetId: string; reason: string }[]; }
export interface SitePreviewReceipt { schemaVersion: "1"; mode: "site"; preset: string; configSha256: string; pages: SitePageReceipt[]; }
export interface SitePreviewValidation { schemaVersion: "1"; mode: "site"; valid: boolean; allPagesValid: boolean; uniqueOutputFiles: boolean; pages: { route: string; outputFile: string; validation: RenderValidation }[]; }
export interface SitePreviewResult { mode: "site"; files: readonly string[]; receipt: SitePreviewReceipt; validation: SitePreviewValidation; }
export class RenderPreviewError extends Error { constructor(message: string, public readonly issues: readonly SiteConfigIssue[] = []) { super(message); this.name = "RenderPreviewError"; } }

export const validateRenderedHtml = (html: string, decisions: readonly MediaDecision[], mediaHrefs?: readonly string[]): RenderValidation => {
  const selectedPaths = mediaHrefs ?? decisions.filter((item) => item.selected).map((item) => item.path).filter((path): path is string => !!path);
  const checks = {
    doctype: /^<!doctype html>/i.test(html), complete: /<\/html>\s*$/.test(html), minimumBytes: Buffer.byteLength(html) >= 3000,
    ptBr: /<html lang="pt-BR">/.test(html), inlineCss: /<style>/.test(html), main: /<main\b/.test(html), focusVisible: /focus-visible/.test(html), reducedMotion: /prefers-reduced-motion/.test(html),
    noInlineSvg: !/<svg\b/i.test(html), noPageScript: !/<script\b/i.test(html), noLazyAsync: !/loading="lazy"|decoding="async"/i.test(html), localSelectedMedia: selectedPaths.every((path) => html.includes(`src="${path}"`)),
  };
  return { schemaVersion: "1", mode: "page", valid: Object.values(checks).every(Boolean), htmlBytes: Buffer.byteLength(html), htmlSha256: sha256(html), checks };
};

const issue = (path: string, code: string, message: string): RenderPreviewError => new RenderPreviewError(message, [{ path: [path], code, message }]);
const contained = (root: string, name: string): string => {
  if (!name || isAbsolute(name) || name.includes("\\")) throw issue(name || "files", "unsafe_output_path", "Output path is not contained");
  const output = resolve(root, name); const relativePath = relative(resolve(root), output);
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) throw issue(name, "unsafe_output_path", "Output path is not contained");
  return output;
};
const inspectDirectory = (target: string, root: string, missing: Set<string>): void => {
  const systemRoot = resolve(target).slice(0, resolve(target).indexOf(sep) + 1);
  const parts = relative(systemRoot, resolve(target)).split(sep).filter(Boolean);
  let current = systemRoot;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    let stat;
    try { stat = lstatSync(current); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        let missingCurrent = current;
        missing.add(missingCurrent);
        for (const remaining of parts.slice(index + 1)) { missingCurrent = join(missingCurrent, remaining); missing.add(missingCurrent); }
        return;
      }
      throw issue(relative(root, current) || "outDir", "output_parent_conflict", "Unable to inspect output parent");
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw issue(relative(root, current) || "outDir", "output_parent_conflict", "Output parent is not a directory");
  }
};

interface PreflightEntry { name: string; final: string; existed: boolean; previous?: Buffer; }
interface PreflightPlan { root: string; entries: PreflightEntry[]; missingDirectories: string[]; }
const preflight = (outDir: string, names: readonly string[]): PreflightPlan => {
  const root = resolve(outDir); const finals = names.map((name) => contained(root, name)); const missing = new Set<string>();
  inspectDirectory(root, root, missing);
  for (const final of finals) inspectDirectory(dirname(final), root, missing);
  const entries = finals.map((final, index) => {
    try {
      const stat = lstatSync(final);
      if (stat.isSymbolicLink() || !stat.isFile()) throw issue(names[index]!, "output_target_conflict", "Output target is not a regular file");
      return { name: names[index]!, final, existed: true, previous: readFileSync(final) };
    } catch (error) {
      if (error instanceof RenderPreviewError) throw error;
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { name: names[index]!, final, existed: false };
      throw issue(names[index]!, "output_target_conflict", "Unable to inspect output target");
    }
  });
  return { root, entries, missingDirectories: [...missing].sort((left, right) => left.split(sep).length - right.split(sep).length) };
};

const createTempFile = (directory: string, contents: string | Buffer): string => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const path = join(directory, `.seed-preview-${process.pid}-${randomUUID()}.tmp`); let descriptor: number | undefined;
    try {
      descriptor = openSync(path, "wx");
      try { writeFileSync(descriptor, contents); } finally { closeSync(descriptor); }
      return path;
    } catch (error) {
      if (descriptor !== undefined) { try { unlinkSync(path); } catch { /* cleanup only this transaction file */ } }
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error("Unable to allocate transaction file");
};

export const preparePageOutput = (page: Page, configCanonical: string, html: string, decisions: readonly MediaDecision[], mediaHrefs: readonly string[]): { result: PagePreviewResult; bytes: Record<string, string> } => {
  const validation = validateRenderedHtml(html, decisions, mediaHrefs); if (!validation.valid) throw new RenderPreviewError("Rendered preview failed independent invariants");
  const parsed = JSON.parse(configCanonical) as SiteConfig; const receipt: RenderReceipt = { schemaVersion: "1", mode: "page", preset: parsed.preset, pageId: page.id, route: page.route, pageType: page.pageType, htmlSha256: validation.htmlSha256, configSha256: sha256(configCanonical), decisions: [...decisions], warnings: decisions.filter((item) => !item.selected).map((item) => ({ assetId: item.assetId, reason: item.reason })) };
  const bytes = { "index.html": html, "seed-receipt.json": canonicalJson(receipt), "seed-validation.json": canonicalJson(validation) };
  return { result: { mode: "page", files: ["index.html", "seed-receipt.json", "seed-validation.json"], receipt, validation }, bytes };
};

export const prepareSiteOutput = (config: SiteConfig, pages: { page: Page; outputFile: string; html: string; decisions: readonly MediaDecision[]; mediaHrefs: readonly string[]; validation: RenderValidation }[]): { result: SitePreviewResult; bytes: Record<string, string> } => {
  const outputFiles = pages.map((item) => item.outputFile); const validations = pages.map((item) => item.validation); const uniqueOutputFiles = new Set(outputFiles).size === outputFiles.length;
  if (!uniqueOutputFiles || validations.some((item) => !item.valid)) throw new RenderPreviewError("Rendered site failed independent invariants");
  const configCanonical = canonicalJson(config); const receiptPages = pages.map(({ page, outputFile, decisions }, index) => ({ pageId: page.id, route: page.route, pageType: page.pageType, outputFile, htmlSha256: validations[index]!.htmlSha256, decisions: [...decisions], warnings: decisions.filter((item) => !item.selected).map((item) => ({ assetId: item.assetId, reason: item.reason })) }));
  const receipt: SitePreviewReceipt = { schemaVersion: "1", mode: "site", preset: config.preset, configSha256: sha256(configCanonical), pages: receiptPages };
  const validation: SitePreviewValidation = { schemaVersion: "1", mode: "site", valid: true, allPagesValid: validations.every((item) => item.valid), uniqueOutputFiles, pages: pages.map(({ page, outputFile, validation: pageValidation }) => ({ route: page.route, outputFile, validation: pageValidation })) };
  const bytes: Record<string, string> = {}; pages.forEach((item) => { bytes[item.outputFile] = item.html; }); bytes["seed-receipt.json"] = canonicalJson(receipt); bytes["seed-validation.json"] = canonicalJson(validation);
  return { result: { mode: "site", files: [...outputFiles, "seed-receipt.json", "seed-validation.json"], receipt, validation }, bytes };
};

export const replaceOwnedFiles = (outDir: string, bytes: Readonly<Record<string, string>>): void => {
  const plan = preflight(outDir, Object.keys(bytes));
  const createdDirectories: string[] = []; const staged: { entry: PreflightEntry; temp: string; committed: boolean }[] = [];
  const cleanupTemps = (): void => { for (const item of staged) { try { unlinkSync(item.temp); } catch { /* already renamed or absent */ } } };
  const removeCreatedDirectories = (): void => { for (const directory of [...createdDirectories].reverse()) { try { rmdirSync(directory); } catch { /* never remove caller content */ } } };
  try {
    for (const directory of plan.missingDirectories) { mkdirSync(directory); createdDirectories.push(directory); }
    for (const entry of plan.entries) staged.push({ entry, temp: createTempFile(dirname(entry.final), bytes[entry.name]!), committed: false });
    for (const item of staged) { renameSync(item.temp, item.entry.final); item.committed = true; }
  } catch (error) {
    let rollbackError: unknown;
    for (const item of [...staged].reverse()) {
      try {
        if (!item.committed) continue;
        if (item.entry.existed) {
          let restoreTemp: string | undefined;
          try { restoreTemp = createTempFile(dirname(item.entry.final), item.entry.previous!); renameSync(restoreTemp, item.entry.final); restoreTemp = undefined; }
          finally { if (restoreTemp) { try { unlinkSync(restoreTemp); } catch { /* cleanup only this transaction file */ } } }
        } else unlinkSync(item.entry.final);
      } catch (rollbackFailure) { rollbackError ??= rollbackFailure; }
    }
    cleanupTemps(); removeCreatedDirectories();
    if (rollbackError) throw new RenderPreviewError("Unable to rollback preview files", [{ path: ["files"], code: "rollback_failed", message: "Unable to rollback preview files" }]);
    throw new RenderPreviewError("Unable to replace preview files", [{ path: ["files"], code: "write_failed", message: "Unable to replace preview files" }]);
  }
  cleanupTemps();
};
