import { createServer } from "node:http";
import { createReadStream, realpathSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = realpathSync(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function isContained(path) {
  const relativePath = relative(root, path);
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== "..");
}

export const server = createServer((request, response) => {
  if (!request.url || !["GET", "HEAD"].includes(request.method ?? "")) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  if (pathname.includes("\0")) {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  let candidate = join(root, pathname);
  try {
    if (statSync(candidate).isDirectory()) candidate = join(candidate, "index.html");
    candidate = realpathSync(candidate);
    if (!isContained(candidate) || !statSync(candidate).isFile()) throw new Error("Path is not a contained file");
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(candidate)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(candidate).pipe(response);
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  server.listen(port, "127.0.0.1", () => {
    console.log(`Static blueprint: http://127.0.0.1:${server.address().port}`);
  });
}
