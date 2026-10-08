import { ALBUM_MAX_DEPTH, type AlbumSummary } from "@wikideck/shared";

type Node = Pick<AlbumSummary, "id" | "name" | "parentId">;

const parentOf = (albums: Node[], id: string) => albums.find((a) => a.id === id)?.parentId ?? null;

/** Niveau d'un album : 1 pour le premier niveau. */
export function depthOf(albums: Node[], id: string) {
  let depth = 0;
  for (let cur: string | null = id; cur; cur = parentOf(albums, cur)) depth++;
  return depth;
}

/** L'album et tous ses descendants. */
export function subtreeOf(albums: Node[], id: string) {
  const ids = [id];
  for (let i = 0; i < ids.length; i++) {
    for (const a of albums) if (a.parentId === ids[i]) ids.push(a.id);
  }
  return ids;
}

/** Niveaux de l'arbre sous un album, lui compris. */
export function heightOf(albums: Node[], id: string): number {
  const kids = albums.filter((a) => a.parentId === id);
  return 1 + Math.max(0, ...kids.map((k) => heightOf(albums, k.id)));
}

/** « Football › France » : le chemin complet d'un album. */
export function pathLabel(albums: Node[], id: string, separator = " › ") {
  const names: string[] = [];
  for (let cur: string | null = id; cur; cur = parentOf(albums, cur)) {
    const node = albums.find((a) => a.id === cur);
    if (!node) break;
    names.unshift(node.name);
  }
  return names.join(separator);
}

/** Albums où `id` peut être rangé : ni lui-même ni un de ses descendants, et sans dépasser la profondeur max. */
export function moveTargets(albums: Node[], id: string) {
  const forbidden = new Set(subtreeOf(albums, id));
  const height = heightOf(albums, id);
  return albums
    .filter((a) => !forbidden.has(a.id) && depthOf(albums, a.id) + height <= ALBUM_MAX_DEPTH)
    .map((a) => ({ id: a.id, label: pathLabel(albums, a.id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
