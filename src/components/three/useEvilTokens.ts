import { useEffect, useState, type RefObject } from "react";

export type EvilTokens = {
  /** Resolved `rgb(...)` strings for the scope's family and mode. */
  accent: string;
  border: string;
  /** Hard shadow offset in px from `--evil-shadow-card`: 4/4 in light, 0/0 in dark. */
  shadowX: number;
  shadowY: number;
};

const FALLBACK: EvilTokens = { accent: "#F74813", border: "#1A1A1A", shadowX: 4, shadowY: 4 };

/* The Evil Labs color vars hold `light-dark(a, b)`, which getPropertyValue
 * returns unresolved. Setting a var as a probe's `color` makes the browser
 * resolve it against the probe's own color-scheme, so nested
 * data-evil-mode / data-evil-theme scopes resolve correctly. */
function resolveColor(scope: Element, name: string): string {
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(--evil-color-${name})`;
  scope.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

function readTokens(scope: Element): EvilTokens {
  // Custom properties substitute var() at computed time, so this is the
  // literal "4px 4px 0px 0px #1A1A1A" or "0px 0px ...".
  const shadow = getComputedStyle(scope).getPropertyValue("--evil-shadow-card");
  const [x = 0, y = 0] = (shadow.match(/-?[\d.]+px/g) ?? []).map(parseFloat);
  return {
    accent: resolveColor(scope, "accent"),
    border: resolveColor(scope, "border"),
    shadowX: x,
    shadowY: y,
  };
}

/**
 * Reads the Evil Labs tokens that apply inside `scopeRef` and re-reads them
 * when any data-evil-mode / data-evil-theme attribute on the page changes
 * or the OS color scheme flips. Client-only.
 */
export function useEvilTokens(scopeRef: RefObject<Element | null>): EvilTokens {
  const [tokens, setTokens] = useState<EvilTokens>(FALLBACK);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    const update = () =>
      setTokens((prev) => {
        const next = readTokens(scope);
        return prev.accent === next.accent &&
          prev.border === next.border &&
          prev.shadowX === next.shadowX &&
          prev.shadowY === next.shadowY
          ? prev
          : next;
      });
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-evil-mode", "data-evil-theme"],
    });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, [scopeRef]);

  return tokens;
}
