#!/usr/bin/env node
// Validation des traductions : `pnpm lint:i18n` (ajoutez --strict pour que les avertissements échouent).
//
//  1. fichiers de messages : JSON valide, tous importés par messages/<locale>/index.ts
//  2. messages : syntaxe ICU valide (pluriels avec « other », balises riches fermées)
//  3. langues : mêmes clés et mêmes variables que la langue par défaut
//  4. code : toute clé utilisée existe, les variables passées correspondent au message,
//     les clés jamais utilisées sont signalées
//  5. texte en dur : texte français oublié dans le JSX (un « // i18n-ignore » le tolère)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { parse, TYPE } from "@formatjs/icu-messageformat-parser";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const SOURCE_DIRS = ["app", "components", "lib", "i18n"];
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ---------- configuration des locales ----------
const configSource = fs.readFileSync(path.join(root, "i18n/config.ts"), "utf8");
const locales = [...configSource.match(/locales = \[([^\]]*)\]/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const defaultLocale = configSource.match(/defaultLocale: Locale = "([^"]+)"/)[1];

// ---------- 1. chargement des messages ----------
function flatten(value, prefix = "", out = new Map()) {
  for (const [key, v] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof v === "string") out.set(full, v);
    else if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, full, out);
    else fail(`messages: ${full} doit être une chaîne ou un objet`);
  }
  return out;
}

const catalogs = new Map();
for (const locale of locales) {
  const dir = path.join(root, "messages", locale);
  if (!fs.existsSync(dir)) {
    fail(`messages/${locale}/ introuvable`);
    continue;
  }
  const merged = new Map();
  const indexSource = fs.readFileSync(path.join(dir, "index.ts"), "utf8");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const ns = file.slice(0, -5);
    if (!indexSource.includes(`from "./${file}"`)) fail(`messages/${locale}/index.ts n'importe pas ${file}`);
    try {
      flatten(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")), ns, merged);
    } catch (e) {
      fail(`messages/${locale}/${file}: JSON invalide (${e.message})`);
    }
  }
  catalogs.set(locale, merged);
}

// ---------- 2. syntaxe ICU et variables ----------
function argumentsOf(message, onTag) {
  const names = new Set();
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.type === TYPE.tag) {
        onTag?.(n.value);
        walk(n.children);
        continue;
      }
      if (n.type === TYPE.literal || n.type === TYPE.pound) continue;
      names.add(n.value);
      if (n.type === TYPE.plural || n.type === TYPE.select) {
        for (const option of Object.values(n.options)) walk(option.value);
      }
    }
  };
  walk(parse(message, { requiresOtherClause: true }));
  return names;
}

const signatures = new Map(); // locale -> clé -> { vars, tags }
for (const [locale, messages] of catalogs) {
  const sig = new Map();
  for (const [key, message] of messages) {
    try {
      const tags = new Set();
      const vars = argumentsOf(message, (tag) => tags.add(tag));
      sig.set(key, { vars, tags });
    } catch (e) {
      fail(`${locale}:${key}: message ICU invalide (${e.message.split("\n")[0]})`);
    }
  }
  signatures.set(locale, sig);
}

// ---------- 3. cohérence entre langues ----------
const reference = catalogs.get(defaultLocale) ?? new Map();
for (const locale of locales.filter((l) => l !== defaultLocale)) {
  const messages = catalogs.get(locale);
  if (!messages) continue;
  for (const key of reference.keys()) {
    if (!messages.has(key)) fail(`${locale}: clé manquante ${key}`);
  }
  for (const key of messages.keys()) {
    if (!reference.has(key)) warn(`${locale}: clé absente de ${defaultLocale} : ${key}`);
  }
  const base = signatures.get(defaultLocale);
  const own = signatures.get(locale);
  for (const [key, { vars }] of own) {
    const expected = base.get(key)?.vars;
    if (!expected) continue;
    const diff = [...expected].filter((v) => !vars.has(v)).concat([...vars].filter((v) => !expected.has(v)));
    if (diff.length) fail(`${locale}:${key}: variables différentes de ${defaultLocale} (${diff.join(", ")})`);
  }
}

// ---------- 4. usages dans le code ----------
function* sourceFiles(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(rel);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|d)\.tsx?$/.test(entry.name)) yield rel;
  }
}

const TRANSLATOR_HOOKS = new Set(["useTranslations", "getTranslations"]);
const unwrap = (node) => {
  while (node && (ts.isAwaitExpression(node) || ts.isParenthesizedExpression(node) || ts.isAsExpression(node))) {
    node = node.expression;
  }
  return node;
};
const stringOf = (node) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;

function namespaceOf(call) {
  const arg = call.arguments[0];
  if (!arg) return "";
  const literal = stringOf(arg);
  if (literal !== null) return literal;
  if (ts.isObjectLiteralExpression(arg)) {
    const prop = arg.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === "namespace");
    return prop ? stringOf(prop.initializer) : null;
  }
  return null;
}

// clés lues par des données (codes d'erreur de l'API, identifiants du catalogue...) : jamais « inutilisées »
const DATA_DRIVEN = ["apiErrors.", "docs.endpoints.", "docs.sections.", "staff.signals.", "staff.actions."];

const usedKeys = new Set();
const usedPrefixes = []; // { prefix, suffixes }
const usedNamespaces = new Set(); // espaces de noms utilisés avec une clé dynamique
const callsWithValues = [];

function collectKeys(node) {
  // retourne [{ literal } | { prefix, suffix } | { dynamic }]
  const literal = stringOf(node);
  if (literal !== null) return [{ literal }];
  if (ts.isTemplateExpression(node)) {
    return [{ prefix: node.head.text, suffix: node.templateSpans.at(-1).literal.text }];
  }
  if (ts.isConditionalExpression(node)) return [...collectKeys(node.whenTrue), ...collectKeys(node.whenFalse)];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return collectKeys(node.expression);
  return [{ dynamic: true }];
}

for (const dir of SOURCE_DIRS) {
  for (const file of sourceFiles(dir)) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const scopes = new Map(); // fonction -> Map(variable -> espace de noms)
    const scopeOf = (node) => {
      for (let n = node.parent; n; n = n.parent) {
        if (ts.isFunctionLike(n) || ts.isSourceFile(n)) return n;
      }
      return sf;
    };
    const bind = (node, name, ns) => {
      const scope = scopeOf(node);
      if (!scopes.has(scope)) scopes.set(scope, new Map());
      scopes.get(scope).set(name, ns);
    };
    const resolve = (node, name) => {
      for (let n = node.parent; n; n = n.parent) {
        const found = scopes.get(n)?.get(name);
        if (found !== undefined) return found;
      }
      return undefined;
    };

    // alias de type : type Translator = ReturnType<typeof useTranslations<"ns">>
    const aliases = new Map();
    const collectAliases = (node) => {
      if (ts.isTypeAliasDeclaration(node)) {
        const m = node.type.getText().match(/(?:useTranslations|getTranslations)<"([^"]+)">/);
        if (m) aliases.set(node.name.text, m[1]);
      }
      ts.forEachChild(node, collectAliases);
    };
    collectAliases(sf);

    // pass 1 : const t = useTranslations("ns"), paramètres typés par un alias
    const declare = (node) => {
      if (ts.isParameter(node) && node.type) {
        // type Translator = ReturnType<typeof useTranslations<"ns">> (alias ou type en ligne)
        const nsOfType = (type) => {
          if (ts.isTypeReferenceNode(type) && aliases.has(type.typeName.getText())) return aliases.get(type.typeName.getText());
          return type.getText().match(/(?:useTranslations|getTranslations)<"([^"]+)">/)?.[1];
        };
        if (ts.isIdentifier(node.name)) {
          const ns = nsOfType(node.type);
          if (ns !== undefined) bind(node, node.name.text, ns);
        } else if (ts.isObjectBindingPattern(node.name) && ts.isTypeLiteralNode(node.type)) {
          for (const member of node.type.members) {
            if (ts.isPropertySignature(member) && member.type && ts.isIdentifier(member.name)) {
              const ns = nsOfType(member.type);
              if (ns !== undefined) bind(node, member.name.text, ns);
            }
          }
        }
      }
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const call = unwrap(node.initializer);
        if (call && ts.isCallExpression(call) && ts.isIdentifier(call.expression) && TRANSLATOR_HOOKS.has(call.expression.text)) {
          const ns = namespaceOf(call);
          if (ns === null) usedNamespaces.add("*");
          else if (ts.isIdentifier(node.name)) bind(node, node.name.text, ns);
        }
        const all = call && ts.isCallExpression(call) && call.expression.getText() === "Promise.all" ? call.arguments[0] : null;
        if (all && ts.isArrayLiteralExpression(all) && ts.isArrayBindingPattern(node.name)) {
          all.elements.forEach((el, i) => {
            const inner = unwrap(el);
            const binding = node.name.elements[i];
            if (inner && ts.isCallExpression(inner) && ts.isIdentifier(inner.expression) && TRANSLATOR_HOOKS.has(inner.expression.text) && binding && ts.isBindingElement(binding) && ts.isIdentifier(binding.name)) {
              const ns = namespaceOf(inner);
              if (ns !== null) bind(node, binding.name.text, ns);
            }
          });
        }
      }
      ts.forEachChild(node, declare);
    };
    declare(sf);

    // pass 2 : appels t("clé"), t.rich("clé"), t.has("clé")
    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        let callee = node.expression;
        let method = "t";
        if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && resolve(node, callee.expression.text) !== undefined) {
          method = callee.name.text;
          callee = callee.expression;
        }
        if (ts.isIdentifier(callee) && resolve(node, callee.text) !== undefined && node.arguments[0]) {
          const ns = resolve(node, callee.text);
          const qualify = (k) => (ns ? `${ns}.${k}` : k);
          for (const k of collectKeys(node.arguments[0])) {
            if (k.literal !== undefined) {
              const key = qualify(k.literal);
              if (method !== "has") {
                usedKeys.add(key);
                if (!reference.has(key) && !hasPrefix(reference, key)) {
                  fail(`${file}:${lineOf(node)}: clé inconnue « ${key} »`);
                }
              }
              const values = node.arguments[1];
              if (method !== "has" && values && ts.isObjectLiteralExpression(values)) {
                callsWithValues.push({ file, line: lineOf(node), key, rich: method === "rich", values });
              }
            } else if (k.prefix !== undefined) {
              usedPrefixes.push({ prefix: qualify(k.prefix), suffix: k.suffix });
            } else if (method !== "has") {
              usedNamespaces.add(ns);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    // ---------- 5. texte en dur ----------
    if (!file.endsWith("x")) continue;
    const ignoredLines = new Set();
    text.split("\n").forEach((line, i) => {
      if (line.includes("i18n-ignore")) {
        ignoredLines.add(i + 1);
        ignoredLines.add(i + 2);
      }
    });
    const WORD = /\p{L}{2,}/u;
    const ATTRS = new Set(["placeholder", "title", "alt", "aria-label", "aria-description", "label", "description"]);
    const BRAND = /^(Wikideck|Wikipédia|Discord|API|GET|POST|PUT|PATCH|DELETE|CC BY-SA|JSON|FPS)$/;
    const untranslatable = (value) => BRAND.test(value) || /^[A-Z]{2,6}$/.test(value) || value.startsWith("/");
    const report = (node, what, value = "") => {
      if (untranslatable(value.trim())) return;
      const line = lineOf(node);
      if (!ignoredLines.has(line)) warn(`${file}:${line}: texte en dur ${what}`);
    };
    const scan = (node) => {
      if (ts.isJsxText(node)) {
        const value = node.text.replace(/\s+/g, " ").trim();
        if (value && WORD.test(value)) report(node, `« ${value.slice(0, 50)} »`, value);
      } else if (ts.isJsxAttribute(node) && ATTRS.has(node.name.getText())) {
        const init = node.initializer;
        const value = init && (stringOf(init) ?? (ts.isJsxExpression(init) ? stringOf(init.expression) : null));
        if (value && WORD.test(value)) report(node, `${node.name.getText()}="${value.slice(0, 40)}"`, value);
      } else if (ts.isJsxExpression(node) && node.expression && stringOf(node.expression) && ts.isJsxElement(node.parent)) {
        const value = stringOf(node.expression);
        if (WORD.test(value)) report(node, `« ${value.slice(0, 50)} »`, value);
      } else if (ts.isNewExpression(node) && node.expression.getText() === "Notification" && node.arguments?.[0] && stringOf(node.arguments[0])) {
        report(node, "dans new Notification()");
      }
      ts.forEachChild(node, scan);
    };
    scan(sf);
  }
}

function hasPrefix(messages, key) {
  // un espace de noms ou un groupe entier (t("home") pour t.raw) reste valide
  for (const k of messages.keys()) if (k.startsWith(`${key}.`)) return true;
  return false;
}

// variables passées vs variables attendues par le message
const base = signatures.get(defaultLocale) ?? new Map();
for (const { file, line, key, rich, values } of callsWithValues) {
  const expected = base.get(key);
  if (!expected) continue;
  const given = new Set();
  let spread = false;
  for (const p of values.properties) {
    if (ts.isSpreadAssignment(p)) spread = true;
    else if (p.name) given.add(p.name.getText());
  }
  const needed = [...expected.vars].filter((v) => !given.has(v));
  if (!spread && needed.length) fail(`${file}:${line}: « ${key} » attend ${needed.join(", ")}`);
  if (!spread) {
    const extra = [...given].filter((v) => !expected.vars.has(v) && !expected.tags.has(v));
    if (extra.length && !rich) warn(`${file}:${line}: « ${key} » reçoit une variable inutilisée (${extra.join(", ")})`);
  }
}

// clés jamais utilisées
const dynamicAll = usedNamespaces.has("*");
if (!dynamicAll) {
  for (const key of reference.keys()) {
    if (usedKeys.has(key)) continue;
    if ([...usedNamespaces].some((ns) => ns === "" ? true : key.startsWith(`${ns}.`))) continue;
    if (usedPrefixes.some(({ prefix, suffix }) => key.startsWith(prefix) && key.endsWith(suffix))) continue;
    if (DATA_DRIVEN.some((prefix) => key.startsWith(prefix))) continue;
    warn(`${defaultLocale}: clé jamais utilisée ${key}`);
  }
}

// ---------- sortie ----------
for (const w of warnings) console.warn(`avertissement  ${w}`);
for (const e of errors) console.error(`erreur          ${e}`);
const summary = `${reference.size} messages, ${locales.length} langue(s) : ${errors.length} erreur(s), ${warnings.length} avertissement(s)`;
if (errors.length || (strict && warnings.length)) {
  console.error(`\n✗ i18n : ${summary}`);
  process.exit(1);
}
console.log(`✓ i18n : ${summary}`);
