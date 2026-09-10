/**
 * NGS Labs · Heads Up! — single-device party game.
 *
 * How to play in the room:
 *   1. The guesser holds the phone with the screen facing AWAY from them
 *      (toward the rest of the group) or turns their back to it.
 *   2. Everyone else sees the word and shouts clues, acts, or sings.
 *   3. The group taps GOT IT when the guesser names the word;
 *      taps PASS to skip.
 *   4. Round ends at 60 seconds. Score = correct guesses.
 *
 * This is the trade-off vs the real app: the phone is one-handed and
 * the timer is visible to everyone, so the score is genuinely shared.
 * No head-tilt — buttons are big enough to hit by feel.
 *
 * Pure helpers (no DOM) for testing:
 *   - CATEGORIES            list of {id, label, words}
 *   - poolFor(categoryId)   shuffled words for a category
 *   - pickWord(remaining)   next word from the pool
 *   - scoreMessage(score)   end-of-round message tied to the band
 */
import { soundFx } from '../audio.js';
import { showResult } from '../ui.js';

const FRAME = 'relative bg-black border border-amber-500/40 p-4 sm:p-6 text-white max-w-2xl mx-auto font-mono-hud';
const closeButton = () => '<button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">CLOSE</button>';

const ROUND_SECONDS = 60;

const CATEGORIES = [
  {
    id: 'books',
    label: 'BOOKS',
    desc: 'Famous titles and series. Hint: name the work, not the author.',
    words: [
      'Harry Potter', 'The Hobbit', '1984', 'To Kill a Mockingbird', 'Pride and Prejudice',
      'The Great Gatsby', 'Moby-Dick', 'War and Peace', 'Crime and Punishment',
      'The Catcher in the Rye', 'Brave New World', 'The Lord of the Rings', 'The Chronicles of Narnia',
      'A Tale of Two Cities', 'Don Quixote', 'The Odyssey', 'Hamlet', 'Macbeth',
      'Romeo and Juliet', 'The Divine Comedy', 'Catch-22', 'Slaughterhouse-Five',
      'One Hundred Years of Solitude', 'The Alchemist', 'The Da Vinci Code', 'The Kite Runner',
      'Life of Pi', 'The Book Thief', 'Educated', 'Becoming', 'Sapiens',
      'Thinking, Fast and Slow', 'The Power of Habit', 'Atomic Habits', 'Man\u2019s Search for Meaning',
      'The Art of War', 'Meditations', 'Thus Spoke Zarathustra', 'The Little Prince',
      'Charlotte\u2019s Web', 'Where the Wild Things Are', 'The Cat in the Hat',
      'A Game of Thrones', 'The Hunger Games', 'The Fault in Our Stars',
      'Gone Girl', 'The Girl with the Dragon Tattoo', 'Sherlock Holmes', 'Dracula',
      'Frankenstein', 'The Picture of Dorian Gray', 'Lolita', 'On the Road'
    ]
  },
  {
    id: 'sports',
    label: 'SPORTS',
    desc: 'Name the sport. Act it out if stuck.',
    words: [
      'Soccer', 'Basketball', 'Tennis', 'Cricket', 'Rugby', 'American Football',
      'Baseball', 'Ice Hockey', 'Field Hockey', 'Golf', 'Boxing', 'MMA',
      'Wrestling', 'Fencing', 'Swimming', 'Diving', 'Water Polo', 'Synchronized Swimming',
      'Gymnastics', 'Figure Skating', 'Speed Skating', 'Skiing', 'Snowboarding',
      'Surfing', 'Sailing', 'Rowing', 'Canoeing', 'Kayaking', 'Cycling',
      'Marathon', 'Triathlon', 'Decathlon', 'Pentathlon', 'High Jump', 'Long Jump',
      'Pole Vault', 'Shot Put', 'Discus', 'Javelin', 'Hammer Throw', 'Steeplechase',
      'Badminton', 'Table Tennis', 'Squash', 'Volleyball', 'Beach Volleyball',
      'Handball', 'Netball', 'Lacrosse', 'Polo', 'Archery', 'Shooting',
      'Equestrian', 'Polo', 'Bobsled', 'Luge', 'Skeleton', 'Curling', 'Biathlon',
      'Sumo', 'Judo', 'Karate', 'Taekwondo', 'Kung Fu', 'Kickboxing', 'Kendo'
    ]
  },
  {
    id: 'sports-players',
    label: 'SPORTS PLAYERS',
    desc: 'Famous athletes. First or last name is enough.',
    words: [
      'Lionel Messi', 'Cristiano Ronaldo', 'Neymar', 'Kylian Mbapp\u00e9', 'Erling Haaland',
      'Mohamed Salah', 'Sadio Man\u00e9', 'Zlatan Ibrahimovi\u0107', 'Andres Iniesta', 'Xavi',
      'Pele', 'Maradona', 'Ronaldinho', 'David Beckham', 'Wayne Rooney',
      'Serena Williams', 'Venus Williams', 'Naomi Osaka', 'Coco Gauff', 'Iga Swiatek',
      'Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Andy Murray', 'Pete Sampras',
      'Michael Jordan', 'LeBron James', 'Kobe Bryant', 'Stephen Curry', 'Kevin Durant',
      'Shaquille O\u2019Neal', 'Larry Bird', 'Magic Johnson', 'Michael Phelps', 'Usain Bolt',
      'Tiger Woods', 'Jack Nicklaus', 'Phil Mickelson', 'Rory McIlroy', 'Arnold Palmer',
      'Tom Brady', 'Peyton Manning', 'Aaron Rodgers', 'Patrick Mahomes', 'Joe Montana',
      'Wayne Gretzky', 'Sidney Crosby', 'Mario Lemieux', 'Connor McDavid', 'Alexander Ovechkin',
      'Mike Tyson', 'Muhammad Ali', 'Floyd Mayweather', 'Manny Pacquiao', 'Conor McGregor',
      'Michael Schumacher', 'Lewis Hamilton', 'Max Verstappen', 'Sebastian Vettel', 'Ayrton Senna',
      'Yohan Blake', 'Justin Gatlin', 'Shelly-Ann Fraser-Pryce', 'Jasmine Camacho-Quinn', 'Sydney McLaughlin'
    ]
  },
  {
    id: 'actors',
    label: 'FAMOUS ACTORS',
    desc: 'Stage or screen. First or last name is enough.',
    words: [
      'Tom Hanks', 'Meryl Streep', 'Brad Pitt', 'Angelina Jolie', 'George Clooney',
      'Leonardo DiCaprio', 'Cate Blanchett', 'Robert De Niro', 'Al Pacino', 'Jack Nicholson',
      'Denzel Washington', 'Morgan Freeman', 'Samuel L. Jackson', 'Viola Davis', 'Cillian Murphy',
      'Matt Damon', 'Julia Roberts', 'Natalie Portman', 'Scarlett Johansson', 'Margot Robbie',
      'Ryan Gosling', 'Emma Stone', 'Anne Hathaway', 'Hugh Jackman', 'Christian Bale',
      'Joaquin Phoenix', 'Heath Ledger', 'Jodie Foster', 'Robin Williams', 'Will Smith',
      'Halle Berry', 'Keanu Reeves', 'John Travolta', 'Samuel L. Jackson', 'Steve Carell',
      'Drew Barrymore', 'Reese Witherspoon', 'Jennifer Lawrence', 'Chris Hemsworth', 'Chris Evans',
      'Robert Downey Jr.', 'Mark Ruffalo', 'Chris Pratt', 'Zendaya', 'Florence Pugh',
      'Timoth\u00e9e Chalamet', 'Saoirse Ronan', 'Tilda Swinton', 'Idris Elba', 'Daniel Craig',
      'Tom Cruise', 'Harrison Ford', 'Robert Redford', 'Dustin Hoffman', 'Marlon Brando'
    ]
  },
  {
    id: 'movies',
    label: 'MOVIES',
    desc: 'Films, franchises, and series. One word of the title is fine.',
    words: [
      'Titanic', 'The Godfather', 'Star Wars', 'The Shawshank Redemption', 'Forrest Gump',
      'The Dark Knight', 'Pulp Fiction', 'Fight Club', 'Inception', 'The Matrix',
      'Goodfellas', 'Casablanca', 'The Wizard of Oz', 'Citizen Kane', 'Vertigo',
      'Schindler\u2019s List', 'The Silence of the Lambs', 'Saving Private Ryan', 'Jurassic Park',
      'E.T.', 'Jaws', 'Alien', 'The Terminator', 'Back to the Future',
      'The Lion King', 'Toy Story', 'Finding Nemo', 'Shrek', 'Frozen',
      'The Avengers', 'Iron Man', 'Black Panther', 'Spider-Man', 'Batman Begins',
      'Harry Potter', 'The Lord of the Rings', 'The Hobbit', 'Pirates of the Caribbean',
      'James Bond', 'Mission Impossible', 'Indiana Jones', 'Rocky', 'Rambo',
      'Die Hard', 'The Bourne Identity', 'Ocean\u2019s Eleven', 'The Hangover', 'Bridesmaids',
      'Mean Girls', 'The Devil Wears Prada', 'Forrest Gump', 'Cast Away', 'The Departed',
      'Gladiator', 'Braveheart', '300', 'Troy', 'Kingdom of Heaven', 'Dune'
    ]
  },
  {
    id: 'food',
    label: 'FOOD',
    desc: 'Dishes, ingredients, and cuisines. Eat your heart out.',
    words: [
      'Pizza', 'Sushi', 'Tacos', 'Pad Thai', 'Ramen', 'Pho', 'Curry',
      'Burger', 'Cheeseburger', 'Hot Dog', 'Sandwich', 'Club Sandwich', 'BLT',
      'Caesar Salad', 'Cobb Salad', 'Greek Salad', 'Caprese', 'Bruschetta',
      'Spaghetti Carbonara', 'Lasagna', 'Ravioli', 'Penne Arrabbiata', 'Fettuccine Alfredo',
      'Risotto', 'Gnocchi', 'Tiramisu', 'Panna Cotta', 'Gelato',
      'Croissant', 'Baguette', 'Sourdough', 'Pretzel', 'Donut', 'Bagel',
      'Pancake', 'Waffle', 'French Toast', 'Omelette', 'Eggs Benedict', 'Shakshuka',
      'Biryani', 'Tikka Masala', 'Samosa', 'Naan', 'Butter Chicken', 'Tandoori',
      'Falafel', 'Hummus', 'Shawarma', 'Kebab', 'Baba Ganoush', 'Tabbouleh',
      'Kimchi', 'Bibimbap', 'Bulgogi', 'Japchae', 'Tteokbokki', 'Korean BBQ',
      'Dim Sum', 'Peking Duck', 'Mapo Tofu', 'Kung Pao Chicken', 'Chow Mein', 'Fried Rice',
      'Tom Yum', 'Green Curry', 'Massaman', 'Mango Sticky Rice', 'Tom Kha Gai',
      'Ceviche', 'Empanada', 'Arepa', 'Churro', 'Paella', 'Gazpacho',
      'Fish and Chips', 'Shepherd\u2019s Pie', 'Bangers and Mash', 'Yorkshire Pudding',
      'Beef Wellington', 'Cottage Pie', 'Trifle', 'Eton Mess'
    ]
  }
];

/** Mixed pool = union of all categories, deduplicated. */
function buildMixed() {
  const seen = new Set();
  const out = [];
  for (const cat of CATEGORIES) {
    for (const w of cat.words) {
      const key = w.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(w);
    }
  }
  return out;
}

const MIXED_WORDS = buildMixed();

/** Exported for testing — full list of categories, with the synthetic "mixed" one. */
export const CATEGORIES_PUBLIC = [
  ...CATEGORIES,
  { id: 'mixed', label: 'MIXED', desc: 'Everything across all categories.', words: MIXED_WORDS }
];

export function poolFor(categoryId) {
  const cat = CATEGORIES_PUBLIC.find(c => c.id === categoryId);
  if (!cat) return [];
  // Shuffle a copy so consecutive categories share less.
  const arr = cat.words.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick the next word from a (possibly already-depleted) pool.
 *  When the pool runs out, reshuffle from the original category so the
 *  round can keep going until the timer runs out. */
export function pickWord(state, category) {
  if (!state.remaining || state.remaining.length === 0) {
    state.remaining = poolFor(category.id);
    state.reshuffles = (state.reshuffles || 0) + 1;
  }
  return state.remaining.pop();
}

export function scoreMessage(score) {
  if (score >= 25) return 'TELEPATHIC. The group is basically one brain.';
  if (score >= 18) return 'QUICK HANDS. The category barely slowed you down.';
  if (score >= 12) return 'WARM. Another round will crack 20.';
  if (score >= 6)  return 'STEADY. The clues are getting tighter.';
  return 'RUSTY. Try a category everyone actually knows.';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Renderer
 * ──────────────────────────────────────────────────────────────────────── */
export function renderHeadsUp(container, onClose) {
  start();

  function start() {
    let phase = 'pick';        // 'pick' | 'play' | 'done'
    let category = null;       // chosen category object
    let word = '';             // current word on screen
    let correct = 0;
    let passed = 0;
    let secondsLeft = ROUND_SECONDS;
    let timerId = null;
    const state = { remaining: [], reshuffles: 0 };

    function startRound(cat) {
      category = cat;
      state.remaining = poolFor(cat.id);
      state.reshuffles = 0;
      correct = 0;
      passed = 0;
      secondsLeft = ROUND_SECONDS;
      word = state.remaining.pop();
      phase = 'play';
      soundFx.playCoin();
      tickTimer();
      render();
    }

    function tickTimer() {
      if (timerId) clearInterval(timerId);
      timerId = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
          clearInterval(timerId);
          timerId = null;
          endRound();
          return;
        }
        // Just update the timer display; don't re-render the whole screen
        // every second (the word area would flash).
        const tEl = container.querySelector('[data-timer]');
        if (tEl) tEl.textContent = secondsLeft;
        const barEl = container.querySelector('[data-timer-bar]');
        if (barEl) {
          const pct = Math.max(0, (secondsLeft / ROUND_SECONDS) * 100);
          barEl.style.width = pct + '%';
        }
      }, 1000);
    }

    function gotIt() {
      correct++;
      word = pickWord(state, category);
      soundFx.playCoin();
      render();
    }

    function passWord() {
      passed++;
      word = pickWord(state, category);
      soundFx.playClick();
      render();
    }

    function endRound() {
      phase = 'done';
      const title = correct >= 18 ? 'TELEPATHIC' : correct >= 12 ? 'CRACKED IT' : 'ROUND OVER';
      const msg = `${correct} correct, ${passed} passed in ${ROUND_SECONDS} seconds. ${scoreMessage(correct)}`;
      showResult({
        container, title, message: msg,
        gameId: 'heads-up', score: correct,
        tone: correct >= 12 ? 'win' : 'over',
        onRestart: () => { phase = 'pick'; render(); },
        onClose
      });
    }

    function backToPick() {
      if (timerId) { clearInterval(timerId); timerId = null; }
      phase = 'pick';
      render();
    }

    function render() {
      if (phase === 'pick') {
        const buttons = CATEGORIES_PUBLIC.map(cat =>
          `<button data-cat="${cat.id}" class="block w-full text-left p-3 border-2 border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10 transition-colors">
            <div class="text-amber-400 font-black tracking-widest text-base">${cat.label}</div>
            <div class="text-zinc-400 text-xs">${cat.desc}</div>
            <div class="text-amber-500/50 text-[10px] mt-1">${cat.words.length} words</div>
          </button>`
        ).join('');
        container.innerHTML = `
          <div class="${FRAME}">
            <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
              <div>
                <h2 class="text-xl font-black text-amber-400 tracking-wider">HEADS UP!</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">60 seconds · big word · shout clues</p>
              </div>
              ${closeButton()}
            </div>
            <div class="bg-amber-500/10 border border-amber-500/40 p-3 mb-3 text-xs text-zinc-300 leading-relaxed">
              Hold the phone with the screen facing the rest of the room. The guesser says the word out loud; the group taps <b class="text-green-400">GOT IT</b> or <b class="text-red-400">PASS</b>. Round ends at 60 seconds.
            </div>
            <div class="space-y-2">${buttons}</div>
          </div>`;
        container.querySelector('#close-game-btn').onclick = onClose;
        container.querySelectorAll('[data-cat]').forEach(btn => {
          btn.onclick = () => {
            const cat = CATEGORIES_PUBLIC.find(c => c.id === btn.dataset.cat);
            if (cat) startRound(cat);
          };
        });
        return;
      }

      if (phase === 'play') {
        const pct = Math.max(0, (secondsLeft / ROUND_SECONDS) * 100);
        container.innerHTML = `
          <div class="${FRAME}">
            <div class="flex justify-between items-center mb-3 border-b border-amber-500/40 pb-2">
              <div>
                <h2 class="text-xl font-black text-amber-400 tracking-wider">${category.label}</h2>
                <p class="text-[10px] text-amber-500/80 uppercase">Hold the phone facing the room</p>
              </div>
              ${closeButton()}
            </div>
            <div class="flex justify-between bg-zinc-950 border border-amber-500/40 p-2 mb-2 text-xs font-bold text-center">
              <span>GOT IT<br><b class="text-green-400 text-base">${correct}</b></span>
              <span>TIME<br><b data-timer class="text-amber-400 text-base">${secondsLeft}</b></span>
              <span>PASS<br><b class="text-red-400 text-base">${passed}</b></span>
            </div>
            <div class="w-full bg-zinc-900 h-1 mb-3 border border-amber-500/30">
              <div data-timer-bar class="h-full bg-amber-400" style="width:${pct}%"></div>
            </div>
            <div class="bg-zinc-950 border-2 border-amber-500/60 p-8 mb-4 flex items-center justify-center" style="min-height:220px">
              <div class="text-amber-400 font-black text-3xl sm:text-4xl text-center break-words leading-tight" style="word-break:break-word">${word}</div>
            </div>
            <div class="grid grid-cols-2 gap-2 mb-2">
              <button data-pass class="py-6 bg-red-500/20 border-2 border-red-500 text-red-300 font-black tracking-widest text-sm hover:bg-red-500/30">PASS</button>
              <button data-got class="py-6 bg-green-500/20 border-2 border-green-500 text-green-300 font-black tracking-widest text-sm hover:bg-green-500/30">GOT IT</button>
            </div>
            <button data-back class="w-full py-2 text-amber-500/60 text-xs underline">CANCEL &amp; PICK ANOTHER CATEGORY</button>
          </div>`;
        container.querySelector('#close-game-btn').onclick = () => { backToPick(); onClose(); };
        container.querySelector('[data-got]').onclick = gotIt;
        container.querySelector('[data-pass]').onclick = passWord;
        container.querySelector('[data-back]').onclick = backToPick;
        return;
      }
    }

    render();
  }
}
