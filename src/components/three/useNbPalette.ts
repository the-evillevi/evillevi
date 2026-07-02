import { useEffect, useState } from "react";

export const NB_COLOR_NAMES = [
  "base",
  "surface",
  "text",
  "peach",
  "pink",
  "red",
  "yellow",
  "green",
  "teal",
  "blue",
  "lavender",
  "ink",
] as const;

export type NbColorName = (typeof NB_COLOR_NAMES)[number];

export type NbPalette = Record<NbColorName, string>;

function readPalette(): NbPalette {
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    NB_COLOR_NAMES.map((name) => [name, styles.getPropertyValue(`--nb-${name}`).trim()]),
  ) as NbPalette;
}

/**
 * Reads the site's `--nb-*` design tokens and re-reads them whenever the
 * theme toggle flips `document.documentElement.dataset.theme`.
 * Client-only: consumers must never be server-rendered.
 */
export function useNbPalette(): NbPalette {
  const [palette, setPalette] = useState<NbPalette>(readPalette);

  useEffect(() => {
    const observer = new MutationObserver(() => setPalette(readPalette()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return palette;
}
