/**
 * OmniArcade · Labs
 * ------------------------------------------------------------------
 * Dr Non's personal games portal. The first game is a trivia about
 * the things he likes / engages with — books, philosophy, bikes,
 * Shanghai, music. Future games go here.
 *
 * To add a new trivia: append an object to `trivias` below. That's it.
 * To add a brand new game type: write a new renderXxx(container, onClose)
 * and export it from this file, then add a card to the Games catalog in
 * app.js pointing at it.
 * ------------------------------------------------------------------
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

/* ===========================================================================
 * TRIVIA LIBRARY
 * Each trivia is a self-contained pack: id, title, icon, optional color,
 * and a `questions` array. Each question has 2-4 options and a `correct`
 * index. Add new ones here. The engine handles the rest.
 * ========================================================================== */
const trivias = [
  {
    id: 'non-reading',
    title: 'Non-Reading Room',
    subtitle: 'Books, authors, ideas — the canon that built the man',
    icon: '📚',
    color: 'c-language',
    questions: [
      { q: "What is Dr Non's favorite Murakami non-fiction?",
        options: ['Norwegian Wood', 'What I Talk About When I Talk About Running', '1Q84', 'Kafka on the Shore'],
        correct: 1 },
      { q: "Which Murakami novel is his favorite fiction?",
        options: ['A Wild Sheep Chase', 'The Wild Sheep Chase', 'Dance Dance Dance', 'Hard-Boiled Wonderland'],
        correct: 1 },
      { q: "Which Raymond Carver collection inspired Murakami's running memoir title?",
        options: ['What We Talk About When We Talk About Love', 'Where I\'m Calling From', 'Will You Please Be Quiet, Please?', 'Cathedral'],
        correct: 0 },
      { q: "What was Dr Non trained as before he turned anthropologist?",
        options: ['Economist', 'Architect & urban designer', 'Historian', 'Journalist'],
        correct: 1 },
      { q: "Who wrote A Treatise of Human Nature?",
        options: ['David Hume', 'Immanuel Kant', 'Gottfried Wilhelm Leibniz', 'Adam Smith'],
        correct: 0 },
      { q: "Roland Barthes' book about writing for writing's sake is called…",
        options: ['Writing Degree Zero', 'The Order of Things', 'Mythologies', 'Camera Lucida'],
        correct: 0 },
      { q: "Which historian's audiobook kept Dr Non company on his Shanghai rides?",
        options: ['Howard Zinn', 'Eric Hobsbawm', 'Yuval Noah Harari', 'Simon Schama'],
        correct: 0 },
      { q: "Which James Joyce technique did Dr Non explicitly call out?",
        options: ['Free indirect discourse', 'Stream of consciousness', 'Interior monologue', 'Epiphany'],
        correct: 1 }
    ]
  },
  {
    id: 'non-bike',
    title: 'Bike Life',
    subtitle: 'Two wheels, 24 km/h, Shanghai',
    icon: '🚲',
    color: 'c-arcade',
    questions: [
      { q: "What folding bike does Dr Non ride?",
        options: ['Dahon', 'Brompton', 'Tern', 'Montague'],
        correct: 1 },
      { q: "Where is the Brompton manufactured?",
        options: ['Germany', 'Netherlands', 'UK', 'Taiwan'],
        correct: 2 },
      { q: "How old was he when he bought the Brompton?",
        options: ['30', '31', '32', '33'],
        correct: 3 },
      { q: "Where did he buy it?",
        options: ['A shop in Shanghai', 'Uptown Manhattan', 'Online, shipped to China', 'A second-hand dealer in Hong Kong'],
        correct: 1 },
      { q: "What speed (km/h) did he balance at while thinking about Leibniz?",
        options: ['18', '20', '24', '32'],
        correct: 2 },
      { q: "Farthest one-way ride mentioned in the blog?",
        options: ['20 km', '24 km', '28 km', '40 km'],
        correct: 2 },
      { q: "Why did he buy the Brompton — his real reason?",
        options: ['His father always wanted one', 'It was on sale', 'A friend recommended it', 'A gift from his supervisor'],
        correct: 0 },
      { q: "Which route ends at the International Cruise Terminal?",
        options: ['The Pudong loop', 'The tip of the Yangtze River Delta', 'The Suzhou Creek path', 'Line 1 to the end'],
        correct: 1 }
    ]
  },
  {
    id: 'non-shanghai',
    title: 'Shanghai Stories',
    subtitle: 'Three years, a thousand horn honks',
    icon: '🌃',
    color: 'c-kids',
    questions: [
      { q: "When did Dr Non first arrive in Shanghai?",
        options: ['Summer 2011', '21 June 2013', 'Autumn 2014', 'Spring 2015'],
        correct: 1 },
      { q: "Which university is he affiliated with as a PhD student?",
        options: ['Tongji', 'Fudan', 'Jiao Tong', 'East China Normal'],
        correct: 1 },
      { q: "Which district of Shanghai does he live in?",
        options: ['Xuhui', 'Jing\'an', 'Yangpu', 'Pudong'],
        correct: 2 },
      { q: "What was the 'Thai Cultural Day' event?",
        options: ['A temple fair', 'A university event at Fudan', 'A government ceremony', 'A cooking class'],
        correct: 1 },
      { q: "Which Shanghai road has photos from the blog?",
        options: ['Nanjing Road', 'Fuzhou Road', 'Huaihai Road', 'Yan\'an Road'],
        correct: 1 },
      { q: "What did he ride all the way to the tip of?",
        options: ['The Bund', 'The Yangtze River Delta', 'Pudong Airport', 'The Suzhou Creek'],
        correct: 1 },
      { q: "Which expat friend took the SOAS route back to London?",
        options: ['Harry den Hartog', 'Mr. Hu', 'Leo Pang', 'Nigel Warburton'],
        correct: 2 },
      { q: "What frustrates Dr Non most about Shanghai drivers?",
        options: ['Running red lights', 'Excessive horn-honking', 'Wrong-side driving', 'Blocking bike lanes'],
        correct: 1 }
    ]
  },
  {
    id: 'non-thinkers',
    title: 'Philosophers\' Table',
    subtitle: 'Kant, Hume, Confucius, the lot',
    icon: '🧠',
    color: 'c-science',
    questions: [
      { q: "Whose enlightenment quote: 'men emerge from their self-imposed immaturity'?",
        options: ['Kant', 'Hume', 'Leibniz', 'Voltaire'],
        correct: 0 },
      { q: "Which philosopher is associated with 'the best of all possible worlds'?",
        options: ['Spinoza', 'Leibniz', 'Descartes', 'Berkeley'],
        correct: 1 },
      { q: "Confucius, at seventy, could…",
        options: ['Travel the kingdom', 'Follow the dictates of his own heart', 'Teach without words', 'Set his heart upon learning'],
        correct: 1 },
      { q: "Which philosopher's 'A Treatise of Human Nature' is the source of 'I never can catch myself'?",
        options: ['Locke', 'Hume', 'Berkeley', 'Kant'],
        correct: 1 },
      { q: "The couple Dr Non admires for non-possessive love?",
        options: ['Simone de Beauvoir & Jean-Paul Sartre', 'Friedrich & Zsa Zsa', 'Iris Murdoch & John Bayley', 'Hannah Arendt & Heinrich Blücher'],
        correct: 0 },
      { q: "Which philosopher wrote 'Justice' (the book Dr Non quotes on sex)?",
        options: ['Michael Sandel', 'Martha Nussbaum', 'Peter Singer', 'John Rawls'],
        correct: 0 },
      { q: "What Buddhist idea influenced David Hume's view of the self?",
        options: ['Anatta (no-self)', 'Sunyata (emptiness)', 'Pratityasamutpada (dependent origination)', 'Dukkha (suffering)'],
        correct: 0 },
      { q: "Which social psychologist does Dr Non cite on reflection?",
        options: ['Daniel Kahneman', 'Alison Gopnik', 'Steven Pinker', 'Carol Dweck'],
        correct: 1 }
    ]
  },
  {
    id: 'non-sound',
    title: 'Sound & Frequency',
    subtitle: 'Podcasts, ukulele, what he listens to while biking',
    icon: '🎧',
    color: 'c-music',
    questions: [
      { q: "Two philosophy podcasts Dr Non listens to:",
        options: ['Very Bad Wizards + Rationally Speaking', 'Philosophy Bites + Philosophize This', 'The Partially Examined Life + The History of Philosophy Without Any Gaps', 'Savage Lovecasts + Philosophize This'],
        correct: 1 },
      { q: "Who hosts Philosophy Bites?",
        options: ['Nigel Warburton & David Edmond', 'Stephen West & Nigel Warburton', 'Edmund & West', 'David Hume & Nigel Warburton'],
        correct: 0 },
      { q: "Host of Philosophize This?",
        options: ['Stephen West', 'Steven West', 'Steve Weston', 'Stefan Westerweld'],
        correct: 1 },
      { q: "Which song's title does Dr Non borrow for the line 'Tradition: what\'s it good for?'",
        options: ['War — Edwin Starr', 'What\'s Going On — Marvin Gaye', 'Fortunate Son — CCR', 'Fight the Power — Public Enemy'],
        correct: 0 },
      { q: "What instruments does Dr Non play at home?",
        options: ['Piano & harmonica', 'Ukulele & guitar', 'Bass & mandolin', 'Violin & erhu'],
        correct: 1 },
      { q: "Which Malcolm Gladwell book was he listening to on audio?",
        options: ['Outliers', 'Blink', 'All of them, "you name it"', 'The Tipping Point'],
        correct: 2 },
      { q: "Which TV show does he have at home and watch often?",
        options: ['CNN', 'BBC World', 'NHK World Channel', 'Al Jazeera English'],
        correct: 2 },
      { q: "Which TV episode does he reference about horn-honking and authority?",
        options: ['Modern Family — Mitch and Cam\'s loudspeaker car', 'Parks and Rec — Leslie\'s campaign megaphone', 'The Office — Meredith\'s horn', 'Brooklyn Nine-Nine — the car alarm'],
        correct: 0 }
    ]
  }
];

/* ===========================================================================
 * ENGINE
 * Renders the trivia hub (list of trivias) then a single trivia when chosen.
 * ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderHub(container, onClose) {
  container.innerHTML = `
    <div class="labs-modal">
      <div class="labs-head">
        <button id="labs-close" class="axiom-close-btn">✕ CLOSE</button>
        <div class="labs-eyebrow">🧪 LABS · PERSONAL PORTAL</div>
        <h2 class="labs-title">Pick a trivia</h2>
        <p class="labs-sub">Each one is hand-curated from Dr Non's own books, bike rides, and 100 days of writing. Play with friends. Add your own — see <code>labsGames.js</code>.</p>
      </div>
      <div class="labs-grid">
        ${trivias.map(t => `
          <button class="labs-card labs-card--${t.color}" data-trivia="${t.id}" aria-label="Play ${t.title}">
            <span class="labs-card-icon">${t.icon}</span>
            <span class="labs-card-title">${t.title}</span>
            <span class="labs-card-sub">${t.subtitle}</span>
            <span class="labs-card-meta">${t.questions.length} questions</span>
          </button>
        `).join('')}
      </div>
      <div class="labs-foot">
        <span class="labs-lock">🔒 PERSONAL · NOT ON THE PUBLIC GRID</span>
        <span class="labs-foot-meta">v1 · 5 trivias · 40 questions</span>
      </div>
    </div>
  `;
  $('#labs-close', container).onclick = onClose;
  container.querySelectorAll('.labs-card').forEach(btn => {
    btn.onclick = () => {
      soundFx.playClick();
      const t = trivias.find(x => x.id === btn.dataset.trivia);
      if (t) runTrivia(container, onClose, t);
    };
  });
}

function runTrivia(container, onClose, trivia) {
  // Shuffle questions so each play differs
  const qs = shuffle(trivia.questions).slice(0, 10);
  let i = 0, score = 0, answered = false;

  function renderQ() {
    answered = false;
    const q = qs[i];
    container.innerHTML = `
      <div class="labs-modal labs-modal--quiz">
        <div class="labs-head">
          <button id="labs-close" class="axiom-close-btn">✕ CLOSE</button>
          <div class="labs-eyebrow">🧪 ${trivia.title.toUpperCase()}</div>
          <div class="labs-progress">
            <span class="labs-progress-text">Q ${i + 1} / ${qs.length}</span>
            <div class="labs-progress-bar"><div class="labs-progress-fill" style="width:${(i / qs.length) * 100}%"></div></div>
            <span class="labs-progress-score">SCORE ${score}</span>
          </div>
        </div>
        <div class="labs-question">${q.q}</div>
        <div class="labs-options">
          ${q.options.map((opt, idx) => `
            <button class="labs-option" data-idx="${idx}">
              <span class="labs-option-letter">${String.fromCharCode(65 + idx)}</span>
              <span class="labs-option-text">${opt}</span>
            </button>
          `).join('')}
        </div>
        <div class="labs-foot">
          <button class="labs-back" id="labs-back-hub">← back to trivias</button>
          <span class="labs-foot-meta">${trivia.subtitle}</span>
        </div>
      </div>
    `;
    $('#labs-close', container).onclick = onClose;
    $('#labs-back-hub', container).onclick = () => { soundFx.playClick(); renderHub(container, onClose); };
    container.querySelectorAll('.labs-option').forEach(btn => {
      btn.onclick = () => answer(parseInt(btn.dataset.idx, 10));
    });
  }

  function answer(idx) {
    if (answered) return;
    answered = true;
    const q = qs[i];
    const correct = idx === q.correct;
    if (correct) { score += 10; soundFx.playCoin(); } else { soundFx.playHit(); }
    // Reveal correct / wrong inline
    container.querySelectorAll('.labs-option').forEach((btn, n) => {
      btn.disabled = true;
      if (n === q.correct) btn.classList.add('is-correct');
      else if (n === idx) btn.classList.add('is-wrong');
    });
    setTimeout(() => { i++; if (i >= qs.length) return end(); renderQ(); }, 900);
  }

  function end() {
    const max = qs.length * 10;
    let tone = 'over', title = 'Trivia done', msg = `${score} / ${max} points.`;
    if (score === max) { tone = 'win'; title = 'Perfect.'; msg = `100%. The canon is locked in.`; }
    else if (score >= max * 0.7) { tone = 'win'; title = 'Strong run.'; msg = `${score} / ${max} — you know the canon.`; }
    else if (score >= max * 0.4) { title = 'Not bad.'; msg = `${score} / ${max} — room to read more of the source material.`; }
    else { title = 'Time to read the blog.'; msg = `${score} / ${max} — go to nonharvard and start from Day 1.`; }
    showResult({
      container,
      title,
      message: msg,
      score,
      gameId: `labs-${trivia.id}`,
      tone,
      onRestart: () => runTrivia(container, onClose, trivia),
      onClose
    });
  }

  renderQ();
}

/* ===========================================================================
 * PUBLIC: the single game entry. The catalog in app.js points at this.
 * ========================================================================== */
export function renderNonTrivial(container, onClose) {
  renderHub(container, onClose);
}
