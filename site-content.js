// Editable site content. Defaults live here (site works standalone); the café
// server publishes overrides via /api/content which are merged on top.
(function () {
  // --- Default copy (mirrors the original hardcoded marketing site) ---
  const DEFAULTS = {
    // Hero
    hero_label: '§ 01 / hello · the second cup is always',
    hero_dev: 'डॉप्लर',
    hero_line2: 'in brick',
    hero_line3: '& light.',
    hero_intro: 'A specialty roastery and cafe in the pink city — under a glass roof, behind a brick wall, beside a moringa tree.',
    hero_btn_reserve: 'Reserve a table',
    hero_btn_tour: 'Tour the rooms',
    hero_meta_open: '06:00 — 22:30',
    hero_meta_origins: 'Chikmagalur · Araku',
    hero_meta_roast: 'In-house · weekly',

    // About
    about_label: '§ 02 / about · the room',
    about_photo_caption: 'Courtyard · afternoon',
    about_photo_meta: '35mm · ƒ/2.8',
    about_h1: 'A brick wall,',
    about_h2: 'a glass roof,',
    about_h3: 'a slow morning.',
    about_p1: 'The wall is hand-laid brick — local, kiln-fired, set with a thumb-thick mortar joint. At dusk, lights buried in the lawn throw long warm bars across the path to the door.',
    about_p2: 'Inside: lime-plaster walls, oak floor, a glass-and-timber roof above the espresso bar. Onion-shaped silk lanterns hang over the slow bar. The moringa stays out front.',
    about_p3: 'Beans travel from estates in Chikmagalur and the Araku Valley, roasted in small batches on-site. डॉप्लर — a name for the shift you hear when something moves toward you. We hope yours does, too.',
    about_spec1_n: '06:00', about_spec1_l: 'Daily open',
    about_spec2_n: '14', about_spec2_l: 'Single-origins on bar',
    about_spec3_n: '2.4k', about_spec3_l: 'Cups poured / week',

    // Specials (rotating — leave a card's name blank to hide it)
    specials_label: '§ specials · this week on the bar',
    specials_h1: "This week's",
    specials_h2: 'pours.',
    specials_intro: 'A short rotation — seasonal lots, limited batches, and the odd experiment from the bar. Here while they last.',
    specials_1_tag: 'Limited · 30 cups/day', specials_1_name: 'Geisha, washed',
    specials_1_desc: 'Panama · bergamot, jasmine, white peach. Poured on the V60, no milk.', specials_1_price: '₹640',
    specials_2_tag: 'Seasonal', specials_2_name: 'Strawberry Cortado',
    specials_2_desc: 'Double ristretto, fresh strawberry reduction, steamed milk. Spring only.', specials_2_price: '₹320',
    specials_3_tag: 'Bar experiment', specials_3_name: 'Cascara Tonic',
    specials_3_desc: 'Coffee-cherry syrup, indian tonic, orange peel. Caffeine-light, bright.', specials_3_price: '₹280',

    // Brew
    brew_label: '§ 03 / brew · simulator',
    brew_h1: 'Pour your',
    brew_h2: 'own way.',

    // Tour
    tour_label: '§ 04 / tour · the floor plan',
    tour_h1: 'Walk the plan,',
    tour_h2: 'find the corner.',

    // Tour · per-area panel text (shown when a room is selected).
    // detail fields are one bullet per line.
    'tour_approach_name': 'The Approach',
    'tour_approach_tag': 'FACADE · DUSK · MAY',
    'tour_approach_desc': 'A 28-foot brick-paved walk between moringa and frangipani. Lights buried in the lawn flicker on at 18:30 — the first thing every guest sees.',
    'tour_approach_detail': 'Hand-laid brick\nMoringa · frangipani\n60 m to door',

    'tour_matcha-bar_name': 'Matcha Bar',
    'tour_matcha-bar_tag': 'MATCHA · UJI · 75°C',
    'tour_matcha-bar_desc': 'A small jade-tiled counter for ceremonial and culinary matcha. Uji powder, sifted; chasen whisked into peaks. Three seats only — bring patience.',
    'tour_matcha-bar_detail': 'Sift · bloom · whisk\n3 seats\nOpen from 09:00',

    'tour_community-table_name': 'Community Table',
    'tour_community-table_tag': 'COMMUNITY TABLE · 16 PAX',
    'tour_community-table_desc': 'A 13-foot reclaimed teak table beneath the glass roof. Eight stools either side — strangers become regulars; regulars become friends.',
    'tour_community-table_detail': 'Reclaimed teak\n16 seats\nGlass-roof daylight',

    'tour_coffee-bar_name': 'Coffee Bar',
    'tour_coffee-bar_tag': 'COFFEE BAR · CENTRE · 9.5′ × 7.5′',
    'tour_coffee-bar_desc': 'The curved island. Two grinders, one La Marzocco, a Hario Switch station. Everything within arm’s reach — the bar choreographed for a single barista to dance.',
    'tour_coffee-bar_detail': 'La Marzocco Linea PB\nMahlkönig EK43 · E80\nV60 · Switch · siphon',

    'tour_floor-hall_name': 'Floor Hall',
    'tour_floor-hall_tag': 'FLOOR HALL · LANTERNS · NIGHT',
    'tour_floor-hall_desc': 'Around the bar, the room opens up. Two-tops on the wings, four-tops down the middle, a velvet booth at the back for quiet conversations.',
    'tour_floor-hall_detail': '60 seats\n14 tables\n6 columns',

    'tour_projector-lounge_name': 'Projector Lounge',
    'tour_projector-lounge_tag': 'LOUNGE · PROJECTOR · SUN 16:00',
    'tour_projector-lounge_desc': 'A small sunken plaster room with a single projector. Sunday afternoons it plays Studio Ghibli; weekday nights, b-side films from the neighbourhood.',
    'tour_projector-lounge_detail': 'Projection wall · 13′-9″\n16 seats · bench\nBYO film, Wednesdays',

    // Reserve
    reserve_label: '§ 05 / reserve · events & tables',
    reserve_h1: "What's on,",
    reserve_h2: 'when to come.',
    reserve_intro: 'Cuppings, listening nights, Sunday cinema, the occasional pop-up. Tables and tickets are held through Hop — tap a date for the brief, then head over to book.',

    // Shared contact / footer
    contact_address: 'C-Scheme · Jaipur 302001',
    contact_hours: '06:00 — 22:30',
    contact_phone: '+91 14 1 234 0001',
    contact_email: 'hello@doppler.coffee',
    contact_instagram: '@doppler.jaipur',
    footer_blurb: 'A specialty roastery in Jaipur, behind a brick wall and under a glass roof. Slow water, single origin, the second cup is always.',
    footer_copyright: '© 2026 Doppler Coffee · 26.9130N · 75.8060E',
    footer_tagline: 'Designed in concrete',

    // Photos (URLs; defaults point at bundled files)
    img_facade: 'img/facade.png',
    img_courtyard: 'img/courtyard.png',
    img_atrium: 'img/atrium.png',
    img_espresso: 'img/espresso.png',
    img_slowbar: 'img/slowbar.png',
    img_lounge: 'img/lounge.png',

    // Tour rooms that previously reused the hero/about photos — now independent.
    img_tour_approach: 'img/facade.png',
    img_tour_matcha: 'img/courtyard.png',

    // Logos (CSS backgrounds; upload PNGs with transparent backgrounds)
    img_logo: 'img/logo.png',
    img_logo_knockout: 'img/logo-knockout-trim.png',
  };

  // --- Admin editor schema (groups + fields). type: text | area | image ---
  const SCHEMA = [
    { group: 'Hero', fields: [
      { key: 'hero_label', label: 'Eyebrow label' },
      { key: 'hero_dev', label: 'Headline · Devanagari' },
      { key: 'hero_line2', label: 'Headline · line 2' },
      { key: 'hero_line3', label: 'Headline · line 3 (serif)' },
      { key: 'hero_intro', label: 'Intro paragraph', type: 'area' },
      { key: 'hero_btn_reserve', label: 'Button · reserve' },
      { key: 'hero_btn_tour', label: 'Button · tour' },
      { key: 'hero_meta_open', label: 'Meta · open hours' },
      { key: 'hero_meta_origins', label: 'Meta · origins' },
      { key: 'hero_meta_roast', label: 'Meta · roast' },
    ]},
    { group: 'About', fields: [
      { key: 'about_label', label: 'Eyebrow label' },
      { key: 'about_h1', label: 'Heading · line 1' },
      { key: 'about_h2', label: 'Heading · line 2 (serif)' },
      { key: 'about_h3', label: 'Heading · line 3' },
      { key: 'about_p1', label: 'Paragraph 1', type: 'area' },
      { key: 'about_p2', label: 'Paragraph 2', type: 'area' },
      { key: 'about_p3', label: 'Paragraph 3', type: 'area' },
      { key: 'about_photo_caption', label: 'Photo caption' },
      { key: 'about_photo_meta', label: 'Photo meta' },
      { key: 'about_spec1_n', label: 'Spec 1 · number' }, { key: 'about_spec1_l', label: 'Spec 1 · label' },
      { key: 'about_spec2_n', label: 'Spec 2 · number' }, { key: 'about_spec2_l', label: 'Spec 2 · label' },
      { key: 'about_spec3_n', label: 'Spec 3 · number' }, { key: 'about_spec3_l', label: 'Spec 3 · label' },
    ]},
    { group: 'Specials', fields: [
      { key: 'specials_label', label: 'Eyebrow label' },
      { key: 'specials_h1', label: 'Heading · line 1' },
      { key: 'specials_h2', label: 'Heading · line 2 (serif)' },
      { key: 'specials_intro', label: 'Intro paragraph', type: 'area' },
      { key: 'specials_1_tag', label: 'Card 1 · tag' }, { key: 'specials_1_name', label: 'Card 1 · name (blank = hide)' },
      { key: 'specials_1_desc', label: 'Card 1 · description', type: 'area' }, { key: 'specials_1_price', label: 'Card 1 · price' },
      { key: 'specials_2_tag', label: 'Card 2 · tag' }, { key: 'specials_2_name', label: 'Card 2 · name (blank = hide)' },
      { key: 'specials_2_desc', label: 'Card 2 · description', type: 'area' }, { key: 'specials_2_price', label: 'Card 2 · price' },
      { key: 'specials_3_tag', label: 'Card 3 · tag' }, { key: 'specials_3_name', label: 'Card 3 · name (blank = hide)' },
      { key: 'specials_3_desc', label: 'Card 3 · description', type: 'area' }, { key: 'specials_3_price', label: 'Card 3 · price' },
    ]},
    { group: 'Brew', fields: [
      { key: 'brew_label', label: 'Eyebrow label' },
      { key: 'brew_h1', label: 'Heading · line 1' },
      { key: 'brew_h2', label: 'Heading · line 2 (serif)' },
    ]},
    { group: 'Tour', fields: [
      { key: 'tour_label', label: 'Eyebrow label' },
      { key: 'tour_h1', label: 'Heading · line 1' },
      { key: 'tour_h2', label: 'Heading · line 2 (serif)' },
    ]},
    { group: 'Tour · The Approach', fields: [
      { key: 'tour_approach_name', label: 'Area title' },
      { key: 'tour_approach_tag', label: 'Photo tag' },
      { key: 'tour_approach_desc', label: 'Description', type: 'area' },
      { key: 'tour_approach_detail', label: 'Detail bullets (one per line)', type: 'area' },
    ]},
    { group: 'Tour · Matcha Bar', fields: [
      { key: 'tour_matcha-bar_name', label: 'Area title' },
      { key: 'tour_matcha-bar_tag', label: 'Photo tag' },
      { key: 'tour_matcha-bar_desc', label: 'Description', type: 'area' },
      { key: 'tour_matcha-bar_detail', label: 'Detail bullets (one per line)', type: 'area' },
    ]},
    { group: 'Tour · Community Table', fields: [
      { key: 'tour_community-table_name', label: 'Area title' },
      { key: 'tour_community-table_tag', label: 'Photo tag' },
      { key: 'tour_community-table_desc', label: 'Description', type: 'area' },
      { key: 'tour_community-table_detail', label: 'Detail bullets (one per line)', type: 'area' },
    ]},
    { group: 'Tour · Coffee Bar', fields: [
      { key: 'tour_coffee-bar_name', label: 'Area title' },
      { key: 'tour_coffee-bar_tag', label: 'Photo tag' },
      { key: 'tour_coffee-bar_desc', label: 'Description', type: 'area' },
      { key: 'tour_coffee-bar_detail', label: 'Detail bullets (one per line)', type: 'area' },
    ]},
    { group: 'Tour · Floor Hall', fields: [
      { key: 'tour_floor-hall_name', label: 'Area title' },
      { key: 'tour_floor-hall_tag', label: 'Photo tag' },
      { key: 'tour_floor-hall_desc', label: 'Description', type: 'area' },
      { key: 'tour_floor-hall_detail', label: 'Detail bullets (one per line)', type: 'area' },
    ]},
    { group: 'Tour · Projector Lounge', fields: [
      { key: 'tour_projector-lounge_name', label: 'Area title' },
      { key: 'tour_projector-lounge_tag', label: 'Photo tag' },
      { key: 'tour_projector-lounge_desc', label: 'Description', type: 'area' },
      { key: 'tour_projector-lounge_detail', label: 'Detail bullets (one per line)', type: 'area' },
    ]},
    { group: 'Reserve', fields: [
      { key: 'reserve_label', label: 'Eyebrow label' },
      { key: 'reserve_h1', label: 'Heading · line 1' },
      { key: 'reserve_h2', label: 'Heading · line 2 (serif)' },
      { key: 'reserve_intro', label: 'Intro paragraph', type: 'area' },
    ]},
    { group: 'Contact & Footer', fields: [
      { key: 'contact_address', label: 'Address' },
      { key: 'contact_hours', label: 'Hours' },
      { key: 'contact_phone', label: 'Phone' },
      { key: 'contact_email', label: 'Email' },
      { key: 'contact_instagram', label: 'Instagram' },
      { key: 'footer_blurb', label: 'Footer blurb', type: 'area' },
      { key: 'footer_copyright', label: 'Footer copyright' },
      { key: 'footer_tagline', label: 'Footer tagline' },
    ]},
    { group: 'Photos', fields: [
      { key: 'img_facade', label: 'Hero · facade — 1600×1100px landscape (JPG)', type: 'image' },
      { key: 'img_courtyard', label: 'About · courtyard — 1200×1600px portrait 3:4 (JPG)', type: 'image' },
      { key: 'img_tour_approach', label: 'Tour · the approach — 1280×1600px portrait 4:5 (JPG)', type: 'image' },
      { key: 'img_tour_matcha', label: 'Tour · matcha bar — 1280×1600px portrait 4:5 (JPG)', type: 'image' },
      { key: 'img_atrium', label: 'Tour · community table — 1280×1600px portrait 4:5 (JPG)', type: 'image' },
      { key: 'img_espresso', label: 'Tour · coffee bar — 1280×1600px portrait 4:5 (JPG)', type: 'image' },
      { key: 'img_slowbar', label: 'Tour · floor hall — 1280×1600px portrait 4:5 (JPG)', type: 'image' },
      { key: 'img_lounge', label: 'Tour · lounge — 1280×1600px portrait 4:5 (JPG)', type: 'image' },
    ]},
    { group: 'Logos', fields: [
      { key: 'img_logo', label: 'Logo · mark (nav, hero card, loader, footer) — 512×512px square, PNG transparent', type: 'image' },
      { key: 'img_logo_knockout', label: 'Hero wordmark (large logo) — 600×625px, PNG transparent', type: 'image' },
    ]},
  ];

  // Effective content = defaults overlaid with published overrides.
  let overrides = {};
  function rebuild() {
    const eff = Object.assign({}, DEFAULTS, overrides);
    window.__SITE = eff;
    // Image resources consumed by components + hero facade CSS.
    const r = window.__resources || {};
    ['facade', 'courtyard', 'atrium', 'espresso', 'slowbar', 'lounge'].forEach((k) => {
      const v = eff['img_' + k];
      r[k] = v; r['img/' + k + '.png'] = v;
    });
    window.__resources = r;
    let tag = document.getElementById('__site_img_overrides');
    if (!tag) { tag = document.createElement('style'); tag.id = '__site_img_overrides'; (document.head || document.documentElement).appendChild(tag); }
    // Hero facade + logos are CSS background-images; override just the image,
    // leaving each rule's own sizing/position intact.
    tag.textContent =
      `.hero .facade { background-image: url('${eff.img_facade}') !important; }\n` +
      `.brand-mark, .hero-card .logo-mark, .loader .logo-mark { background-image: url('${eff.img_logo}') !important; }\n` +
      `.bsb-logo { background-image: url('${eff.img_logo_knockout}') !important; }`;
  }

  // Synchronous default so first render has content.
  rebuild();

  // Global accessor used by components.
  window.SITE = function (key) {
    const v = window.__SITE && window.__SITE[key];
    return v == null ? '' : v;
  };
  window.DopplerContent = { DEFAULTS, SCHEMA, get: () => Object.assign({}, DEFAULTS, overrides) };

  // Fetch published overrides, then re-render if the app exposed a hook.
  fetch('/api/content', { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((data) => {
      overrides = data && typeof data === 'object' ? data : {};
      rebuild();
      if (typeof window.__render === 'function') window.__render();
    })
    .catch(() => {});
})();
