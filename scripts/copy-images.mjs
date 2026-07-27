// Copies committed unit/route/map images into the client build so Vercel serves
// them as static files at /images/* (matching the URLs stored in db.json).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "server", "data", "images");
const DEST = path.join(ROOT, "client", "dist", "images");

fs.mkdirSync(DEST, { recursive: true });

let n = 0;
if (fs.existsSync(SRC)) {
  for (const f of fs.readdirSync(SRC)) {
    if (f === ".gitkeep" || f.startsWith(".")) continue;
    fs.copyFileSync(path.join(SRC, f), path.join(DEST, f));
    n++;
  }
}
console.log(`Copied ${n} image(s) to client/dist/images`);
