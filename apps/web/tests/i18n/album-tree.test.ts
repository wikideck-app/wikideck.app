import { describe, expect, it } from "vitest";
import { depthOf, heightOf, moveTargets, pathLabel, subtreeOf } from "@/lib/album-tree";

const albums = [
  { id: "foot", name: "Football", parentId: null },
  { id: "fr", name: "France", parentId: "foot" },
  { id: "psg", name: "PSG", parentId: "fr" },
  { id: "bre", name: "Brésil", parentId: "foot" },
  { id: "tennis", name: "Tennis", parentId: null },
];

describe("arbre des albums", () => {
  it("calcule niveau, hauteur, descendants et chemin", () => {
    expect(depthOf(albums, "psg")).toBe(3);
    expect(heightOf(albums, "foot")).toBe(3);
    expect(subtreeOf(albums, "fr").sort()).toEqual(["fr", "psg"]);
    expect(pathLabel(albums, "psg")).toBe("Football › France › PSG");
  });

  it("n'autorise pas de ranger un album dans lui-même ni dans ses descendants", () => {
    const ids = moveTargets(albums, "fr").map((t) => t.id);
    expect(ids).not.toContain("fr");
    expect(ids).not.toContain("psg");
    expect(ids).toContain("tennis");
  });

  it("refuse de dépasser la profondeur maximale", () => {
    // Football (hauteur 3) sous PSG (niveau 3) ferait 6 niveaux
    expect(moveTargets(albums, "foot").map((t) => t.id)).toEqual(["tennis"]);
    // Tennis (hauteur 1) tient sous PSG (niveau 3 + 1 = 4)
    expect(moveTargets(albums, "tennis").map((t) => t.id)).toContain("psg");
  });
});
