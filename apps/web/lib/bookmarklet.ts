function source(home: string, max: number) {
  return `(function (HOME, MAX) {
var COLLECTION = "https://www.wiki-masters.com/collection";
if (!/(^|\\.)wiki-masters\\.com$/.test(location.hostname)) { location.href = COLLECTION; return; }
var previous = window.__wikideckImport;
if (previous && previous.busy()) { previous.show(); return; }
if (previous) previous.remove();

var target = window.open(HOME + "/import", "wikideck-import");
var host = document.createElement("div");
host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;";
var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
root.innerHTML = "<style>" +
".p{width:300px;box-sizing:border-box;padding:18px;border-radius:12px;background:rgba(0,0,0,.88);color:#fff;border:1px solid #4d4d4d;font:500 13px/1.45 system-ui,sans-serif}" +
".h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font:700 10px/1 system-ui,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#999}" +
".x{border:0;background:none;color:#999;font-size:18px;line-height:1;cursor:pointer;padding:0 2px}" +
".t{margin:0 0 10px;font-size:14px;font-weight:700}" +
".b{height:4px;border-radius:99px;background:#333;overflow:hidden}" +
".f{height:100%;width:0;background:#fff;transition:width .4s}" +
".n{margin-top:8px;font-size:12px;color:#c6c6c6}" +
".g{display:block;width:100%;margin-top:14px;padding:10px;border:0;border-radius:99px;background:#343755;color:#fff;font:700 12px/1 system-ui,sans-serif;cursor:pointer}" +
".e .t{color:#ff6b6b}.e .f{background:#ff6b6b}" +
"</style>" +
"<div class='p'><div class='h'><span>Wikideck \\u00b7 Import</span><button class='x' aria-label='Fermer'>\\u00d7</button></div>" +
"<p class='t'>Connexion \\u00e0 Wikideck\\u2026</p><div class='b'><div class='f'></div></div><div class='n'></div>" +
"<button class='g'>Revenir sur Wikideck</button></div>";
document.body.appendChild(host);

var panel = root.querySelector(".p");
var text = root.querySelector(".t");
var fill = root.querySelector(".f");
var note = root.querySelector(".n");
var go = root.querySelector(".g");
function say(message, sub, ratio) {
  text.textContent = message;
  note.textContent = sub || "";
  if (ratio !== undefined) fill.style.width = Math.round(Math.max(0, Math.min(1, ratio)) * 100) + "%";
}
function fmt(n) { return Number(n).toLocaleString("fr-FR"); }
function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

if (!target) {
  panel.className = "p e";
  say("Fen\\u00eatre bloqu\\u00e9e", "Autorise les fen\\u00eatres pop-up de wiki-masters.com, puis relance le favori.", 1);
  go.style.display = "none";
  root.querySelector(".x").onclick = function () { host.remove(); };
  return;
}

var ready = false;
var stopped = false;
function send(message) {
  message.app = "wikideck";
  message.v = 1;
  try { target.postMessage(message, HOME); } catch (e) {}
}
function stop(message, sub, error) {
  if (stopped) return;
  stopped = true;
  if (error) panel.className = "p e";
  say(message, sub, error ? 1 : undefined);
}
window.addEventListener("message", function (e) {
  if (e.origin !== HOME || !e.data || e.data.app !== "wikideck") return;
  if (e.data.type === "ready") ready = true;
  if (e.data.type === "stop") stop("Import arr\\u00eat\\u00e9", "L'import a \\u00e9t\\u00e9 arr\\u00eat\\u00e9 depuis Wikideck.");
});

var hellos = 0;
var hello = setInterval(function () {
  if (ready || stopped) return clearInterval(hello);
  hellos++;
  if (target.closed) { clearInterval(hello); return stop("Onglet Wikideck ferm\\u00e9", "Clique \\u00e0 nouveau sur le favori pour recommencer.", true); }
  if (hellos > 180) { clearInterval(hello); return stop("Wikideck ne r\\u00e9pond pas", "Connecte-toi \\u00e0 Wikideck, puis clique \\u00e0 nouveau sur le favori.", true); }
  send({ type: "hello" });
}, 500);
send({ type: "hello" });

go.onclick = function () { try { target.focus(); } catch (e) {} };
function remove() {
  stopped = true;
  host.remove();
  if (window.__wikideckImport === handle) window.__wikideckImport = null;
}
root.querySelector(".x").onclick = function () {
  if (!stopped) send({ type: "error", reason: "cancelled" });
  remove();
};
var handle = {
  busy: function () { return !stopped; },
  show: function () { if (!host.isConnected) document.body.appendChild(host); go.onclick(); },
  remove: remove
};
window.__wikideckImport = handle;

async function read(url) {
  for (var attempt = 0; attempt < 4; attempt++) {
    var res = null;
    try { res = await fetch(url, { credentials: "include", headers: { accept: "application/json" } }); } catch (e) {}
    if (res && res.status === 401) throw new Error("login");
    if (res && res.ok) {
      try { return await res.json(); } catch (e) { throw new Error("format"); }
    }
    await wait(800 * Math.pow(2, attempt));
  }
  return null;
}
function titleOf(card) {
  var url = String(card.wikipedia_url || "");
  var at = url.indexOf("/wiki/");
  var title = "";
  if (at >= 0) {
    try { title = decodeURIComponent(url.slice(at + 6).split(/[?#]/)[0]).replace(/_/g, " "); } catch (e) { title = ""; }
  }
  return (title || String(card.wikipedia_title || "")).slice(0, 255);
}
async function waitForWikideck() {
  while (!ready && !stopped) await wait(250);
}
async function run() {
  say("Connexion \\u00e0 Wikideck\\u2026", "Ouverture de la page d'import", 0);
  await waitForWikideck();
  if (stopped) return;
  var stats = await read("/api/my-collection/stats?sort=rarity");
  if (stopped) return;
  if (!stats) throw new Error("down");
  if (typeof stats.total !== "number") throw new Error("format");
  var total = stats.total;
  var size = 50;
  var pages = Math.ceil(Math.min(total, MAX) / size);
  var readCards = 0, failed = 0, inRow = 0;
  say("Lecture de ta collection\\u2026", fmt(total) + " cartes sur Wiki-Masters", 0);
  for (var page = 0; page < pages && !stopped; page++) {
    if (target.closed) return stop("Onglet Wikideck ferm\\u00e9", "Clique \\u00e0 nouveau sur le favori pour recommencer.", true);
    var data = await read("/api/my-collection?sort=rarity&page=" + page + "&stats=0");
    if (stopped) return;
    if (!data) { failed++; inRow++; if (inRow >= 5) throw new Error("down"); continue; }
    inRow = 0;
    if (!Array.isArray(data.collection)) throw new Error("format");
    if (page === 0 && data.collection.length) {
      size = data.collection.length;
      pages = Math.ceil(Math.min(total, MAX) / size);
    }
    var items = [];
    for (var i = 0; i < data.collection.length; i++) {
      var card = (data.collection[i] || {}).card || {};
      items.push({ t: titleOf(card), l: String(card.lang || "") });
    }
    if (!items.length) break;
    items = items.slice(0, Math.max(0, MAX - readCards));
    readCards += items.length;
    send({ type: "page", page: page, pages: pages, total: total, items: items });
    say("Lecture de ta collection\\u2026", fmt(readCards) + " / " + fmt(Math.min(total, MAX)) + " cartes lues", (page + 1) / pages);
    if (readCards >= MAX) break;
    await wait(250);
  }
  if (stopped) return;
  send({ type: "done", read: readCards, failed: failed });
  stop("Collection lue !", "Valide l'import sur Wikideck.");
  fill.style.width = "100%";
}
run().catch(function (e) {
  if (stopped) return;
  var reason = e && e.message === "login" ? "login" : e && e.message === "format" ? "format" : "down";
  send({ type: "error", reason: reason });
  if (reason === "login") stop("Connecte-toi \\u00e0 Wiki-Masters", "Puis clique \\u00e0 nouveau sur le favori.", true);
  else if (reason === "format") stop("Lecture impossible", "Wiki-Masters a chang\\u00e9 : l'import ne sait plus lire ta collection.", true);
  else stop("Wiki-Masters ne r\\u00e9pond pas", "R\\u00e9essaie dans un moment : clique \\u00e0 nouveau sur le favori.", true);
});
})(${JSON.stringify(home)}, ${max});void 0`;
}

export function bookmarkletHref(home: string, max = 10_000) {
  return `javascript:${encodeURIComponent(source(home, max))}`;
}
