// Builds the Chinkara design tokens from the Figma variables export.
//
//   npm run tokens
//
// Input:  "chinkara Design System.json" (repo root) — the master design system.
// Output: app/chinkara.css     every token as a CSS variable (light on :root,
//                              dark under [data-theme="dark"], mobile type sizes
//                              below 768px)
//         lib/designTokens.ts  resolved colour values for places CSS can't reach
//                              (OG image, web manifest, theme-color)
//
// Variable names come straight from each token's WEB code syntax, so the CSS
// matches what designers see in Figma. Never edit the outputs by hand — change
// the JSON and re-run this script.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(root, "chinkara Design System.json");
const CSS_OUT = resolve(root, "app/chinkara.css");
const TS_OUT = resolve(root, "lib/designTokens.ts");

const WEIGHTS = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Black: 900,
};

const FONT_STACKS = {
  "Google Sans Flex": 'var(--font-google-sans-flex), "Google Sans Flex", ui-sans-serif, system-ui, sans-serif',
  "Google Sans Code": 'var(--font-google-sans-code), "Google Sans Code", ui-monospace, monospace',
};

// ---- load ---------------------------------------------------------------

// tokens[collection][mode][path] = token, where path is "Chinkara/Green/500"
const tokens = {};
for (const entry of JSON.parse(readFileSync(SOURCE, "utf8"))) {
  for (const [collection, { modes }] of Object.entries(entry)) {
    for (const [mode, tree] of Object.entries(modes)) {
      const walk = (node, path) => {
        if (node && node.$value !== undefined) {
          ((tokens[collection] ??= {})[mode] ??= {})[path.join("/")] = node;
          return;
        }
        for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) walk(child, [...path, key]);
      };
      walk(tree, []);
    }
  }
}

const isAlias = (v) => typeof v === "string" && /^\{.+\}$/.test(v);
const cssName = (token) => token.$codeSyntax?.WEB?.match(/var\((--[^)]+)\)/)?.[1];

function lookup(alias, collection, mode) {
  const path = alias.slice(1, -1).split(".").join("/");
  const modes = tokens[collection];
  if (!modes) throw new Error(`Unknown collection "${collection}" for ${alias}`);
  const token = modes[mode]?.[path] ?? Object.values(modes)[0][path];
  if (!token) throw new Error(`Unresolved alias ${alias} in "${collection}"`);
  return token;
}

/** Follows aliases down to a literal value. */
function resolveValue(token, mode) {
  let t = token;
  for (let i = 0; isAlias(t.$value); i++) {
    if (i > 20) throw new Error(`Alias loop at ${token.$value}`);
    t = lookup(t.$value, t.$collectionName, mode);
  }
  return t.$value;
}

// ---- formatting ---------------------------------------------------------

/** How a literal value is written in CSS, decided by the collection and path. */
function format(collection, path, value) {
  if (typeof value === "string" && (value.startsWith("#") || value.startsWith("rgb"))) return value;
  if (path.includes("/Family")) return FONT_STACKS[value] ?? `"${value}", sans-serif`;
  if (path.includes("/Weight")) return String(WEIGHTS[value] ?? value);
  if (collection === "Utility") {
    if (path.startsWith("Opacity/")) return String(value / 100);
    if (path.startsWith("Z-Index/")) return String(value);
    if (path.startsWith("Motion/Duration/")) return `${value}ms`;
    return String(value);
  }
  if (typeof value === "number") return `${round(value)}px`;
  return String(value);
}

const round = (n) => Math.round(n * 1000) / 1000;

/** CSS value for a token: keeps alias chains as var() so primitives stay the single source. */
function cssValue(collection, mode, path, token) {
  // Composite letter spacing is authored as a percentage of the font size
  // (label: 8 → 0.88px at 11px, matching the "0_88" primitive), so it becomes em.
  if (collection === "Typography" && path.endsWith("/Letter Spacing")) {
    return `${round(resolveValue(token, mode) / 100)}em`;
  }
  if (isAlias(token.$value)) {
    const target = lookup(token.$value, token.$collectionName, mode);
    const name = cssName(target);
    if (name) return `var(${name})`;
  }
  return format(collection, path, resolveValue(token, mode));
}

function block(collection, mode) {
  const lines = [];
  for (const [path, token] of Object.entries(tokens[collection][mode])) {
    const name = cssName(token);
    if (!name) continue;
    const note = token.$description ? ` /* ${token.$description.replace(/\*\//g, "")} */` : "";
    lines.push(`  ${name}: ${cssValue(collection, mode, path, token)};${note}`);
  }
  return lines.join("\n");
}

// ---- write CSS ----------------------------------------------------------

const single = ["Unit", "Primitive: Color", "Primitive: Type", "Border", "Spacing", "Layout", "Utility"];
const sections = single.map((c) => `  /* ${c} */\n${block(c, Object.keys(tokens[c])[0])}`);

const css = `/*
 * Chinkara design tokens — GENERATED by scripts/build-design-tokens.mjs
 * from "chinkara Design System.json". Do not edit by hand: change the JSON
 * and run \`npm run tokens\`.
 */

:root {
${sections.join("\n\n")}

  /* Semantic: Color — Light */
${block("Semantic: Color", "Light")}

  /* Typography — Mobile (below 768px) */
${block("Typography", "Mobile")}
}

@media (min-width: 768px) {
  :root {
    /* Typography — Desktop */
${block("Typography", "Desktop").replace(/^ {2}/gm, "    ")}
  }
}

/* Dark mode is opt-in: set data-theme="dark" on any element. */
[data-theme="dark"] {
${block("Semantic: Color", "Dark")}
}
`;
writeFileSync(CSS_OUT, css);

// ---- write TS -----------------------------------------------------------

const colors = {};
for (const collection of ["Primitive: Color", "Semantic: Color"]) {
  const mode = collection === "Semantic: Color" ? "Light" : Object.keys(tokens[collection])[0];
  for (const token of Object.values(tokens[collection][mode])) {
    const name = cssName(token);
    if (name) colors[name.slice(2)] = resolveValue(token, mode);
  }
}

const ts = `// GENERATED by scripts/build-design-tokens.mjs from "chinkara Design System.json".
// Do not edit by hand — change the JSON and run \`npm run tokens\`.
//
// Resolved light-mode colours, keyed by CSS variable name (without "--").
// Only for places CSS variables can't reach (OG images, manifest, theme-color);
// components should use the Tailwind classes or var(--…) instead.

export const colors = ${JSON.stringify(colors, null, 2)} as const;

export type ColorToken = keyof typeof colors;
`;
writeFileSync(TS_OUT, ts);

console.log(`Wrote ${CSS_OUT}\nWrote ${TS_OUT} (${Object.keys(colors).length} colours)`);
