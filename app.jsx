// App shell — mounts everything, manages chrome
function Loader({ onDone }) {
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += 4 + Math.random() * 8;
      if (p >= 100) { p = 100; clearInterval(id); setTimeout(onDone, 400); }
      setPct(p);
    }, 60);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={"loader" + (pct >= 100 ? " gone" : "")}>
      <div className="logo-mark"></div>
      <div style={{ fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>
        डॉप्लर · Doppler Coffee
      </div>
      <div className="bar" style={{ '--p': pct + '%' }}></div>
      <div className="label on-dark">{Math.round(pct)}% · brewing</div>
    </div>
  );
}

function Topbar({ dark }) {
  const [time, setTime] = React.useState('');
  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' };
      setTime(d.toLocaleTimeString('en-GB', opts) + ' IST');
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={"topbar" + (dark ? " dark" : "")}>
      <div className="left">
        <a href="#hero" className="brand brand-logo-only" aria-label="Doppler">
          <span className="brand-mark"></span>
        </a>
      </div>
      <div className="topbar-nav">
        <a href="#about" className="nav-link">About</a>
        <a href="#brew" className="nav-link">Brew</a>
        <a href="#tour" className="nav-link">Space</a>
        <a href="menu.html" className="nav-link">Menu</a>
        <a href="careers.html" className="nav-link">Careers</a>
        <a href="#reserve" className="nav-link">Reserve</a>
      </div>
      <div className="right">
        <span className="nav-link">Jaipur · 302001</span>
      </div>
    </div>
  );
}

function AudioToggle() {
  const [on, setOn] = React.useState(false);
  const toggle = () => {
    const next = !on;
    setOn(next);
    if (window.AudioCtx) {
      window.AudioCtx.setOn(next);
      if (next) { window.AudioCtx.startAmbient(); window.AudioCtx.click(); }
      else window.AudioCtx.stopAmbient();
    }
  };
  return (
    <button className={"audio-toggle" + (on ? "" : " off")} onClick={toggle}>
      <span className="bars"><span></span><span></span><span></span></span>
      {on ? 'Cafe sound · ON' : 'Cafe sound · OFF'}
    </button>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div>
          <div className="brand" style={{ fontSize: 24, marginBottom: 16 }}>
            <span className="brand-mark" style={{ width: 40, height: 40 }}></span>
            <span>डॉप्लर · Doppler</span>
          </div>
          <p style={{ maxWidth: 340, opacity: 0.75, fontSize: 14, lineHeight: 1.5 }}>
            {SITE('footer_blurb')}
          </p>
        </div>
        <div>
          <h4>Visit</h4>
          <ul>
            <li>{SITE('contact_address')}</li>
            <li>{SITE('contact_hours')}</li>
          </ul>
        </div>
        <div>
          <h4>Reach</h4>
          <ul>
            <li><a href="#">{SITE('contact_email')}</a></li>
            <li><a href="#">{SITE('contact_phone')}</a></li>
            <li><a href="#">{SITE('contact_instagram')}</a></li>
          </ul>
        </div>
        <div>
          <h4>Trade</h4>
          <ul>
            <li><a href="#">Wholesale beans</a></li>
            <li><a href="#">Hire the space</a></li>
            <li><a href="#">Press kit</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bot">
        <span>{SITE('footer_copyright')}</span>
        <span>{SITE('footer_tagline')}</span>
      </div>
    </footer>
  );
}

function App() {
  const [loaded, setLoaded] = React.useState(false);
  useReveal();

  return (
    <React.Fragment>
      <div className="grain"></div>
      <CustomCursor />
      {!loaded && <Loader onDone={() => setLoaded(true)} />}
      <Topbar dark={true} />
      <Hero />
      <About />
      <PourOver />
      <SpaceTour />
      <Reservations />
      <Footer />
      <AudioToggle />
      <DopplerTweaks />
    </React.Fragment>
  );
}

function DopplerTweaks() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "default",
    "grain": 0.08,
    "customCursor": true,
    "accentHue": 50
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    document.body.classList.remove('theme-warm', 'theme-cold', 'theme-mono');
    if (tweaks.theme && tweaks.theme !== 'default') document.body.classList.add('theme-' + tweaks.theme);
    document.documentElement.style.setProperty('--grain-opacity', tweaks.grain);
    document.body.classList.toggle('no-custom-cursor', !tweaks.customCursor);
    if (!tweaks.customCursor) {
      document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(el => el.style.display = 'none');
    } else {
      document.querySelectorAll('.cursor-dot, .cursor-ring').forEach(el => el.style.display = '');
    }
    if (tweaks.theme === 'default') {
      document.documentElement.style.setProperty('--ember', `oklch(0.68 0.18 ${tweaks.accentHue})`);
    }
  }, [tweaks]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Theme">
        <TweakRadio
          label="Palette"
          value={tweaks.theme}
          onChange={v => setTweak('theme', v)}
          options={[
            { value: 'default', label: 'Bone' },
            { value: 'warm', label: 'Warm' },
            { value: 'cold', label: 'Cold' },
            { value: 'mono', label: 'Mono' },
          ]}
        />
        <TweakSlider
          label="Accent hue"
          value={tweaks.accentHue}
          min={0} max={360} step={1}
          onChange={v => setTweak('accentHue', v)}
          unit="°"
        />
      </TweakSection>
      <TweakSection title="Texture">
        <TweakSlider
          label="Concrete grain"
          value={tweaks.grain}
          min={0} max={0.25} step={0.01}
          onChange={v => setTweak('grain', v)}
        />
      </TweakSection>
      <TweakSection title="Interaction">
        <TweakToggle
          label="Custom cursor"
          value={tweaks.customCursor}
          onChange={v => setTweak('customCursor', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// Re-renderable root so published content (loaded async) can refresh the page.
const __dopplerRoot = ReactDOM.createRoot(document.getElementById('root'));
window.__render = () => __dopplerRoot.render(<App />);
window.__render();
