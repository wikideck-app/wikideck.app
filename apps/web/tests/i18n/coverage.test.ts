import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  ANIME_TITLES,
  CATALOG_OWNERSHIP,
  CATALOG_SORTS,
  COLLECTION_SORTS,
  MARKET_SORTS,
  PLAYER_TITLES,
  RANKING_BOARDS,
  RARITIES,
} from "@wikideck/shared";
import { STAFF_DOCS, USER_DOCS } from "@/lib/api-docs";
import { messages } from "./helpers";

// Ces clés viennent de données (catalogue partagé, structure de l'API) : TypeScript ne peut pas
// vérifier qu'elles ont un texte, ces tests le font.
const has = (path: string) =>
  path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages) !==
  undefined;

describe("couverture des textes pilotés par les données", () => {
  it("chaque rareté a un libellé", () => {
    for (const r of RARITIES) expect(has(`cards.rarity.${r.value}`), r.value).toBe(true);
  });

  it("chaque tri, filtre et classement a un libellé", () => {
    for (const s of COLLECTION_SORTS) expect(has(`cards.sorts.${s.value}`), s.value).toBe(true);
    for (const s of CATALOG_SORTS) expect(has(`cards.sorts.${s.value}`), s.value).toBe(true);
    for (const o of CATALOG_OWNERSHIP) expect(has(`cards.ownership.${o.value}`), o.value).toBe(true);
    for (const s of MARKET_SORTS) expect(has(`market.sorts.${s.value}`), s.value).toBe(true);
    for (const b of RANKING_BOARDS) {
      for (const part of ["label", "unit", "hint"]) {
        expect(has(`ranking.boards.${b.value}.${part}`), b.value).toBe(true);
      }
    }
  });

  it("chaque titre de joueur a un nom", () => {
    for (const t of PLAYER_TITLES) expect(has(`titles.names.${t.key}`), t.key).toBe(true);
    for (const t of ANIME_TITLES) expect(has(`titles.animeNames.${t.key}`), t.key).toBe(true);
  });

  it("chaque succès a un nom et une description", () => {
    for (const a of ACHIEVEMENTS) {
      expect(has(`achievements.items.${a.key}.name`), a.key).toBe(true);
      expect(has(`achievements.items.${a.key}.description`), a.key).toBe(true);
    }
  });

  it("chaque route documentée a son texte et celui de ses champs", () => {
    for (const section of [...USER_DOCS, ...STAFF_DOCS]) {
      expect(has(`docs.sections.${section.id}.title`), section.id).toBe(true);
      for (const e of section.endpoints) {
        expect(has(`docs.endpoints.${e.key}.summary`), e.key).toBe(true);
        for (const f of e.query ?? []) expect(has(`docs.endpoints.${e.key}.query.${f}`), `${e.key}.${f}`).toBe(true);
        for (const f of e.body ?? []) expect(has(`docs.endpoints.${e.key}.body.${f}`), `${e.key}.${f}`).toBe(true);
      }
    }
  });
});
