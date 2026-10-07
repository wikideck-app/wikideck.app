// textes affichés par le favori : traduits par l'application, injectés tels quels dans le script
export const BOOKMARKLET_KEYS = [
  "panelTitle",
  "close",
  "connecting",
  "backToWikideck",
  "popupBlocked",
  "popupBlockedHint",
  "stopped",
  "stoppedHint",
  "tabClosed",
  "tabClosedHint",
  "noAnswer",
  "noAnswerHint",
  "opening",
  "reading",
  "readingTotal",
  "readingProgress",
  "done",
  "doneHint",
  "login",
  "loginHint",
  "format",
  "formatHint",
  "down",
  "downHint",
] as const;

export type BookmarkletStrings = Record<(typeof BOOKMARKLET_KEYS)[number], string>;

function source(home: string, max: number, S: BookmarkletStrings, locale: string) {
  return `(function (HOME, MAX, S, LOCALE) {
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
"<div class='p'><div class='h'><span></span><button class='x'>\\u00d7</button></div>" +
"<p class='t'></p><div class='b'><div class='f'></div></div><div class='n'></div>" +
"<button class='g'></button></div>";
document.body.appendChild(host);

var panel = root.querySelector(".p");
root.querySelector(".h span").textContent = S.panelTitle;
root.querySelector(".x").setAttribute("aria-label", S.close);
root.querySelector(".g").textContent = S.backToWikideck;
var text = root.querySelector(".t");
text.textContent = S.connecting;
var fill = root.querySelector(".f");
var note = root.querySelector(".n");
var go = root.querySelector(".g");
function say(message, sub, ratio) {
  text.textContent = message;
  note.textContent = sub || "";
  if (ratio !== undefined) fill.style.width = Math.round(Math.max(0, Math.min(1, ratio)) * 100) + "%";
}
function fmt(n) { return Number(n).toLocaleString(LOCALE); }
function fill_(template, values) { return template.replace(/\\{(\\w+)\\}/g, function (m, k) { return values[k] !== undefined ? values[k] : m; }); }
function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

if (!target) {
  panel.className = "p e";
  say(S.popupBlocked, S.popupBlockedHint, 1);
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
  if (e.data.type === "stop") stop(S.stopped, S.stoppedHint);
});

var hellos = 0;
var hello = setInterval(function () {
  if (ready || stopped) return clearInterval(hello);
  hellos++;
  if (target.closed) { clearInterval(hello); return stop(S.tabClosed, S.tabClosedHint, true); }
  if (hellos > 180) { clearInterval(hello); return stop(S.noAnswer, S.noAnswerHint, true); }
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
  say(S.connecting, S.opening, 0);
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
  say(S.reading, fill_(S.readingTotal, { total: fmt(total) }), 0);
  for (var page = 0; page < pages && !stopped; page++) {
    if (target.closed) return stop(S.tabClosed, S.tabClosedHint, true);
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
    say(S.reading, fill_(S.readingProgress, { read: fmt(readCards), max: fmt(Math.min(total, MAX)) }), (page + 1) / pages);
    if (readCards >= MAX) break;
    await wait(250);
  }
  if (stopped) return;
  send({ type: "done", read: readCards, failed: failed });
  stop(S.done, S.doneHint);
  fill.style.width = "100%";
}
run().catch(function (e) {
  if (stopped) return;
  var reason = e && e.message === "login" ? "login" : e && e.message === "format" ? "format" : "down";
  send({ type: "error", reason: reason });
  if (reason === "login") stop(S.login, S.loginHint, true);
  else if (reason === "format") stop(S.format, S.formatHint, true);
  else stop(S.down, S.downHint, true);
});
})(${JSON.stringify(home)}, ${max}, ${JSON.stringify(S)}, ${JSON.stringify(locale)});void 0`;
}

export function bookmarkletHref(
  home: string,
  strings: BookmarkletStrings,
  locale: string,
  max = 10_000,
) {
  return `javascript:${encodeURIComponent(source(home, max, strings, locale))}`;
}
