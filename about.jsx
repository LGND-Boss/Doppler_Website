// About — courtyard photo + story
function About() {
  return (
    <section className="section" id="about" data-screen-label="02 About">
      <div className="row-tag">
        <span className="label">{SITE('about_label')}</span>
        <span className="label">idx 0002</span>
      </div>

      <div className="about-grid">
        <div >
          <div className="photo-frame" style={{ backgroundImage: `url('${(window.__resources && window.__resources.courtyard) || 'img/courtyard.png'}')` }}></div>
          <div className="photo-meta">
            <span>{SITE('about_photo_caption')}</span>
            <span>{SITE('about_photo_meta')}</span>
          </div>
        </div>

        <div>
          <h2 className="huge">
            {SITE('about_h1')}<br/>
            <span className="serif">{SITE('about_h2')}</span><br/>
            {SITE('about_h3')}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 24, marginTop: 56 }}>
            <span className="about-num">01</span>
            <p className="large" style={{ maxWidth: 540 }}>{SITE('about_p1')}</p>

            <span className="about-num">02</span>
            <p className="large" style={{ maxWidth: 540 }}>{SITE('about_p2')}</p>

            <span className="about-num">03</span>
            <p className="large" style={{ maxWidth: 540 }}>{SITE('about_p3')}</p>
          </div>

          <div className="specs">
            <div className="spec">
              <div className="n">{SITE('about_spec1_n')}</div>
              <div className="l">{SITE('about_spec1_l')}</div>
            </div>
            <div className="spec">
              <div className="n">{SITE('about_spec2_n')}</div>
              <div className="l">{SITE('about_spec2_l')}</div>
            </div>
            <div className="spec">
              <div className="n">{SITE('about_spec3_n')}</div>
              <div className="l">{SITE('about_spec3_l')}</div>
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
