import { createHash } from "node:crypto";

export const escapeText = (value: string): string => value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]!);
export const escapeAttribute = (value: string): string => escapeText(value).replace(/["']/g, (character) => character === '"' ? "&quot;" : "&#39;");

export const attributes = (values: Readonly<Record<string, string | number | boolean | undefined>>): string => Object.entries(values)
  .filter(([, value]) => value !== undefined && value !== false)
  .map(([name, value]) => value === true ? ` ${name}` : ` ${name}="${escapeAttribute(String(value))}"`)
  .join("");

export const tag = (name: string, attrs: Readonly<Record<string, string | number | boolean | undefined>>, children = ""): string => `<${name}${attributes(attrs)}>${children}</${name}>`;

const canonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalValue(item)]));
  return value;
};
export const canonicalJson = (value: unknown): string => `${JSON.stringify(canonicalValue(value))}\n`;
export const sha256 = (bytes: string | Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
