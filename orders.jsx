const { useState, useEffect, useCallback } = React;
const API = window.DopplerAPI;

function timeAgo(iso) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  return m + 'm ago';
}

function Login({ onIn }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try { const me = await API.login(email.trim(), pass); onIn(me); }
    catch (ex) { setErr(ex.message); }
  };
  return (
    <form className="login" onSubmit={submit}>
      <h1>Doppler · Live Orders</h1>
      <p>Sign in with your station account (bar, kitchen, or cashier).</p>
      <input type="email" placeholder="Staff email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      <input type="password" placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
      <button className="btn primary" type="submit">Sign in</button>
      <p className="err">{err}</p>
    </form>
  );
}

function Lines({ items }) {
  return items.map((l, i) => (
    <div className="line" key={i}>
      <span>
        <span className="q">{l.qty}×</span>{l.name}
        {l.addons && l.addons.length > 0 ? <span className="line-addons"> + {l.addons.map((a) => a.name).join(', ')}</span> : null}
      </span>
    </div>
  ));
}

function StationCard({ order, station, onReady }) {
  const mine = (order.items || []).filter((l) => l.station === station);
  const ready = station === 'bar' ? order.bar_ready : order.kitchen_ready;
  return (
    <div className={'card' + (ready ? ' done' : '')}>
      <div className="seat">{order.seat_label}</div>
      <div className="meta">{timeAgo(order.created_at)} · order #{order.id.slice(0, 4)}</div>
      <Lines items={mine} />
      <div className="actions">
        {ready
          ? <span className="badge ok">✓ {station} ready</span>
          : <button className="btn ready" onClick={() => onReady(order.id, station)}>Mark {station} ready</button>}
      </div>
    </div>
  );
}

function CashierCard({ order, role, onReady, onPay, onRedeem }) {
  const total = order.subtotal + (order.tax_amount || 0);
  const barItems = (order.items || []).filter((l) => l.station === 'bar');
  const kitchenItems = (order.items || []).filter((l) => l.station === 'kitchen');
  return (
    <div className="card">
      <div className="seat">{order.seat_label}</div>
      <div className="meta">{order.customer_email} · {timeAgo(order.created_at)} · {order.status}</div>
      {barItems.length > 0 && <div className="section-label">Bar</div>}
      <Lines items={barItems} />
      {kitchenItems.length > 0 && <div className="section-label">Kitchen</div>}
      <Lines items={kitchenItems} />
      <div className="badges">
        {order.needs_bar && <span className={'badge ' + (order.bar_ready ? 'ok' : 'wait')}>Bar {order.bar_ready ? '✓' : '…'}</span>}
        {order.needs_kitchen && <span className={'badge ' + (order.kitchen_ready ? 'ok' : 'wait')}>Kitchen {order.kitchen_ready ? '✓' : '…'}</span>}
      </div>
      <div className="totals">
        <div>Subtotal ₹{order.subtotal} · Tax ₹{order.tax_amount || 0}</div>
        <div className="grand">Total ₹{total}</div>
      </div>
      <div className="actions">
        {order.status !== 'paid' && <button className="btn primary" onClick={() => onPay(order.id)}>Mark paid</button>}
        {order.status === 'paid' && <button className="btn ghost" onClick={() => onRedeem(order.id)}>Redeem pts</button>}
        {role === 'admin' && order.needs_bar && !order.bar_ready && <button className="btn ready" onClick={() => onReady(order.id, 'bar')}>Bar ready</button>}
        {role === 'admin' && order.needs_kitchen && !order.kitchen_ready && <button className="btn ready" onClick={() => onReady(order.id, 'kitchen')}>Kitchen ready</button>}
      </div>
    </div>
  );
}

function Board({ me, onOut }) {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState('');
  const role = me.role;
  const isStation = role === 'bar' || role === 'kitchen';

  const load = useCallback(async () => {
    try {
      const opts = isStation ? { station: role } : { active: 1 };
      setOrders(await API.listOrders(opts));
    } catch (e) { setErr(e.message); }
  }, [role, isStation]);

  useEffect(() => {
    load();
    const es = API.streamBoard(() => load());
    const t = setInterval(load, 15000); // refresh "time ago" + safety net
    return () => { es.close(); clearInterval(t); };
  }, [load]);

  const onReady = async (id, station) => { try { await API.setReady(id, station); load(); } catch (e) { alert(e.message); } };
  const onPay = async (id) => { try { const r = await API.payOrder(id); alert(`Paid · +${r.pointsEarned} pts (balance ${r.pointsBalance})`); load(); } catch (e) { alert(e.message); } };
  const onRedeem = async (id) => {
    const p = parseInt(prompt('Points to redeem:'), 10);
    if (!Number.isInteger(p)) return;
    try { const r = await API.redeemOrder(id, p); alert(`Redeemed ₹${r.redeemedValue} (balance ${r.pointsBalance})`); load(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="topbar">
        <div className="who">{me.email}<span className="role-badge">{role}</span></div>
        <button onClick={onOut}>Sign out</button>
      </div>
      <div className="wrap">
        {err && <p className="err">{err}</p>}
        {orders.length === 0
          ? <p className="hint">No active orders right now.</p>
          : <div className="grid">
              {orders.map((o) => isStation
                ? <StationCard key={o.id} order={o} station={role} onReady={onReady} />
                : <CashierCard key={o.id} order={o} role={role} onReady={onReady} onPay={onPay} onRedeem={onRedeem} />)}
            </div>}
      </div>
    </div>
  );
}

function App() {
  const [me, setMe] = useState(undefined); // undefined=loading, false=logged out
  useEffect(() => { API.me().then(setMe).catch(() => setMe(false)); }, []);
  const onOut = async () => { try { await API.logout(); } finally { setMe(false); } };
  if (me === undefined) return <p className="hint">Loading…</p>;
  if (!me) return <Login onIn={setMe} />;
  return <Board me={me} onOut={onOut} />;
}

ReactDOM.createRoot(document.getElementById('orders-root')).render(<App />);
