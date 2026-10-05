"use client";

import { useEffect, useRef } from "react";

const FORBIDDEN = [
  "Fichier:",
  "File:",
  "Wikipédia:",
  "Wikipedia:",
  "Aide:",
  "Help:",
  "Catégorie:",
  "Category:",
  "Discussion:",
  "Talk:",
  "Utilisateur:",
  "User:",
  "Spécial:",
  "Special:",
  "Portail:",
  "Portal:",
  "Modèle:",
  "Template:",
  "Projet:",
  "WP:",
];

const REMOVED_SECTIONS = ["Liens_externes"];

const headingId = (el: Element) =>
  el.querySelector("[id]")?.getAttribute("id") ??
  el.querySelector("span[id]")?.getAttribute("id") ??
  "";

function clean(container: HTMLElement) {
  container
    .querySelectorAll(
      ".mw-editsection, .navbox, .navbox-inner, .vertical-navbox, .catlinks, .sistersitebox, .bandeau-portail, .ambox, .tmbox, .cmbox, .ombox, .fmbox, .bandeau-container, .bandeau, .audio, .audiolink, audio, video, .gallery, #toc, .toc",
    )
    .forEach((el) => el.remove());

  container.querySelectorAll("div, nav").forEach((el) => {
    const links = el.querySelectorAll("a");
    if (links.length <= 3) return;
    const hrefs = Array.from(links, (a) => a.getAttribute("href") ?? "");
    if (hrefs.every((h) => h.includes("#")) && !hrefs.some((h) => h.includes("cite_"))) el.remove();
  });

  container.querySelectorAll("h2, h3, .mw-heading").forEach((heading) => {
    const id = headingId(heading);
    if (!REMOVED_SECTIONS.some((s) => id === s || id.startsWith(`${s}_`))) return;
    let node: Element | null = heading;
    while (node) {
      const next: Element | null = node.nextElementSibling;
      node.remove();
      node = next;
    }
  });
}

export function ArticleView({
  html,
  onNavigate,
  disabled = false,
}: {
  html: string;
  onNavigate: (title: string) => void;
  disabled?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const navigate = useRef(onNavigate);
  const blocked = useRef(disabled);
  useEffect(() => {
    navigate.current = onNavigate;
    blocked.current = disabled;
  });

  useEffect(() => {
    const root = container.current;
    if (!root || !html) return;
    root.innerHTML = html;
    clean(root);

    root.querySelectorAll<HTMLAnchorElement>("a[href^='/wiki/']").forEach((link) => {
      const path = (link.getAttribute("href") ?? "").replace("/wiki/", "");
      let title = path;
      try {
        title = decodeURIComponent(path);
      } catch {}
      title = title.replace(/_/g, " ");
      if (FORBIDDEN.some((ns) => title.startsWith(ns)) || title.includes("#")) return;
      link.setAttribute("data-wiki-title", title);
      link.classList.add("wp-link");
    });
    root.querySelectorAll("a[href]").forEach((link) => link.removeAttribute("href"));
    root.querySelectorAll("img").forEach((img) => img.setAttribute("loading", "lazy"));

    const onClick = (e: MouseEvent) => {
      if (blocked.current) return;
      const link = (e.target as HTMLElement).closest<HTMLElement>("[data-wiki-title]");
      const title = link?.getAttribute("data-wiki-title");
      if (title) {
        e.preventDefault();
        navigate.current(title);
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html]);

  return <div ref={container} className="wp-content" />;
}
