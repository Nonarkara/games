/**
 * Fail when a Tailwind utility used in js/ or index.html has no rule in
 * css/tailwind.static.css. The static sheet is committed (see
 * tailwind.config.cjs); a class typed into a game does nothing until that
 * sheet is regenerated and index.html's ?v= is bumped.
 *
 * Class values are read from class="…" / className="…" (and the same with
 * single quotes or backticks). A separate pass keeps string literals that
 * are nothing but class tokens, so `ring-2` in `'ring-2 ring-amber-400'`
 * still counts. Tokens are trimmed of quotes and `>`.
 *
 * Hook names (pb-cell, ttl-opt) and interpolation residue (w.id) are not
 * utilities and are not required to have a Tailwind rule.
 *
 * The self-test deletes the .h-full and .ring-2 rules from a copy of the
 * sheet and expects this check to fail. A substring search used to stay
 * green for those outage classes.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const VARIANTS = /^(?:hover|focus|focus-visible|active|disabled|sm|md|lg|xl|2xl|last|first|odd|even|group-hover|placeholder|dark):/;
const TOKEN = /^(?:[a-z0-9-]+:)*!?[a-z][a-z0-9./[\]_%#-]*$/;
const COLORS = '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const COLOR = new RegExp(`^${COLORS}-(?:50|100|200|300|400|500|600|700|800|900|950)(?:/\\d+)?$`);

const ROOTS = new Set(`
  container block inline inline-block inline-flex inline-grid flex grid hidden contents
  static fixed absolute relative sticky visible invisible collapse
  flex-row flex-col flex-wrap flex-nowrap flex-1 flex-auto flex-initial flex-none shrink grow
  items-start items-end items-center items-baseline items-stretch
  justify-start justify-end justify-center justify-between justify-around justify-evenly
  self-auto self-start self-end self-center self-stretch
  overflow-auto overflow-hidden overflow-clip overflow-visible overflow-scroll
  overflow-x-auto overflow-y-auto overflow-x-hidden overflow-y-hidden
  truncate whitespace-nowrap whitespace-normal break-words break-all
  text-left text-center text-right uppercase lowercase capitalize underline line-through
  font-sans font-mono font-normal font-medium font-semibold font-bold font-extrabold font-black
  select-none select-text pointer-events-none pointer-events-auto cursor-pointer cursor-default cursor-crosshair
  transition transition-all transition-colors animate-pulse transform
  border border-0 border-2 border-4 border-8 border-t border-b border-dashed border-solid
  shadow shadow-sm shadow-md shadow-lg shadow-inner shadow-none
  w-full w-auto w-screen w-min w-max w-fit h-full h-auto h-screen h-min h-max h-fit
  min-h-0 min-h-full min-h-screen min-w-0 min-w-full max-w-none max-h-full
  m-auto mx-auto my-auto ml-auto mr-auto mt-auto mb-auto
  leading-none leading-tight leading-snug leading-normal leading-relaxed leading-loose
  tracking-tight tracking-normal tracking-wide tracking-wider tracking-widest
  z-0 z-10 z-20 z-30 z-40 z-50 z-auto
  top-0 right-0 bottom-0 left-0 inset-0
  ring ring-inset filter blur invert
`.split(/\s+/).filter(Boolean));

const PREFIXES = [
  'aspect-', 'w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-',
  'p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-',
  'm-', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-',
  'gap-', 'gap-x-', 'gap-y-', 'space-x-', 'space-y-',
  'grid-cols-', 'grid-rows-', 'col-span-', 'row-span-',
  'text-', 'font-', 'leading-', 'tracking-',
  'bg-', 'border-', 'ring-', 'shadow-', 'opacity-',
  'z-', 'top-', 'right-', 'bottom-', 'left-', 'inset-',
  'basis-', 'order-', 'duration-', 'rounded-'
];

function stripInterp(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '$' && src[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < src.length && depth) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') depth--;
        i++;
      }
      i--;
      out += ' ';
    } else out += src[i];
  }
  return out;
}

function baseOf(tok) {
  let t = tok;
  while (VARIANTS.test(t)) t = t.replace(VARIANTS, '');
  if (t.startsWith('!')) t = t.slice(1);
  return t;
}

function isUtility(tok) {
  if (!TOKEN.test(tok) || tok.includes('--')) return false;
  const base = baseOf(tok);
  if (!base || ROOTS.has(base)) return Boolean(base);
  const prefix = PREFIXES.find(p => base.startsWith(p) && base.length > p.length);
  if (!prefix) return false;
  const rest = base.slice(prefix.length);
  if (/^(?:px|\d+(?:\.\d+)?|full|auto|screen|min|max|fit|none|\[.*\])$/.test(rest)) return true;
  if (/^(?:black|white|transparent|current)$/.test(rest)) return true;
  if (COLOR.test(rest)) return true;
  if (/^(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[.*\])$/.test(rest)) return true;
  if (/^(?:thin|light|normal|medium|semibold|bold|extrabold|black)$/.test(rest)) return true;
  if (/^(?:none|tight|snug|normal|relaxed|loose|\[.*\])$/.test(rest)) return true;
  if (/^(?:tighter|tight|normal|wide|wider|widest|\[.*\])$/.test(rest)) return true;
  if (/^(?:sm|md|lg|xl|2xl|inner|none)$/.test(rest)) return true;
  if (/^\[[^\]]+\]$/.test(rest)) return true;
  if (/^\d+$/.test(rest) && /^(?:grid-cols-|grid-rows-|col-span-|z-|ring-|w-|h-|min-|max-|p|m|gap|space|opacity-)/.test(base)) return true;
  return false;
}

/** Selector boundary, so .h-full does not match inside a longer name. */
function inCss(cssText, tok) {
  const literal = tok.replace(/[./:[\]%#!(),_]/g, ch => '\\' + ch);
  const pattern = literal.replace(/[\\^$*+?.()|[\]{}]/g, ch => '\\' + ch);
  return new RegExp(`(?<![A-Za-z0-9_-])\\.${pattern}(?![A-Za-z0-9_-])`).test(cssText);
}

function cleanToken(raw) {
  return raw.trim().replace(/^["'`>]+|["'`>;,]+$/g, '');
}

function tokensOf(value) {
  return stripInterp(value).split(/\s+/).map(cleanToken).filter(Boolean);
}

/**
 * Read one quoted string starting at src[start] (the quote character).
 * Template ${...} blocks are returned as a space; their contents are scanned
 * separately by the caller.
 */
function readQuoted(src, start) {
  const q = src[start];
  let i = start + 1;
  let body = '';
  const holes = [];
  while (i < src.length) {
    if (src[i] === '\\') {
      body += src[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (q === '`' && src[i] === '$' && src[i + 1] === '{') {
      const hole = readBalanced(src, i + 1);
      holes.push(hole.text);
      body += ' ';
      i = hole.next;
      continue;
    }
    if (src[i] === q) return { body, next: i + 1, holes };
    body += src[i];
    i++;
  }
  return { body, next: src.length, holes };
}

function readBalanced(src, braceAt) {
  let i = braceAt + 1;
  let depth = 1;
  const start = i;
  while (i < src.length && depth) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      i = readQuoted(src, i).next;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth) i++;
  }
  return { text: src.slice(start, Math.max(start, i - (depth ? 0 : 0))), next: Math.min(src.length, i + (src[i] === '}' ? 1 : 0)) };
}

function skipLineComment(src, i) {
  const nl = src.indexOf('\n', i);
  return nl < 0 ? src.length : nl + 1;
}

function skipBlockComment(src, i) {
  const end = src.indexOf('*/', i + 2);
  return end < 0 ? src.length : end + 2;
}

/** Pull class / className values straight out of the source text. */
function classValues(src) {
  const values = [];
  const re = /\bclass(?:Name)?\b\s*[:=]?\s*/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    while (src[i] === ' ' || src[i] === '\n' || src[i] === '\t' || src[i] === '\r') i++;
    if (src[i] === '{') {
      i++;
      while (src[i] === ' ' || src[i] === '\n' || src[i] === '\t' || src[i] === '\r') i++;
    }
    const q = src[i];
    if (q !== '"' && q !== "'" && q !== '`') continue;
    const read = readQuoted(src, i);
    values.push(read.body);
    for (const hole of read.holes) values.push(...classValues(hole));
    re.lastIndex = read.next;
  }
  return values;
}

/**
 * String literals whose entire content is a class list. These are the
 * fragments interpolated into class="…", such as 'ring-2 ring-amber-400'.
 */
function classListLiterals(src) {
  const lists = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = skipLineComment(src, i); continue; }
    if (c === '/' && src[i + 1] === '*') { i = skipBlockComment(src, i); continue; }
    if (c === '"' || c === "'" || c === '`') {
      const read = readQuoted(src, i);
      const flat = stripInterp(read.body).trim();
      const parts = flat.split(/\s+/).filter(Boolean).map(cleanToken);
      if (parts.length && parts.length <= 24 && parts.every(p => TOKEN.test(p)) && parts.some(isUtility)) {
        lists.push(flat);
      }
      for (const hole of read.holes) lists.push(...classListLiterals(hole));
      i = read.next;
      continue;
    }
    i++;
  }
  return lists;
}

function utilitiesIn(src) {
  const found = new Set();
  for (const value of [...classValues(src), ...classListLiterals(src)]) {
    for (const tok of tokensOf(value)) {
      if (isUtility(tok)) found.add(tok);
    }
  }
  return found;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.js')) acc.push(p);
  }
  return acc;
}

function sourceFiles() {
  return [...walk(new URL('../js', import.meta.url).pathname), new URL('../index.html', import.meta.url).pathname];
}

function findMissing(cssText, files) {
  const missing = new Map();
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const tok of utilitiesIn(src)) {
      if (inCss(cssText, tok) || missing.has(tok)) continue;
      missing.set(tok, file);
    }
  }
  return missing;
}

/** Delete one exact utility rule. .h-full must not also delete .min-h-full. */
function withoutRule(cssText, tok) {
  const literal = tok.replace(/[./:[\]%#!(),_]/g, ch => '\\' + ch);
  const pattern = ('.' + literal).replace(/[\\^$*+?.()|[\]{}]/g, ch => '\\' + ch);
  const re = new RegExp(`(?<![A-Za-z0-9_-])${pattern}\\{[^}]*\\}`);
  if (!re.test(cssText)) {
    console.error(`tailwind self-test: no .${tok}{{…}} rule to delete`);
    process.exit(1);
  }
  return cssText.replace(re, '');
}

function selfTest(cssText, files) {
  for (const tok of ['h-full', 'ring-2']) {
    const broken = withoutRule(cssText, tok);
    if (inCss(broken, tok)) {
      console.error(`tailwind self-test: .${tok} still matches after its rule was deleted`);
      process.exit(1);
    }
    const missing = findMissing(broken, files);
    if (!missing.has(tok)) {
      console.error(`tailwind self-test: deleting .${tok} did not fail the check`);
      process.exit(1);
    }
  }
}

const css = readFileSync(new URL('../css/tailwind.static.css', import.meta.url), 'utf8');
const files = sourceFiles();
selfTest(css, files);

const missing = findMissing(css, files);
if (missing.size) {
  console.error(`tailwind: ${missing.size} utilities used in js/ have no rule in css/tailwind.static.css`);
  console.error('Regenerate with: npx tailwindcss@3.4.17 -c tailwind.config.cjs -o css/tailwind.static.css --minify');
  console.error('Then bump ?v= on the stylesheet link in index.html.');
  for (const [tok, file] of [...missing].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.error(`  ${tok}  (${file})`);
  }
  process.exit(1);
}

console.log('tailwind: every utility used in js/ has a rule (self-test: deleting .h-full and .ring-2 fails)');
