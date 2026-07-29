import { lstatSync } from "node:fs";
import { resolve, sep } from "node:path";
import type { Asset, MediaReference, MediaTreatment } from "../domain/site-config.js";

export type MediaReason = "selected" | "asset-missing" | "file-missing" | "not-regular-file" | "insufficient-dimensions" | "role-incompatible";
export interface MediaDecision { assetId: string; path?: string; selected: boolean; reason: MediaReason; role?: Asset["role"]; fit?: "cover" | "contain"; cropPolicy?: "allow" | "no-crop"; aspect?: MediaTreatment["aspect"]; frame?: MediaTreatment["frame"]; composition?: MediaTreatment["composition"]; density?: MediaTreatment["density"]; sizeBucket?: MediaTreatment["sizeBucket"]; focalPoint?: { x: number; y: number }; width?: number; height?: number; }

const protectedRole = (role: Asset["role"]): boolean => ["logo", "brand", "product"].includes(role);

export const resolveMedia = (reference: MediaReference, assets: ReadonlyMap<string, Asset>, outDir: string): MediaDecision => {
  const asset = assets.get(reference.assetId);
  if (!asset) return { assetId: reference.assetId, selected: false, reason: "asset-missing" };
  const absolute = resolve(outDir, asset.path);
  const assetRoot = resolve(outDir, "assets") + sep;
  if (!absolute.startsWith(assetRoot)) return { assetId: asset.id, role: asset.role, selected: false, reason: "role-incompatible" };
  try {
    if (!lstatSync(absolute).isFile()) return { assetId: asset.id, role: asset.role, selected: false, reason: "not-regular-file" };
  } catch { return { assetId: asset.id, role: asset.role, selected: false, reason: "file-missing" }; }
  const treatment = reference.treatment ?? {};
  const locked = protectedRole(asset.role);
  const fit = locked ? "contain" : (treatment.fit ?? "cover");
  const cropPolicy = locked ? "no-crop" : (treatment.cropPolicy ?? (fit === "cover" ? "allow" : "no-crop"));
  const composition = locked ? "standalone" : (treatment.composition ?? "inset");
  if (locked && (fit === "cover" || cropPolicy === "allow" || composition === "full-bleed")) return { assetId: asset.id, role: asset.role, selected: false, reason: "role-incompatible" };
  if (fit === "cover" && (asset.width < 129 || asset.height < 129)) return { assetId: asset.id, role: asset.role, selected: false, reason: "insufficient-dimensions" };
  if ((asset.role === "logo" || asset.role === "brand") && (Math.max(asset.width, asset.height) < 96 || Math.min(asset.width, asset.height) < 24)) return { assetId: asset.id, role: asset.role, selected: false, reason: "insufficient-dimensions" };
  return { assetId: asset.id, path: asset.path, selected: true, reason: "selected", role: asset.role, fit, cropPolicy, composition, aspect: treatment.aspect ?? "landscape", frame: treatment.frame ?? "soft", density: treatment.density ?? "comfortable", sizeBucket: treatment.sizeBucket ?? "medium", focalPoint: treatment.focalPoint, width: asset.width, height: asset.height };
};
