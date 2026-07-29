import { posix } from "node:path";

const routeParts = (route: string): string[] => route === "/" ? [] : route.slice(1).split("/");
export const routeToIndexFile = (route: string): string => [...routeParts(route), "index.html"].join("/");
export const routeDepth = (route: string): number => routeParts(route).length;
export const assetHrefForRoute = (route: string, assetPath: string): string => posix.join(...Array.from({ length: routeDepth(route) }, () => ".."), assetPath) || assetPath;
export const pageHref = (currentRoute: string, targetRoute: string): string => {
  const from = routeToIndexFile(currentRoute);
  const target = routeToIndexFile(targetRoute);
  const relative = posix.relative(posix.dirname(from), target);
  return relative || "index.html";
};
export const previewHref = (currentRoute: string, href: string, routes: ReadonlySet<string>): string => {
  if (!href.startsWith("/") || !routes.has(href)) return href;
  return pageHref(currentRoute, href);
};
