import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const catalog = source.split('const gamesCatalog = [')[1].split('\n];')[0];
const entries = [...catalog.matchAll(/\{ id: '([^']+)'[^\n]*?wing: '([^']+)'[^\n]*?desc: '((?:\\'|[^'])*)'/g)]
  .map(match => ({ id: match[1], wing: match[2], desc: match[3].replace(/\\'/g, "'") }));

assert.ok(entries.length >= 80, `expected the full floor, parsed ${entries.length}`);
const codes = [...catalog.matchAll(/\bcode:\s*'([^']+)'/g)].map(match => match[1]);
assert.equal(new Set(codes).size, codes.length, `duplicate cartridge codes: ${codes.filter((code, i) => codes.indexOf(code) !== i).join(', ')}`);
const action = /\b(?:answer|build|cancel|check|choose|clear|combine|connect|count|crack|cross|darken|decide|draw|drop|eat|fill|find|flag|follow|give|grow|guess|hear|hit|ignore|lower|match|memorize|merge|move|name|pick|place|plant|predict|press|push|read|recall|report|rotate|say|shout|slide|solve|sort|stand|start|stay|switch|take|tap|tell|type|unscramble|wait|walk|watch)\b/i;
const unexplainedJargon = /\b(?:WPM|RMIE|minimax|tetrominoes|loci|System-1|System-2|probe|amber|withhold|peripheral|mastermind|metadata|bankroll|paradigm)\b/i;

for (const game of entries.filter(entry => entry.wing !== 'meta')) {
  assert.ok(game.desc.length >= 30 && game.desc.length <= 90, `${game.id} description must be 30–90 characters; got ${game.desc.length}`);
  assert.match(game.desc, action, `${game.id} description must say what the player does`);
  assert.doesNotMatch(game.desc, unexplainedJargon, `${game.id} description contains unexplained jargon`);
}

console.log(`catalog copy: ${entries.length - 1} playable descriptions are short, action-led, and jargon-free`);
