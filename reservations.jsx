// Reserve — events calendar + Hop reservation handoff
const KIND_META = {
  cupping:   { label: 'Cupping',   dot: 'var(--ember)' },
  listening: { label: 'Listening', dot: '#b39ddb' },
  tasting:   { label: 'Tasting',   dot: '#e57373' },
  workshop:  { label: 'Workshop',  dot: '#a4c66a' },
  film:      { label: 'Cinema',    dot: '#7fb3d5' },
  guest:     { label: 'Guest',     dot: '#d99a3a' },
};

function fmtKey(y, m, d) {
  return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function monthName(m) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m];
}

function Reservations() {
  // Live data (set in admin panel via localStorage)
  const events = (window.DopplerData && window.DopplerData.getEvents()) || {};
  const HOP_URL = (window.DopplerData && window.DopplerData.getHopUrl()) || 'https://hop.doppler.coffee';

  // Month state
  const today = new Date();
  const [view, setView] = React.useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedKey, setSelectedKey] = React.useState(null);

  // If nothing selected, surface the next upcoming event in view
  const upcomingInView = React.useMemo(() => {
    const inMonth = Object.keys(events)
      .filter(k => {
        const [yy, mm] = k.split('-').map(Number);
        return yy === view.y && (mm - 1) === view.m;
      })
      .sort();
    return inMonth[0] || null;
  }, [view, events]);

  const activeKey = selectedKey || upcomingInView;
  const activeEvent = activeKey ? events[activeKey] : null;

  // Build calendar grid (Mon-first)
  const firstDow = (() => {
    const d = new Date(view.y, view.m, 1).getDay();
    return (d + 6) % 7; // Mon=0
  })();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = fmtKey(today.getFullYear(), today.getMonth(), today.getDate());

  const shift = (n) => {
    if (window.AudioCtx) window.AudioCtx.click();
    let m = view.m + n, y = view.y;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setView({ y, m });
    setSelectedKey(null);
  };

  return (
    <section className="section" id="reserve" data-screen-label="05 Reserve">
      <div className="row-tag">
        <span className="label">{SITE('reserve_label')}</span>
        <span className="label">handled by hop ↗</span>
      </div>

      <div className="reserve-grid">
        <div>
          <h2 className="huge reveal">
            {SITE('reserve_h1')}<br/>
            <span className="serif">{SITE('reserve_h2')}</span>
          </h2>
          <p className="large reveal" style={{ maxWidth: 460, marginTop: 32, opacity: 0.8 }}>
            {SITE('reserve_intro')}
          </p>

          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: 12 }}>
              <span className="label">Address</span>
              <span style={{ fontSize: 16 }}>{SITE('contact_address')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: 12 }}>
              <span className="label">Hours</span>
              <span style={{ fontSize: 16 }}>{SITE('contact_hours')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: 12 }}>
              <span className="label">Reservations</span>
              <span style={{ fontSize: 16 }}>hop.doppler.coffee</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label">Tel</span>
              <span style={{ fontSize: 16 }}>{SITE('contact_phone')}</span>
            </div>
          </div>

          {/* Kind legend */}
          <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: '12px 24px' }}>
            {Object.entries(KIND_META).map(([k, meta]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, display: 'inline-block' }}></span>
                <span className="label" style={{ color: 'rgba(26,20,16,0.7)' }}>{meta.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar + detail card */}
        <div className="reveal" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="cal-shell">
            <div className="cal-head">
              <button className="cal-nav magnet" onClick={() => shift(-1)} aria-label="Previous month">←</button>
              <div className="cal-title">
                <div className="label" style={{ color: 'rgba(26,20,16,0.55)' }}>Now showing</div>
                <div style={{ fontSize: 28, letterSpacing: '-0.01em', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>
                  {monthName(view.m)} <span style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: 'normal', fontSize: 18, opacity: 0.55 }}>· {view.y}</span>
                </div>
              </div>
              <button className="cal-nav magnet" onClick={() => shift(1)} aria-label="Next month">→</button>
            </div>

            <div className="cal-dow">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="label" style={{ textAlign: 'center' }}>{d}</div>
              ))}
            </div>

            <div className="cal-grid">
              {cells.map((d, i) => {
                if (d === null) return <div key={'e'+i} className="cal-cell empty"></div>;
                const key = fmtKey(view.y, view.m, d);
                const ev = events[key];
                const isToday = key === todayKey;
                const isActive = key === activeKey;
                return (
                  <button
                    key={key}
                    className={"cal-cell" + (ev ? " has-ev" : "") + (isToday ? " today" : "") + (isActive ? " active" : "")}
                    onClick={() => { if (ev) { window.AudioCtx && window.AudioCtx.click(); setSelectedKey(key); } }}
                    disabled={!ev}>
                    <span className="cal-num">{String(d).padStart(2,'0')}</span>
                    {ev && (
                      <span className="cal-dot" style={{ background: KIND_META[ev.kind].dot }}></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail / Hop card */}
          <div className="event-card">
            {activeEvent ? (
              <React.Fragment>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div className="label" style={{ color: KIND_META[activeEvent.kind].dot, filter: 'brightness(0.7)' }}>
                      ● {KIND_META[activeEvent.kind].label.toUpperCase()} · {activeKey} · {activeEvent.time}
                    </div>
                    <div style={{ fontSize: 28, marginTop: 8, letterSpacing: '-0.01em', maxWidth: 460 }}>
                      {activeEvent.title}
                    </div>
                    {activeEvent.note && (
                      <div style={{ marginTop: 12, opacity: 0.75, fontSize: 14, lineHeight: 1.5, maxWidth: 460 }}>
                        {activeEvent.note}
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            ) : (
              <div>
                <div className="label">No events this month</div>
                <div style={{ fontSize: 22, marginTop: 8, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>
                  The bar is open. Walk in.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <a href={(activeEvent && activeEvent.hop) || HOP_URL} target="_blank" rel="noopener noreferrer" className="btn ember magnet hop-btn">
                {activeEvent ? 'Reserve on Hop' : 'Book a table on Hop'} <span className="arrow">↗</span>
              </a>
              <a href={HOP_URL + '/events'} target="_blank" rel="noopener noreferrer" className="btn outline magnet">
                All events <span className="arrow">→</span>
              </a>
            </div>

            <div className="hop-meta">
              <span className="label">Powered by</span>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 18 }}>hop</span>
              <span className="label" style={{ opacity: 0.55 }}>· reservations &amp; ticketing</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Reservations });
