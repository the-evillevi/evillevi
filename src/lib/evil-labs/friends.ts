import type { Group } from "./recolor";

/**
 * The three Affogato friends shown in Spaag's style on the Evil Labs showcase.
 * `groups` are reference colors sampled from the Kenney atlas
 * (public/models/Textures/colormap.png) under each animal's UVs. Every atlas
 * shade snaps to the nearest reference, and the reference's role picks the
 * color from the card's family.
 */
export type EvilFamily =
  | "principal"
  | "terracota"
  | "melocoton"
  | "malva"
  | "lavanda"
  | "menta"
  | "rosa"
  | "azul";

export type SpaagFriend = {
  id: "cat" | "bee" | "fox";
  name: string;
  family: EvilFamily;
  modelPath: string;
  groups: Group[];
};

const model = (id: string) => `/models/animal-${id}.glb`;

export const SPAAG_FRIENDS: SpaagFriend[] = [
  {
    id: "cat",
    name: "Cat",
    family: "terracota",
    modelPath: model("cat"),
    groups: [
      { ref: "#474a57", role: "ink" }, // eyes, nose, inner ears
      { ref: "#70728a", role: "accent" }, // grey coat
      { ref: "#9aa0c0", role: "light" }, // pale coat highlights
      { ref: "#ffc659", role: "cream" }, // yellow eyes
    ],
  },
  {
    id: "bee",
    name: "Bee",
    family: "melocoton",
    modelPath: model("bee"),
    groups: [
      { ref: "#474a58", role: "ink" }, // stripes, legs
      { ref: "#ffc659", role: "accent" }, // yellow stripes
      { ref: "#cfcfe1", role: "light" }, // wings
      { ref: "#f4f4f8", role: "cream" }, // eyes and wing tips
    ],
  },
  {
    id: "fox",
    name: "Fox",
    family: "principal",
    modelPath: model("fox"),
    groups: [
      { ref: "#474a57", role: "ink" }, // eyes, nose
      { ref: "#e68d47", role: "accent" }, // orange coat
      { ref: "#a45d41", role: "shade" }, // paws
      { ref: "#e6b48f", role: "light" }, // muzzle, tail tip
      { ref: "#eeeef5", role: "cream" }, // chest, ears
    ],
  },
];

export const EVIL_FAMILIES: { id: EvilFamily; label: string }[] = [
  { id: "principal", label: "Principal" },
  { id: "terracota", label: "Terracota" },
  { id: "melocoton", label: "Melocotón" },
  { id: "malva", label: "Malva" },
  { id: "lavanda", label: "Lavanda" },
  { id: "menta", label: "Menta" },
  { id: "rosa", label: "Rosa" },
  { id: "azul", label: "Azul" },
];
