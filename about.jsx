// About — courtyard photo + story
function About() {
  return (
    <section className="section" id="about" data-screen-label="02 About">
      <div className="row-tag">
        <span className="label">§ 02 / about · the room</span>
        <span className="label">idx 0002</span>
      </div>

      <div className="about-grid">
        <div >
          <div className="photo-frame" style={{ backgroundImage: `url('${(window.__resources && window.__resources.courtyard) || 'img/courtyard.png'}')` }}></div>
          <div className="photo-meta">
            <span>Courtyard · afternoon</span>
            <span>35mm · ƒ/2.8</span>
          </div>
        </div>

        <div>
          <h2 className="huge">
            A brick wall,<br/>
            <span className="serif">a glass roof,</span><br/>
            a slow morning.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 24, marginTop: 56 }}>
            <span className="about-num">01</span>
            <p className="large" style={{ maxWidth: 540 }}>
              The wall is hand-laid brick — local, kiln-fired, set with a thumb-thick mortar joint.
              At dusk, lights buried in the lawn throw long warm bars across the path to the door.
            </p>

            <span className="about-num">02</span>
            <p className="large" style={{ maxWidth: 540 }}>
              Inside: lime-plaster walls, oak floor, a glass-and-timber roof above the espresso bar.
              Onion-shaped silk lanterns hang over the slow bar. The moringa stays out front.
            </p>

            <span className="about-num">03</span>
            <p className="large" style={{ maxWidth: 540 }}>
              Beans travel from estates in Chikmagalur and the Araku Valley, roasted in small batches
              on-site. <span className="devanagari">डॉप्लर</span> — a name for the shift you hear when
              something moves toward you. We hope yours does, too.
            </p>
          </div>

          <div className="specs">
            <div className="spec">
              <div className="n">06:00</div>
              <div className="l">Daily open</div>
            </div>
            <div className="spec">
              <div className="n">14</div>
              <div className="l">Single-origins on bar</div>
            </div>
            <div className="spec">
              <div className="n">2.4k</div>
              <div className="l">Cups poured / week</div>
            </div>
          </div>
        </div>
      </div>

      <div className="marquee" style={{ marginTop: 96 }}>
        <div className="marquee-track">
          <span>Slow water<span className="dot"></span>Single origin<span className="dot"></span>Brick &amp; lantern light<span className="dot"></span>Hand-poured<span className="dot"></span>डॉप्लर coffee<span className="dot"></span>The second cup is always<span className="dot"></span></span>
          <span>Slow water<span className="dot"></span>Single origin<span className="dot"></span>Brick &amp; lantern light<span className="dot"></span>Hand-poured<span className="dot"></span>डॉप्लर coffee<span className="dot"></span>The second cup is always<span className="dot"></span></span>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { About });
