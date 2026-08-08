/**
 * OmniArcade — About panel. Not a game; the reason the games exist.
 */

export function renderAbout(container, onClose) {
  container.innerHTML = `
    <div class="relative bg-black border border-amber-500/40 p-6 text-white max-w-2xl mx-auto font-mono-hud">
      <div class="flex justify-between items-center mb-4 border-b border-amber-500/40 pb-3">
        <div class="flex items-center gap-3">
          <span class="text-3xl text-amber-400">👤</span>
          <div>
            <h2 class="text-2xl font-black text-amber-400 tracking-wider">WHY THIS EXISTS</h2>
            <p class="text-[10px] text-amber-500/80 uppercase">Dr Non · games, gamification, and time</p>
          </div>
        </div>
        <button id="close-game-btn" class="axiom-close-btn" style="flex-shrink:0">✕ CLOSE</button>
      </div>

      <figure class="mb-5 border border-amber-500/30 bg-zinc-950 p-2">
        <img src="public/Playing%20Wii%20@MIT%202007.jpg" alt="Dr Non playing Wii at MIT, 2007"
             class="w-full max-h-[340px] object-cover object-top" />
        <figcaption class="text-[10px] text-amber-500/70 uppercase tracking-wider pt-2 px-1">
          Playing Wii @ MIT, 2007. The research question was already forming.
        </figcaption>
      </figure>

      <div class="space-y-4 text-sm leading-relaxed text-zinc-300" style="font-family:'Source Sans 3',sans-serif">
        <p>
          That photo is from 2007, in a common room at MIT, mid-swing on a Wii remote. Two degrees in
          architecture were supposedly the reason for being there. The Wii got a defensible share of the attention.
        </p>
        <p>
          Dr Non has played games his whole life — cartridges that needed blowing on, arcades that ate coins,
          consoles that ate semesters. Somewhere between architecture and a doctorate in urban anthropology,
          the games stopped being a break from the work and started being the model for it: points, feedback,
          visible progress, a reason to try one more time. Gamification isn't a gimmick to him. It's how humans
          have always tricked themselves into practice.
        </p>
        <p>
          The phrase "killing time" is unusually honest. The time actually dies. An infinite feed is a machine
          built to collect those dead minutes at scale, and it gives nothing back. This arcade is the counter-offer:
          the same twenty minutes, the same itch for one-more-round — but pointed at working memory, reaction
          speed, attention, and mental math. With a scoreboard, so you have something to defend, and the research
          on the shelf, so you can check the claims yourself.
        </p>
        <p>
          Play. Sign the board with five letters. Come back and beat yourself.
        </p>
      </div>
    </div>
  `;
  container.querySelector('#close-game-btn').onclick = onClose;
}
