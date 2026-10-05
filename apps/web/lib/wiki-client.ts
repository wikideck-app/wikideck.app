const API = "https://fr.wikipedia.org/w/api.php";

export type WikiArticle = { title: string; html: string };

const cache = new Map<string, Promise<WikiArticle>>();

function download(title: string): Promise<WikiArticle> {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    format: "json",
    origin: "*",
    prop: "text|displaytitle",
    disableeditsection: "1",
    redirects: "1",
  });
  return fetch(`${API}?${params}`)
    .then((res) => {
      if (!res.ok) throw new Error("network");
      return res.json();
    })
    .then((data): WikiArticle => {
      if (data.error) throw new Error(data.error.info ?? "not_found");
      return { html: data.parse.text["*"] as string, title: data.parse.title as string };
    })
    .catch((error) => {
      cache.delete(title);
      throw error;
    });
}

export async function fetchArticle(title: string): Promise<WikiArticle | null> {
  if (!cache.has(title)) cache.set(title, download(title));
  try {
    return await cache.get(title)!;
  } catch {
    return null;
  }
}

export function prefetchArticle(title: string) {
  void fetchArticle(title);
}

export function normalizeTitle(s: string): string {
  let decoded = s;
  try {
    decoded = decodeURIComponent(s);
  } catch {}
  return decoded.replace(/_/g, " ").toLowerCase().trim();
}
