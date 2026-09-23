import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve("dist");
const required = [
  "manifest.json",
  "background.js",
  "content.js",
  "content.css",
  "popup.html",
  "popup.js",
  "options.html",
  "options.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
  "brand/stockalert-logo-dark.png",
];

for (const file of required) {
  const path = resolve(dist, file);
  if (!existsSync(path)) {
    throw new Error(`Missing ${file} in dist/`);
  }
}

const content = readFileSync(resolve(dist, "content.js"), "utf8");
if (/^import\s/m.test(content) || /^export\s/m.test(content)) {
  throw new Error("dist/content.js must stay self-contained without ESM imports");
}

const popup = readFileSync(resolve(dist, "popup.html"), "utf8");
if (popup.includes('src="/popup.js"') || popup.includes('href="/assets/')) {
  throw new Error("dist/popup.html must use relative asset paths for Chrome extension pages");
}

const manifest = JSON.parse(readFileSync(resolve(dist, "manifest.json"), "utf8"));
if (manifest.content_scripts) {
  throw new Error("dist/manifest.json must not register content_scripts");
}
if (manifest.host_permissions.join() !== "https://api.stockalert.pro/*") {
  throw new Error("dist/manifest.json host_permissions drifted");
}
if (JSON.stringify(manifest.optional_host_permissions) !== JSON.stringify(["http://*/*", "https://*/*"])) {
  throw new Error("dist/manifest.json optional_host_permissions drifted");
}

console.log("dist package looks store-ready");
