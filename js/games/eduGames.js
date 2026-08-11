/**
 * Dr Non — Non-Gaming System Educational Games Suite
 * Public-domain / classic educational mechanics, reimplemented in vanilla JS.
 */
import { soundFx } from '../audio.js';
import { StorageService } from '../storage.js';
import { showResult } from '../ui.js';

/* 1. STROOP COLOR MATCH (Cognitive inhibition) */
export function renderStroop(container, onClose) {
  start();
  function start() {
    const COLORS = [
      { name: 'RED', hex: '#ef4444' }, { name: 'GREEN', hex: '#22c55e' },
      { name: 'BLUE', hex: '#3b82f6' }, { name: 'AMBER', hex: '#f59e0b' },
      { name: 'PURPLE', hex: '#a855f7' }
    ];
    let score = 0, lives = 3, round = 0, timer = null;
    let current = makeRound();
    function makeRound() {
      const word = COLORS[Math.floor(Math.random() * COLORS.length)];
      let ink; do { ink = COLORS[Math.floor(Math.random() * COLORS.length)]; } while (ink.name === word.name);
      return { word, ink, options: [...COLORS].sort(() => Math.random() - 0.5) };
    }
    function answer(hex) {
      clearTimeout(timer);
      if (hex === current.ink.hex) { score += 10; soundFx.playCoin(); } else { lives--; soundFx.playHit(); }
      round++;
      if (lives <= 0) return endGame();
      current = makeRound(); render();
    }
    function endGame() {
      clearTimeout(timer);
      showResult({ container, title: 'STROOP COMPLETE', message: `${round} rounds.`, score, gameId: 'stroop-match', tone: 'win', onRestart: () => start(), onClose });
    }
    function render() {
      const tl = Math.max(1.5, 4 - round * 0.08);
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center gap-2 mb-4 border-b border-amber-500/40 pb-3">
            <div class="min-w-0"><h2 class="text-base sm:text-xl font-black text-amber-400 tracking-wider">STROOP COLOR MATCH</h2><p class="text-[9px] text-amber-500/80 uppercase">PICK THE INK COLOR · IGNORE THE WORD</p></div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>SCORE: <span class="text-white text-base">${score}</span></div>
            <div>ROUND: <span class="text-amber-400 text-base">${round + 1}</span></div>
            <div>LIVES: <span class="text-red-500 text-base">${Math.max(0, lives)}/3</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-5 sm:p-10 text-center mb-6">
            <div class="text-amber-500 text-xs mb-3">CLICK THE COLOR OF THE INK ↓</div>
            <div class="text-4xl sm:text-6xl font-black break-all mb-2" style="color:${current.ink.hex}">${current.word.name}</div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            ${current.options.map(c => `<button class="stroop-btn py-5 border font-bold text-xs transition hover:opacity-80" style="border-color:${c.hex};color:${c.hex}" data-hex="${c.hex}">${c.name}</button>`).join('')}
          </div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearTimeout(timer); onClose(); };
      container.querySelectorAll('.stroop-btn').forEach(b => b.onclick = () => answer(b.dataset.hex));
      timer = setTimeout(() => { lives--; soundFx.playHit(); round++; if (lives <= 0) return endGame(); current = makeRound(); render(); }, tl * 1000);
    }
    render();
  }
}

/* 2. SIMON SEQUENCE (Auditory working memory) */
export function renderSimon(container, onClose) {
  start();
  function start() {
    const PADS = [{ hex:'#ef4444',freq:329.63 }, { hex:'#22c55e',freq:261.63 }, { hex:'#3b82f6',freq:220 }, { hex:'#f59e0b',freq:164.81 }];
    let seq = [], userIdx = 0, round = 0, accepting = false;
    function flash(i) {
      const pad = container.querySelectorAll('.simon-pad')[i];
      if (!pad) return;
      soundFx.playTone(PADS[i].freq, 'sine', 0.3, 0.3);
      pad.style.filter = 'brightness(2.2)';
      setTimeout(() => { pad.style.filter = 'brightness(0.6)'; }, 320);
    }
    function playSeq() {
      accepting = false; let i = 0;
      const step = () => { if (i >= seq.length) { accepting = true; return; } flash(seq[i]); i++; setTimeout(step, 560); };
      setTimeout(step, 700);
    }
    function nextRound() { round++; seq.push(Math.floor(Math.random()*4)); userIdx = 0; playSeq(); }
    function tap(i) {
      if (!accepting) return;
      flash(i);
      if (seq[userIdx] === i) { userIdx++; if (userIdx === seq.length) { accepting = false; setTimeout(nextRound, 700); } }
      else { accepting = false; soundFx.playGameOver(); showResult({ container, title:'SEQUENCE BROKEN', message:`Reached round ${round}.`, score:round-1, gameId:'simon-seq', onRestart:()=>start(), onClose }); }
    }
    container.innerHTML = `
      <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-md mx-auto font-mono-hud">
        <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
          <div><h2 class="text-xl font-black text-amber-400 tracking-wider">SIMON SEQUENCE</h2><p class="text-[10px] text-amber-500/80 uppercase">WORKING MEMORY — REPEAT THE PATTERN</p></div>
          <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
        </div>
        <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
          <div>ROUND: <span class="text-white text-base">${round}</span></div>
          <div>HIGH: <span class="text-amber-400 text-base">${StorageService.getHighScore('simon-seq')}</span></div>
        </div>
        <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto">
          ${PADS.map((p,i) => `<button class="simon-pad aspect-square border-2" style="border-color:${p.hex};background:${p.hex}22;filter:brightness(0.6);transition:filter 0.1s" data-i="${i}"></button>`).join('')}
        </div>
        <p class="text-[10px] text-zinc-500 text-center mt-4">WATCH THE PATTERN, THEN REPEAT IT</p>
      </div>`;
    container.querySelector('#close-game-btn').onclick = onClose;
    container.querySelectorAll('.simon-pad').forEach(b => b.onclick = () => tap(parseInt(b.dataset.i)));
    nextRound();
  }
}

/* 3. ANAGRAM SCRAMBLE (Spelling & vocabulary) */
export function renderAnagram(container, onClose) {
  start();
  function start() {
    const WORDS = ['planet','rocket','garden','castle','jungle','python','laptop','magnet','bridge','circle','dragon','engine','forest','golden','palace','puzzle','quartz','silver','temple','window'];
    let score = 0, solved = 0, attempts = 3;
    let current = pick();
    function pick() {
      const w = WORDS[Math.floor(Math.random()*WORDS.length)];
      let s; do { s = w.split('').sort(()=>Math.random()-0.5).join(''); } while (s === w);
      return { word: w, scrambled: s };
    }
    function check(guess) {
      if (guess.toLowerCase().trim() === current.word) { score += 10 + attempts*5; solved++; soundFx.playCoin(); current = pick(); attempts = 3; }
      else { attempts--; soundFx.playHit(); if (attempts <= 0) return showResult({ container, title:'GAME OVER', message:`Solved ${solved} words.`, score, gameId:'anagram-scramble', onRestart:()=>start(), onClose }); }
      render();
    }
    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center gap-2 mb-4 border-b border-amber-500/40 pb-3">
            <div class="min-w-0"><h2 class="text-base sm:text-xl font-black text-amber-400 tracking-wider">ANAGRAM SCRAMBLE</h2><p class="text-[9px] text-amber-500/80 uppercase">UNSCRAMBLE THE WORD</p></div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>SCORE: <span class="text-white text-base">${score}</span></div>
            <div>SOLVED: <span class="text-amber-400 text-base">${solved}</span></div>
            <div>TRIES: <span class="text-red-500 text-base">${attempts}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-5 sm:p-10 text-center mb-6">
            <div class="text-amber-500 text-xs mb-3">UNSCRAMBLE THESE LETTERS</div>
            <div class="text-3xl sm:text-5xl font-black tracking-[0.15em] sm:tracking-[0.3em] text-white break-all">${current.scrambled.toUpperCase()}</div>
          </div>
          <form id="anagram-form" class="flex flex-col sm:flex-row gap-2">
            <input id="anagram-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="type the word..." class="flex-1 bg-black border border-amber-500/60 px-4 py-3 text-lg text-amber-200 focus:outline-none focus:border-amber-400 font-mono uppercase tracking-widest" />
            <button class="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black text-sm uppercase">SUBMIT</button>
          </form>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      const input = container.querySelector('#anagram-input'); input.focus();
      container.querySelector('#anagram-form').onsubmit = (e) => { e.preventDefault(); check(input.value); };
    }
    render();
  }
}

/* 4. PERIODIC QUEST (Chemistry recall) */
export function renderPeriodicQuest(container, onClose) {
  start();
  function start() {
    const E = [
      {s:'H',n:'Hydrogen',a:1},{s:'He',n:'Helium',a:2},{s:'Li',n:'Lithium',a:3},{s:'C',n:'Carbon',a:6},
      {s:'N',n:'Nitrogen',a:7},{s:'O',n:'Oxygen',a:8},{s:'Na',n:'Sodium',a:11},{s:'Mg',n:'Magnesium',a:12},
      {s:'Al',n:'Aluminum',a:13},{s:'Si',n:'Silicon',a:14},{s:'P',n:'Phosphorus',a:15},{s:'S',n:'Sulfur',a:16},
      {s:'Cl',n:'Chlorine',a:17},{s:'K',n:'Potassium',a:19},{s:'Ca',n:'Calcium',a:20},{s:'Fe',n:'Iron',a:26},
      {s:'Cu',n:'Copper',a:29},{s:'Zn',n:'Zinc',a:30},{s:'Ag',n:'Silver',a:47},{s:'Au',n:'Gold',a:79},
      {s:'Hg',n:'Mercury',a:80},{s:'Pb',n:'Lead',a:82}
    ];
    let score = 0, q = 0; const max = 10;
    let current = makeQ();
    function makeQ() { const el = E[Math.floor(Math.random()*E.length)]; const wrongs = E.filter(e=>e!==el).sort(()=>Math.random()-0.5).slice(0,3); return { el, options:[el,...wrongs].sort(()=>Math.random()-0.5) }; }
    function answer(n) { q++; if (n === current.el.n) { score += 10; soundFx.playCoin(); } else soundFx.playHit(); if (q>=max) return showResult({container,title:'SCIENCE COMPLETE',message:`${score}/${max*10} points.`,score,gameId:'periodic-quest',tone:'win',onRestart:()=>start(),onClose}); current = makeQ(); render(); }
    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div><h2 class="text-xl font-black text-amber-400 tracking-wider">PERIODIC QUEST</h2><p class="text-[10px] text-amber-500/80 uppercase">CHEMISTRY — WHICH ELEMENT IS THIS?</p></div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>SCORE: <span class="text-white text-base">${score}</span></div>
            <div>Q: <span class="text-amber-400 text-base">${q+1}/${max}</span></div>
            <div>HIGH: <span class="text-amber-400 text-base">${StorageService.getHighScore('periodic-quest')}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-10 text-center mb-6"><div class="text-amber-500 text-xs mb-3">ELEMENT #${current.el.a}</div><div class="text-7xl font-black text-white">${current.el.s}</div></div>
          <div class="grid grid-cols-2 gap-3">${current.options.map(o=>`<button class="pq-btn py-4 bg-zinc-900 hover:bg-amber-600 hover:text-black border border-amber-500/40 font-bold text-sm transition" data-n="${o.n}">${o.n}</button>`).join('')}</div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.pq-btn').forEach(b => b.onclick = () => answer(b.dataset.n));
    }
    render();
  }
}

/* 5. CAPITAL QUEST (World geography) */
export function renderCapitalQuiz(container, onClose) {
  start();
  function start() {
    const D = [{c:'Paris',co:'France'},{c:'Tokyo',co:'Japan'},{c:'London',co:'United Kingdom'},{c:'Berlin',co:'Germany'},{c:'Rome',co:'Italy'},{c:'Madrid',co:'Spain'},{c:'Ottawa',co:'Canada'},{c:'Canberra',co:'Australia'},{c:'Brasília',co:'Brazil'},{c:'Cairo',co:'Egypt'},{c:'New Delhi',co:'India'},{c:'Beijing',co:'China'},{c:'Moscow',co:'Russia'},{c:'Athens',co:'Greece'},{c:'Stockholm',co:'Sweden'}];
    let score = 0, q = 0; const max = 10; let current = makeQ();
    function makeQ() { const it = D[Math.floor(Math.random()*D.length)]; const w = D.filter(d=>d!==it).sort(()=>Math.random()-0.5).slice(0,3); return { item: it, options:[it,...w].sort(()=>Math.random()-0.5) }; }
    function answer(c) { q++; if (c === current.item.c) { score += 10; soundFx.playCoin(); } else soundFx.playHit(); if (q>=max) return showResult({container,title:'GEO COMPLETE',message:`${score}/${max*10} points.`,score,gameId:'capital-quiz',tone:'win',onRestart:()=>start(),onClose}); current = makeQ(); render(); }
    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div><h2 class="text-xl font-black text-amber-400 tracking-wider">CAPITAL QUEST</h2><p class="text-[10px] text-amber-500/80 uppercase">WORLD GEOGRAPHY — CAPITAL OF THIS COUNTRY?</p></div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>SCORE: <span class="text-white text-base">${score}</span></div>
            <div>Q: <span class="text-amber-400 text-base">${q+1}/${max}</span></div>
            <div>HIGH: <span class="text-amber-400 text-base">${StorageService.getHighScore('capital-quiz')}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-10 text-center mb-6"><div class="text-amber-500 text-xs mb-3">WHAT IS THE CAPITAL OF</div><div class="text-4xl font-black text-white">${current.item.co}?</div></div>
          <div class="grid grid-cols-2 gap-3">${current.options.map(o=>`<button class="cq-btn py-4 bg-zinc-900 hover:bg-amber-600 hover:text-black border border-amber-500/40 font-bold text-sm transition" data-c="${o.c}">${o.c}</button>`).join('')}</div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.cq-btn').forEach(b => b.onclick = () => answer(b.dataset.c));
    }
    render();
  }
}

/* 6. NUMBER CHAIN (Numerical pattern reasoning) */
export function renderNumberChain(container, onClose) {
  start();
  function start() {
    let score = 0, q = 0; const max = 10; let current = makeQ();
    function makeQ() {
      const t = ['arith','geom','square'][Math.floor(Math.random()*3)];
      let seq, ans;
      if (t === 'arith') { const st = Math.floor(Math.random()*10)+1, d = Math.floor(Math.random()*7)+2; seq = [st, st+d, st+2*d, st+3*d]; ans = st+4*d; }
      else if (t === 'geom') { const st = Math.floor(Math.random()*3)+2, r = Math.floor(Math.random()*2)+2; seq = [st, st*r, st*r*r, st*r*r*r]; ans = st*Math.pow(r,4); }
      else { const st = Math.floor(Math.random()*3)+1; seq = [st*st,(st+1)*(st+1),(st+2)*(st+2),(st+3)*(st+3)]; ans = (st+4)*(st+4); }
      const wrongs = new Set(); while (wrongs.size < 3) { const v = ans + (Math.floor(Math.random()*11)-5); if (v !== ans && v > 0) wrongs.add(v); }
      return { seq, ans, options: [ans, ...wrongs].sort(() => Math.random()-0.5) };
    }
    function answer(v) { q++; if (v === current.ans) { score += 10; soundFx.playCoin(); } else soundFx.playHit(); if (q>=max) return showResult({container,title:'PATTERN COMPLETE',message:`${score}/${max*10} points.`,score,gameId:'number-chain',tone:'win',onRestart:()=>start(),onClose}); current = makeQ(); render(); }
    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div><h2 class="text-xl font-black text-amber-400 tracking-wider">NUMBER CHAIN</h2><p class="text-[10px] text-amber-500/80 uppercase">NUMERICAL REASONING — FIND THE NEXT NUMBER</p></div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>SCORE: <span class="text-white text-base">${score}</span></div>
            <div>Q: <span class="text-amber-400 text-base">${q+1}/${max}</span></div>
            <div>HIGH: <span class="text-amber-400 text-base">${StorageService.getHighScore('number-chain')}</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-10 text-center mb-6"><div class="text-amber-500 text-xs mb-3">WHAT COMES NEXT?</div><div class="text-3xl font-black tracking-widest text-white">${current.seq.join(' · ')} · <span class="text-amber-500">?</span></div></div>
          <div class="grid grid-cols-4 gap-3">${current.options.map(o=>`<button class="nc-btn py-5 bg-zinc-900 hover:bg-amber-600 hover:text-black border border-amber-500/40 font-bold text-xl transition" data-v="${o}">${o}</button>`).join('')}</div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.nc-btn').forEach(b => b.onclick = () => answer(parseInt(b.dataset.v)));
    }
    render();
  }
}

/* 7. TOWER OF HANOI (Recursive planning) */
export function renderTowerHanoi(container, onClose) {
  start();
  function start() {
    const N = 4; let pegs = [[], [], []]; for (let i = N; i >= 1; i--) pegs[0].push(i);
    let moves = 0, selected = null; const minMoves = Math.pow(2, N) - 1;
    function clickPeg(p) {
      if (selected === null) { if (pegs[p].length === 0) return; selected = p; soundFx.playClick(); }
      else { if (selected === p) { selected = null; render(); return; } const disk = pegs[selected][pegs[selected].length-1]; const top = pegs[p].length > 0 ? pegs[p][pegs[p].length-1] : Infinity;
        if (disk < top) { pegs[p].push(pegs[selected].pop()); moves++; selected = null; soundFx.playCoin(); if (pegs[2].length === N) return showResult({container,title:'TOWER SOLVED',message:`${moves} moves (optimal ${minMoves}).`,score:Math.max(500-(moves-minMoves)*20,100),gameId:'tower-hanoi',tone:'win',onRestart:()=>start(),onClose}); }
        else { soundFx.playHit(); selected = null; } }
      render();
    }
    function dc(s) { return ['#f59e0b','#22c55e','#3b82f6','#a855f7','#ef4444'][(s-1)%5]; }
    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
            <div><h2 class="text-xl font-black text-amber-400 tracking-wider">TOWER OF HANOI</h2><p class="text-[10px] text-amber-500/80 uppercase">PLANNING & LOGIC — MOVE ALL DISKS TO PEG 3</p></div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>MOVES: <span class="text-white text-base">${moves}</span></div>
            <div>OPTIMAL: <span class="text-amber-400 text-base">${minMoves}</span></div>
            <div>HIGH: <span class="text-amber-400 text-base">${StorageService.getHighScore('tower-hanoi')}</span></div>
          </div>
          <div class="grid grid-cols-3 gap-3 bg-zinc-900 border border-amber-500/40 p-6 mb-4" style="min-height:220px">
            ${pegs.map((peg,pi)=>`<button class="hanoi-peg flex flex-col-reverse items-center justify-start relative pb-1 ${selected===pi?'bg-amber-950':'hover:bg-zinc-800'} transition" data-p="${pi}"><div class="absolute bottom-1 w-1 h-32 bg-amber-500/30"></div>${peg.map(s=>`<div class="z-10 h-7 flex items-center justify-center text-[10px] font-black mb-1 border" style="width:${30+s*28}px;background:${dc(s)}22;border-color:${dc(s)};color:${dc(s)}">${s}</div>`).join('')}</button>`).join('')}
          </div>
          <p class="text-[10px] text-zinc-500 text-center">CLICK PEG TO SELECT, THEN TARGET · LARGER CAN'T GO ON SMALLER</p>
        </div>`;
      container.querySelector('#close-game-btn').onclick = onClose;
      container.querySelectorAll('.hanoi-peg').forEach(b => b.onclick = () => clickPeg(parseInt(b.dataset.p)));
    }
    render();
  }
}

/* 8. WORD BUILDER (Phonics & spelling) — builds words from tiles in 60s */
export function renderWordBuilder(container, onClose) {
  start();
  function start() {
    const POOL = 'AEIOUBCDFGHLMNPRST'.split('');
    const DICT = new Set(('ace act add age aid aim air ale all and ant any ape arc are arm art ash ask ate awe axe bad bag ban bar bat bay bed bee beg bet big bin bit boa bog bot bow box boy bud bug bun bus but buy cab can cap car cat cob cod cog cop cot cow cry cub cue cup cut dab dad day den dew did die dig dim din dip doe dog don dot dry dub due dug dye ear eat eel egg ego elf elk elm end eon era eve eye fad fan far fat fed fee few fig fin fir fit fix fly foe fog for fox fry fun fur gab gag gal gap gas gel gem get gig god got gum gun gut guy had ham has hat hay hem hen her hew hex hid him hip his hit hob hoe hog hop hot how hub hue hug hum hut ice icy ill imp ink inn ion ire its jab jam jar jaw jay jet jib jig job jog jot joy jug keg key kid kin kit lab lad lag lap law lay led leg let lid lie lip lit lob log lop lot low lug lye mad man map mar mat may men met mid mix mob mom mop mud mug nab nag nap net new nib nip nod nor not now nub nun nut oak oar oat odd off oil old one orb ore our out owe owl own pad pal pan par pat paw pay pea pen pep per pet pic pie pig pin pit pod pop pot pub pug pun pup pus put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rug rum run rut rye sad sag sap sat saw say sea see set sew she shy sin sip sir sit six ski sky sly sob sod son sop sow soy spa spy sub sue sum sun tab tad tag tan tap tar tat tax tea ten the tic tie tin tip toe ton too top tot tow toy try tub tug two urn use van vat vet vex via vie vow wad wag wan war was wax way web wed wee wet who why wig win wit woe wok won woo wow wry yak yam yap yea yen yes yet you zap zip zoo about above abuse acorn actor adapt admin admit adopt adore adult after again agent agile agree ahead alarm album alert alien align alike alive alley allow alloy alter among ample amply angel anger angle angry animal ankle annoy annual answer apple apply apron arena argue arise armor around array arrow aside ask asleep aspen asset avoid await awake award aware away azure baby back bacon badge badly bagel bags bail bait bake baker bald bale balk ball balm ban band bane bang bank bar bard bare bark barn base basic basil basin basis bask bath bathe baton beach bead beak beam bean bear beard beast beat beauty became because become bedroom bee beef been beer beetle began begin begun being below belt bench bend berry beside best bet better between beware beyond bible bike bill bind bingo biology birth black blade blame blank blast blaze bleed blend bless blind block blood bloom blot blouse blow blue bluff blunt blur board boast boat bode body boil bold bolt bomb bond bone bonus book boom boost boot border bore born boss both bother bottle bottom bound bow bowl box boy brace brain brake brand brass brave bread break breath breed brick bride brief bring broad broke bronze brood brook broom brown brush build built bulb bulk bull bump bunch bundle bun bunker burn burst bus bush busy but butter button buy buyer buzz cabin cable cache caddy cake calf call calm came camel camp can canal canary cancel cancer candle candy cane canon canoe canon canvas canyon cape capital car card care career cargo carpet carrot carry cart carve case cash cast castle cat catch cause cave cell chain chair chalk champ chant chaos chapel charge chart chase cheap cheat check cheek cheer chess chest chew chick chief child chill chin chip chord chore chose chosen chrome chunk church cigar cinema circle citizen city civic civil claim clamp clan clap clash class clay clean clear clerk click cliff climb cling clip clock clone close cloth cloud clown club clue coach coal coast coat code coffee coil coin cold collar color colt comb come comet comic cook cool cope copy core cork corn cost cot cottage cotton couch could count coup couple course court cover cow crack craft cram crane crash crate crawl crazy cream create credit creek creep crime crisp cross crowd crown crude crush crust cry cube cult cup cure curl current curse curtain curve cute cycle daddy daily dairy dance dandy danger dark darling data date daughter day dead deal dear death debit debt decay decent decide deck decoy deed deep deer delay delete dense depart depend depth derive desert design desire desk detail detect devil dial diamond diary dice did diet differ dig dine dinner dip direct dirt dirty disco discuss disease dish dive divide divine dizzy dock doctor dog doll dollar dolphin dome done donkey door dose dot double doubt dough down draft drag drain drama draw drawn dread dream dress drift drink drive drop drown drum drunk dry duck duel duet dull dummy dust duty eager eagle early earn earth east easy eaten ebony echo edge edit educate eel effect effort egg eight either elbow elder elect elegy elite email empty enact ended endure enemy energy enroll ensure entire entry envoy envy equal equip erase error erupt essay even event ever every evil exact exit exotic expand expect expert expire extra extreme fabric face facet fact fade fail faint fair fairy faith fake fall fame family famous fancy fatal fate father fault favor fear feast feature fee feed feel feet fellow felt female fence ferry fetch fever few field fifty fight figure file fill film final find fine finger finish fire firm first fish five fix flag flame flash flat flaw flea flesh flew flex flight float flock flood floor flour flow flower fluid flush focus fog foil fold folk food fool foot for force forge form fort four fowl fox frame fraud free fresh front frost fruit fuel full fun fund funny fur fury fuse fuzzy gain gait gala game gander gang gap gape garage garbage garden garlic garment gas gasp gate gather gauge gave gaze gear gem gender generic gentle gentle genuine ghost giant gift giggle gill girl give given glare glass glaze gleam glide gloom glory glove glow glue goal goat gobble god gold golf gone good goof goose gorge grab grace grade grain grand grant grape graph grasp grass grave gravy gray great green greet grief grill grim grin grip grit group grow growl grown gruff grunt guard guess guest guide guilt guitar gulf gum gunner gusto gut guy habit hack hail hair half hall halt ham hammer hand hand hang happy harbor hard harm haste hat hate haul have hawk hay head heal health heap hear heart heat heavy hedge heel height heir held help hen her here hero hex hi hide high hike hill hilt him hind hint hip hire hiss hit hobby hockey hoe hog hold hole holiday hollow holy home honey honor hood hoof hook hoop hop hope horn horse hose host hotel hound hour house how howl hub huge hulk hull human humor hump hunch hundred hung hunger hunt hurry hurt ice idea ideal idle idiot idol if ill image immune impact import impose impulse in income indeed index indoor induce indulge inept infant infect infer infirm inform infuse ingest inhale inherit inhibit initial inject injure ink inner input insect insert inside intend intent inter into intro invent invest invite involve island isle issue it itch item ivory ivy jacket jail jam jar jargon jaw jay jazz jealous jeans jeep jest jet jewel jiffy jig job join joke jolly judge juice jumble jumbo jump junior junk jury just keep kelp kept kerchief kettle key kick kid kidnap kill kiln kilt kin kind kindle king kiosk kiss kit kite knack knee kneel knew knife knight knock knot know known label labor lack lad ladder laden lady lag laid lake lamb lame land lane language lap large lark laser last late latter laugh launch lava lawn lawyer lax lay layer lazy lead leaf league leak lean leap learn lease least leather leave led left leg legal legend lemon lend length lens lent leopard less lesson let lethal lettuce level lever levy liar libel license lick lid lied liege lieu life lift light like lily limb lime limit limp line linen link lion lip liquid list listen lit literal litter little live load loaf loan lobby local lock lodge loft logic loin lone long look loom loon loop loose loot lord lose loser lost lotion lottery loud lounge louse love low loyal lucid luck luggage lukewarm lull lumber lump lunch lung lure lurid lurk lush lust lute luxury lying lyric mace made magic magnet maid mail main maize major make male mall malt mama mammal man mane mango mania manor maple march margin marine mark market marry mask mass master mat match mate math matter maul maybe mayor maze meadow meal mean meant meat medal media medic medium meek meet mellow melt member memo memory men mental menu mercy mere merge merit merry mesh mess metal meter middle might mighty mild mile milk mill mind mine mini minor mint minus minute mirror miscall miss mist model modem modest modify mom moment money month moon moor mop moral more morning moss most moth mother motion motor mount mouse mouth move movie much muck mud muff muffin mule mummy mural mush music must mutter my myth nail naive naked name nap nasty nation native nature naval nave navy near neat neck need needle nerd nest net never new news next nice niche nick niece night nine nipple no noble nobody node noise none nook noon north nose note nothing notice notion novel now nude nudge number numeric nurse nut nylon oak oar oasis oat oath obese obey object oblige obscure obtain obvious occult occur ocean octave octopus odd odor off offer office often oil ointment okay old olive omit on once one onion only onset ooze open opera opt option or oral orange orbit order organ origin orphan ostrich other otter ought ounce our out outer output outside oval oven over own owner ox oxide oyster pace pack pact pad page paid pail pain paint pair pal pale palm pan pane panel panic pant paper par parade pardon parent paris park part party pass past paste pat patch path patient patio patrol pattern pause pave paw pay pea peace peach peak peal pearl peat pebble peck pedal peek peel peer peg pelt pen penalty pencil penny people pepper per perch perfect peril period perk perm permit pest pet petal petty phase phone photo phrase piano pick pickle picnic pie piece pier pig pigeon pile pill pillar pilot pin pinch pine ping pink pint pinto pipe pit pitch pith pity pivot place plague plaid plain plan plane planet plank plant plate play plaza plead pleat plenty plight plot plough plow pluck plug plum plunge plus poach pocket pod poem poet point poise poison poke polar pole police policy polish pond pony pool poor pop porch pore pork port portal pose posit posit posh pound pour pout powder power practice prairie praise prance pray prayer preach prefer premium prepare presence present press pretty price pride priest prime print prior prism prison prize probe problem process produce profit prompt proof proper prose proud prove prune public pucker puff pulp pulse pump pun punch pupil puppet puppy pure purge purple purse pursue push put puzzle quad quail quake qualm quart quartz quay queen queer quell query quest queue quick quiet quill quilt quince quirk quit quite quiver quiz quote rabbit rabid race rack radar radio radish rail rain raise rally ramp ranch random range rank rapid rare rash rat rate ratio rattle rave raven raw ray razor reach react read ready real realm reap rear reason rebel rebut recall receipt recent recipe reckon recoil record recover recycle red reduce reed reef reel ref reform refuge refuse regal regard regime region regret regular rehearse reign rein relate relax relay release relief rely remain remark remedy remind remote remove rend render renew rent repair repeat repel reply report repose reptile republic repute request require rescue resent reserve reside resign resist resort respect respond rest restore result resume retail retain retire retreat return reuse reveal revenge revenue revere reverse review revise revive revolt revolve reward rheum rhino rhubarb rhyme rhythm rib ribbon rice rich rid riddle ride ridge rifle rift rig right rigid rim rind ring rinse riot rip ripe ripple rise risk rite ritual rival river road roam roar roast rob robe robin robot rock rocket rod role roll roller romance roof rook room root rope rose rotate round rouse route routine row royal rub ruby rude rue ruffle rug rugby ruin rule rum rumor run rung rural rush rust sable sack sacred sad saddle safe sage said sail saint sake salad salary sale salmon salon salt salute same sand sandwich sane sang sap sash sat satchel sated satin satisfy sauce saucer sauna savage save saw say scald scale scan scar scarce scare scarf scatter scene scent schedule scheme school science scoff scold scoop scope score scorn scout scowl scrap scrape scratch scream screen screw scribe scroll scrub scuba sea seal seam search season seat second secret sector secure see seed seek seem seen seep seize select self sell send senile senior sense sent septum sequel sequence serene serial serious serum serve service session set settle seven sever sew shade shadow shaft shaggy shake shaky sham shame shampoo shape share shark sharp shave she shed sheep sheer sheet shelf shell shift shine ship shirt shiver shoal shock shoe shone shoot shop shore short shot should shout shovel show shower shred shrew shriek shrill shrimp shrink shrub shuffle shun shut shuttle shy sick side siege siege sift sigh sight sign signal silent silk sill silly silver similar simmer simple sin since sing single sink sip sir siren sit site six size skate sketch ski skill skim skin skip skirt skull sky slab slack slam slander slap slash slate slave slay sled sleep sleet sleeve slept slice slick slide slight slim sling slip slit slither slope slot slow slug slum slumber slung slur slurp slush small smart smash smell smile smirk smoke smooth snack snag snail snake snap snare snarl snatch sneak sneer sneeze sniff snip snipe snob snore snort snout snow snub snug soak soap soar sob soccer social sock socket soda sofa soft soil solar sold soldier sole solid solo solve some son song soon soot soothe sop soprano sorbet sore sorry sort soul sound soup sour source south sow space spade span spare spark spat spawn speak spear special speck speech speed spell spend spent sphere spice spider spike spill spin spine spirit spit splash split spoil spoke sponge spoof spook spoon sport spot spouse spout spray spread spree spring sprint sprout spry spunk spy square squat squeak squeal squeeze squid squint squirm squirrel stab stable stack stadium staff stage stain stair stake stale stalk stamp stance stand staple star stare start starve state status stave stay steady steak steal steam steel steep steer stem step stereo stern stew stick stiff still sting stink stir stitch stock stone stood stoop stop store storm story stout stove straight strain strand strange strap straw stray streak stream street stress stretch stride strike string strip stripe stroke stroll strong struck structure struggle strum strung strut stub stuck study stuff stumble stump stun stupid sturdy style subject submit subtle suburb subway succeed such suck sudden suffer sugar suggest suit sulk sully sum summer summon sun sundry sung sunk sunny super supper supply support suppose supreme sure surf surge surly surplus surprise survey survive suspect sustain swallow swam swamp swan swap swarm sway swear sweat sweep sweet swell swept swift swim swing swirl switch swivel swoon swoop sword swore sworn syllabus symbol syntax syrup system tab table tablet taboo tack tactic tad tag tail tailor taint take tale talent talk tall tally tame tan tank tap tape taper tar target tariff tarot tart task tassel taste tat taunt taut tax tea teach teak teal team tear tease teat teed teem teen telex tell temper temple tempo ten tend tense tent term terror test text than thaw the their them then theory there these they thick thief thigh thin thing think third thirst this thorn those though thought thrash thread threat three threw thrice thrill throat throb throne throng through throw thrust thud thug thumb thump thus tick ticket tide tidy tie tier tiger tight tile till tilt timber time timid tin tinder tinge tint tiny tip tipsy tire tissue title toad toast tobacco today toe toes toffee tofu toga toggle toil token told toll tomato tomb tone tongs tongue tonic tonight took tool tooth top topaz topic torch tornado torso toss tot total tote totem touch tough tour tow toward towel tower town toy trace track tract trade traffic tragic trail train trait tram tramp trance trap trash travel tray tread treasure treat treaty tree tremble trench trend tress trial tribe trick tried trifle trim trip triple trivia trot trouble trough trout trove trowel truant truce truck trudge true truffle truly trumpet trunk trust truth try tub tube tuck tuft tug tuition tulip tumble tuna tundra tune tunic tunnel turban turbine turf turkey turmoil turn turret turtle tusk tutor twang tweed tweet twelve twenty twice twig twilight twin twine twinkle twirl twist twitch two tycoon type tycoon typical tyrant udder ugly ulcer ultra umpire unable uncle under undo unequal unfit unhappy unicorn uniform union unique unit unite unity unjust unlike unlock unpack until untie unto unusual unveil unwind up upon upper upset upside uptown upward urge urn us use used user usual usurp utter vacant vacate vacuum vague vain valet valid valley valor value valve vampire van vandal vane vanish vapor variant varnish vary vase vassal vast vat vault veal veer vegan vein velocity velvet vendor venom vent venture venue verb verbal verdict verge vermin verse very vessel vest veto vex via vial vibe vicar vice victim victor video vie view vigil vigor vile villa village villain vine vinegar vinyl violate violet violin viper virgin virtue virus visa viscid vista visual vital vivid vixen vocal vodka vogue voice void volatile volcano volley volt volume vote vouch vow vowel voyage vulgar wade wafer waffle wage wagon waist wait waive wake walk wall wallet walnut walrus waltz wand wander want war ward ware warm warn warp warrant warrior wash wasp waste watch water wave wax way we weak wealth weapon wear weary weave web wed wedge weed week weep weigh weight weird welcome weld welfare well went wept were west wet whack whale wharf what wheat wheel when where which while whim whine whip whirl whisk whisper whistle white whole whom whose why wick wicked wide widow width wield wife wig wild wile will wilt wily win wind window wine wing wink winner winter wipe wire wisdom wise wish wisp wit witch with wither witty wizard woe wok wolf woman womb won wonder wont wood wool word wore work worm worn worry worse worst worth would wound wove wrack wrap wrath wreath wreck wrench wrest wrestle wriggle wring wrinkle wrist write writhe wrong wrote wrung wry yacht yam yank yap yard yarn yawn yawn yea year yearn yeast yell yellow yelp yen yes yet yield yip yodel yoga yoke yolk yonder you young your youth zebra zero zest zinc zing zipper zither zodiac zone zoo zoom').split(' '));
    let tiles = [], found = [], score = 0, timeLeft = 60, over = false, started = false, timer = null;
    function newTiles() {
      const V = 'AEIOU'.split('');
      tiles = [V[Math.floor(Math.random()*5)], V[Math.floor(Math.random()*5)]];
      while (tiles.length < 7) tiles.push(POOL[Math.floor(Math.random()*POOL.length)]);
      tiles = tiles.sort(() => Math.random()-0.5);
    }
    newTiles();
    function submit(input) {
      const w = input.toUpperCase().trim(); if (!w || w.length < 3 || found.includes(w)) return;
      const tc = tiles.slice(); let ok = true;
      for (const ch of w) { const idx = tc.indexOf(ch); if (idx < 0) { ok = false; break; } tc.splice(idx, 1); }
      if (!ok || !DICT.has(w.toLowerCase())) { soundFx.playHit(); return; }
      found.push(w); score += w.length * 10; soundFx.playCoin(); render();
    }
    function endGame() { over = true; clearInterval(timer); showResult({ container, title:'TIME UP', message:`Found ${found.length} words.`, score, gameId:'word-builder', tone:'win', onRestart:()=>start(), onClose }); }
    function render() {
      container.innerHTML = `
        <div class="relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-xl mx-auto font-mono-hud">
          <div class="flex justify-between items-center gap-2 mb-4 border-b border-amber-500/40 pb-3">
            <div class="min-w-0"><h2 class="text-base sm:text-xl font-black text-amber-400 tracking-wider">WORD BUILDER</h2><p class="text-[9px] text-amber-500/80 uppercase">BUILD WORDS FROM 7 TILES · 60S</p></div>
            <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>
          </div>
          <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-3 mb-6 text-xs font-bold">
            <div>SCORE: <span class="text-white text-base">${score}</span></div>
            <div>WORDS: <span class="text-amber-400 text-base">${found.length}</span></div>
            <div>TIME: <span id="wb-time" class="text-amber-400 text-base">${timeLeft}s</span></div>
          </div>
          <div class="bg-zinc-900 border border-amber-500/60 p-6 mb-6 text-center">
            <div class="text-amber-500 text-xs mb-3">YOUR LETTER TILES</div>
            <div class="flex justify-center gap-2 flex-wrap">${tiles.map(t=>`<div class="w-12 h-12 bg-black border-2 border-amber-500 flex items-center justify-center text-2xl font-black text-white">${t}</div>`).join('')}</div>
          </div>
          <form id="wb-form" class="flex flex-col sm:flex-row gap-2 mb-4">
            <input id="wb-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" placeholder="type a word..." class="flex-1 bg-black border border-amber-500/60 px-4 py-3 text-lg text-amber-200 focus:outline-none focus:border-amber-400 font-mono uppercase tracking-widest" />
            <button class="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black text-sm uppercase">SUBMIT</button>
          </form>
          <div class="text-xs text-zinc-500 mb-1">FOUND WORDS:</div>
          <div class="flex flex-wrap gap-1 min-h-[28px]">${found.map(w=>`<span class="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 border border-emerald-600">${w}</span>`).join('') || '<span class="text-zinc-700 text-xs">none yet</span>'}</div>
        </div>`;
      container.querySelector('#close-game-btn').onclick = () => { clearInterval(timer); onClose(); };
      const input = container.querySelector('#wb-input'); input.focus();
      container.querySelector('#wb-form').onsubmit = (e) => { e.preventDefault(); if (!started) { started = true; timer = setInterval(() => { timeLeft--; const t = container.querySelector('#wb-time'); if (t) t.innerText = timeLeft + 's'; if (timeLeft <= 0) endGame(); }, 1000); } submit(input.value); input.value = ''; };
    }
    render();
  }
}
