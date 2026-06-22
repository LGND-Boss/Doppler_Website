(function () {
  async function req(method, url, body) {
    const opts = { method, credentials: 'same-origin', headers: {} };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const r = await fetch(url, opts);
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : null;
    if (!r.ok) throw new Error((data && data.error) || ('HTTP ' + r.status));
    return data;
  }

  window.DopplerAPI = {
    // menu (canonical, used by order page)
    loadMenu: () => req('GET', 'menu.json'),

    // public
    loadConfig: () => req('GET', '/api/config'),
    getSeat: (id) => req('GET', '/api/seat/' + encodeURIComponent(id)),
    placeOrder: (payload) => req('POST', '/api/order', payload),
    streamOrder: (id, onMsg) => {
      const es = new EventSource('/api/order/' + encodeURIComponent(id) + '/stream');
      es.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch (_) {} };
      return es;
    },

    // auth
    login: (email, password) => req('POST', '/api/login', { email, password }),
    logout: () => req('POST', '/api/logout'),
    me: () => req('GET', '/api/me'),

    // staff: orders
    listOrders: (opts) => {
      const o = opts || {};
      const qs = new URLSearchParams();
      if (o.status) qs.set('status', o.status);
      if (o.station) qs.set('station', o.station);
      if (o.active) qs.set('active', '1');
      const s = qs.toString();
      return req('GET', '/api/orders' + (s ? '?' + s : ''));
    },
    setStatus: (id, status) => req('POST', '/api/orders/' + id + '/status', { status }),
    setReady: (id, station) => req('POST', '/api/orders/' + id + '/ready', { station }),
    payOrder: (id) => req('POST', '/api/orders/' + id + '/pay'),
    redeemOrder: (id, points) => req('POST', '/api/orders/' + id + '/redeem', { points }),
    streamBoard: (onMsg) => {
      const es = new EventSource('/api/orders/stream');
      es.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch (_) {} };
      return es;
    },

    // staff: seats
    listSeats: () => req('GET', '/api/seats'),
    createSeat: (label, zone) => req('POST', '/api/seats', { label, zone }),
    updateSeat: (id, patch) => req('PATCH', '/api/seats/' + id, patch),

    // staff: customers
    listCustomers: (q) => req('GET', '/api/customers' + (q ? '?q=' + encodeURIComponent(q) : '')),
    getCustomer: (id) => req('GET', '/api/customers/' + id),
    adjustCustomer: (id, delta, reason) => req('POST', '/api/customers/' + id + '/adjust', { delta, reason }),

    // staff: settings
    getSettings: () => req('GET', '/api/settings'),
    putSettings: (patch) => req('PUT', '/api/settings', patch),

    // admin: staff accounts
    listStaff: () => req('GET', '/api/staff'),
    createStaff: (email, password, role) => req('POST', '/api/staff', { email, password, role }),
    updateStaff: (id, patch) => req('PATCH', '/api/staff/' + id, patch),
    deleteStaff: (id) => req('DELETE', '/api/staff/' + id),
  };
})();
