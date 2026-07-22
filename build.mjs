import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

const assets = [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/index.html", "index.html", "text/html; charset=utf-8"],
  ["/css/style.css", "css/style.css", "text/css; charset=utf-8"],
  ["/manifest.json", "manifest.json", "application/manifest+json; charset=utf-8"],
  ["/sw.js", "sw.js", "text/javascript; charset=utf-8"],
  ["/icons/icon.svg", "icons/icon.svg", "image/svg+xml"],
  ["/vendor/chart.umd.js", "vendor/chart.umd.js", "text/javascript; charset=utf-8"],
  ["/js/data.js", "js/data.js", "text/javascript; charset=utf-8"],
  ["/js/utils.js", "js/utils.js", "text/javascript; charset=utf-8"],
  ["/js/api.js", "js/api.js", "text/javascript; charset=utf-8"],
  ["/js/storage.js", "js/storage.js", "text/javascript; charset=utf-8"],
  ["/js/vault.js", "js/vault.js", "text/javascript; charset=utf-8"],
  ["/js/ui.js", "js/ui.js", "text/javascript; charset=utf-8"],
  ["/js/app.js", "js/app.js", "text/javascript; charset=utf-8"],
];

const entries = await Promise.all(
  assets.map(async ([url, file, type]) => [url, [await readFile(file, "utf8"), type]]),
);

const worker = `const assets = new Map(${JSON.stringify(entries)});

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const asset = assets.get(url.pathname);
    if (!asset) return new Response("Not Found", { status: 404 });
    const [body, contentType] = asset;
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": url.pathname === "/" || url.pathname === "/index.html"
          ? "no-cache"
          : "public, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  },
};
`;

await rm("dist", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await writeFile("dist/server/index.js", worker, "utf8");
console.log(`Built ${entries.length} routes.`);
