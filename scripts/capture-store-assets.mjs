import { mkdir, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chrome =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const jobs = [
  { file: "store/screenshots.html?shot=1", out: "store/output/screenshots/01-popup-create-alert.png", size: "1280,800" },
  { file: "store/screenshots.html?shot=2", out: "store/output/screenshots/02-click-ticker-overlay.png", size: "1280,800" },
  { file: "store/screenshots.html?shot=3", out: "store/output/screenshots/03-context-menu.png", size: "1280,800" },
  { file: "store/screenshots.html?shot=4", out: "store/output/screenshots/04-easy-setup.png", size: "1280,800" },
  { file: "store/screenshots.html?shot=5", out: "store/output/screenshots/05-privacy-permissions.png", size: "1280,800" },
  { file: "store/promo-small.html", out: "store/output/promo/small-440x280.png", size: "440,280" },
  { file: "store/promo-marquee.html", out: "store/output/promo/marquee-1400x560.png", size: "1400,560" },
];

function run(bin, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(bin, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${bin} exited with ${code}`));
    });
  });
}

await rm(resolve(rootDir, "store/output"), { recursive: true, force: true });
await mkdir(resolve(rootDir, "store/output/screenshots"), { recursive: true });
await mkdir(resolve(rootDir, "store/output/promo"), { recursive: true });

for (const job of jobs) {
  const htmlPath = resolve(rootDir, job.file.split("?")[0]);
  const query = job.file.includes("?") ? `?${job.file.split("?")[1]}` : "";
  const hash = query ? `#shot-${query.replace("?shot=", "")}` : "";
  const url = `file://${htmlPath}${hash}`;
  const out = resolve(rootDir, job.out);
  await run(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${job.size}`,
    `--screenshot=${out}`,
    url,
  ]);
  const [expectedW, expectedH] = job.size.split(",").map(Number);
  const png = await readFile(out);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== expectedW || height !== expectedH) {
    throw new Error(`${job.out} is ${width}x${height}, expected ${expectedW}x${expectedH}`);
  }
  console.log(`wrote ${job.out} (${width}x${height})`);
}
