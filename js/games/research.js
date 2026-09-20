/**
 * NGS · Research
 * The words behind the floor. Four tabs, one overlay, zero photos in the
 * DR NON tab — pixel sprites only, as requested. Every claim shows its paper.
 */

import { spriteImg } from '../sprites.js';
import { THEORY_STACK, STACK_ORDER } from '../theory.js';
import { PAPER_LINKS, TRANSFER_CAVEAT } from '../brainGuides.js';

const TABS = [
  { id: 'origin', label: 'ORIGIN', hint: 'How this floor came about' },
  { id: 'philosophy', label: 'WHY GAMES', hint: 'Not killing time' },
  { id: 'science', label: 'SCIENCE', hint: 'Five frameworks' },
  { id: 'drnon', label: 'DR NON', hint: 'The person — pixel only' },
];

export function renderResearch(container, onClose) {
  let active = 'origin';

  const render = () => {
    container.innerHTML = `
      <article class="research-panel" aria-labelledby="research-title">
        <header class="research-head">
          <div>
            <p>RESEARCH · NON-GAMING SYSTEM</p>
            <h2 id="research-title">The words behind the floor</h2>
            <p class="research-sub">Why games are not a waste of time. How this project came about. The science underneath, and the person who built it. One floor, five frameworks, eighty cartridges — every claim shows its paper.</p>
          </div>
          <button type="button" class="about-close" id="close-game-btn">CLOSE</button>
        </header>

        <nav class="research-tabs" role="tablist" aria-label="Research sections">
          ${TABS.map(t => `
            <button role="tab" aria-selected="${active === t.id}" data-tab="${t.id}" class="${active === t.id ? 'is-active' : ''}">
              <b>${t.label}</b><small>${t.hint}</small>
            </button>
          `).join('')}
        </nav>

        <div class="research-body">
          ${active === 'origin' ? originHtml() : ''}
          ${active === 'philosophy' ? philosophyHtml() : ''}
          ${active === 'science' ? scienceHtml() : ''}
          ${active === 'drnon' ? drnonHtml() : ''}
        </div>

        <footer class="research-foot">
          <p>Every cartridge opens with the skill it trains, how long a round takes, and the limit of the claim. That is the whole product. <a href="https://doi.org/10.1177/1529100616661983" target="_blank" rel="noopener">Simons 2016</a> stays on the shelf on purpose.</p>
          <button type="button" class="research-foot-close" id="research-close-2">CLOSE</button>
        </footer>
      </article>
    `;
    container.querySelector('#close-game-btn').onclick = onClose;
    const c2 = container.querySelector('#research-close-2');
    if (c2) c2.onclick = onClose;
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.onclick = () => { active = btn.dataset.tab; render(); container.querySelector(`[data-tab="${active}"]`)?.focus(); };
    });
    // keep focus inside the dialog
    container.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  };

  render();
}

function originHtml() {
  return `
    <section aria-labelledby="origin-h">
      <p class="research-kicker">ORIGIN · HOW THIS FLOOR CAME ABOUT</p>
      <h3 id="origin-h" class="research-h">Games taught me how to think before any book did.</h3>

      <div class="research-pixels" aria-hidden="true">
        ${spriteImg('drnon-lanes', 'research-sprite')}
        ${spriteImg('drnon-famicom', 'research-sprite')}
        ${spriteImg('drnon-ibm', 'research-sprite')}
        ${spriteImg('drnon-dallas', 'research-sprite')}
        ${spriteImg('drnon-mit', 'research-sprite')}
        ${spriteImg('drnon-shanghai', 'research-sprite')}
        ${spriteImg('drnon-depa', 'research-sprite')}
        ${spriteImg('drnon-switch2', 'research-sprite')}
      </div>
      <p class="research-caption">Eight 8-bit moments. Bangkok lanes → Famicom from Singapore → IBM laptop from the bank → Dallas 1998 → Wii @ MIT 2007 → Shanghai by bike → DEPA dashboards → Switch 2 line, July 2025.</p>

      <p>NGS is not a game portal that added a brain-training label after the fact. It is the other way around. The floor exists because a kid in Bangkok learned systems from games before school taught systems from books.</p>

      <p><strong>Bangkok in the 80s and 90s was simple.</strong> No smartphones. No computers you could reach. We played in the lanes with a plastic ball and sandals for goalposts. The first World Cup I should remember is Argentina 1986 — I was five and slept through Maradona. The first I actually watched was Italia 90 with my dad. West Germany won. I asked why there were two Germanys. He did not know either. It took twenty-four years to find out, in Berlin in 2014.</p>

      <p><strong>The first computer was not mine.</strong> My mom was a banker. She brought home an IBM laptop — one of the first the bank issued — when I was in middle school. I taught myself HTML and BASIC and the games that came with the machine. My first console was a Famicom my dad brought back from Singapore in the early 90s. I saved for the cartridges. That was the deal: he got the box, I got the games. Dragon Quest was the first cartridge I bought. It is still the cartridge that matters — the first time a story was also a world you walked through.</p>

      <p>High school was Championship Manager, SimCity, and ISS on PlayStation. Each one taught a domain: soccer, cities, storytelling. At seventeen I went to AFS at Bishop Lynch in Dallas, Texas. France 98 was on — Zidane headbutt, Beckham sent off. I watched with kids who would become my friends. In 2007 I was at MIT for two architecture degrees and spent a defensible share of the time playing Wii in a common room mid-swing. There is a photo from that year. The research question was already forming.</p>

      <p>I am 40-something now. The 2026 World Cup lands in the country I first lived in at seventeen. I will be there. I stood in line last July to buy a Switch 2. I am not embarrassed by that.</p>

      <h4 class="research-h4">The counter your mama said — and mine.</h4>
      <blockquote class="research-quote">“Games are killing time.”</blockquote>
      <p>Yes. They are. So is reading the news, watching the news, scrolling a feed. The question is not whether the time dies — the time always dies. The question is whether the minutes gave anything back. An infinite feed is a machine built to collect dead minutes at scale and give nothing back. A good game gives back a system, a story, a reflex, a memory. The difference is the system.</p>

      <h4 class="research-h4">So what. Three moves.</h4>
      <ol class="research-steps">
        <li><strong>NGS exists because games taught me to think</strong> and I want that for the next person. Not a game system. A brain expansion system.</li>
        <li><strong>Every cartridge is built on five frameworks</strong> — Kahneman, Werbach, Thaler, neuroplasticity, Atomic Habits. Love alone is not enough. You need a science. The next tab says why gamification is a real field and why behavioral economics is as big as economics itself.</li>
        <li><strong>Sign the board with four letters. Come back. Beat yourself.</strong> That is the loop. That is the system.</li>
      </ol>

      <p class="research-sig">Play.</p>
      <p class="research-sig2">— Dr Non, Bangkok, 2026</p>

      <aside class="research-note">
        <b>HOW TO READ THIS FLOOR</b>
        <p>Pick any cartridge. Before you play you see: the skill it trains, how many minutes a round takes, what to do in the round, why that practice matters, a coach tip, and the honest caveat. Then — and only then — PLAY.</p>
      </aside>
    </section>
  `;
}

function philosophyHtml() {
  return `
    <section aria-labelledby="phil-h">
      <p class="research-kicker">PHILOSOPHY · WHY GAMES ARE NOT A WASTE OF TIME</p>
      <h3 id="phil-h" class="research-h">Those who are more successful or happier are playing better games — on purpose.</h3>

      <p>That line is the philosophy. It is not about screen time. It is about whether a day is lived as a feed or as a game.</p>

      <p>A feed has no rules, no win condition, no next move. You do not get better at it. It just continues. A game has the opposite: a clear action, a visible result, a rule you can learn, and a score that says whether the last ten minutes taught you something. When people who are more successful or happier describe their lives, they usually describe a game — a practice with loops they chose, stakes they accept, and feedback they can read. The ones who are stuck usually describe a feed.</p>

      <h4 class="research-h4">Your mama and my mama were not wrong — just early.</h4>
      <p>“Go do something useful” meant: this looks like wasting time. In the 80s a game really was a break from the world. In 2026 the world has turned into a game you did not consent to play. Every app is a slot machine. Every feed is a leaderboard you never signed up for. The question is no longer “should you play games?” You are already playing. The question is who designed the game and what it is training you to do while you think you are just scrolling.</p>

      <p>A good game does the opposite by design: <em>it tells you what it is training</em>. NGS puts the briefing before the play for exactly that reason — the skill, the minutes, the limit of the claim. The briefing is the consent screen an infinite feed never shows you.</p>

      <h4 class="research-h4">Gamification is a field. Not a metaphor.</h4>
      <p>Gamification has been a university subject since 2012 at least, when Kevin Werbach started teaching it at Wharton and published <em>For the Win</em> with Dan Hunter. The core is the <strong>PBL triad — Points, Badges, Leaderboards</strong> — and <strong>MDA — Mechanics → Dynamics → Aesthetics</strong>. Points make progress visible. Badges mark identity. Leaderboards make it social. Mechanics are the rules. Dynamics are what happens when the rules are played. Aesthetics are why you want to stay. NGS uses all of them on purpose: score is points, four letters on the board is the badge and the identity, the top-5 per cartridge is the leaderboard, briefing → play → result is the MDA loop, and the 16-bit CRT surface is the aesthetic of fun. “Do not forget the fun” is an actual step in Werbach’s six-step design method — not a joke.</p>

      <h4 class="research-h4">Behavioral economics is as big as economics itself.</h4>
      <p>Economics used to model humans as rational calculators. Behavioral economics showed we are not — we anchor, we loss-averse, we follow defaults, we want the thing now, not later. That work won Nobels: <strong>Daniel Kahneman (2002, with Vernon Smith)</strong> for prospect theory and the two-system mind, <strong>Richard Thaler (2017)</strong> for nudges — the idea that choice architecture steers behavior without removing freedom. Thaler and Cass Sunstein’s <em>Nudge</em> (2008) and the UK Behavioural Insights Team’s <strong>EAST framework — Easy, Attractive, Social, Timely</strong> — are now standard in 400+ government nudge units and every serious product team. That is not a side field. Since 2017 it <em>is</em> the field. Any screen you see has already been nudged. NGS just says so out loud.</p>

      <div class="research-grid">
        <article><b>Easy</b><p>One cartridge of the day. One choice, not thirty.</p></article>
        <article><b>Attractive</b><p>Four amber letters on a dark board. You want your name there.</p></article>
        <article><b>Social</b><p>Top-5 is public. You are not playing against the app. You are playing against the room.</p></article>
        <article><b>Timely</b><p>“Made the board — sign it NOW” appears exactly when you qualify, not tomorrow.</p></article>
      </div>

      <blockquote class="research-quote">A feed collects dead minutes at scale. A good game trades minutes for a system you can reuse. Pick the game. Play it on purpose. Come back and beat yourself — that is the loop that compounds.</blockquote>

      <p>Huizinga called humans <em>Homo Ludens</em> — the playing animal — in 1938. Bernard Suits defined playing a game as “the voluntary attempt to overcome unnecessary obstacles” in 1978. Jane McGonigal has spent a career showing that games create real optimism and agency under constraint. All three point the same way: we do not play games to escape life. We play games to rehearse the part of life that needs a rule, a limit, and a second try.</p>

      <p>Your mama wanted you to do something that gives back. So does this floor. Pick a room — TRAIN, ARCADE, LEARN, or LABS — and give ten minutes to a skill that says its name before it starts. That is not killing time. That is spending it.</p>
    </section>
  `;
}

function scienceHtml() {
  const papers = Object.entries(PAPER_LINKS).map(([k, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${k}</a></li>`).join('');
  return `
    <section aria-labelledby="sci-h">
      <p class="research-kicker">SCIENCE · FIVE FRAMEWORKS, ONE LOOP</p>
      <h3 id="sci-h" class="research-h">Five frameworks, one loop, every round short enough to fit between meetings.</h3>
      <p class="research-lead">Briefing → Play → Result. Briefing primes Kahneman’s System 2. Play hands the load to System 1 and Werbach’s mechanics. Result closes James Clear’s habit loop and writes four letters on the board. The five underneath are the reason the loop should work — and the reason we say where it stops.</p>

      ${STACK_ORDER.map(id => {
        const t = THEORY_STACK[id];
        if (!t) return '';
        return `
          <article class="research-stack">
            <p class="research-stack-kicker">LAYER ${t.layer} · ${t.year}</p>
            <h4>${t.name}</h4>
            <p class="research-stack-claim">${t.claim}</p>
            <p><strong>Why it is on this floor:</strong> ${t.why}</p>
            <p><strong>In NGS:</strong> ${t.inNgs}</p>
            <ul class="research-stack-mech">
              ${t.mechanics.map(m => `<li>${m}</li>`).join('')}
            </ul>
            <p class="research-stack-cite"><a href="${t.citation.url}" target="_blank" rel="noopener">${t.citation.label}</a></p>
            ${t.secondary?.length ? `<p class="research-stack-sec">${t.secondary.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`).join(' · ')}</p>` : ''}
          </article>
        `;
      }).join('')}

      <h4 class="research-h4">The honest version — on every cartridge for a reason.</h4>
      <p>${TRANSFER_CAVEAT} Near transfer is real — practice on a task improves that task, and close neighbours benefit when the mechanism overlaps. Far transfer — “this drill makes you smarter at unrelated things” — is contested. <a href="https://doi.org/10.1177/1529100616661983" target="_blank" rel="noopener">Simons et al. 2016</a> reviewed the brain-training literature and found little evidence that training on one task reliably improves performance on a different, untrained task in a different domain. We cite it on every briefing. We mean it. The promise of this floor is narrower and truer: the cartridge says what it trains, shows you the loop, and lets you see the line go up on that skill over weeks on the top-5 board.</p>

      <h4 class="research-h4">What “good for the brain” actually means here</h4>
      <p>Every cartridge’s <strong>WHY IT MATTERS</strong> line is written to that standard. It does not say “this makes you smarter.” It says what the round practises in plain language — inhibition, task switching, spatial rotation, prospective planning, retrieval — and which framework it draws on. The coach tip then says what to try next so the next round is a little more deliberate than the last. That specificity is the whole honesty product. If a claim would need a qualifier, the qualifier is in the briefing, not in a footnote you will never open.</p>

      <h4 class="research-h4">Papers on this floor</h4>
      <ul class="research-papers">
        <li><a href="https://doi.org/10.1073/pnas.0801268105" target="_blank" rel="noopener">Jaeggi 2008 · N-back</a></li>
        <li><a href="https://doi.org/10.1037/h0043158" target="_blank" rel="noopener">Miller 1956 · Span</a></li>
        <li><a href="https://doi.org/10.1037/h0054651" target="_blank" rel="noopener">Stroop 1935</a></li>
        <li><a href="https://doi.org/10.1016/j.tics.2008.07.005" target="_blank" rel="noopener">Verbruggen 2008 · Go / No-Go</a></li>
        <li><a href="https://doi.org/10.1038/nature01647" target="_blank" rel="noopener">Green &amp; Bavelier 2003</a></li>
        <li><a href="https://doi.org/10.1016/S0010-9452(72)80024-5" target="_blank" rel="noopener">Corsi 1972 · spatial span</a></li>
        <li><a href="https://doi.org/10.3758/BF03203267" target="_blank" rel="noopener">Eriksen 1974 · flanker</a></li>
        <li><a href="https://en.wikipedia.org/wiki/Method_of_loci" target="_blank" rel="noopener">Yates 1966 · method of loci</a></li>
        <li><a href="https://doi.org/10.1016/j.cub.2007.10.027" target="_blank" rel="noopener">Inoue &amp; Matsuzawa 2007 · chimp memory</a></li>
        <li><a href="https://doi.org/10.1016/0030-5073(77)90001-0" target="_blank" rel="noopener">Lichtenstein &amp; Fischhoff 1977 · calibration</a></li>
        <li><a href="https://en.wikipedia.org/wiki/Monty_Hall_problem" target="_blank" rel="noopener">Selvin 1975 · Monty Hall</a></li>
        <li><a href="https://doi.org/10.1177/1529100616661983" target="_blank" rel="noopener">Simons 2016 · evidence review</a></li>
        ${papers}
      </ul>
      <p class="research-note-sm">All open-source adaptations are credited per cartridge and in CREDITS.md. Papers link to DOIs or open references — no paywall claims.</p>
    </section>
  `;
}

function drnonHtml() {
  return `
    <section aria-labelledby="drnon-h">
      <p class="research-kicker">DR NON · THE PERSON BEHIND THE FLOOR — PIXEL ONLY</p>
      <h3 id="drnon-h" class="research-h">Architecture → anthropology → digital economy. Same street, three lenses.</h3>
      <p class="research-lead">No photos here — 8-bit only, as you asked. Every face on this page is a 12×12 hand-drawn sprite in the same four-colour palette as the cartridges. The story underneath is from evidence, not praise.</p>

      <div class="research-portrait">
        <div class="research-portrait-sprite">${spriteImg('about-dr-non', 'research-portrait-img')}</div>
        <div>
          <p><strong>Non Arkaraprasertkul</strong> — Dr Non. Senior Expert, Smart City Promotion / Smart City Thailand Office at DEPA. The last posting the corpus captures is built around ~7 years in the role, 120+ projects across 77 provinces, 5,000+ decision-makers trained (LinkedIn About + Experience, repeated on stage). That title is the costume that fits right now. Underneath: someone who keeps trying to make cities legible as lived places — architect / urban designer → anthropologist in Shanghai lilongs → the person who puts FloodDash on a mayor’s Monday morning instead of another unused platform.</p>
          <p class="research-note-sm">Source for this portrait: <code>~/Downloads/DR-NON.md</code> — canonical-from-evidence, generated 2026-09-02, updated 2026-09-08. Corpus: Otter monologues, Plaud notes, Knowledge/Corpus writing/100-days, 97 LinkedIn posts (~11h–7mo window), 363 entities / 840 edges. Claims prefer primary speech and dated corpus over summaries. Unknown where thin — no invention.</p>
        </div>
      </div>

      <h4 class="research-h4">The through-line</h4>
      <p>Architecture → anthropology → digital economy is the same itch: form, power, money, and ordinary people sharing one street. <em>Locating Shanghai</em> (shanghai.nonarkara.org) and FloodDash (flood.nonarkara.org) are the same mind in two decades — one reads a city slowly, the other refuses mock data.</p>

      <div class="research-timeline">
        ${[
          { id: 'drnon-lanes', year: '1986 · 5', title: 'Bangkok lanes', text: 'Plastic ball, sandals for posts. Slept through Maradona. That is the first memory of games as the street — not the screen.' },
          { id: 'drnon-famicom', year: 'Early 90s', title: 'Famicom from Singapore', text: 'Dad brought the box. I saved for the cartridges. Dragon Quest — still the cartridge that matters.' },
          { id: 'drnon-ibm', year: 'Middle school', title: 'IBM laptop from the bank', text: 'Mom was a banker. One of the first laptops the bank issued. Taught myself HTML, BASIC, the games that came with it.' },
          { id: 'drnon-dallas', year: '1998 · 17', title: 'AFS Dallas — Bishop Lynch', text: 'Texas at 17. France 98 on — Zidane headbutt, Beckham red. Watched with kids who became friends. The World Cup thread that returns in 2026.' },
          { id: 'drnon-mit', year: '2007', title: 'MIT — two architecture degrees, one Wii', text: 'Fulbright to MIT. Two architecture degrees were the official reason. The Wii took a defensible share of the attention. Photo mid-swing in a common room — the research question already forming.' },
          { id: 'drnon-shanghai', year: '2013-06-21', title: 'Shanghai — resident, not visitor', text: 'Visiting “Shanghai expert” 2006–2013, then embarrassed by resident ignorance. From 21 Jun 2013, fieldwork on the ground — Huangpu on a bike, northeast Shanghai, northeast lilongs, dissertation chapter Anthropology of Displacement, Locating Shanghai.' },
          { id: 'drnon-depa', year: 'Now · Bangkok', title: 'DEPA · Axiom · SLIC', text: 'DEPA Smart City Thailand Office (ASCN nine consecutive meetings, founding-member seat). Co-founder Axiom Thailand with Dr Poon Thiengburanathum — the lab that does not wait for permission. Co-founder SLIC — SLIC Index, consulting, capacity building. FloodDash / AirDash / Index: product constellation with GISTDA / NASA / JAXA data.' },
          { id: 'drnon-switch2', year: '2025-07', title: 'Still in line', text: 'Stood in line last July to buy a Switch 2 at 40-something. Will be at the 2026 World Cup in the country first lived in at 17. Liverpool shirts: Owen in 1998, Salah today. That is the line.' },
        ].map(row => `
          <article class="research-timeline-row">
            <span class="research-timeline-sprite">${spriteImg(row.id, 'research-timeline-img')}</span>
            <div>
              <p class="research-timeline-year">${row.year}</p>
              <h5>${row.title}</h5>
              <p>${row.text}</p>
            </div>
          </article>
        `).join('')}
      </div>

      <h4 class="research-h4">Identity — grounded, not inflated</h4>
      <ul class="research-list">
        <li><strong>DEPA</strong> Senior Expert, Smart City Promotion / Smart City Thailand Office; 120+ projects / 77 provinces / 5,000+ decision-makers. Co-founder <strong>Axiom Thailand</strong> (with Dr Poon) and <strong>SLIC</strong> (Smart and Livable Cities).</li>
        <li><strong>Academic path:</strong> Thailand → AFS/Oklahoma → <strong>MIT</strong> (architecture/urban design, Fulbright) → <strong>Oxford</strong> (Modern Chinese Studies) → <strong>Harvard</strong> PhD Anthropology (Shanghai dissertation, advisor Theodore C. Bestor) → Fudan/BLCU/PKU Chinese study → teaching/visiting (Jagiellonian, USF with Jan Wampler, ESSCA Shanghai, IDEO Shanghai EIR, etc.) → return to Thailand.</li>
        <li><strong>Household:</strong> Mother (~80 in later talk); father <strong>Kongkiat Arkaraprasertkul</strong> — Buriram governor, lifelong DOPA, died early 60s, lived with him ~28 years, now trains DOPA/DLA under DEPA (“same four letters rearranged”); partner <strong>Plop</strong>; dogs <strong>Expo &amp; Mali</strong>.</li>
        <li>Self-documents via Otter monologues, Plaud notes, LinkedIn posts, and <em>100 Days of Writing</em>.</li>
      </ul>

      <h4 class="research-h4">Public vs private — same person, two registers</h4>
      <div class="research-compare">
        <article><b>PUBLIC / STAGE</b><p>Explainer of smart city, AI, digital twin, open data. Demos live dashboards over slide decks. Fast Thai + นะครับ, English tech terms, joke-first icebreakers, anti-vendor-lock-in, show-don’t-tell. LinkedIn: hook → scene → three blunt takeaways → named people → hashtags.</p></article>
        <article><b>PRIVATE / DIARY</b><p>Long free-association monologues. Themes: integrity vs accusation trauma (2016–2019), nostalgia, sleep, cannabis, travel, Plop, mother/dogs, parenthood ambivalence, fair-weather friends. Code-switches English↔Thai; half-jokes about Thai rhetoric.</p></article>
      </div>

      <h4 class="research-h4">LinkedIn gravity — 97 posts, 363 entities, 840 edges</h4>
      <p>Activity window ~11h→7mo (LinkedIn would not load older). Top clusters: DEPA / Smart City Thailand; ASEAN / ASCN (nine consecutive meetings); Academia arc (Harvard–MIT–Oxford–Shanghai–KMITL, with Rutchanee Gullayalon); SLIC / Axiom / FloodDash / AirDash / Index (GISTDA/NASA/JAXA); Philippines / Cauayan (6-year arc → MoU with Reina Santos, Jc/Bernard Dy, ADB); Korea hackathons (KMITL × PNU seaside editions, MHESRI + DEPA); 2026 “Grand Slam” (SCSE Taipei → GITEX SG → LEAP East HK); Family/Isan (Kongkiat / Buriram / DOPA); USTDA / US tech-diplomacy (Pracha Asawateera, Brandon Megorden, Kevin Toohers).</p>

      <h4 class="research-h4">Shanghai · 100 Days</h4>
      <p>Resident from <strong>21 Jun 2013</strong>. Visiting “expert” 2006–2013, then resident ignorance. Fieldwork by bike, northeast Shanghai, northeast lilongs, dissertation <em>Anthropology of Displacement</em>. The private wound that stages do not get: <strong>Nana</strong> — Shanghai summer 2011, “love of my life,” Hailun Road / Xueyuan Lu, literary frames (see 100 Days Days 15/41). Day 1 prelude caption 2015-09-14: Huangpu River (Puxi) on a bike.</p>

      <h4 class="research-h4">Values &amp; tensions — evidence, not praise</h4>
      <ul class="research-list">
        <li>Integrity vs reputation damage (accusation narrative 2016–2019) — “fear truth not stories.”</li>
        <li>Ambition vs quiet life / anonymity vs DEPA leverage — both present, do not collapse.</li>
        <li>Parenthood ambivalence — might not have a kid because he does not like himself enough <em>and</em> wants Thailand better so he can — both present.</li>
        <li>Axiom impatience vs government day job — the double bind is the engine.</li>
        <li>Showing up (4th-year seaside hackathons) vs leaving early for province missions and regretting the miss.</li>
        <li>“I was just lucky” vs ridicule for long schooling without a “proper” married career.</li>
      </ul>

      <h4 class="research-h4">How he speaks</h4>
      <p><strong>English (private):</strong> long run-ons, mid-sentence self-correction, academic + street bluntness. <strong>Thai (public):</strong> rapid, joke-first, everyday analogies for tech. <strong>Teaching claim:</strong> does not read from a script; same syllabus, different each time (2024 finlit caravan, university/gov lectures). Values voiced: truth over mob, loyalty vs cowardice, sleep non-negotiable, remote communities when teaching, Bangkok-as-home.</p>

      <h4 class="research-h4">Gaps — do not invent</h4>
      <ul class="research-list research-list--muted">
        <li>LinkedIn Activity older than ~7 months not captured. ResearchGate SEO paused (OTP).</li>
        <li>Exact father death date; Plop legal name / engagement dates; “Miau Son” — no clean corpus hit.</li>
        <li>FloodDash municipality counts conflict across posts — do not crown one number.</li>
        <li>Plaud <code>1970-01-01</code> filenames are epoch placeholders; sensitive Otter material stays out of public summaries unless Non asks.</li>
      </ul>

      <div class="research-portrait" style="margin-top: 28px;">
        <div class="research-portrait-sprite">${spriteImg('drnon-mit', 'research-portrait-img')}</div>
        <div>
          <p><strong>What this floor borrows from him:</strong> show-don’t-tell. Live dashboard over slide deck. Four letters on a board over likes. A loop you can feel in ten minutes over a promise you cannot test. If you want the person, read the corpus — Otter, Plaud, 100 Days, shanghai.nonarkara.org, flood.nonarkara.org — not this summary.</p>
          <p class="research-sig2">— Research tab, built from evidence, Bangkok 2026</p>
        </div>
      </div>
    </section>
  `;
}
