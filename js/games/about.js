/**
 * Dr Non — Non-Gaming System · About.
 * The "love for games" essay. MITF voice. Rides the warm-paper Read surface
 * (Spectral for the body, one red Move) — this is the one place the 16-bit
 * register steps aside for reading.
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

        <p class="about-punch">
          <strong>Games taught me how to think before any book did.</strong>
        </p>

        <p>
          I am Dr Non. I am 40-something. I am in Bangkok, and I stood in line
          last July to buy a Nintendo Switch 2. I am not embarrassed by that.
          I have been in love with games since before I owned one.
        </p>

        <h3 class="about-h">The lanes</h3>

        <p>
          Bangkok in the 80s and 90s was simple. No smartphones. No computers
          you could reach. We played in the lanes with a plastic ball and
          sandals for goalposts. The first World Cup I should remember is
          Argentina 1986 — I was five. I slept through Maradona.
        </p>

        <p>
          The first one I actually watched was Italia 90, with my dad. West
          Germany won. I asked why there were two Germanys. He did not know
          either. It took me twenty-four years to find out, in Berlin, 2014.
        </p>

        <h3 class="about-h">The first machine</h3>

        <p>
          My first computer was not mine. My mom was a banker. She brought
          home an IBM laptop — one of the first laptops the bank gave out —
          when I was in middle school. I taught myself HTML. I taught myself
          BASIC. I taught myself the games that came with the machine.
        </p>

        <p>
          My first console was a Famicom. My dad went to Singapore in the
          early 90s and brought one back. I saved my money to buy the
          cartridges. That was the deal: he got the box, I got the games.
        </p>

        <p>
          <strong>Dragon Quest was the first cartridge I bought. It is still
          the cartridge that matters.</strong>
        </p>

        <h3 class="about-h">The computer age</h3>

        <p>
          High school was when I jumped into Championship Manager, SimCity,
          and ISS. Each one taught me a domain: soccer, cities, storytelling.
          Each one taught me more about how a system works than any textbook
          did. Dragon Quest especially — that game taught me what a story
          could feel like when the story was also a world you walked through.
        </p>

        <p>
          I was seventeen in 1998. I went to AFS in Dallas, Texas, to a high
          school called Bishops. The World Cup was on. Zidane headbutted.
          Beckham was sent off. I watched it with kids who would become my
          friends.
        </p>

        <h3 class="about-h">2007 and now</h3>

        <p>
          I went to MIT in 2007. There is a photo of me playing Wii in a
          common room, mid-swing. Two architecture degrees were the official
          reason for being there. The Wii took a defensible share of the
          attention.
        </p>

        <p>
          I am 40-something now. The 2026 World Cup is hosted in a country
          I first lived in at seventeen. I will be there. Liverpool shirts,
          Owen in 1998, Salah today — that is the line. I stood in line last
          July for a Switch 2. I am still in love with games.
        </p>

        <h3 class="about-h">The counter</h3>

        <p>
          <em>"Games are killing time."</em>
        </p>

        <p>
          Yes. They are. So is reading the news, or watching the news, or
          scrolling a feed. The question is not whether the time dies. The
          time always dies. The question is whether the minutes gave anything
          back. An infinite feed is a machine built to collect those dead
          minutes at scale, and it gives nothing back. A good game gives back
          a system, a story, a reflex, a memory. The difference is the
          system.
        </p>

        <h3 class="about-h">So what. Three moves.</h3>

        <p>
          One: NGS exists because games taught me to think, and I want that
          for the next person. Not a game system. A brain expansion system.
        </p>

        <p>
          Two: every cartridge on this floor is built on five frameworks —
          Kahneman, Werbach, Thaler, neuroplasticity, Atomic Habits. Love
          alone is not enough. You need a science.
        </p>

        <p>
          Three: sign the board with four letters. Come back. Beat yourself.
          That is the loop. That is the system.
        </p>

        <p class="about-close-line">
          Play.
        </p>

        <p class="about-sig">— Dr Non, Bangkok, 2026</p>

      </div>
    </article>
  `;
  container.querySelector('#close-game-btn').onclick = onClose;
}
