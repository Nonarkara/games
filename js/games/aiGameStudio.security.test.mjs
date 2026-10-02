import assert from 'node:assert/strict';
import { renderAIGameStudio } from './aiGameStudio.js';
import { soundFx } from '../audio.js';
soundFx.muted = true;
const elements = new Map();
const container = {
  innerHTML: '',
  querySelector(selector) {
    if (selector === '#ai-canvas') return null;
    if (!elements.has(selector)) elements.set(selector, { value: '' });
    return elements.get(selector);
  },
  querySelectorAll() { return []; }
};
renderAIGameStudio(container, () => {});
const payload = '"><img src=x onerror=alert(1)>';
for (const selector of ['#ai-prompt-input', '#param-player', '#param-obs', '#param-item']) container.querySelector(selector).value = payload;
container.querySelector('#ai-generate-btn').onclick();
container.querySelector('#ai-stop-btn').onclick();
assert.ok(!container.innerHTML.includes('<img'), 'redesign must never insert user HTML');
assert.ok(container.innerHTML.includes('&lt;img'), 'custom text must survive as escaped text');
console.log('Game builder: hostile custom values remain text on redesign');
