const { useState, useEffect, useMemo } = React;

function getSeatId() {
  return new URLSearchParams(window.location.search).get('seat');
}

function Menu({ menu, cart, setQty }) {
  return menu.categories.map((cat) => (
    <div key={cat.id}>
      <div className="cat-title">{cat.title}</div>
      {cat.items.map((it) => (
        <div className="menu-item" key={it.id}>
          <div className="mi-main">
            <div className="mi-name">{it.name}</div>
            <div className="mi-note">{it.note}</div>
          </div>
          <div className="mi-price">₹{it.price}</div>
          <div className="qty">
            <button onClick={() => setQty(it.id, (cart[it.id] || 0) - 1)} aria-label="less">–</button>
            <span className="n">{cart[it.id] || 0}</span>
            <button onClick={() => setQty(it.id, (cart[it.id] || 0) + 1)} aria-label="more">+</button>
          </div>
        </div>
      ))}
    </div>
  ));
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
  const [fatal, setFatal] = useState('');
  const [cart, setCart] = useState({});
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
  }, []);

  const setQty = (id, q) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = Math.min(50, q); return n; });

  const subtotal = useMemo(() => {
    if (!menu) return 0;
    const prices = {}; menu.categories.forEach((c) => c.items.forEach((i) => { prices[i.id] = i.price; }));
    return Object.entries(cart).reduce((sum, [id, q]) => sum + (prices[id] || 0) * q, 0);
  }, [cart, menu]);

  const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = items.length > 0 && emailValid && !submitting;

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

  return (
    <div className="order-wrap">
      <div className="order-head">
        <span className="order-seat">{seat.label}</span>
        <span className="order-edition">{menu.edition}</span>
      </div>
      <Menu menu={menu} cart={cart} setQty={setQty} />
      <div style={{ marginTop: 28 }}>
        <input className="field" type="email" placeholder="Email (required for points)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="text" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {err && <p className="err">{err}</p>}
      <div className="order-bar">
        <span>{items.length} item(s) · ₹{subtotal}</span>
        <button disabled={!canSubmit} onClick={submit}>{submitting ? 'Sending…' : 'Place order'}</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('order-root')).render(<OrderApp />);
