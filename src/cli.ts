#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { RenderSiteError, renderSite } from "./index.js";

type CliIssue = { path: readonly (string | number)[]; code: string; message: string };
type Arguments = { configPath: string; outDir: string };

type ArgumentResult = { ok: true; value: Arguments } | { ok: false; code: string; message: string };

const usageMessage = "Expected exactly --config <file> --out <directory>";

const parseArguments = (args: readonly string[]): ArgumentResult => {
  let configPath: string | undefined;
  let outDir: string | undefined;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag !== "--config" && flag !== "--out") return { ok: false, code: "unknown_flag", message: `Unknown flag: ${flag ?? ""}` };
    if (value === undefined || value.startsWith("--")) return { ok: false, code: "missing_value", message: `Missing value for ${flag}` };
    if (flag === "--config") {
      if (configPath !== undefined) return { ok: false, code: "duplicate_flag", message: "Duplicate flag: --config" };
      configPath = value;
    } else {
      if (outDir !== undefined) return { ok: false, code: "duplicate_flag", message: "Duplicate flag: --out" };
      outDir = value;
    }
  }
  if (configPath === undefined || outDir === undefined) return { ok: false, code: "missing_flag", message: usageMessage };
  return { ok: true, value: { configPath, outDir } };
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
    const result = renderSite(input, { outDir: parsedArguments.value.outDir });
    process.stdout.write(`${JSON.stringify({ ok: true, files: result.files, validation: { valid: result.validation.valid } })}\n`);
    return 0;
  } catch (error) {
    if (error instanceof RenderSiteError && error.issues.length > 0) {
      printIssue("invalid_config", error.message, error.issues as readonly CliIssue[]);
      return 4;
    }
    printIssue("render_failed", "Unable to render site");
    return 5;
  }
};

const exitCode = run(process.argv.slice(2));
if (exitCode !== 0) process.exitCode = exitCode;
