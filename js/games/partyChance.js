// Original screen-only party games. No weapons, money, or drinking rules.
export function createRound(players, random = Math.random) {
  if (!Number.isInteger(players) || players < 2 || players > 10) throw new RangeError('Choose 2–10 players');
  const slots = players * 3;
  const trap = Math.min(slots - 1, Math.floor(random() * slots));
  const used = new Set();
  let turn = 0, ended = false;
  return {
    get remaining() { return slots - used.size; },
    get player() { return turn % players + 1; },
    slots,
    pick(slot) {
      if (ended || !Number.isInteger(slot) || slot < 0 || slot >= slots || used.has(slot)) return null;
      const player = this.player;
      used.add(slot);
      ended = slot === trap;
      if (!ended) turn++;
      return { player, lost: ended, remaining: this.remaining };
    }
  };
}

export function renderRussianRoulette(container, onClose) { renderParty(container, onClose, false); }
export function renderPirateBarrel(container, onClose) { renderParty(container, onClose, true); }

function renderParty(container, onClose, pirate) {
  const pirateArt = '<svg viewBox="0 0 180 130" width="180" height="130" aria-hidden="true"><g class="chance-pirate"><path fill="#efbd58" d="M66 30h48v45H66z"/><path fill="#131612" d="M54 30l18-24h36l18 24z"/><path fill="#131612" d="M72 42h15v9H72zm27 0h9v9h-9zM80 61h21v4H80z"/><path stroke="#f4eedc" stroke-width="3" d="M84 14l12 10m0-10L84 24"/></g><path fill="#91613b" stroke="#efbd58" stroke-width="2" d="M48 68Q90 58 132 68l-6 58H54z"/><path stroke="#171916" stroke-width="6" d="M50 82h80m-78 30h76"/><path stroke="#efbd58" d="M75 67v57m30-57v57"/></svg>';
  const title = pirate ? 'PIRATE BARREL' : 'RUSSIAN ROULETTE';
  let round, players = 2, effect = 'quiet', used = new Set(), finished = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.innerHTML = `<section class="chance-game" aria-label="${title}">
    <header><h2>${title}</h2><button class="axiom-close-btn" data-close>✕ CLOSE</button></header>
    <p>${pirate ? 'Pick an unused slot. One hidden slot makes the pirate pop — that player loses.' : 'Take turns pressing the button. One hidden trigger ends the round — that player loses. Screen-only: no real weapons.'}</p>
    <form data-setup><label>Players <select name="players">${Array.from({ length: 9 }, (_, i) => `<option>${i + 2}</option>`).join('')}</select></label>
    <label>Surprise <select name="effect"><option value="quiet">Quiet reveal</option><option value="pop">Sudden ${pirate ? 'pirate' : 'BOO!'} pop-up</option><option value="white">Single white reveal</option></select></label>
    <p class="chance-note">Surprise effects are optional. No strobe, loud sound, or vibration.${reduced ? ' Reduced motion is on: reveals stay still.' : ''}</p>
    <button class="chance-action" type="submit">START ROUND</button></form>
    <div data-play hidden><p class="chance-status" role="status" aria-live="polite"></p>
    <div class="chance-stage" data-stage aria-hidden="true">${pirate ? pirateArt : '?'}</div>
    <div class="chance-slots" data-slots></div><button class="chance-action" data-trigger hidden>PRESS TRIGGER</button>
    <button class="chance-action" data-next hidden>NEXT PLAYER READY</button>
    <button class="chance-action" data-again hidden>PLAY AGAIN</button></div>
    <details><summary>What can you learn?</summary><p>This is chance, not a brain test. One losing slot is chosen at the start and stays fixed. After each safe turn, the risk is 1 divided by the slots left. A safe streak does not make you lucky. No slot is safer than another.</p>${pirate ? '<p>Inspired by the Pop-Up Pirate tabletop toy. Original code and screen artwork; not affiliated with its makers.</p>' : ''}</details>
    </section>`;
  const $ = selector => container.querySelector(selector);
  $('[data-close]').onclick = onClose;
  $('[data-setup]').onsubmit = event => {
    event.preventDefault();
    players = Number($('[name=players]').value); effect = $('[name=effect]').value;
    start();
  };
  function start() {
    round = createRound(players); used = new Set(); finished = false;
    $('[data-setup]').hidden = true; $('[data-play]').hidden = false;
    $('[data-again]').hidden = true; $('[data-next]').hidden = true;
    $('[data-stage]').className = 'chance-stage';
    $('[data-stage]').innerHTML = pirate ? pirateArt : '?';
    $('[data-slots]').innerHTML = pirate ? Array.from({ length: round.slots }, (_, i) => `<button data-slot="${i}" aria-label="Slot ${i + 1}">${i + 1}</button>`).join('') : '';
    for (const button of container.querySelectorAll('[data-slot]')) button.onclick = () => pick(Number(button.dataset.slot));
    ready();
  }
  function ready() {
    $('[data-next]').hidden = true;
    $('[data-trigger]').hidden = pirate;
    for (const button of container.querySelectorAll('[data-slot]')) button.disabled = used.has(Number(button.dataset.slot));
    $('.chance-status').textContent = `Player ${round.player} · ${round.remaining} slots left · risk 1 in ${round.remaining}`;
    (pirate ? container.querySelector('[data-slot]:not(:disabled)') : $('[data-trigger]')).focus();
  }
  function pick(slot) {
    if (finished || !$('[data-next]').hidden) return;
    const result = round.pick(slot);
    if (!result) return;
    used.add(slot);
    $('[data-trigger]').hidden = true;
    for (const button of container.querySelectorAll('[data-slot]')) button.disabled = true;
    if (result.lost) {
      finished = true;
      $('.chance-status').textContent = `Player ${result.player} loses this round!`;
      if (pirate) { $('[data-stage]').innerHTML = pirateArt; $('[data-stage]').classList.add('chance-revealed'); }
      else $('[data-stage]').textContent = 'BOO!';
      if (effect === 'white') $('[data-stage]').classList.add('chance-white');
      if (effect === 'pop' && !reduced) $('[data-stage]').classList.add('chance-pop');
      $('[data-again]').hidden = false; $('[data-again]').focus();
    } else {
      $('.chance-status').textContent = `Player ${result.player} is safe. Pass to Player ${round.player}.`;
      $('[data-next]').hidden = false; $('[data-next]').focus();
    }
  }
  $('[data-trigger]').onclick = () => pick(Array.from({ length: round.slots }, (_, i) => i).find(i => !used.has(i)));
  $('[data-next]').onclick = ready;
  $('[data-again]').onclick = () => { $('[data-play]').hidden = true; $('[data-setup]').hidden = false; $('[name=players]').focus(); };
}
