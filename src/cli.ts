#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RenderPreviewError, renderPagePreview, renderSitePreview } from "./index.js";

type CliIssue = { path: readonly (string | number)[]; code: string; message: string };
type Arguments = { command: "render-page" | "render-site"; configPath: string; outDir: string; route?: string };
type ArgumentResult = { ok: true; value: Arguments } | { ok: false; code: string; message: string };
const usageMessage = "Expected render-page|render-site --config <file> --out <directory> [--route <route>]";

const parseArguments = (args: readonly string[]): ArgumentResult => {
  const command = args[0];
  if (!command) return { ok: false, code: "missing_command", message: usageMessage };
  if (command !== "render-page" && command !== "render-site") return { ok: false, code: "unknown_command", message: "Unknown command" };
  let configPath: string | undefined; let outDir: string | undefined; let route: string | undefined;
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index]; const value = args[index + 1];
    if (flag !== "--config" && flag !== "--out" && flag !== "--route") return { ok: false, code: "unknown_flag", message: "Unknown flag" };
    if (value === undefined || value.startsWith("--")) return { ok: false, code: "missing_value", message: `Missing value for ${flag}` };
    if (flag === "--config") { if (configPath !== undefined) return { ok: false, code: "duplicate_flag", message: "Duplicate flag: --config" }; configPath = value; }
    else if (flag === "--out") { if (outDir !== undefined) return { ok: false, code: "duplicate_flag", message: "Duplicate flag: --out" }; outDir = value; }
    else { if (route !== undefined) return { ok: false, code: "duplicate_flag", message: "Duplicate flag: --route" }; route = value; }
  }
  if (configPath === undefined || outDir === undefined) return { ok: false, code: "missing_flag", message: usageMessage };
  if (command === "render-site" && route !== undefined) return { ok: false, code: "foreign_flag", message: "--route is only valid for render-page" };
  if (command === "render-page" && route === undefined) return { ok: false, code: "missing_flag", message: "render-page requires --route" };
  return { ok: true, value: { command, configPath, outDir, route } };
};

const printIssue = (code: string, message: string, issues?: readonly CliIssue[]): void => {
  const body: { error: string; message: string; issues?: readonly CliIssue[] } = { error: code, message };
  if (issues && issues.length > 0) body.issues = issues;
  process.stderr.write(`${JSON.stringify(body)}\n`);
};

const run = (args: readonly string[]): number => {
  const parsedArguments = parseArguments(args);
  if (!parsedArguments.ok) {
    printIssue(parsedArguments.code, parsedArguments.message);
    return 2;
  }

  let input: unknown;
  try {
    input = JSON.parse(readFileSync(resolve(parsedArguments.value.configPath), "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      printIssue("invalid_json", "Configuration must be valid JSON");
      return 3;
    }
    printIssue("config_read_failed", "Unable to read configuration file");
    return 3;
  }

  try {
    const result = parsedArguments.value.command === "render-page"
      ? renderPagePreview(input, { outDir: parsedArguments.value.outDir, route: parsedArguments.value.route! })
      : renderSitePreview(input, { outDir: parsedArguments.value.outDir });
    process.stdout.write(`${JSON.stringify({ ok: true, mode: result.mode, files: result.files, validation: { valid: result.validation.valid } })}\n`);
    return 0;
  } catch (error) {
    if (error instanceof RenderPreviewError && error.issues.length > 0 && !error.issues.some((item) => item.code.startsWith("output_") || item.code === "write_failed")) {
      printIssue("invalid_config", error.message, error.issues as readonly CliIssue[]);
      return 4;
    }
    printIssue("render_failed", "Unable to render preview");
    return 5;
  }
};

const exitCode = run(process.argv.slice(2));
if (exitCode !== 0) process.exitCode = exitCode;
