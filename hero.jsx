// Hero — facade backdrop, lantern steam, Devanagari accent
function Hero() {
  const heroRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const [time, setTime] = React.useState('');

  React.useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' };
      setTime(d.toLocaleTimeString('en-GB', opts) + ' IST');
    }, 1000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    const el = heroRef.current;if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, []);

  // Steam — warm, lantern-tinted
  React.useEffect(() => {
    const cv = canvasRef.current;if (!cv) return;
    const ctx = cv.getContext('2d');
    let w = 0,h = 0,dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width;h = r.height;
      cv.width = w * dpr;cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let mx = w * 0.3,my = h * 0.78;
    let mx2 = w * 0.06,my2 = h * 0.20;
    let emitWidth = 480;
    const setEmit = () => {
      const r = cv.getBoundingClientRect();
      mx = r.width * 0.30;my = r.height * 0.78;
      // Wide plume — emits across the full width of डॉप्लर
      const host = heroRef.current;
      const ddev = host && host.querySelector('.ddev');
      if (ddev && host) {
        const dr = ddev.getBoundingClientRect();
        const er = host.getBoundingClientRect();
        mx2 = dr.left - er.left + dr.width * 0.35;
        my2 = dr.top - er.top;
        emitWidth = dr.width; // span the headline width
      } else {
        mx2 = r.width * 0.22;my2 = r.height * 0.32;
        emitWidth = 480;
      }
    };
    setEmit();

    const particles = [];
    const spawn = () => {
      particles.push({
        x: mx + (Math.random() - 0.5) * 30,
        y: my,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.6 - Math.random() * 0.7,
        life: 0,
        max: 200 + Math.random() * 120,
        r: 22 + Math.random() * 36,
        seed: Math.random() * 1000
      });
    };
    const spawn2 = () => {
      particles.push({
        x: mx2 + (Math.random() - 0.5) * 4,
        y: my2 + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -1.0 - Math.random() * 0.6,
        life: 0,
        max: 280 + Math.random() * 160,
        r: 22 + Math.random() * 18,
        seed: Math.random() * 1000,
        plume: true
      });
    };

    let mouseX = -9999,mouseY = -9999;
    const onMouse = (e) => {
      const r = cv.getBoundingClientRect();
      mouseX = e.clientX - r.left;mouseY = e.clientY - r.top;
    };
    cv.parentElement.addEventListener('mousemove', onMouse);

    let raf,t = 0;
    const tick = () => {
      t++;
      ctx.clearRect(0, 0, w, h);
      if (t % 4 === 0) spawn2();
      if (t % 220 === 0) setEmit();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.vx += Math.sin((p.life + p.seed) * 0.04) * 0.02;
        const dx = p.x - mouseX,dy = p.y - mouseY;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          const f = (1 - d2 / 14000) * 0.7;
          p.vx += dx / Math.sqrt(d2 + 1) * f;
          p.vy += dy / Math.sqrt(d2 + 1) * f;
        }
        p.vy *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.20;

        const baseA = p.plume ? 0.07 : 0.16;
        const alpha = (1 - p.life / p.max) * baseA;
        if (alpha <= 0) {particles.splice(i, 1);continue;}

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        grd.addColorStop(0, `rgba(244, 201, 122, ${alpha})`);
        grd.addColorStop(0.6, `rgba(244, 201, 122, ${alpha * 0.4})`);
        grd.addColorStop(1, 'rgba(244, 201, 122, 0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      cv.parentElement.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <section className="hero" ref={heroRef} id="hero" data-screen-label="01 Hero">
      <div className="facade"></div>
      <div className="spotlight"></div>
      <canvas ref={canvasRef} className="steam"></canvas>

      <div className="hero-grid">
        <div>
          <div className="label on-dark" style={{ marginBottom: 24 }}>
            {SITE('hero_label')}
          </div>
          <h1 className="mega">
            <span className="ddev">{SITE('hero_dev')}</span><br />
            {SITE('hero_line2')}<br />
            <span className="serif">{SITE('hero_line3')}</span>
          </h1>
          <p className="large" style={{ maxWidth: 520, marginTop: 32, opacity: 0.88 }}>
            {SITE('hero_intro')}
          </p>

          <div style={{ display: 'flex', gap: 16, marginTop: 40, flexWrap: 'wrap' }}>
            <MagneticBtn className="ember" onClick={() => document.getElementById('reserve').scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {SITE('hero_btn_reserve')} <span className="arrow">→</span>
            </MagneticBtn>
            <MagneticBtn className="outline" onClick={() => document.getElementById('tour').scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {SITE('hero_btn_tour')} <span className="arrow">→</span>
            </MagneticBtn>
          </div>

          <div className="hero-meta">
            <div className="cell"><span className="k">Open</span><span className="v">{SITE('hero_meta_open')}</span></div>
            <div className="cell"><span className="k">Origins</span><span className="v">{SITE('hero_meta_origins')}</span></div>
            <div className="cell"><span className="k">Roast</span><span className="v">{SITE('hero_meta_roast')}</span></div>
            <div className="cell"><span className="k">Index</span><span className="v">№ 001 / 005</span></div>
          </div>
        </div>

        <div className="hero-brand-col" style={{ position: 'relative', alignSelf: 'stretch', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div className="brand-stack-block">
            <div className="bsb-logo" aria-label="Doppler"></div>
            <div className="bsb-rule"></div>
            <div className="bsb-line">26.9130° N · 75.8060° E</div>
            <div className="bsb-line">Jaipur · Rajasthan · IND</div>
            <div className="bsb-line">{time || '—'}</div>
            <div className="bsb-line">डॉप्लर · DOPPLER · EST. 2021</div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 4 }}>
        <div className="label on-dark">↓ scroll · move cursor to disturb the steam</div>
        <div className="label on-dark">№ 001 / 005</div>
      </div>
    </section>);

}

Object.assign(window, { Hero });