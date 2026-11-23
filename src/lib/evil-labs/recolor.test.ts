import { describe, expect, it } from "vitest";
import {
  INK,
  CREAM,
  bakeColors,
  classifyVertices,
  hexToRgb,
  mix,
  nearestGroup,
  roleColors,
  srgbToLinear,
  type Group,
} from "./recolor";

const fox: Group[] = [
  { ref: "#474a57", role: "ink" },
  { ref: "#e68d47", role: "accent" },
  { ref: "#a45d41", role: "shade" },
  { ref: "#e6b48f", role: "light" },
  { ref: "#eeeef5", role: "cream" },
];

describe("hexToRgb and mix", () => {
  it("parses #rrggbb into 0-255 channels", () => {
    expect(hexToRgb("#F74813")).toEqual([247, 72, 19]);
  });

  it("parses rgb() strings from getComputedStyle", () => {
    expect(hexToRgb("rgb(247, 72, 19)")).toEqual([247, 72, 19]);
  });

  it("mixes two colors linearly in sRGB", () => {
    expect(mix([0, 0, 0], [200, 100, 50], 0.5)).toEqual([100, 50, 25]);
  });
});

describe("nearestGroup", () => {
  it("snaps every shade of a baked gradient to its own group", () => {
    // Fox body gradient, from the darkest to the lightest orange in the atlas.
    for (const hex of ["#df7941", "#e38444", "#ec9e4d"])
      expect(fox[nearestGroup(hexToRgb(hex), fox)].role).toBe("accent");
  });

  it("separates the fox's paws, muzzle, eyes and chest", () => {
    expect(fox[nearestGroup(hexToRgb("#865542"), fox)].role).toBe("shade");
    expect(fox[nearestGroup(hexToRgb("#ebbc99"), fox)].role).toBe("light");
    expect(fox[nearestGroup(hexToRgb("#525564"), fox)].role).toBe("ink");
    expect(fox[nearestGroup(hexToRgb("#c1c1d8"), fox)].role).toBe("cream");
  });
});

describe("roleColors", () => {
  it("keeps tinta and crema fixed and derives shade and light from the accent", () => {
    const colors = roleColors("#F74813");
    expect(colors.ink).toEqual(INK);
    expect(colors.cream).toEqual(CREAM);
    expect(colors.accent).toEqual([247, 72, 19]);
    // Shade: accent mixed 28% toward ink, the celMaterial.ts rule.
    expect(colors.shade).toEqual(mix([247, 72, 19], INK, 0.28));
    // Light: accent mixed 55% toward crema.
    expect(colors.light).toEqual(mix([247, 72, 19], CREAM, 0.55));
  });
});

describe("srgbToLinear", () => {
  it("matches the sRGB transfer curve at both ends and the middle", () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBeCloseTo(1, 6);
    expect(srgbToLinear(128)).toBeCloseTo(0.2158605, 6);
  });
});

describe("classifyVertices and bakeColors", () => {
  // Two vertices on the orange body, one on the eye.
  const uvs = new Float32Array([0.1, 0.1, 0.2, 0.2, 0.9, 0.9]);
  const sample = (u: number) => hexToRgb(u < 0.5 ? "#e28244" : "#3d3f4b");

  it("returns one group index per vertex", () => {
    const groups = classifyVertices(uvs, sample, fox);
    expect(Array.from(groups)).toEqual([1, 1, 0]);
  });

  it("bakes three linear floats per vertex from the role colors", () => {
    const groups = classifyVertices(uvs, sample, fox);
    const colors = bakeColors(groups, fox, roleColors("#F74813"));
    expect(colors).toBeInstanceOf(Float32Array);
    expect(colors.length).toBe(9);
    expect(colors[0]).toBeCloseTo(srgbToLinear(247), 6);
    expect(colors[6]).toBeCloseTo(srgbToLinear(INK[0]), 6);
  });
});
