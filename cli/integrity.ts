import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * A fingerprint of the problem tree's contents.
 *
 * Every run is copied from `problems/minicalc`, so an edit made there by hand
 * is baked into every future run. This is how that stops being silent.
 * Generated files are excluded so the hash is stable across installs.
 */
export function treeHash(root: string): string {
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === "node_modules" || entry === ".git" || entry.startsWith(".jam-")) continue;
      if (entry === "package-lock.json") continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(root);

  const h = createHash("sha256");
  for (const f of files) {
    h.update(relative(root, f).replace(/\\/g, "/"));
    h.update("\0");
    h.update(readFileSync(f));
    h.update("\0");
  }
  return h.digest("hex").slice(0, 16);
}
