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
    // menu (public read; admin/editor write) — published to the DB like content
    getMenu: () => req('GET', '/api/menu'),
    putMenu: (data) => req('PUT', '/api/menu', data),

    // auth
    login: (email, password) => req('POST', '/api/login', { email, password }),
    logout: () => req('POST', '/api/logout'),
    me: () => req('GET', '/api/me'),

    // site content (public read; admin write)
    getContent: () => req('GET', '/api/content'),
    putContent: (data) => req('PUT', '/api/content', data),
    uploadImage: (key, dataUrl) => req('POST', '/api/content/image', { key, dataUrl }),

    // admin: staff accounts
    listStaff: () => req('GET', '/api/staff'),
    createStaff: (email, password, role) => req('POST', '/api/staff', { email, password, role }),
    updateStaff: (id, patch) => req('PATCH', '/api/staff/' + id, patch),
    deleteStaff: (id) => req('DELETE', '/api/staff/' + id),
  };
})();
