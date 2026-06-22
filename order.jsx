const { useState, useEffect, useMemo } = React;

function getSeatId() {
  return new URLSearchParams(window.location.search).get('seat');
}

function taxFor(subtotal, taxPercent) {
  return Math.max(0, Math.round(subtotal * (taxPercent || 0) / 100));
}

function Filter({ menu, activeCat, setActiveCat, search, setSearch }) {
  return (
    <div className="filter">
      <input
        className="search"
        type="search"
        placeholder="Search the menu…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="chips">
        <button className={"chip" + (activeCat === 'all' ? ' on' : '')} onClick={() => setActiveCat('all')}>All</button>
        {menu.categories.map((c) => (
          <button key={c.id} className={"chip" + (activeCat === c.id ? ' on' : '')} onClick={() => setActiveCat(c.id)}>
            {c.title.split(' · ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Menu({ menu, cart, setQty, activeCat, search }) {
  const q = search.trim().toLowerCase();
  const cats = menu.categories
    .filter((c) => activeCat === 'all' || c.id === activeCat)
    .map((c) => ({ ...c, items: c.items.filter((it) => !q || it.name.toLowerCase().includes(q) || (it.note || '').toLowerCase().includes(q)) }))
    .filter((c) => c.items.length > 0);

  if (cats.length === 0) return <p className="empty">No items match your search.</p>;

  return cats.map((cat) => (
    <div key={cat.id}>
      <div className="cat-title">{cat.title}</div>
      {cat.items.map((it) => {
        const n = cart[it.id] || 0;
        return (
          <div className="menu-item" key={it.id}>
            <div className="mi-main">
              <div className="mi-name">{it.name}</div>
              <div className="mi-note">{it.note}</div>
            </div>
            <div className="mi-price">₹{it.price}</div>
            {n === 0 ? (
              <button className="add-btn" onClick={() => setQty(it.id, 1)}>Add</button>
            ) : (
              <div className="qty">
                <button onClick={() => setQty(it.id, n - 1)} aria-label="less">–</button>
                <span className="n">{n}</span>
                <button onClick={() => setQty(it.id, n + 1)} aria-label="more">+</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  ));
}

function Review({ lines, subtotal, taxPercent, tax, total, email, name, err, submitting, setEmail, setName, onBack, onSubmit }) {
  return (
    <div>
      <button className="link-back" onClick={onBack}>← Back to menu</button>
      <h2 className="review-h">Your cart</h2>
      {lines.map((l) => (
        <div className="review-row" key={l.id}>
          <span>{l.qty}× {l.name}</span>
          <span className="mono">₹{l.price * l.qty}</span>
        </div>
      ))}
      <div className="totals">
        <div className="t-row"><span>Subtotal</span><span className="mono">₹{subtotal}</span></div>
        <div className="t-row"><span>Tax ({taxPercent}%)</span><span className="mono">₹{tax}</span></div>
        <div className="t-row grand"><span>Total</span><span className="mono">₹{total}</span></div>
      </div>
      <div style={{ marginTop: 22 }}>
        <input className="field" type="email" placeholder="Email (required for points)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="text" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {err && <p className="err">{err}</p>}
      <p className="pay-note">You'll pay at the counter. Points are earned on the pre-tax subtotal once paid.</p>
    </div>
  );
}

function Confirmation({ result, seatLabel }) {
  const [status, setStatus] = useState('new');
  useEffect(() => {
    const es = window.DopplerAPI.streamOrder(result.orderId, (msg) => { if (msg.status) setStatus(msg.status); });
    return () => es.close();
  }, [result.orderId]);
  const label = { new: 'Order received', preparing: 'Preparing', served: 'Served', paid: 'Paid · thank you', cancelled: 'Cancelled' }[status];
  return (
    <div className="confirm">
      <div className="status-chip">{label}</div>
      <div className="big">{seatLabel}</div>
      <div className="totals" style={{ maxWidth: 320, margin: '18px auto' }}>
        <div className="t-row"><span>Subtotal</span><span className="mono">₹{result.subtotal}</span></div>
        <div className="t-row"><span>Tax ({result.taxPercent}%)</span><span className="mono">₹{result.tax}</span></div>
        <div className="t-row grand"><span>Total</span><span className="mono">₹{result.total}</span></div>
      </div>
      <p>Pay at the counter when you're ready.</p>
      <div className="balance">
        Balance: {result.pointsBalance} pts · you'll earn ~{result.estimatedPoints} pts once paid
      </div>
    </div>
  );
}

function OrderApp() {
  const seatId = getSeatId();
  const [menu, setMenu] = useState(null);
  const [seat, setSeat] = useState(null);
  const [config, setConfig] = useState({ tax_percent: 0 });
  const [fatal, setFatal] = useState('');
  const [cart, setCart] = useState({});
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('menu'); // 'menu' | 'review'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!seatId) { setFatal('No seat in the link. Please scan the QR at your table again.'); return; }
    window.DopplerAPI.getSeat(seatId)
      .then((s) => { if (!s.active) setFatal('This seat is not active. Please ask a staff member.'); else setSeat(s); })
      .catch(() => setFatal('We couldn\'t find this seat. Please scan the QR again.'));
    window.DopplerAPI.loadMenu().then(setMenu).catch(() => setFatal('Menu failed to load.'));
    window.DopplerAPI.loadConfig().then(setConfig).catch(() => {});
  }, []);

  const setQty = (id, q) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = Math.min(50, q); return n; });

  const priceById = useMemo(() => {
    const p = {}; if (menu) menu.categories.forEach((c) => c.items.forEach((i) => { p[i.id] = i; }));
    return p;
  }, [menu]);

  const lines = Object.entries(cart).map(([id, qty]) => ({ id, qty, name: priceById[id]?.name, price: priceById[id]?.price || 0 }));
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const taxPercent = Number(config.tax_percent) || 0;
  const tax = taxFor(subtotal, taxPercent);
  const total = subtotal + tax;

  const items = lines.map((l) => ({ id: l.id, qty: l.qty }));
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = async () => {
    setErr(''); setSubmitting(true);
    try {
      const r = await window.DopplerAPI.placeOrder({ seatId, email, name, items });
      setResult(r);
    } catch (e) { setErr(e.message); } finally { setSubmitting(false); }
  };

  if (fatal) return <div className="order-wrap"><p className="err">{fatal}</p></div>;
  if (!menu || !seat) return <div className="order-wrap"><p>Loading…</p></div>;
  if (result) return <div className="order-wrap"><Confirmation result={result} seatLabel={seat.label} /></div>;

  if (view === 'review') {
    return (
      <div className="order-wrap">
        <Review
          lines={lines} subtotal={subtotal} taxPercent={taxPercent} tax={tax} total={total}
          email={email} name={name} err={err} submitting={submitting}
          setEmail={setEmail} setName={setName}
          onBack={() => { setErr(''); setView('menu'); }}
          onSubmit={submit}
        />
        <div className="order-bar">
          <span>Total · ₹{total}</span>
          <button disabled={!emailValid || submitting || itemCount === 0} onClick={submit}>{submitting ? 'Sending…' : 'Place order'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-wrap">
      <div className="order-head">
        <span className="order-seat">{seat.label}</span>
        <span className="order-edition">{menu.edition}</span>
      </div>
      <Filter menu={menu} activeCat={activeCat} setActiveCat={setActiveCat} search={search} setSearch={setSearch} />
      <Menu menu={menu} cart={cart} setQty={setQty} activeCat={activeCat} search={search} />
      <div className="order-bar">
        <span>{itemCount} item(s) · ₹{subtotal}</span>
        <button disabled={itemCount === 0} onClick={() => setView('review')}>Review cart →</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('order-root')).render(<OrderApp />);
