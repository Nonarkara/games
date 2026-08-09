/**
 * OmniArcade — About. Not a game; the reason the floor exists.
 * Play-mode surface: warm paper, Spectral for reading, one red Move.
 */

export function renderAbout(container, onClose) {
  container.innerHTML = `
    <article class="about-panel" aria-labelledby="about-title">
      <header class="about-head">
        <div>
          <p>SIGNAL · DR NON</p>
          <h2 id="about-title">Why this floor exists</h2>
        </div>
        <button type="button" class="about-close" id="close-game-btn">CLOSE</button>
      </header>

      <figure class="about-figure">
        <img src="public/Playing%20Wii%20@MIT%202007.jpg" alt="Dr Non playing Wii at MIT, 2007" width="1200" height="800" />
        <figcaption>Playing Wii @ MIT, 2007. The research question was already forming.</figcaption>
      </figure>

      <div class="about-body">
        <p>
          That photo is from a common room at MIT in 2007, mid-swing on a Wii remote.
          Two architecture degrees were the official reason for being there.
          The Wii took a defensible share of the attention.
        </p>
        <p>
          I am Non Arkaraprasertkul — Dr Non. Architecture, then a doctorate in urban anthropology,
          then years building decision systems for cities. Games never left the room.
          Cartridges that needed blowing on. Arcades that ate coins. Consoles that ate semesters.
          Somewhere along that path, games stopped being a break from the work and became the model for it:
          points, feedback, visible progress, a reason to try one more round.
        </p>
        <p>
          Gamification is not a gimmick to me. It is how humans have always tricked themselves into practice.
          The phrase “killing time” is unusually honest. The time actually dies.
          An infinite feed is a machine built to collect those dead minutes at scale, and it gives nothing back.
        </p>
        <p>
          OmniArcade is the counter-offer. The same twenty minutes. The same itch for one more round.
          Pointed at working memory, inhibition, attention, and mental math — with a scoreboard so you have
          something to defend, and the papers on the shelf so you can check the claims yourself.
        </p>
        <p>
          What other portals will not tell you: practice is specific.
          Dual N-Back makes you better at Dual N-Back. Far transfer to “smarter in life” is contested —
          Simons et al. 2016 is listed on purpose. Near transfer is real. Honesty is the product.
        </p>
        <p class="about-close-line">
          Play. Sign the board with five letters. Come back and beat yourself.
        </p>
      </div>
    </article>
  `;
  container.querySelector('#close-game-btn').onclick = onClose;
}
