// Shared data store for events + careers.
// Reads localStorage overrides (set via admin.html) and falls back to defaults.
(function () {
  const EVENT_DEFAULTS = {
    '2026-05-16': { title: 'Cupping · Ethiopia Yirgacheffe', kind: 'cupping', time: '11:00', note: 'Six lots · blind score · open seats', hop: 'https://hop.doppler.coffee/e/yirg' },
    '2026-05-17': { title: 'Sunday Cinema · Spirited Away', kind: 'film', time: '16:00', note: 'Lounge · projector · iced bombóns', hop: 'https://hop.doppler.coffee/e/spirited' },
    '2026-05-21': { title: 'Listening Night · Ambient B-sides', kind: 'listening', time: '20:00', note: 'Vinyl · slow bar · 30 seats', hop: 'https://hop.doppler.coffee/e/ambient' },
    '2026-05-23': { title: 'Latte Art Throwdown', kind: 'workshop', time: '18:00', note: 'Bring your own tamper', hop: 'https://hop.doppler.coffee/e/throwdown' },
    '2026-05-24': { title: 'Sunday Cinema · Past Lives', kind: 'film', time: '16:00', note: 'Lounge · projector', hop: 'https://hop.doppler.coffee/e/pastlives' },
    '2026-05-28': { title: 'Guest Roaster · Subko, Bombay', kind: 'guest', time: '11:00', note: 'Pop-up bar · ticketed', hop: 'https://hop.doppler.coffee/e/subko' },
    '2026-05-30': { title: 'Sunset Shift Tasting · v2.0', kind: 'tasting', time: '17:30', note: 'New menu preview · paired', hop: 'https://hop.doppler.coffee/e/sunset' },
    '2026-06-04': { title: 'Cupping · Colombia Pink Bourbon', kind: 'cupping', time: '11:00', note: '', hop: 'https://hop.doppler.coffee/e/pinkbourbon' },
    '2026-06-07': { title: 'Sunday Cinema · Howl\u2019s Moving Castle', kind: 'film', time: '16:00', note: '', hop: 'https://hop.doppler.coffee/e/howl' },
    '2026-06-11': { title: 'Listening Night · Hindustani Classical', kind: 'listening', time: '20:00', note: '', hop: 'https://hop.doppler.coffee/e/hindustani' },
    '2026-06-14': { title: 'Sunday Cinema · Perfect Days', kind: 'film', time: '16:00', note: '', hop: 'https://hop.doppler.coffee/e/perfectdays' },
    '2026-06-18': { title: 'Brew Workshop · The Hario Switch', kind: 'workshop', time: '18:00', note: 'Eight seats · ₹1,200 incl. beans', hop: 'https://hop.doppler.coffee/e/switch' },
    '2026-06-21': { title: 'Solstice Pop-up · Long Day Menu', kind: 'tasting', time: '08:00', note: 'Open 06:00 — 24:00', hop: 'https://hop.doppler.coffee/e/solstice' },
    '2026-06-28': { title: 'Guest Roaster · Blue Tokai', kind: 'guest', time: '11:00', note: '', hop: 'https://hop.doppler.coffee/e/bluetokai' },
  };

  const JOB_DEFAULTS = [
    {
      id: 'head-barista',
      title: 'Head Barista',
      team: 'Coffee Bar',
      type: 'Full-time',
      location: 'Jaipur · on-site',
      pay: '₹38,000 – ₹52,000 / month + tips',
      summary: 'Run the bar. Pull shots that stay tight all 12 hours. Train the line. Care, deeply, about the cup in front of you.',
      requirements: [
        '3+ years on a high-volume specialty bar',
        'Comfortable dialling in espresso and pour-over daily',
        'Calm under volume, kind under pressure',
        'You can train, not just perform',
      ],
      apply: 'https://hop.doppler.coffee/jobs/head-barista',
    },
    {
      id: 'roaster',
      title: 'Roaster',
      team: 'Production',
      type: 'Full-time',
      location: 'Jaipur · on-site',
      pay: '₹45,000 – ₹65,000 / month',
      summary: 'Run our 12kg loring. Cup every roast. Build profiles for new lots and the seasonal menu shift.',
      requirements: [
        'Experience on a production drum or air roaster',
        'Cupping vocabulary and a calibrated palate',
        'Comfortable with Cropster (or willing to learn fast)',
        'Mornings — roast days start at 06:00',
      ],
      apply: 'https://hop.doppler.coffee/jobs/roaster',
    },
    {
      id: 'host',
      title: 'Host & Floor Lead',
      team: 'Service',
      type: 'Full-time',
      location: 'Jaipur · on-site',
      pay: '₹28,000 – ₹36,000 / month + tips',
      summary: 'Set the tone of the room. Seat guests with grace. Run the floor team across two services, every day.',
      requirements: [
        'Hospitality experience — café, restaurant or hotel',
        'Bilingual: English + Hindi (Marwari a plus)',
        'Warm, organised, never flustered',
        'Open to evening shifts and weekends',
      ],
      apply: 'https://hop.doppler.coffee/jobs/host',
    },
    {
      id: 'pastry',
      title: 'Pastry Cook',
      team: 'Kitchen',
      type: 'Full-time',
      location: 'Jaipur · on-site',
      pay: '₹32,000 – ₹44,000 / month',
      summary: 'Bake our croissants, focaccia, and the rotating cake. Six days on the bench, one off, and a clean station to inherit.',
      requirements: [
        '2+ years pastry or laminated doughs',
        'Early starts — kitchen lights on at 05:00',
        'Ownership of the section, top to bottom',
      ],
      apply: 'https://hop.doppler.coffee/jobs/pastry',
    },
    {
      id: 'designer',
      title: 'Brand Designer · 6-month contract',
      team: 'Studio',
      type: 'Contract',
      location: 'Remote · or Jaipur',
      pay: '₹1,80,000 – ₹2,40,000 / month',
      summary: 'Design the seasonal menu, in-shop signage, packaging for the retail line, and our quarterly zine. Print-first, never templated.',
      requirements: [
        'Strong editorial / type portfolio',
        'Print production fluency (CMYK, paper, finishes)',
        'Comfortable working solo and in long, slow drafts',
      ],
      apply: 'https://hop.doppler.coffee/jobs/designer',
    },
  ];

  const ABOUT_DEFAULTS = {
    careersIntro: "Doppler is small, deliberate, and built on craft. We hire slowly — and once you're in, we invest in you. Beans, training, equipment, time to study, time to think.",
    perks: [
      'Cost-price beans, every week',
      'Annual origin trip — we go together',
      'Health cover · partner discount',
      'Mental health stipend',
      'Two weeks paid leave + birthday off',
      'Tuition reimbursement for craft courses',
    ],
    contact: 'hello@doppler.coffee',
  };

  const HOP_DEFAULTS = 'https://hop.doppler.coffee';

  // --- Editable photos. key is also the short alias consumed by window.__resources. ---
  const IMAGE_SLOTS = [
    { key: 'facade',        label: 'Hero · facade',          path: 'img/facade.png',             where: 'Top of homepage · hero background · rec 1600×1100px landscape' },
    { key: 'courtyard',     label: 'About · courtyard',      path: 'img/courtyard.png',          where: 'About section photo · rec 1200×1600px portrait (3:4)' },
    { key: 'tour_approach', label: 'Tour · the approach',    path: 'img/facade.png',             where: 'Floorplan tour · the approach · rec 1280×1600px portrait (4:5)' },
    { key: 'tour_matcha',   label: 'Tour · matcha bar',      path: 'img/courtyard.png',          where: 'Floorplan tour · matcha bar · rec 1280×1600px portrait (4:5)' },
    { key: 'atrium',        label: 'Tour · community table', path: 'img/atrium.png',             where: 'Floorplan tour · community table · rec 1280×1600px portrait (4:5)' },
    { key: 'espresso',      label: 'Tour · coffee bar',      path: 'img/espresso.png',           where: 'Floorplan tour · coffee bar · rec 1280×1600px portrait (4:5)' },
    { key: 'slowbar',       label: 'Tour · floor hall',      path: 'img/slowbar.png',            where: 'Floorplan tour · floor hall · rec 1280×1600px portrait (4:5)' },
    { key: 'lounge',        label: 'Tour · lounge',          path: 'img/lounge.png',             where: 'Floorplan tour · lounge · rec 1280×1600px portrait (4:5)' },
    { key: 'logo',          label: 'Logo · mark',            path: 'img/logo.png',               where: 'Nav, hero card, loader, footer · rec 512×512px PNG transparent' },
    { key: 'logo_knockout', label: 'Hero wordmark',          path: 'img/logo-knockout-trim.png', where: 'Large logo in hero · rec 600×625px PNG transparent' },
  ];

  const MENU_DEFAULTS = {
    edition: 'Edition 02 · Summer 2026',
    titleTop: 'Sunset',
    titleMid: 'Shift',
    titleSerif: 'two-point-oh.',
    address: 'Doppler · coffee\nC-Scheme · Jaipur',
    hours: '06:00 — 22:30',
    footTagline: 'Slow water. Second cup is always.',
    footCopyright: '© 2026 Doppler Coffee · Edition 02 · Summer 2026',
    footCoords: '26.9130°N · 75.8060°E',
    categories: [
      { id: 'classics',  column: 'left', title: 'Classics · Espresso Bar', code: '§ 01 · Hot / Iced', sub: '', items: [
        { name: 'Espresso shot',    note: 'double · ristretto-leaning',           price: '180' },
        { name: 'Americano',        note: 'long black · 1:4',                     price: '200' },
        { name: 'Cappuccino',       note: '5oz · dry foam',                       price: '240' },
        { name: 'Latte',            note: '8oz · velvet',                         price: '260' },
        { name: 'Flavoured Latte',  note: 'vanilla · hazelnut · caramel · rose',  price: '260' },
        { name: 'Flat White',       note: 'hot · micro-foam',                     price: '260' },
        { name: 'Cortado',          note: 'cut · 1:1',                            price: '220' },
        { name: 'Macchiato',        note: 'hot · marked',                         price: '220' },
        { name: 'Mocha',            note: 'dark cocoa · single origin',           price: '280' },
      ]},
      { id: 'manual',    column: 'left', title: 'Manual Bar',   code: '§ 02 · Slow water',  sub: 'Pour-over via Hario Switch · open the valve when you\u2019re ready', items: [
        { name: 'IGC · Ethiopian',   note: 'yirgacheffe · jasmine · stone fruit',  price: '360' },
        { name: 'IGC · Pink Bourbon',note: 'colombia · grape · honey',             price: '360' },
        { name: 'IGC · Geisha',      note: 'panama · bergamot · floral · rare',    price: '640' },
        { name: 'AeroPress',         note: 'inverted · 1m steep · clean cup',      price: '320' },
      ]},
      { id: 'coldbrew',  column: 'left', title: 'Cold Brew', code: '§ 03 · 18-hour drip', sub: '', items: [
        { name: 'Classic',  note: 'house blend · neat',                price: '240' },
        { name: 'Orange',   note: 'cold brew · citrus · tonic',        price: '280' },
        { name: 'Coconut',  note: 'cold brew · tender coconut · ice',  price: '280' },
      ]},
      { id: 'craft',     column: 'right', title: 'Craft Bar', code: '§ 04 · Speciality', sub: '', items: [
        { name: 'Vietnamese Phin', note: 'robusta · condensed milk · slow drip', price: '320' },
      ]},
      { id: 'signature', column: 'right', title: 'Signature', code: '§ 05 · House recipes', sub: '', items: [
        { name: 'Orange Honey Espresso', note: 'espresso · orange · raw honey · ice', price: '360' },
        { name: 'Café Bombón',           note: 'condensed milk · double espresso',    price: '360' },
        { name: 'Honey Trap',            note: 'espresso · jaggery · cream float',    price: '320' },
        { name: 'Greek Freddo',          note: 'whipped espresso · ice · cold milk',  price: '320' },
        { name: 'Vietnamese Cloud',      note: 'phin · coconut foam · cocoa dust',    price: '360' },
      ]},
      { id: 'frappes',   column: 'right', title: 'Frappés', code: '§ 06 · Blended', sub: '', items: [
        { name: 'OG Frappé',      note: 'espresso · ice · milk · sugar',      price: '240' },
        { name: 'Caramel Frappé', note: 'house caramel · espresso · cream',   price: '240' },
      ]},
      { id: 'coolers',   column: 'right', title: 'Coolers', code: '§ 07 · Cold & long', sub: '', items: [
        { name: 'Espresso Tonic',      note: 'hazelnut · caramel · indian tonic',  price: '280' },
        { name: 'Watermelon Mojito',   note: 'watermelon · mint · lime · soda',    price: '240' },
        { name: 'Cold-pressed Juices', note: 'watermelon · orange-pineapple',      price: '240' },
      ]},
      { id: 'smoothies', column: 'right', title: 'Smoothies', code: '§ 08 · Whole-fruit', sub: '', items: [
        { name: 'Avocado',       note: 'avocado · honey · cold milk · ice',        price: '420' },
        { name: 'Mixed Berries', note: 'strawberry · blueberry · raspberry',       price: '420' },
      ]},
    ],
    addons: [
      { name: 'Oat milk',           price: '₹60'  },
      { name: 'Almond milk',        price: '₹60'  },
      { name: 'Decaf shot (DBCAP)', price: '₹100' },
    ],
    kitchenTitle: 'From the brick oven.',
    kitchenBody:  'Sliced avocado & sourdough toast, sprouted seeds, sauerkraut. Green apple, arugula, sourdough with pistachio. Small plates, all-day.',
    kitchenRange: 'From ₹320 · up to ₹860',
    finePrintTitle: 'One last thing.',
    finePrintBody:  'All prices include GST. Beans roasted in-house, weekly. Ask the barista which lot is on bar today — we\u2019ll happily pour you a free taster before you commit.',
  };

  // --- Local storage helpers ---
  function readLS(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) { return fallback; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  window.DopplerData = {
    // events
    getEvents() { return readLS('doppler.events', EVENT_DEFAULTS); },
    setEvents(obj) { writeLS('doppler.events', obj); },
    resetEvents() { localStorage.removeItem('doppler.events'); },
    EVENT_DEFAULTS,

    // jobs
    getJobs() { return readLS('doppler.jobs', JOB_DEFAULTS); },
    setJobs(arr) { writeLS('doppler.jobs', arr); },
    resetJobs() { localStorage.removeItem('doppler.jobs'); },
    JOB_DEFAULTS,

    // about (careers intro / perks / contact)
    getAbout() { return Object.assign({}, ABOUT_DEFAULTS, readLS('doppler.about', {})); },
    setAbout(obj) { writeLS('doppler.about', obj); },
    resetAbout() { localStorage.removeItem('doppler.about'); },
    ABOUT_DEFAULTS,

    // hop url
    getHopUrl() { return readLS('doppler.hop', HOP_DEFAULTS); },
    setHopUrl(s) { writeLS('doppler.hop', s); },
    HOP_DEFAULTS,

    // menu
    getMenu() {
      const stored = readLS('doppler.menu', null);
      if (!stored) return JSON.parse(JSON.stringify(MENU_DEFAULTS));
      // shallow merge so newly-added top-level fields fall back to defaults
      return Object.assign({}, MENU_DEFAULTS, stored);
    },
    setMenu(obj) { writeLS('doppler.menu', obj); },
    resetMenu() { localStorage.removeItem('doppler.menu'); },
    MENU_DEFAULTS,

    // images — stored as {key: dataURL} in localStorage. Falls back to default file paths.
    getImages() { return readLS('doppler.images', {}); },
    setImage(key, dataURL) {
      const m = readLS('doppler.images', {});
      m[key] = dataURL;
      writeLS('doppler.images', m);
      applyImagesToWindow();
    },
    clearImage(key) {
      const m = readLS('doppler.images', {});
      delete m[key];
      writeLS('doppler.images', m);
      applyImagesToWindow();
    },
    clearAllImages() {
      localStorage.removeItem('doppler.images');
      applyImagesToWindow();
    },
    IMAGE_SLOTS,
  };

  // --- Resolve images into window.__resources (both short-key and full-path) + override hero CSS ---
  function applyImagesToWindow() {
    const stored = readLS('doppler.images', {});
    const r = window.__resources || {};
    IMAGE_SLOTS.forEach(s => {
      const v = stored[s.key] || s.path;
      r[s.key]  = v;
      r[s.path] = v;
    });
    window.__resources = r;

    // The hero uses a CSS background-image declared in styles.css. If the user has
    // uploaded a custom facade photo, inject a style override at runtime.
    let tag = document.getElementById('__doppler_img_overrides');
    if (!tag) {
      tag = document.createElement('style');
      tag.id = '__doppler_img_overrides';
      (document.head || document.documentElement).appendChild(tag);
    }
    const css = [];
    if (stored.facade) {
      css.push(`.hero .facade { background-image: url('${stored.facade}') !important; }`);
    }
    tag.textContent = css.join('\n');
  }
  applyImagesToWindow();
  // Cross-tab: react when admin saves an image.
  window.addEventListener('storage', (e) => { if (e.key === 'doppler.images') applyImagesToWindow(); });
})();
