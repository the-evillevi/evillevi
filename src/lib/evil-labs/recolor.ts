/**
 * Recolors Kenney voxel animals into an Evil Labs color family.
 *
 * Each Kenney part samples a baked gradient from the shared palette atlas
 * (dozens of near shades per material). An animal declares a few reference
 * colors ("groups"), each tagged with a role. Every vertex snaps to its
 * nearest group once at load (`classifyVertices`), and its color is then
 * baked from the role colors of the active family (`bakeColors`). Rebaking
 * on a mode or family change is a cheap array pass, with no atlas reads.
 */

export type Rgb = [number, number, number];

export type Role = "ink" | "shade" | "accent" | "light" | "cream";

export type Group = { ref: string; role: Role };

export type RoleColors = Record<Role, Rgb>;

/** Tinta and crema stay fixed in every family and mode. */
export const INK: Rgb = [0x1a, 0x1a, 0x1a];
export const CREAM: Rgb = [0xfe, 0xf1, 0xef];

/** Parses `#rrggbb` or the `rgb(r, g, b)` form getComputedStyle returns. */
export function hexToRgb(color: string): Rgb {
  const value = color.trim();
  if (value.startsWith("#")) {
    const n = parseInt(value.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const parts = value.match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`Unrecognized color: ${color}`);
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

/** Linear blend from `a` toward `b` by `t`, rounded to whole channels. */
export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
}

/** Index of the group whose reference color is closest in RGB space. */
export function nearestGroup(color: Rgb, groups: Group[]): number {
  let best = 0;
  let bestDistance = Infinity;
  groups.forEach((group, index) => {
    const ref = hexToRgb(group.ref);
    const distance = (color[0] - ref[0]) ** 2 + (color[1] - ref[1]) ** 2 + (color[2] - ref[2]) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

/** The five role colors for one family accent (already resolved for the mode). */
export function roleColors(accent: string): RoleColors {
  const base = hexToRgb(accent);
  return {
    ink: INK,
    shade: mix(base, INK, 0.28),
    accent: base,
    light: mix(base, CREAM, 0.55),
    cream: CREAM,
  };
}

/** sRGB channel (0-255) to linear (0-1); three.js expects linear vertex colors. */
export function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** One group index per vertex, from the atlas color under each vertex's UV. */
export function classifyVertices(
  uvs: ArrayLike<number>,
  sample: (u: number, v: number) => Rgb,
  groups: Group[],
): Uint8Array {
  const count = uvs.length / 2;
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i++) out[i] = nearestGroup(sample(uvs[i * 2], uvs[i * 2 + 1]), groups);
  return out;
}

/** Linear RGB triplets per vertex, ready for a `color` BufferAttribute. */
export function bakeColors(
  vertexGroups: Uint8Array,
  groups: Group[],
  colors: RoleColors,
): Float32Array {
  const linear = groups.map((group) => colors[group.role].map(srgbToLinear));
  const out = new Float32Array(vertexGroups.length * 3);
  vertexGroups.forEach((group, i) => out.set(linear[group], i * 3));
  return out;
}
