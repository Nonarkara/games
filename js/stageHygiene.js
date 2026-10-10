/**
 * Stock emoji used as icons (headers, lives, deck art) come out of the
 * play surface. Card suits and chess pieces stay — they are the pieces.
 * Geometric arrows and the symbol-coding shapes stay too.
 */

const EXTRA_ICON = new Set([
  0x270A, 0x270B, 0x270C, // raised fists / hand — rock paper scissors art
  0x2764,                 // heart used as a life pip
  0x26BD,                 // soccer ball
  0x2696,                 // scales
  0x261D,                 // index finger
  0x23F1,                 // stopwatch
  0x26A1,                 // bolt
  0x2728,                 // sparkles
  0x2699,                 // gear
  0x26A0                  // warning sign
]);

export function isIconEmoji(codePoint) {
  if (EXTRA_ICON.has(codePoint)) return true;
  return codePoint >= 0x1F000 && codePoint <= 0x1FAFF;
}

export function stripIconEmojiText(value) {
  let out = '';
  for (const ch of String(value)) {
    const cp = ch.codePointAt(0);
    if (cp === 0xFE0F) continue;
    if (isIconEmoji(cp)) continue;
    out += ch;
  }
  return out.replace(/[ \t]{2,}/g, ' ');
}

/** Rewrite text nodes in place. Skips fields the player is typing into. */
export function scrubIconEmoji(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest('input, textarea, script, style')) continue;
    const next = stripIconEmojiText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}
