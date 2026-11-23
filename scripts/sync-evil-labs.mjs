// Copies the Evil Labs design system build into the garden, byte for byte.
// Source: EVIL_LABS_DS (default ~/Repositories/evil-labs-design-system).
// `--check` fails if any copy differs from the source. It needs the source
// folder, so it is a local check, not a CI one.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.env.EVIL_LABS_DS ?? join(homedir(), "Repositories/evil-labs-design-system");
const check = process.argv.includes("--check");

// [source path, destination path relative to the repo]
const files = [
  ["dist/evil-labs.css", "src/styles/evil-labs/dist/evil-labs.css"],
  ["dist/fonts.css", "src/styles/evil-labs/dist/fonts.css"],
  ["dist/themes.json", "src/styles/evil-labs/dist/themes.json"],
  ["fonts/Montserrat-Variable.woff2", "src/styles/evil-labs/fonts/Montserrat-Variable.woff2"],
  ["fonts/Montserrat-OFL.txt", "src/styles/evil-labs/fonts/Montserrat-OFL.txt"],
  ["fonts/Lobster-Regular.woff2", "src/styles/evil-labs/fonts/Lobster-Regular.woff2"],
  ["fonts/Lobster-OFL.txt", "src/styles/evil-labs/fonts/Lobster-OFL.txt"],
  ["assets/mascot-inline.svg", "src/assets/evil-labs/mascot-inline.svg"],
  ["assets/wordmark-inline.svg", "src/assets/evil-labs/wordmark-inline.svg"],
];

const stale = [];
for (const [from, to] of files) {
  const bytes = await readFile(join(source, from));
  const target = join(root, to);
  if (check) {
    const current = await readFile(target).catch(() => null);
    if (!current || !current.equals(bytes)) stale.push(to);
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
}

if (stale.length) {
  console.error(`Stale Evil Labs copies (run pnpm evil:sync):\n  ${stale.join("\n  ")}`);
  process.exit(1);
}
console.log(
  check
    ? "Evil Labs copies match the design system."
    : `Copied ${files.length} files from ${source}.`,
);
