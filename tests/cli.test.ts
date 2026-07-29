import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { writePng } from "./fixtures.js";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceCli = join(projectRoot, "src", "cli.ts");
const temporary = (): string => mkdtempSync(join(tmpdir(), "evolvera-seed-cli-test-"));
const example = (name: string): unknown => JSON.parse(readFileSync(join(projectRoot, "examples", name), "utf8"));

const runSourceCli = (args: readonly string[], command: "render-page" | "render-site" = "render-page", route = "/") => spawnSync(process.execPath, ["--import", "tsx", sourceCli, command, ...args, ...(command === "render-page" ? ["--route", route] : [])], { cwd: projectRoot, encoding: "utf8" });
const writeConfig = (root: string, name: string, value: unknown): string => {
  const path = join(root, name);
  writeFileSync(path, JSON.stringify(value), "utf8");
  return path;
};

const assertIssue = (result: ReturnType<typeof runSourceCli>, code: string): void => {
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  const issue = JSON.parse(result.stderr);
  assert.equal(issue.error, code);
  assert.equal(typeof issue.message, "string");
};

test("source CLI renders the no-media example into the exact caller directory", () => {
  const root = temporary();
  try {
    const configPath = writeConfig(root, "service.json", example("service-no-media.json"));
    const outDir = join(root, "caller-owned", "site");
    mkdirSync(join(outDir, "assets"), { recursive: true });
    writeFileSync(join(outDir, "assets", "keep.bin"), "caller asset");
    writeFileSync(join(outDir, "unrelated.txt"), "preserve me");

    const result = runSourceCli(["--config", configPath, "--out", outDir]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.deepEqual(JSON.parse(result.stdout), { ok: true, mode: "page", files: ["index.html", "seed-receipt.json", "seed-validation.json"], validation: { valid: true } });
    assert.equal(readFileSync(join(outDir, "assets", "keep.bin"), "utf8"), "caller asset");
    assert.equal(readFileSync(join(outDir, "unrelated.txt"), "utf8"), "preserve me");
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    for (const section of ["hero", "proofRail", "cardGrid", "splitFeature", "metricsBand", "processTimeline", "specGrid", "faq", "cta"]) assert.match(html, new RegExp(`data-blueprint-section="${section}"`));
    for (const target of html.matchAll(/href="#([a-z][a-z0-9-]*)"/g)) assert.match(html, new RegExp(`id="${target[1]}"`));
    assert.doesNotMatch(html, /<img\b/i);
    assert.ok(existsSync(join(outDir, "seed-receipt.json")));
    assert.ok(existsSync(join(outDir, "seed-validation.json")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("source CLI render-site emits every example route and preserves caller files", () => {
  const root = temporary();
  try {
    const configPath = writeConfig(root, "multipage.json", example("multipage-blueprint.json")); const outDir = join(root, "site"); mkdirSync(outDir, { recursive: true }); writeFileSync(join(outDir, "sentinel.txt"), "preserve");
    const result = runSourceCli(["--config", configPath, "--out", outDir], "render-site");
    assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, ""); assert.deepEqual(JSON.parse(result.stdout), { ok: true, mode: "site", files: ["index.html", "empresa/index.html", "servicos/manutencao/index.html", "catalogo/index.html", "contato/index.html", "seed-receipt.json", "seed-validation.json"], validation: { valid: true } });
    for (const route of ["index.html", "empresa/index.html", "servicos/manutencao/index.html", "catalogo/index.html", "contato/index.html"]) assert.equal(existsSync(join(outDir, route)), true); assert.equal(readFileSync(join(outDir, "sentinel.txt"), "utf8"), "preserve"); assert.equal(JSON.parse(readFileSync(join(outDir, "seed-receipt.json"), "utf8")).pages.length, 5); assert.equal(JSON.parse(readFileSync(join(outDir, "seed-validation.json"), "utf8")).valid, true);
    const rerun = runSourceCli(["--config", configPath, "--out", outDir], "render-site"); assert.equal(rerun.status, 0, rerun.stderr); assert.equal(rerun.stdout, result.stdout);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("source CLI renders the catalog example with caller-staged synthetic media", () => {
  const root = temporary();
  try {
    const configPath = writeConfig(root, "catalog.json", example("catalog-local-media.json"));
    const outDir = join(root, "catalog-site");
    mkdirSync(join(outDir, "assets"), { recursive: true });
    writePng(join(outDir, "assets", "catalogo-item.png"), 640, 480);
    writeFileSync(join(outDir, "assets", "keep.txt"), "do not replace");

    const result = runSourceCli(["--config", configPath, "--out", outDir]);
    assert.equal(result.status, 0, result.stderr);
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    assert.match(html, /preset-catalog-driven/);
    assert.match(html, /src="assets\/catalogo-item\.png"/);
    assert.equal(readFileSync(join(outDir, "assets", "keep.txt"), "utf8"), "do not replace");
    assert.equal(JSON.parse(readFileSync(join(outDir, "seed-validation.json"), "utf8")).valid, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("source CLI rejects bad arguments and invalid inputs without replacing finals", () => {
  const root = temporary();
  try {
    const configPath = writeConfig(root, "service.json", example("service-no-media.json"));
    const outDir = join(root, "existing-site");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), "original final");
    writeFileSync(join(outDir, "seed-receipt.json"), "original receipt");

    for (const [args, code] of [
      [["--config", configPath, "--out", outDir, "--out", outDir], "duplicate_flag"],
      [["--config", configPath, "--out", outDir, "--unknown", "value"], "unknown_flag"],
      [["--config", configPath], "missing_flag"],
      [["--config", join(root, "missing.json"), "--out", outDir], "config_read_failed"],
    ] as const) {
      const result = runSourceCli(args);
      assertIssue(result, code);
      assert.equal(readFileSync(join(outDir, "index.html"), "utf8"), "original final");
      assert.equal(readFileSync(join(outDir, "seed-receipt.json"), "utf8"), "original receipt");
      assert.doesNotMatch(result.stderr, new RegExp(outDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    const malformed = join(root, "malformed.json");
    writeFileSync(malformed, "{not json", "utf8");
    assertIssue(runSourceCli(["--config", malformed, "--out", outDir]), "invalid_json");
    assert.equal(readFileSync(join(outDir, "index.html"), "utf8"), "original final");

    const unsafe = example("service-no-media.json") as { pages: Array<{ route: string }> };
    unsafe.pages[0]!.route = "/unsafe/";
    const unsafePath = writeConfig(root, "unsafe.json", unsafe);
    const invalid = runSourceCli(["--config", unsafePath, "--out", outDir]);
    assertIssue(invalid, "invalid_config");
    assert.deepEqual(JSON.parse(invalid.stderr).issues[0].path, ["pages", 0, "route"]);
    assert.equal(readFileSync(join(outDir, "index.html"), "utf8"), "original final");
    assert.equal(existsSync(join(outDir, "seed-validation.json")), false);

    const multiPage = example("service-no-media.json") as { pages: Array<Record<string, unknown>> };
    multiPage.pages.push({ id: "extra", route: "/extra", pageType: "service", title: "Extra", sections: [{ kind: "cta", id: "extra-cta", title: "Extra", body: "Extra", actions: [{ label: "Voltar", href: "/" }] }] });
    const profilePath = writeConfig(root, "multi-page.json", multiPage);
    const selected = runSourceCli(["--config", profilePath, "--out", outDir]);
    assert.equal(selected.status, 0, selected.stderr);
    assert.equal(readFileSync(join(outDir, "index.html"), "utf8").includes("Extra"), false);

    const blockedOut = join(root, "not-a-directory");
    writeFileSync(blockedOut, "caller file", "utf8");
    const writeFailure = runSourceCli(["--config", configPath, "--out", blockedOut]);
    assertIssue(writeFailure, "render_failed");
    assert.equal(readFileSync(blockedOut, "utf8"), "caller file");
    assert.doesNotMatch(writeFailure.stderr, new RegExp(blockedOut.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
