// 2D Floor-plan tour — clickable blueprint
const ROOMS = [
  {
    id: 'approach',
    code: 'R · 01',
    name: 'The Approach',
    short: 'Garden path',
    desc: 'A 28-foot brick-paved walk between moringa and frangipani. Lights buried in the lawn flicker on at 18:30 — the first thing every guest sees.',
    photo: 'img/facade.png',
    photoTag: 'FACADE · DUSK · MAY',
    detail: ['Hand-laid brick', 'Moringa · frangipani', '60 m to door'],
  },
  {
    id: 'matcha-bar',
    code: 'R · 02',
    name: 'Matcha Bar',
    short: 'Top-left',
    desc: 'A small jade-tiled counter for ceremonial and culinary matcha. Uji powder, sifted; chasen whisked into peaks. Three seats only — bring patience.',
    photo: 'img/courtyard.png',
    photoTag: 'MATCHA · UJI · 75°C',
    detail: ['Sift · bloom · whisk', '3 seats', 'Open from 09:00'],
  },
  {
    id: 'community-table',
    code: 'R · 03',
    name: 'Community Table',
    short: 'Long shared bench',
    desc: 'A 13-foot reclaimed teak table beneath the glass roof. Eight stools either side — strangers become regulars; regulars become friends.',
    photo: 'img/atrium.png',
    photoTag: 'COMMUNITY TABLE · 16 PAX',
    detail: ['Reclaimed teak', '16 seats', 'Glass-roof daylight'],
  },
  {
    id: 'coffee-bar',
    code: 'R · 04',
    name: 'Coffee Bar',
    short: 'Curved island · heart',
    desc: 'The curved island. Two grinders, one La Marzocco, a Hario Switch station. Everything within arm’s reach — the bar choreographed for a single barista to dance.',
    photo: 'img/espresso.png',
    photoTag: 'COFFEE BAR · CENTRE · 9.5′ × 7.5′',
    detail: ['La Marzocco Linea PB', 'Mahlk\u00f6nig EK43 · E80', 'V60 · Switch · siphon'],
  },
  {
    id: 'floor-hall',
    code: 'R · 05',
    name: 'Floor Hall',
    short: '60 pax inside',
    desc: 'Around the bar, the room opens up. Two-tops on the wings, four-tops down the middle, a velvet booth at the back for quiet conversations.',
    photo: 'img/slowbar.png',
    photoTag: 'FLOOR HALL · LANTERNS · NIGHT',
    detail: ['60 seats', '14 tables', '6 columns'],
  },
  {
    id: 'projector-lounge',
    code: 'R · 06',
    name: 'Projector Lounge',
    short: 'Top-right · cinema',
    desc: 'A small sunken plaster room with a single projector. Sunday afternoons it plays Studio Ghibli; weekday nights, b-side films from the neighbourhood.',
    photo: 'img/lounge.png',
    photoTag: 'LOUNGE · PROJECTOR · SUN 16:00',
    detail: ['Projection wall · 13′-9″', '16 seats · bench', 'BYO film, Wednesdays'],
  },
];

function SpaceTour() {
  const [activeId, setActiveId] = React.useState('coffee-bar');
  const [hoverId, setHoverId] = React.useState(null);

  const active = ROOMS.find(r => r.id === activeId);

  const select = (id) => {
    if (window.AudioCtx) window.AudioCtx.click();
    setActiveId(id);
  };

  const photoSrc = (window.__resources && window.__resources[active.photo]) || active.photo;

  // Region paths (viewBox 0 0 800 1200)
  // Designed from the supplied 2D blueprint.
  const REGION_PATHS = {
    'matcha-bar': 'M 110 100 H 270 V 230 H 110 Z',
    'community-table': 'M 270 100 H 540 V 230 H 270 Z',
    'projector-lounge': 'M 540 36 H 690 V 230 H 540 Z',
    'coffee-bar':
      // kidney-shaped curved island
      'M 290 260 C 290 220 380 220 400 250 C 420 220 510 220 510 260 ' +
      'L 510 410 C 510 460 420 470 400 440 C 380 470 290 460 290 410 Z',
    'floor-hall':
      // L-shape around the coffee bar (excluding kitchen left + admin right column)
      'M 270 230 H 540 V 260 H 510 V 460 H 540 V 720 H 270 Z',
    'approach': 'M 330 720 H 470 V 1100 Q 470 1140 430 1140 H 370 Q 330 1140 330 1100 Z',
  };

  // Label anchors per region (where the code + name texts sit)
  const REGION_LABELS = {
    'matcha-bar':       { x: 190, y: 165 },
    'community-table':  { x: 405, y: 165 },
    'projector-lounge': { x: 615, y: 130 },
    'coffee-bar':       { x: 400, y: 345 },
    'floor-hall':       { x: 405, y: 600 },
    'approach':         { x: 400, y: 920 },
  };

  return (
    <section className="section dark" id="tour" data-screen-label="04 Tour">
      <div className="row-tag">
        <span className="label on-dark">§ 04 / tour · the floor plan</span>
        <span className="label on-dark">tap a room · 6 areas</span>
      </div>

      <h2 className="huge reveal" style={{ marginBottom: 32 }}>
        Walk the plan,<br/>
        <span className="serif">find the corner.</span>
      </h2>

      <div className="plan-split">
        {/* LEFT — blueprint */}
        <div className="plan-wrap">
          <div className="plan-frame">
            {/* corner ticks */}
            <span className="tick tl"></span>
            <span className="tick tr"></span>
            <span className="tick bl"></span>
            <span className="tick br"></span>

            <svg viewBox="0 0 800 1200" className="plan-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <pattern id="plan-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(244,201,122,0.06)" strokeWidth="0.5"/>
                </pattern>
                <pattern id="tile" width="14" height="14" patternUnits="userSpaceOnUse">
                  <rect width="14" height="14" fill="rgba(244,201,122,0.03)"/>
                  <path d="M 0 0 L 14 14 M 14 0 L 0 14" stroke="rgba(244,201,122,0.05)" strokeWidth="0.4"/>
                </pattern>
              </defs>

              {/* paper / grid */}
              <rect x="0" y="0" width="800" height="1200" fill="url(#plan-grid)"/>

              {/* property boundary (dashed slanted edge) */}
              <path d="M 60 1170 L 740 1180" stroke="rgba(244,201,122,0.35)" strokeWidth="0.8" strokeDasharray="4 4" fill="none"/>
              <path d="M 60 30 L 60 1170 M 740 30 L 740 1180" stroke="rgba(244,201,122,0.25)" strokeWidth="0.6" strokeDasharray="3 5" fill="none"/>

              {/* Site label */}
              <text x="70" y="50" className="plan-label" fill="rgba(244,201,122,0.5)">SITE · 0.32 ACRE · C-SCHEME</text>
              <text x="730" y="50" className="plan-label" fill="rgba(244,201,122,0.5)" textAnchor="end">N ↑</text>

              {/* compass */}
              <g transform="translate(740 90)">
                <circle r="14" fill="none" stroke="rgba(244,201,122,0.4)" strokeWidth="0.6"/>
                <path d="M 0 -12 L 4 0 L 0 12 L -4 0 Z" fill="rgba(244,201,122,0.6)"/>
                <text y="-18" textAnchor="middle" className="plan-label" fill="rgba(244,201,122,0.6)">N</text>
              </g>

              {/* ============ NON-INTERACTIVE CONTEXT ROOMS ============ */}
              {/* outer building outline (with projector bump) */}
              <path
                d="M 110 100 L 540 100 L 540 36 L 690 36 L 690 720 L 110 720 Z"
                fill="rgba(235,227,210,0.02)"
                stroke="rgba(235,227,210,0.9)"
                strokeWidth="2.4"
              />
              {/* inner outline (double-line wall effect) */}
              <path
                d="M 117 107 L 540 107 L 540 43 L 683 43 L 683 713 L 117 713 Z"
                fill="none"
                stroke="rgba(235,227,210,0.35)"
                strokeWidth="0.6"
              />

              {/* Service windows at top wall */}
              <g>
                <rect x="180" y="96" width="18" height="8" fill="rgba(244,201,122,0.18)" stroke="rgba(235,227,210,0.6)" strokeWidth="0.6"/>
                <rect x="220" y="96" width="18" height="8" fill="rgba(244,201,122,0.18)" stroke="rgba(235,227,210,0.6)" strokeWidth="0.6"/>
                <rect x="290" y="96" width="14" height="8" fill="rgba(244,201,122,0.18)" stroke="rgba(235,227,210,0.6)" strokeWidth="0.6"/>
              </g>

              {/* Right-side window slits */}
              <g>
                {[100, 170, 250, 330, 420, 510, 600, 660].map(y => (
                  <rect key={'w-'+y} x="687" y={y} width="4" height="22" fill="rgba(244,201,122,0.18)" stroke="rgba(235,227,210,0.5)" strokeWidth="0.4"/>
                ))}
              </g>

              {/* Kitchen rooms (left strip) — with door swings + counters */}
              <g className="ctx">
                {/* Room 1 */}
                <rect x="110" y="230" width="160" height="120" fill="rgba(244,201,122,0.06)" stroke="rgba(235,227,210,0.45)" strokeWidth="1"/>
                {/* counter along back wall */}
                <rect x="118" y="238" width="48" height="14" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                {/* sink */}
                <rect x="170" y="238" width="20" height="14" fill="rgba(124,179,66,0.1)" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                {/* stove */}
                <rect x="194" y="238" width="20" height="14" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                <circle cx="200" cy="245" r="2" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.4"/>
                <circle cx="208" cy="245" r="2" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.4"/>
                {/* door swing */}
                <path d="M 270 320 A 26 26 0 0 0 244 346" fill="none" stroke="rgba(235,227,210,0.45)" strokeWidth="0.6"/>
                <text x="190" y="295" textAnchor="middle" className="plan-label" fill="rgba(235,227,210,0.55)">KITCHEN · 01</text>
                <text x="190" y="308" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.4)">7′-3″</text>

                {/* Room 2 */}
                <rect x="110" y="350" width="160" height="170" fill="rgba(244,201,122,0.06)" stroke="rgba(235,227,210,0.45)" strokeWidth="1"/>
                <rect x="118" y="358" width="80" height="16" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                <rect x="200" y="358" width="64" height="16" fill="rgba(124,179,66,0.08)" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                {/* island */}
                <rect x="150" y="430" width="80" height="20" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                {/* door */}
                <path d="M 270 490 A 26 26 0 0 0 244 516" fill="none" stroke="rgba(235,227,210,0.45)" strokeWidth="0.6"/>
                <text x="190" y="395" textAnchor="middle" className="plan-label" fill="rgba(235,227,210,0.55)">KITCHEN · 02</text>
                <text x="190" y="408" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.4)">21′-1″</text>

                {/* Room 3 */}
                <rect x="110" y="520" width="160" height="200" fill="rgba(244,201,122,0.06)" stroke="rgba(235,227,210,0.45)" strokeWidth="1"/>
                {/* counter back wall */}
                <rect x="118" y="528" width="144" height="14" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                {/* prep tables */}
                <rect x="150" y="600" width="40" height="22" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                <rect x="200" y="600" width="40" height="22" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                {/* fridge units */}
                <rect x="118" y="660" width="22" height="40" fill="rgba(127,179,213,0.08)" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                <rect x="146" y="660" width="22" height="40" fill="rgba(127,179,213,0.08)" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                {/* door */}
                <path d="M 270 660 A 30 30 0 0 0 240 690" fill="none" stroke="rgba(235,227,210,0.45)" strokeWidth="0.6"/>
                <text x="190" y="568" textAnchor="middle" className="plan-label" fill="rgba(235,227,210,0.55)">KITCHEN · 03</text>
                <text x="190" y="581" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.4)">35′-0″</text>
              </g>

              {/* Right column: Merch / WC / Stairs / Admin — detailed */}
              <g className="ctx">
                {/* Merch */}
                <rect x="540" y="230" width="150" height="90"  fill="rgba(244,201,122,0.05)" stroke="rgba(235,227,210,0.45)" strokeWidth="1"/>
                {/* merch shelving (3 lines) */}
                <line x1="548" y1="240" x2="548" y2="312" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                <line x1="582" y1="240" x2="582" y2="312" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                <line x1="618" y1="240" x2="618" y2="312" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                {/* counter */}
                <rect x="546" y="260" width="64" height="14" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.6"/>
                <text x="615" y="270" textAnchor="middle" className="plan-label" fill="rgba(235,227,210,0.6)">MERCH</text>
                <text x="615" y="284" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.4)">2′-7½″</text>

                {/* WC ladies */}
                <rect x="540" y="320" width="80"  height="80"  fill="rgba(244,201,122,0.05)" stroke="rgba(235,227,210,0.45)" strokeWidth="1"/>
                {/* basin */}
                <ellipse cx="556" cy="334" rx="9" ry="6" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                {/* toilet (oval seat + tank) */}
                <ellipse cx="598" cy="382" rx="9" ry="11" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                <rect x="591" y="370" width="14" height="4" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                {/* door swing */}
                <path d="M 540 348 A 22 22 0 0 1 562 370" fill="none" stroke="rgba(235,227,210,0.45)" strokeWidth="0.6"/>
                <text x="580" y="396" textAnchor="middle" className="plan-label" fill="rgba(235,227,210,0.5)">WC</text>

                {/* Stairs */}
                <rect x="620" y="320" width="70"  height="160" fill="rgba(244,201,122,0.05)" stroke="rgba(235,227,210,0.45)" strokeWidth="1"/>
                {Array.from({ length: 8 }).map((_, i) => (
                  <line key={'st-'+i} x1="620" y1={335 + i*18} x2="690" y2={335 + i*18} stroke="rgba(235,227,210,0.35)" strokeWidth="0.5"/>
                ))}
                {/* up arrow on stairs */}
                <path d="M 655 470 L 655 405 M 651 410 L 655 405 L 659 410" stroke="rgba(244,201,122,0.6)" strokeWidth="0.8" fill="none"/>
                <text x="655" y="495" textAnchor="middle" className="plan-label" fill="rgba(235,227,210,0.55)">STAIRS</text>
                <text x="655" y="508" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.4)">10R · 11½″</text>

                {/* Admin toilet (small) */}
                <rect x="540" y="400" width="80" height="80" fill="rgba(244,201,122,0.04)" stroke="rgba(235,227,210,0.45)" strokeWidth="1"/>
                <ellipse cx="598" cy="442" rx="8" ry="10" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                <text x="580" y="472" textAnchor="middle" className="plan-label" fill="rgba(235,227,210,0.5)">ADMIN WC</text>

                {/* Admin block */}
                <rect x="540" y="480" width="150" height="240" fill="rgba(244,201,122,0.06)" stroke="rgba(235,227,210,0.45)" strokeWidth="1"/>
                {/* desk + chair */}
                <rect x="558" y="510" width="44" height="20" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                <rect x="610" y="510" width="44" height="20" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                <circle cx="580" cy="544" r="6" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                <circle cx="632" cy="544" r="6" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                {/* meeting table */}
                <rect x="568" y="600" width="88" height="40" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                {[580, 612, 644].map(x => <circle key={'mt-'+x} cx={x} cy="592" r="5" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.5"/>)}
                {[580, 612, 644].map(x => <circle key={'mb-'+x} cx={x} cy="648" r="5" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.5"/>)}
                {/* door swing */}
                <path d="M 540 510 A 26 26 0 0 1 566 536" fill="none" stroke="rgba(235,227,210,0.45)" strokeWidth="0.6"/>
                <text x="615" y="700" textAnchor="middle" className="plan-label" fill="rgba(235,227,210,0.55)">ADMIN BLOCK</text>
                <text x="615" y="713" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.4)">9′-5″ × 14′</text>
              </g>

              {/* ============ DETAIL INSIDE INTERACTIVE ROOMS ============ */}
              {/* (drawn beneath the interactive overlay paths) */}

              {/* Matcha bar — counter + 2 stools */}
              <g className="ctx">
                <rect x="118" y="108" width="100" height="18" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                <text x="170" y="121" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.5)">MATCHA · BAR</text>
                <circle cx="160" cy="148" r="6" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                <circle cx="200" cy="148" r="6" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                <circle cx="240" cy="148" r="6" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
              </g>

              {/* Community table — long table + 8 stools */}
              <g className="ctx">
                <rect x="320" y="138" width="170" height="40" fill="none" stroke="rgba(235,227,210,0.6)" strokeWidth="0.8"/>
                {/* stools top row */}
                {[340, 372, 404, 436, 468].map(x => (
                  <circle key={'cu-'+x} cx={x} cy="128" r="6" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                ))}
                {/* stools bottom row */}
                {[340, 372, 404, 436, 468].map(x => (
                  <circle key={'cd-'+x} cx={x} cy="188" r="6" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                ))}
              </g>

              {/* Projector lounge — projector unit + bench seats */}
              <g className="ctx">
                {/* projector body at far wall */}
                <rect x="620" y="56" width="50" height="22" fill="rgba(244,201,122,0.1)" stroke="rgba(235,227,210,0.6)" strokeWidth="0.6"/>
                <circle cx="630" cy="67" r="2" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.4"/>
                <circle cx="640" cy="67" r="2" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.4"/>
                <circle cx="650" cy="67" r="2" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.4"/>
                <circle cx="660" cy="67" r="2" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.4"/>
                {/* projection cone hint */}
                <path d="M 645 78 L 600 220 L 670 220 Z" fill="rgba(244,201,122,0.04)" stroke="rgba(244,201,122,0.18)" strokeWidth="0.5" strokeDasharray="3 3"/>
                {/* seating bench inside lounge */}
                <rect x="552" y="180" width="120" height="14" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.6"/>
                {[562, 580, 600, 620, 640, 660].map(x => (
                  <circle key={'pl-'+x} cx={x} cy="205" r="4" fill="none" stroke="rgba(235,227,210,0.5)" strokeWidth="0.5"/>
                ))}
                <text x="615" y="100" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.5)">PROJECTION</text>
              </g>

              {/* Coffee bar — interior counter + equipment + curved stool ring */}
              <g className="ctx">
                {/* inner counter (curved kidney with notch) */}
                <path
                  d="M 312 280 C 312 248 380 248 400 270 C 420 248 488 248 488 280 L 488 400 C 488 442 420 450 400 425 C 380 450 312 442 312 400 Z"
                  fill="none"
                  stroke="rgba(244,201,122,0.5)"
                  strokeWidth="0.8"
                  strokeDasharray="4 3"
                />
                {/* espresso machine */}
                <rect x="386" y="296" width="28" height="14" fill="rgba(244,201,122,0.18)" stroke="rgba(235,227,210,0.7)" strokeWidth="0.6"/>
                {/* grinders */}
                <rect x="346" y="290" width="12" height="14" fill="none" stroke="rgba(235,227,210,0.6)" strokeWidth="0.5"/>
                <rect x="362" y="290" width="12" height="14" fill="none" stroke="rgba(235,227,210,0.6)" strokeWidth="0.5"/>
                {/* pour-over stations */}
                <circle cx="436" cy="298" r="5" fill="none" stroke="rgba(235,227,210,0.6)" strokeWidth="0.5"/>
                <circle cx="450" cy="298" r="5" fill="none" stroke="rgba(235,227,210,0.6)" strokeWidth="0.5"/>
                {/* vacuum pot */}
                <circle cx="465" cy="312" r="6" fill="none" stroke="rgba(235,227,210,0.6)" strokeWidth="0.5"/>
                {/* sink + drain */}
                <rect x="340" y="370" width="20" height="14" fill="rgba(127,179,213,0.1)" stroke="rgba(235,227,210,0.6)" strokeWidth="0.5"/>
                {/* knockbox */}
                <rect x="430" y="370" width="14" height="14" fill="none" stroke="rgba(235,227,210,0.6)" strokeWidth="0.5"/>
                {/* labels inside bar */}
                <text x="400" y="375" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.6)">HARIO · V60</text>
                <text x="400" y="396" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.45)">15′-0″ × 13′</text>
                {/* curved stool ring outside the island */}
                {[
                  [298, 270], [298, 310], [298, 360], [298, 400],
                  [502, 270], [502, 310], [502, 360], [502, 400],
                  [340, 240], [400, 232], [460, 240],
                  [340, 460], [400, 470], [460, 460],
                ].map(([x,y], i) => (
                  <circle key={'cs-'+i} cx={x} cy={y} r="5.5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                ))}
              </g>

              {/* Floor hall — 6 columns + tables + chairs */}
              <g className="ctx">
                {/* 6 columns (2 rows of 3) */}
                {[[300,500],[400,500],[500,500],[300,640],[400,640],[500,640]].map(([cx,cy], i) => (
                  <rect key={'col-'+i} x={cx-6} y={cy-6} width="12" height="12" fill="rgba(26,20,16,0.85)" stroke="rgba(235,227,210,0.7)" strokeWidth="0.5"/>
                ))}

                {/* Four-seater tables down the left wall */}
                {[470, 590].map((ty, ix) => (
                  <g key={'4l-'+ix}>
                    <rect x="288" y={ty} width="24" height="32" fill="none" stroke="rgba(235,227,210,0.65)" strokeWidth="0.7"/>
                    <circle cx="278" cy={ty+8}  r="5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                    <circle cx="278" cy={ty+24} r="5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                    <circle cx="322" cy={ty+8}  r="5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                    <circle cx="322" cy={ty+24} r="5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                  </g>
                ))}

                {/* Four-seater tables down the right wall */}
                {[470, 590].map((ty, ix) => (
                  <g key={'4r-'+ix}>
                    <rect x="488" y={ty} width="24" height="32" fill="none" stroke="rgba(235,227,210,0.65)" strokeWidth="0.7"/>
                    <circle cx="478" cy={ty+8}  r="5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                    <circle cx="478" cy={ty+24} r="5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                    <circle cx="522" cy={ty+8}  r="5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                    <circle cx="522" cy={ty+24} r="5" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                  </g>
                ))}

                {/* Two-seater tables in the central spine */}
                {[[360, 540], [440, 540], [360, 680], [440, 680]].map(([tx, ty], i) => (
                  <g key={'2c-'+i}>
                    <rect x={tx} y={ty} width="20" height="22" fill="none" stroke="rgba(235,227,210,0.6)" strokeWidth="0.6"/>
                    <circle cx={tx+10} cy={ty-6}  r="4" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                    <circle cx={tx+10} cy={ty+28} r="4" fill="none" stroke="rgba(235,227,210,0.55)" strokeWidth="0.5"/>
                  </g>
                ))}

                {/* annotation lines */}
                <line x1="280" y1="540" x2="350" y2="540" stroke="rgba(244,201,122,0.4)" strokeWidth="0.4" strokeDasharray="2 2"/>
                <text x="316" y="535" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.55)">4′-4″</text>
                <line x1="460" y1="540" x2="530" y2="540" stroke="rgba(244,201,122,0.4)" strokeWidth="0.4" strokeDasharray="2 2"/>
                <text x="495" y="535" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.55)">4′-4″</text>
              </g>

              {/* Entry doors at bottom of building */}
              <g>
                <path d="M 360 720 A 24 24 0 0 1 384 744" fill="none" stroke="rgba(235,227,210,0.65)" strokeWidth="0.8"/>
                <path d="M 440 720 A 24 24 0 0 0 416 744" fill="none" stroke="rgba(235,227,210,0.65)" strokeWidth="0.8"/>
                <circle cx="372" cy="722" r="3" fill="rgba(244,201,122,0.5)"/>
                <circle cx="428" cy="722" r="3" fill="rgba(244,201,122,0.5)"/>
              </g>

              {/* Service entrance arrow */}
              <g>
                <text x="80" y="660" className="plan-label" fill="rgba(244,201,122,0.5)" textAnchor="end">SERVICE</text>
                <text x="80" y="675" className="plan-label" fill="rgba(244,201,122,0.5)" textAnchor="end">ENTRY</text>
                <path d="M 85 668 L 105 668" stroke="rgba(244,201,122,0.5)" strokeWidth="0.8" markerEnd="url(#arrow)"/>
              </g>
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="rgba(244,201,122,0.5)"/>
                </marker>
              </defs>

              {/* Garden path — paving tiles + alternating planters */}
              <g>
                {/* paving tiles (concrete pavers) */}
                {Array.from({ length: 16 }).map((_, i) => {
                  const y = 740 + i*22;
                  return (
                    <rect key={'pv-'+i} x="350" y={y} width="100" height="18" fill="rgba(235,227,210,0.04)" stroke="rgba(235,227,210,0.18)" strokeWidth="0.4"/>
                  );
                })}
                {/* trees — alternating sizes for organic feel */}
                {Array.from({ length: 16 }).map((_, i) => {
                  const y = 740 + i*22 + 9;
                  const r1 = i % 3 === 0 ? 9 : 7;
                  const r2 = i % 4 === 0 ? 9 : 7;
                  return (
                    <React.Fragment key={'tr-'+i}>
                      <circle cx={325} cy={y} r={r1} fill="rgba(124,179,66,0.18)" stroke="rgba(124,179,66,0.55)" strokeWidth="0.6"/>
                      <circle cx={325} cy={y} r={r1*0.4} fill="rgba(124,179,66,0.4)"/>
                      <circle cx={475} cy={y} r={r2} fill="rgba(124,179,66,0.18)" stroke="rgba(124,179,66,0.55)" strokeWidth="0.6"/>
                      <circle cx={475} cy={y} r={r2*0.4} fill="rgba(124,179,66,0.4)"/>
                    </React.Fragment>
                  );
                })}
                {/* entry plaza — widens at the bottom */}
                <path d="M 290 1090 Q 290 1140 340 1140 L 460 1140 Q 510 1140 510 1090 L 510 1095 L 510 1095 Z"
                      fill="rgba(235,227,210,0.05)" stroke="rgba(235,227,210,0.3)" strokeWidth="0.6"/>
                {/* plaza trees (denser cluster) */}
                {[
                  [300, 1095, 9], [340, 1115, 7], [380, 1125, 8],
                  [420, 1125, 8], [460, 1115, 7], [500, 1095, 9],
                  [290, 1075, 7], [510, 1075, 7],
                ].map(([x,y,r], i) => (
                  <React.Fragment key={'pt-'+i}>
                    <circle cx={x} cy={y} r={r} fill="rgba(124,179,66,0.18)" stroke="rgba(124,179,66,0.55)" strokeWidth="0.6"/>
                    <circle cx={x} cy={y} r={r*0.4} fill="rgba(124,179,66,0.4)"/>
                  </React.Fragment>
                ))}
                {/* gate arc */}
                <path d="M 360 1110 Q 400 1075 440 1110" fill="none" stroke="rgba(244,201,122,0.7)" strokeWidth="1.2"/>
                <line x1="360" y1="1110" x2="360" y2="1125" stroke="rgba(244,201,122,0.7)" strokeWidth="1"/>
                <line x1="440" y1="1110" x2="440" y2="1125" stroke="rgba(244,201,122,0.7)" strokeWidth="1"/>
                <text x="400" y="1180" textAnchor="middle" className="plan-label" fill="rgba(244,201,122,0.7)">▼ ENTRY · GATE</text>
                <text x="400" y="1193" textAnchor="middle" className="plan-dim" fill="rgba(244,201,122,0.4)">28′-2″ LONG · BRICK PAVERS</text>
              </g>

              {/* ============ INTERACTIVE REGIONS ============ */}
              {ROOMS.map(r => {
                const d = REGION_PATHS[r.id];
                const lbl = REGION_LABELS[r.id];
                const isActive = r.id === activeId;
                const isHover = r.id === hoverId;
                return (
                  <g
                    key={r.id}
                    className={"region magnet region-" + r.id + (isActive ? " active" : "") + (isHover ? " hover" : "")}
                    onClick={() => select(r.id)}
                    onMouseEnter={() => setHoverId(r.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <path d={d}/>
                    <text className="region-code" x={lbl.x} y={lbl.y - 9} textAnchor="middle">{r.code}</text>
                    <text className="region-name" x={lbl.x} y={lbl.y + 9} textAnchor="middle">{r.name.toUpperCase()}</text>
                  </g>
                );
              })}

              {/* Active region — animated 'you are here' ring */}
              {(() => {
                const p = REGION_LABELS[activeId];
                if (!p) return null;
                // Offset the pulse below the label so it doesn't overlap
                const py = p.y + 28;
                return (
                  <g transform={`translate(${p.x} ${py})`}>
                    <circle r="14" fill="none" stroke="#f4c97a" strokeWidth="1.4" opacity="0.9">
                      <animate attributeName="r" values="14;24;14" dur="2.4s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.9;0;0.9" dur="2.4s" repeatCount="indefinite"/>
                    </circle>
                    <circle r="4" fill="#f4c97a"/>
                  </g>
                );
              })()}
            </svg>

            {/* corner readouts */}
            <div className="plan-readout tl">
              <span className="label on-dark" style={{ opacity: 0.5 }}>SHEET</span>
              <span className="mono" style={{ color: 'var(--ember)' }}>A-101</span>
            </div>
            <div className="plan-readout br">
              <span className="label on-dark" style={{ opacity: 0.5 }}>SCALE</span>
              <span className="mono" style={{ color: 'var(--ember)' }}>1" = 8′-0"</span>
            </div>
          </div>

          {/* room list under the plan */}
          <div className="plan-roomlist">
            {ROOMS.map(r => (
              <button
                key={r.id}
                className={"plan-room" + (r.id === activeId ? " active" : "")}
                onClick={() => select(r.id)}
                onMouseEnter={() => setHoverId(r.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <span className="plan-room-code">{r.code}</span>
                <span className="plan-room-name">{r.name}</span>
                <span className="plan-room-short">{r.short}</span>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT — photo viewer */}
        <div className="plan-viewer">
          <div className="plan-photo">
            <div
              key={activeId}
              className="plan-photo-img"
              style={{ backgroundImage: `url('${photoSrc}')` }}
            ></div>
            <div className="plan-photo-tag">
              <span className="label on-dark">{active.photoTag}</span>
            </div>
            <div className="plan-photo-code">
              <span className="label on-dark" style={{ color: 'var(--ember)' }}>● {active.code} · LIVE</span>
            </div>
          </div>

          <div className="plan-info">
            <div className="label on-dark">Now viewing</div>
            <h3 className="plan-info-title">
              {active.name.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="serif">{active.name.split(' ').slice(-1)[0]}.</span>
            </h3>
            <p className="plan-info-desc">{active.desc}</p>

            <div className="plan-info-detail">
              {active.detail.map((d, i) => (
                <div key={i}>
                  <span className="label on-dark" style={{ opacity: 0.5 }}>0{i+1}</span>
                  <span style={{ fontSize: 14 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { SpaceTour });
