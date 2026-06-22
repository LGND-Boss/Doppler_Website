// Brew simulator — multiple methods
const BREW_METHODS = {
  v60: {
    label: 'V60 Pour-over',
    code: 'M·01',
    ratio: '1:16',
    temp: 93,
    dose: '20g',
    note: 'Cone · paper · slow water',
    stages: [
      { name: 'Bloom', target: 60, desc: '60g · 30s · CO₂ escapes' },
      { name: 'First pour', target: 180, desc: 'Spiral out · keep bed flat' },
      { name: 'Second pour', target: 280, desc: 'Centre only · slow stream' },
      { name: 'Drawdown', target: 320, desc: 'Wait · bed flattens itself' },
    ],
    fillRate: 0.06,
  },
  aeropress: {
    label: 'AeroPress',
    code: 'M·02',
    ratio: '1:14',
    temp: 85,
    dose: '17g',
    note: 'Inverted · 1m steep · press',
    stages: [
      { name: 'Saturate', target: 50, desc: 'Wet the grounds · stir 2x' },
      { name: 'Fill', target: 240, desc: 'Top up · cap · invert' },
      { name: 'Steep', target: 240, desc: 'Wait 60s · no agitation' },
      { name: 'Press', target: 240, desc: 'Slow press · 30s down' },
    ],
    fillRate: 0.08,
  },
  french: {
    label: 'French Press',
    code: 'M·03',
    ratio: '1:15',
    temp: 95,
    dose: '32g',
    note: 'Immersion · coarse · 4 min',
    stages: [
      { name: 'Pour', target: 480, desc: 'All water at once · saturate' },
      { name: 'Crust', target: 480, desc: 'Wait 4 min · crust forms' },
      { name: 'Break', target: 480, desc: 'Stir crust · skim foam' },
      { name: 'Plunge', target: 480, desc: 'Slow press · pour clean' },
    ],
    fillRate: 0.18,
  },
  espresso: {
    label: 'Espresso',
    code: 'M·04',
    ratio: '1:2',
    temp: 92,
    dose: '18g',
    note: '9 bar · 28s · ristretto-leaning',
    stages: [
      { name: 'Tamp', target: 0, desc: 'Level · 15kg force · polish' },
      { name: 'Pre-infuse', target: 8, desc: '3s · 3 bar · saturate puck' },
      { name: 'Extract', target: 36, desc: '25s · 9 bar · honey stream' },
      { name: 'Cut', target: 36, desc: 'Stop at blonde · serve hot' },
    ],
    fillRate: 0.04,
  },
  matcha: {
    label: 'Matcha',
    code: 'M·06',
    ratio: '2g : 70ml',
    temp: 75,
    dose: '2g',
    note: 'Sift · whisk · jade foam',
    color: '#7CB342',
    accent: '#C5E1A5',
    stages: [
      { name: 'Sift', target: 30, desc: 'Push powder through fine mesh' },
      { name: 'Bloom', target: 30, desc: 'Splash 30ml · paste it smooth' },
      { name: 'Whisk', target: 70, desc: 'W-motion · 90s · raise foam' },
      { name: 'Serve', target: 70, desc: 'Pause · froth peaks · drink' },
    ],
    fillRate: 0.05,
  },
  moka: {
    label: 'Moka Pot',
    code: 'M·05',
    ratio: '1:10',
    temp: 100,
    dose: '20g',
    note: 'Stovetop · pressure-fed · sputter',
    stages: [
      { name: 'Charge', target: 100, desc: 'Cold water to valve' },
      { name: 'Heat', target: 100, desc: 'Medium flame · steam builds' },
      { name: 'Climb', target: 180, desc: 'Coffee rises · golden stream' },
      { name: 'Sputter', target: 200, desc: 'Off heat at first sputter' },
    ],
    fillRate: 0.05,
  },
};

// Module-level loop guard so Strict Mode double-mount can't run two loops
let __brewLoopRunning = false;

function BrewSim() {
  const [method, setMethod] = React.useState('v60');
  const canvasElRef = React.useRef(null);
  const [stage, setStage] = React.useState(0);
  const [pouring, setPouring] = React.useState(false);
  const [stats, setStats] = React.useState({ water: 0, time: 0 });
  const stateRef = React.useRef({ water: 0, time: 0, drips: [], grounds: [], pouring: false, stage: 0, method: 'v60', press: 0 });
  const m = BREW_METHODS[method];

  const switchMethod = (k) => {
    if (window.AudioCtx) window.AudioCtx.click();
    stateRef.current.method = k;
    stateRef.current.water = 0;
    stateRef.current.time = 0;
    stateRef.current.pouring = false;
    stateRef.current.drips = [];
    stateRef.current.press = 0;
    setMethod(k);
    setStage(0);
    setPouring(false);
  };

  // Renderers per method
  const renderers = React.useMemo(() => ({
    v60: (ctx, W, H, st, now) => {
      ctx.strokeStyle = '#E8E4DD'; ctx.lineWidth = 1;
      // kettle
      ctx.beginPath();
      ctx.moveTo(W/2 - 90, 30); ctx.lineTo(W/2 - 90, 70);
      ctx.quadraticCurveTo(W/2 - 90, 105, W/2 - 30, 105);
      ctx.lineTo(W/2 + 4, 80); ctx.lineTo(W/2 + 4, 60);
      ctx.lineTo(W/2 - 30, 35); ctx.lineTo(W/2 - 30, 30);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W/2 + 4, 80); ctx.lineTo(W/2 + 70, 110);
      ctx.lineTo(W/2 + 70, 130); ctx.lineTo(W/2 + 30, 120); ctx.stroke();
      // dripper
      ctx.beginPath();
      ctx.moveTo(W/2 - 130, 240); ctx.lineTo(W/2 + 130, 240);
      ctx.lineTo(W/2 + 30, 360); ctx.lineTo(W/2 - 30, 360);
      ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = 'rgba(232,228,221,0.25)';
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(W/2 + i*32, 240); ctx.lineTo(W/2 + i*8, 360); ctx.stroke();
      }
      // server
      ctx.strokeStyle = 'rgba(232,228,221,0.7)';
      ctx.beginPath();
      ctx.moveTo(W/2 - 110, 360); ctx.lineTo(W/2 - 130, 500);
      ctx.lineTo(W/2 + 130, 500); ctx.lineTo(W/2 + 110, 360); ctx.stroke();
      // grounds
      st.grounds.forEach(g => {
        const wet = Math.min(1, g.wet);
        const r = g.r * (1 + g.bloom * 0.6);
        ctx.fillStyle = `rgba(${88-wet*40}, ${64-wet*30}, ${48-wet*22}, ${0.55+wet*0.35})`;
        ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI*2); ctx.fill();
        if (g.bloom > 0) g.bloom = Math.max(0, g.bloom - 0.001);
      });
      // liquid
      const fillPct = Math.min(1, st.water/320) * 0.85;
      const lt = 500 - fillPct * 130;
      ctx.fillStyle = 'rgba(110,60,30,0.6)';
      ctx.beginPath();
      const lx1 = W/2 - 110 - (lt-360)/140 * 20;
      const lx2 = W/2 + 110 + (lt-360)/140 * 20;
      ctx.moveTo(lx1, lt); ctx.lineTo(lx2, lt);
      ctx.lineTo(W/2 + 130, 500); ctx.lineTo(W/2 - 130, 500);
      ctx.closePath(); ctx.fill();
      // stream
      if (st.pouring) {
        ctx.strokeStyle = 'rgba(255,230,200,0.7)'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(W/2 + 50, 130);
        for (let y = 130; y < 250; y += 4) {
          const wob = Math.sin(now*0.02 + y*0.2) * 1.5;
          ctx.lineTo(W/2 + 50 + wob - (y-130)*0.05, y);
        }
        ctx.stroke();
        st.grounds.forEach(g => {
          const dx = g.x - (W/2+46), dy = g.y - 248;
          if (dx*dx + dy*dy < 2500) {
            g.wet = Math.min(1, g.wet + 0.02);
            if (st.stage === 0) g.bloom = Math.min(1, g.bloom + 0.04);
          }
        });
        if (Math.random() < 0.6) st.drips.push({ x: W/2 + (Math.random()-0.5)*24, y: 360, vy: 0.5+Math.random() });
      }
      // drips
      ctx.fillStyle = 'rgba(110,60,30,0.6)';
      for (let i = st.drips.length-1; i >= 0; i--) {
        const d = st.drips[i]; d.vy += 0.04; d.y += d.vy;
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.4, 0, Math.PI*2); ctx.fill();
        if (d.y > lt) st.drips.splice(i, 1);
      }
    },

    aeropress: (ctx, W, H, st, now) => {
      ctx.strokeStyle = '#E8E4DD'; ctx.lineWidth = 1;
      // chamber (cylinder)
      const cx = W/2, top = 120, bot = 380;
      ctx.beginPath();
      ctx.moveTo(cx - 70, top); ctx.lineTo(cx - 70, bot);
      ctx.lineTo(cx + 70, bot); ctx.lineTo(cx + 70, top);
      ctx.stroke();
      // top rim
      ctx.beginPath(); ctx.ellipse(cx, top, 70, 8, 0, 0, Math.PI*2); ctx.stroke();
      // bottom cap + filter
      ctx.beginPath(); ctx.moveTo(cx - 75, bot); ctx.lineTo(cx + 75, bot);
      ctx.lineTo(cx + 75, bot+12); ctx.lineTo(cx - 75, bot+12); ctx.closePath(); ctx.stroke();
      // plunger (descends with press progress)
      const plungerY = top - 60 + st.press * 220;
      ctx.beginPath();
      ctx.moveTo(cx - 70, plungerY + 60); ctx.lineTo(cx + 70, plungerY + 60);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 90, plungerY); ctx.lineTo(cx + 90, plungerY);
      ctx.lineTo(cx + 90, plungerY+8); ctx.lineTo(cx - 90, plungerY+8); ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 70, plungerY+8); ctx.lineTo(cx - 70, plungerY+60);
      ctx.moveTo(cx + 70, plungerY+8); ctx.lineTo(cx + 70, plungerY+60);
      ctx.stroke();
      // water level inside
      const fill = Math.min(1, st.water/240);
      const liquidTop = (plungerY + 60) + (1 - fill) * (bot - plungerY - 60);
      const liquidTopClamped = Math.max(plungerY + 60, Math.min(bot - 4, liquidTop));
      ctx.fillStyle = 'rgba(110,60,30,0.55)';
      ctx.fillRect(cx - 69, liquidTopClamped, 138, bot - liquidTopClamped);
      // grounds suspended in water (immersion)
      st.grounds.forEach(g => {
        if (g.y < liquidTopClamped) g.y += 0.4;
        if (g.y > bot - 6) g.y = bot - 6 - Math.random()*2;
        g.x += Math.sin(now*0.002 + g.r) * 0.2 * (st.pouring ? 1 : 0.2);
        g.x = Math.max(cx - 65, Math.min(cx + 65, g.x));
        ctx.fillStyle = `rgba(60, 38, 28, 0.85)`;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI*2); ctx.fill();
      });
      // pouring stream from above
      if (st.pouring && st.stage <= 1) {
        ctx.strokeStyle = 'rgba(255,230,200,0.7)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(cx, top); ctx.stroke();
      }
      // drips below filter when pressing
      if (st.stage === 3) {
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.4) st.drips.push({ x: cx + (Math.random()-0.5)*40, y: bot+14, vy: 1+Math.random() });
        }
      }
      ctx.fillStyle = 'rgba(110,60,30,0.7)';
      for (let i = st.drips.length-1; i >= 0; i--) {
        const d = st.drips[i]; d.vy += 0.05; d.y += d.vy;
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.6, 0, Math.PI*2); ctx.fill();
        if (d.y > 540) st.drips.splice(i, 1);
      }
    },

    french: (ctx, W, H, st, now) => {
      ctx.strokeStyle = '#E8E4DD'; ctx.lineWidth = 1;
      const cx = W/2, top = 100, bot = 480;
      // body (carafe)
      ctx.beginPath();
      ctx.moveTo(cx - 110, top); ctx.lineTo(cx - 110, bot);
      ctx.lineTo(cx + 110, bot); ctx.lineTo(cx + 110, top); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, top, 110, 12, 0, 0, Math.PI*2); ctx.stroke();
      // handle
      ctx.beginPath();
      ctx.moveTo(cx + 110, top + 80); ctx.lineTo(cx + 150, top + 80);
      ctx.lineTo(cx + 150, top + 200); ctx.lineTo(cx + 110, top + 200); ctx.stroke();
      // plunger rod
      const plY = top - 60 + st.press * 320;
      ctx.beginPath(); ctx.moveTo(cx, top - 80); ctx.lineTo(cx, plY); ctx.stroke();
      // mesh disk
      ctx.beginPath();
      ctx.moveTo(cx - 105, plY); ctx.lineTo(cx + 105, plY);
      ctx.lineTo(cx + 105, plY + 6); ctx.lineTo(cx - 105, plY + 6);
      ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = 'rgba(232,228,221,0.3)';
      for (let i = -10; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i*10, plY); ctx.lineTo(cx + i*10, plY+6); ctx.stroke();
      }
      // water level
      const fill = Math.min(1, st.water/480);
      const liquidTop = bot - fill * (bot - top - 20);
      const lt = Math.max(plY + 8, liquidTop);
      ctx.fillStyle = 'rgba(110,60,30,0.55)';
      ctx.fillRect(cx - 109, lt, 218, bot - lt - 1);
      // grounds + crust
      const inLiquid = lt < bot;
      st.grounds.forEach(g => {
        // pre-press: float to top forming crust
        if (st.stage <= 1) {
          if (inLiquid && g.y > lt + 8) g.y -= 0.3;
          if (g.y < lt + 2) g.y = lt + 2 + Math.random();
        } else if (st.stage === 2) {
          // break crust: spread
          g.y += (Math.random() - 0.3) * 1.5;
          g.x += (Math.random() - 0.5) * 2;
        } else if (st.stage === 3) {
          // plunge: pushed down
          if (g.y < plY + 12) g.y = plY + 12 + Math.random()*4;
        }
        g.x = Math.max(cx - 105, Math.min(cx + 105, g.x));
        g.y = Math.min(bot - 4, g.y);
        ctx.fillStyle = `rgba(60, 38, 28, 0.85)`;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI*2); ctx.fill();
      });
      // steam from top
      if (st.stage <= 2) {
        ctx.fillStyle = 'rgba(255,240,220,0.04)';
        for (let i = 0; i < 4; i++) {
          const sx = cx + Math.sin(now*0.001 + i) * 30;
          const sy = top - 20 - i * 25 - (now*0.02) % 80;
          ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI*2); ctx.fill();
        }
      }
    },

    espresso: (ctx, W, H, st, now) => {
      ctx.strokeStyle = '#E8E4DD'; ctx.lineWidth = 1;
      const cx = W/2;
      // group head
      ctx.beginPath();
      ctx.moveTo(cx - 80, 60); ctx.lineTo(cx + 80, 60);
      ctx.lineTo(cx + 80, 120); ctx.lineTo(cx - 80, 120); ctx.closePath(); ctx.stroke();
      // portafilter
      ctx.beginPath();
      ctx.moveTo(cx - 60, 120); ctx.lineTo(cx + 60, 120);
      ctx.lineTo(cx + 50, 160); ctx.lineTo(cx - 50, 160); ctx.closePath(); ctx.stroke();
      // dual spouts
      ctx.beginPath();
      ctx.moveTo(cx - 30, 160); ctx.lineTo(cx - 25, 185); ctx.lineTo(cx - 18, 185); ctx.lineTo(cx - 14, 160); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 14, 160); ctx.lineTo(cx + 18, 185); ctx.lineTo(cx + 25, 185); ctx.lineTo(cx + 30, 160); ctx.stroke();
      // cup
      ctx.beginPath();
      ctx.moveTo(cx - 80, 280); ctx.lineTo(cx - 90, 420);
      ctx.lineTo(cx + 90, 420); ctx.lineTo(cx + 80, 280); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, 280, 80, 10, 0, 0, Math.PI*2); ctx.stroke();
      // saucer
      ctx.beginPath();
      ctx.moveTo(cx - 130, 430); ctx.lineTo(cx + 130, 430); ctx.stroke();
      // streams when extracting
      if (st.pouring && st.stage >= 2) {
        ctx.strokeStyle = 'rgba(180, 100, 50, 0.8)'; ctx.lineWidth = 1.4;
        for (const xo of [-22, 22]) {
          ctx.beginPath(); ctx.moveTo(cx + xo, 185);
          for (let y = 185; y < 280; y += 4) {
            ctx.lineTo(cx + xo + Math.sin(y*0.3 + now*0.02)*0.6, y);
          }
          ctx.stroke();
        }
      }
      // liquid + crema
      const fill = Math.min(1, st.water/36);
      const liquidH = fill * 110;
      const lt = 420 - liquidH;
      ctx.fillStyle = 'rgba(50, 25, 15, 0.85)';
      ctx.beginPath();
      const w1 = 90 - (lt - 280)/140 * 10;
      ctx.moveTo(cx - w1, lt); ctx.lineTo(cx + w1, lt);
      ctx.lineTo(cx + 90, 420); ctx.lineTo(cx - 90, 420);
      ctx.closePath(); ctx.fill();
      // crema
      if (fill > 0.1) {
        ctx.fillStyle = 'rgba(200, 130, 70, 0.9)';
        ctx.beginPath(); ctx.ellipse(cx, lt, w1, 4, 0, 0, Math.PI*2); ctx.fill();
        // crema speckle
        for (let i = 0; i < 12; i++) {
          ctx.fillStyle = `rgba(220, 160, 100, ${0.3 + Math.random()*0.4})`;
          ctx.beginPath();
          ctx.arc(cx + (Math.random()-0.5)*w1*1.6, lt - 1 + Math.random()*2, 1+Math.random(), 0, Math.PI*2);
          ctx.fill();
        }
      }
      // bar pressure gauge
      ctx.strokeStyle = 'rgba(232,228,221,0.5)';
      ctx.beginPath(); ctx.arc(cx + 140, 90, 28, Math.PI, 0); ctx.stroke();
      const bar = st.stage === 1 ? 3 : st.stage >= 2 && st.pouring ? 9 : 0;
      const ang = Math.PI - (bar / 12) * Math.PI;
      ctx.strokeStyle = 'var(--ember)'; ctx.strokeStyle = '#FF8C42'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + 140, 90);
      ctx.lineTo(cx + 140 + Math.cos(ang)*22, 90 + Math.sin(ang)*22); ctx.stroke();
      ctx.fillStyle = '#E8E4DD';
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(bar + ' BAR', cx + 140, 110);
      ctx.textAlign = 'start';
    },

    matcha: (ctx, W, H, st, now) => {
      // Top-down view of a chawan being whisked — clean, iconic, colorful
      const cx = W/2, cy = H/2 + 20;
      const R = 200; // bowl outer radius

      // Tatami / wood backdrop hint — soft warm wash
      ctx.fillStyle = 'rgba(180, 140, 90, 0.04)';
      ctx.fillRect(0, 0, W, H);

      // Bowl shadow (offset)
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(cx + 6, cy + 14, R + 8, R + 6, 0, 0, Math.PI*2);
      ctx.fill();

      // Bowl outer ring (raku-style)
      const bowlGrad = ctx.createRadialGradient(cx - 40, cy - 40, 60, cx, cy, R);
      bowlGrad.addColorStop(0, '#3D342B');
      bowlGrad.addColorStop(0.7, '#2A2420');
      bowlGrad.addColorStop(1, '#16110D');
      ctx.fillStyle = bowlGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.fill();

      // Bowl rim highlight
      ctx.strokeStyle = 'rgba(232,228,221,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.stroke();

      // Inner bowl (where matcha sits) — a bit smaller
      const ir = R - 28;

      // Stage 0: SIFT — empty bowl with sifted powder mound
      // Stage 1: BLOOM — water added, dark green paste
      // Stage 2: WHISK — vortex with growing foam
      // Stage 3: SERVE — foam crown finished

      const fill = Math.min(1, st.water / 70);

      if (st.stage === 0) {
        // empty bowl interior
        ctx.fillStyle = '#0E0B08';
        ctx.beginPath();
        ctx.arc(cx, cy, ir, 0, Math.PI*2);
        ctx.fill();

        // sifted powder mound (bright matcha green)
        const moundR = 38 + (st.pouring ? Math.sin(now*0.005) * 2 : 0);
        const mGrad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, moundR);
        mGrad.addColorStop(0, '#C8E6A0');
        mGrad.addColorStop(0.5, '#A4CC6A');
        mGrad.addColorStop(1, '#7CB342');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, moundR, 0, Math.PI*2);
        ctx.fill();

        // powder dust falling if pouring
        if (st.pouring) {
          for (let i = 0; i < 8; i++) {
            const ang = Math.random() * Math.PI * 2;
            const rad = moundR + Math.random() * 60;
            ctx.fillStyle = `rgba(124, 179, 66, ${0.4 + Math.random()*0.5})`;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang)*rad, cy + Math.sin(ang)*rad,
              0.6 + Math.random()*1.2, 0, Math.PI*2);
            ctx.fill();
          }
        }
        // texture flecks on mound
        for (let i = 0; i < 30; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = Math.random() * moundR;
          ctx.fillStyle = `rgba(85, 139, 47, ${0.5 + Math.random()*0.3})`;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang)*rad, cy + Math.sin(ang)*rad,
            0.5 + Math.random()*0.8, 0, Math.PI*2);
          ctx.fill();
        }
      } else {
        // Stages 1-3: liquid in bowl
        // Liquid base: jade green, gradient for depth
        const liquidR = ir - 4;
        const lGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, liquidR);

        // color shifts: bloom = dark forest, whisk = brighter, serve = brightest with foam
        if (st.stage === 1) {
          lGrad.addColorStop(0, '#558B2F');
          lGrad.addColorStop(0.6, '#3E6B1E');
          lGrad.addColorStop(1, '#2A4A14');
        } else {
          lGrad.addColorStop(0, '#9CCC65');
          lGrad.addColorStop(0.5, '#7CB342');
          lGrad.addColorStop(1, '#558B2F');
        }
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, liquidR, 0, Math.PI*2);
        ctx.fill();

        // Stage 1 BLOOM: dark unmixed clumps swirling
        if (st.stage === 1) {
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI*2 + now*0.0008;
            const rad = 30 + Math.sin(now*0.001 + i) * 20;
            const blob = 14 + Math.sin(now*0.002 + i*1.7) * 6;
            ctx.fillStyle = `rgba(40, 70, 25, 0.7)`;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(ang)*rad, cy + Math.sin(ang)*rad, blob, 0, Math.PI*2);
            ctx.fill();
          }
          // a few un-dissolved bright specks
          for (let i = 0; i < 20; i++) {
            ctx.fillStyle = '#C8E6A0';
            ctx.beginPath();
            ctx.arc(
              cx + (Math.random()-0.5) * liquidR * 1.4,
              cy + (Math.random()-0.5) * liquidR * 1.4,
              0.6 + Math.random()*1, 0, Math.PI*2);
            ctx.fill();
          }
        }

        // Stage 2 WHISK: spinning vortex + growing foam
        if (st.stage === 2) {
          // vortex swirls — concentric arcs spinning
          const spin = now * 0.008;
          for (let ring = 0; ring < 5; ring++) {
            const rr = 30 + ring * 25;
            ctx.strokeStyle = `rgba(220, 237, 200, ${0.4 - ring*0.06})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let a = 0; a < Math.PI*2; a += 0.05) {
              const wobble = Math.sin(a*4 + spin + ring) * 4;
              const x = cx + Math.cos(a + spin*(1 + ring*0.2)) * (rr + wobble);
              const y = cy + Math.sin(a + spin*(1 + ring*0.2)) * (rr + wobble);
              if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
          }

          // whisk position indicator (small bright disc moving in W-pattern)
          const wt = (now * 0.003) % 1;
          const wx = cx + Math.sin(wt * Math.PI * 4) * 70;
          const wy = cy + (wt - 0.5) * 40;
          ctx.fillStyle = 'rgba(245, 250, 235, 0.85)';
          ctx.beginPath();
          ctx.arc(wx, wy, 18, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = 'rgba(220, 237, 200, 0.6)';
          ctx.beginPath();
          ctx.arc(wx, wy, 28, 0, Math.PI*2);
          ctx.fill();
        }

        // Foam cap (builds during stage 2, peaks at stage 3)
        let foam = 0;
        if (st.stage === 2) foam = Math.min(1, st.time / 5);
        else if (st.stage === 3) foam = 1;

        if (foam > 0.05) {
          // foam disc — soft white-green with texture
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, liquidR, 0, Math.PI*2);
          ctx.clip();

          const foamR = liquidR * (0.4 + foam * 0.55);
          const fGrad = ctx.createRadialGradient(cx - 20, cy - 20, 4, cx, cy, foamR);
          fGrad.addColorStop(0, 'rgba(245, 250, 235, 0.95)');
          fGrad.addColorStop(0.7, 'rgba(220, 237, 200, 0.85)');
          fGrad.addColorStop(1, 'rgba(174, 213, 129, 0.4)');
          ctx.fillStyle = fGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, foamR, 0, Math.PI*2);
          ctx.fill();

          // micro-bubbles (varying sizes)
          const nBubbles = Math.floor(120 * foam);
          for (let i = 0; i < nBubbles; i++) {
            // deterministic-ish positions per index
            const ang = (i * 2.39996) % (Math.PI*2);
            const rad = Math.sqrt((i * 0.618) % 1) * foamR * 0.92;
            const bx = cx + Math.cos(ang) * rad;
            const by = cy + Math.sin(ang) * rad;
            const sz = 0.5 + ((i * 7) % 18) / 12;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + ((i*3)%10)/30})`;
            ctx.beginPath();
            ctx.arc(bx, by, sz, 0, Math.PI*2);
            ctx.fill();
          }

          // a few larger highlight bubbles with green ring
          for (let i = 0; i < 14; i++) {
            const ang = (i * 1.7) % (Math.PI*2);
            const rad = ((i * 13) % 100) / 100 * foamR * 0.7;
            const bx = cx + Math.cos(ang) * rad;
            const by = cy + Math.sin(ang) * rad;
            ctx.strokeStyle = 'rgba(124, 179, 66, 0.5)';
            ctx.lineWidth = 0.5;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.arc(bx, by, 1.8 + ((i*5)%8)/4, 0, Math.PI*2);
            ctx.fill();
            ctx.stroke();
          }

          ctx.restore();
        }

        // Stage 3 SERVE: subtle steam wisps rising
        if (st.stage === 3) {
          for (let i = 0; i < 5; i++) {
            const phase = (now * 0.0006 + i * 0.2) % 1;
            const sx = cx + Math.sin(phase * Math.PI * 2 + i) * 60;
            const sy = cy - 80 - phase * 120;
            const op = (1 - phase) * 0.18;
            ctx.fillStyle = `rgba(245, 250, 235, ${op})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 30 + phase * 30, 0, Math.PI*2);
            ctx.fill();
          }
        }
      }

      // Crosshair / framing marks (top-down brutalist hint)
      ctx.strokeStyle = 'rgba(124, 179, 66, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, R + 18, 0, Math.PI*2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Corner ticks
      ctx.strokeStyle = 'rgba(124, 179, 66, 0.7)';
      ctx.lineWidth = 1.2;
      const tickL = 14;
      [[20,20,1,1],[W-20,20,-1,1],[20,H-20,1,-1],[W-20,H-20,-1,-1]].forEach(([x,y,dx,dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + tickL*dx, y);
        ctx.moveTo(x, y); ctx.lineTo(x, y + tickL*dy);
        ctx.stroke();
      });

      // Labels
      ctx.fillStyle = 'rgba(124, 179, 66, 0.9)';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText('TOP·DOWN · CHAWAN', 40, 40);
      ctx.textAlign = 'right';
      ctx.fillText('UJI · KYOTO · 抹茶', W - 40, 40);
      ctx.fillText('Ø ' + (R*2) + 'PX', W - 40, H - 32);
      ctx.textAlign = 'start';
      ctx.fillText('USUCHA · 75°C', 40, H - 32);
    },

    moka: (ctx, W, H, st, now) => {
      ctx.strokeStyle = '#E8E4DD'; ctx.lineWidth = 1;
      const cx = W/2;
      // upper chamber (octagonal hint)
      ctx.beginPath();
      ctx.moveTo(cx - 70, 80); ctx.lineTo(cx + 70, 80);
      ctx.lineTo(cx + 80, 110); ctx.lineTo(cx + 80, 220);
      ctx.lineTo(cx - 80, 220); ctx.lineTo(cx - 80, 110); ctx.closePath(); ctx.stroke();
      // spout
      ctx.beginPath();
      ctx.moveTo(cx - 80, 130); ctx.lineTo(cx - 110, 120); ctx.lineTo(cx - 110, 140); ctx.lineTo(cx - 80, 150); ctx.stroke();
      // handle
      ctx.beginPath();
      ctx.moveTo(cx + 80, 140); ctx.quadraticCurveTo(cx + 130, 165, cx + 80, 200); ctx.stroke();
      // middle joint
      ctx.beginPath();
      ctx.moveTo(cx - 90, 220); ctx.lineTo(cx + 90, 220);
      ctx.lineTo(cx + 90, 240); ctx.lineTo(cx - 90, 240); ctx.closePath(); ctx.stroke();
      // lower chamber
      ctx.beginPath();
      ctx.moveTo(cx - 80, 240); ctx.lineTo(cx - 80, 380);
      ctx.lineTo(cx + 80, 380); ctx.lineTo(cx + 80, 240); ctx.stroke();
      // flame
      const flameI = st.stage >= 1 ? 1 : 0;
      if (flameI) {
        for (let i = 0; i < 12; i++) {
          const fx = cx - 60 + i * 10 + Math.sin(now*0.01+i)*2;
          const fh = 18 + Math.sin(now*0.02+i)*6;
          ctx.fillStyle = `rgba(255, ${120 + Math.random()*80}, 50, ${0.5 + Math.random()*0.3})`;
          ctx.beginPath();
          ctx.moveTo(fx-4, 400); ctx.quadraticCurveTo(fx, 400-fh, fx+4, 400); ctx.fill();
        }
        ctx.fillStyle = 'rgba(50,30,20,0.6)';
        ctx.fillRect(cx - 90, 400, 180, 4);
      }
      // water in lower (drains as climbs)
      const lowerFill = Math.max(0, 1 - Math.max(0, st.water - 100) / 100);
      const lowerTop = 380 - lowerFill * 130;
      ctx.fillStyle = 'rgba(232,228,221,0.3)';
      ctx.fillRect(cx - 79, lowerTop, 158, 380 - lowerTop - 1);
      // bubbles in lower if heating
      if (st.stage >= 1 && st.stage < 3) {
        for (let i = 0; i < 6; i++) {
          if (Math.random() < 0.3) {
            ctx.fillStyle = 'rgba(232,228,221,0.5)';
            ctx.beginPath();
            ctx.arc(cx + (Math.random()-0.5)*150, lowerTop + Math.random()*(380-lowerTop), 1+Math.random()*2, 0, Math.PI*2);
            ctx.fill();
          }
        }
      }
      // upper coffee fill (climbing)
      const upperFill = Math.min(1, Math.max(0, st.water - 100) / 100);
      const upperTop = 220 - upperFill * 130;
      ctx.fillStyle = 'rgba(80, 40, 25, 0.8)';
      ctx.fillRect(cx - 79, upperTop, 158, 220 - upperTop - 1);
      // central post (where coffee emerges)
      ctx.strokeStyle = 'rgba(232,228,221,0.5)';
      ctx.beginPath();
      ctx.moveTo(cx, 220); ctx.lineTo(cx, 90); ctx.stroke();
      // sputter steam
      if (st.stage === 3) {
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = `rgba(255,240,220, ${0.2 - i*0.03})`;
          ctx.beginPath();
          ctx.arc(cx + Math.sin(now*0.005+i)*15, 70 - i*15 - (now*0.05)%50, 12, 0, Math.PI*2);
          ctx.fill();
        }
      }
    },
  }), []);

  // Seed grounds (called when method changes)
  const seedGrounds = React.useCallback(() => {
    const meth = stateRef.current.method;
    const W = 480;
    const grounds = [];
    let cx = W/2, gy = 280, sx = 130;
    if (meth === 'aeropress') { gy = 360; sx = 60; }
    else if (meth === 'french') { gy = 460; sx = 100; }
    else if (meth === 'espresso' || meth === 'moka' || meth === 'matcha') {
      stateRef.current.grounds = [];
      return;
    }
    for (let i = 0; i < 220; i++) {
      grounds.push({
        x: cx + (Math.random()-0.5) * sx * 2,
        y: gy + Math.random() * 30,
        r: 1 + Math.random() * 1.6,
        wet: 0, bloom: 0,
      });
    }
    stateRef.current.grounds = grounds;
  }, []);

  // Ref callback — fires synchronously on mount with the actual element.
  // We start the loop here exactly once globally and keep it pointed at whatever
  // canvas is currently mounted via canvasElRef.
  const canvasRefCallback = React.useCallback((node) => {
    canvasElRef.current = node;
    if (!node) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 480, H = 560;
    // Scale display to fit container on small screens — keep internal coord system at 480×560
    const parent = node.parentElement;
    const maxW = parent ? Math.min(W, parent.clientWidth - 24) : W;
    const scale = maxW / W;
    const dispW = Math.round(W * scale);
    const dispH = Math.round(H * scale);
    node.width = W * dpr; node.height = H * dpr;
    node.style.width = dispW + 'px'; node.style.height = dispH + 'px';
    node.style.maxWidth = '100%';
    const ctx = node.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    seedGrounds();

    if (__brewLoopRunning) return;
    __brewLoopRunning = true;

    let last = performance.now();
    const render = (now) => {
      const live = canvasElRef.current;
      if (!live || !document.body.contains(live)) {
        __brewLoopRunning = false;
        return;
      }
      const c = live.getContext('2d');
      const dt = Math.min(40, now - last); last = now;
      c.clearRect(0, 0, W, H);
      const meth = stateRef.current.method;
      const r = renderers[meth];
      if (r) r(c, W, H, stateRef.current, now);

      if (stateRef.current.pouring) {
        const fr = BREW_METHODS[meth].fillRate;
        stateRef.current.water += dt * fr;
        stateRef.current.time += dt / 1000;
        if ((meth === 'aeropress' || meth === 'french') && stateRef.current.stage === 3) {
          stateRef.current.press = Math.min(1, stateRef.current.press + dt/3500);
        }
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }, [renderers, seedGrounds]);

  // Re-seed when method changes
  React.useEffect(() => {
    seedGrounds();
    stateRef.current.press = 0;
  }, [method, seedGrounds]);

  React.useEffect(() => {
    const id = setInterval(() => {
      setStats({
        water: Math.round(stateRef.current.water),
        time: stateRef.current.time.toFixed(1),
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  const startStage = (i) => {
    if (window.AudioCtx) window.AudioCtx.click();
    stateRef.current.stage = i;
    stateRef.current.pouring = true;
    setStage(i);
    setPouring(true);
    const target = m.stages[i].target;
    const watchdog = setInterval(() => {
      const done = stateRef.current.water >= target ||
        ((method === 'aeropress' || method === 'french') && i === 3 && stateRef.current.press >= 1);
      if (done) {
        stateRef.current.pouring = false;
        setPouring(false);
        clearInterval(watchdog);
      }
    }, 60);
  };

  const reset = () => {
    if (window.AudioCtx) window.AudioCtx.click();
    stateRef.current.water = 0;
    stateRef.current.time = 0;
    stateRef.current.pouring = false;
    stateRef.current.drips = [];
    stateRef.current.press = 0;
    stateRef.current.grounds.forEach(g => { g.wet = 0; g.bloom = 0; });
    setStage(0);
    setPouring(false);
  };

  return (
    <section className="section dark" id="brew" data-screen-label="03 Brew">
      <div className="row-tag">
        <span className="label on-dark">{SITE('brew_label')}</span>
        <span className="label on-dark">interactive · 6 methods</span>
      </div>

      <h2 className="huge reveal" style={{ marginBottom: 24 }}>
        {SITE('brew_h1')}<br/>
        <span className="serif">{SITE('brew_h2')}</span>
      </h2>

      {/* Method picker */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, flexWrap: 'wrap', borderTop: '1px solid var(--rule-on-dark)', borderBottom: '1px solid var(--rule-on-dark)' }}>
        {Object.entries(BREW_METHODS).map(([k, v], i) => (
          <button key={k}
            onClick={() => switchMethod(k)}
            className="magnet"
            style={{
              flex: '1 1 180px',
              padding: '20px 24px',
              border: 'none',
              borderRight: i < Object.keys(BREW_METHODS).length - 1 ? '1px solid var(--rule-on-dark)' : 'none',
              background: method === k ? (v.color || 'var(--ember)') : 'transparent',
              color: method === k ? (k === 'matcha' ? '#1B3A0E' : 'var(--ink)') : 'var(--bone)',
              cursor: 'none',
              textAlign: 'left',
              transition: 'background 0.25s',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
            <span className="label" style={{ color: 'inherit', opacity: 0.6 }}>{v.code}</span>
            <span style={{ fontSize: 20, letterSpacing: '-0.01em' }}>{v.label}</span>
            <span className="label" style={{ color: 'inherit', opacity: 0.55 }}>{v.note}</span>
          </button>
        ))}
      </div>

      <div className="pour-wrap">
        <div className="pour-canvas-wrap">
          <canvas ref={canvasRefCallback}></canvas>
          {pouring && (
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
              <span className="label on-dark" style={{ color: m.color || 'var(--ember)' }}>● ACTIVE</span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
            <span className="label on-dark" style={{ opacity: 0.5 }}>{m.code} · {m.label.toUpperCase()}</span>
          </div>
        </div>

        <div className="pour-controls">
          <p className="label on-dark">Tap a stage. Watch the method unfold.</p>

          {m.stages.map((s, i) => (
            <button key={method + '-' + i}
              className={"pour-stage" + (stage === i && pouring ? " active" : "")}
              onClick={() => startStage(i)}>
              <span className="num">STAGE 0{i+1}</span>
              <span className="name">{s.name}</span>
              <span className="label on-dark" style={{ opacity: 0.7, color: 'inherit' }}>{s.desc}</span>
            </button>
          ))}

          <div className="pour-readout">
            <div>
              <div className="k">Water</div>
              <div className="v">{stats.water}<span style={{ fontSize: 14, opacity: 0.6 }}> g</span></div>
            </div>
            <div>
              <div className="k">Time</div>
              <div className="v">{stats.time}<span style={{ fontSize: 14, opacity: 0.6 }}> s</span></div>
            </div>
            <div>
              <div className="k">Temp</div>
              <div className="v">{m.temp}<span style={{ fontSize: 14, opacity: 0.6 }}> °C</span></div>
            </div>
            <div>
              <div className="k">Ratio · Dose</div>
              <div className="v" style={{ fontSize: 22 }}>{m.ratio} · {m.dose}</div>
            </div>
          </div>

          <button className="btn outline" style={{ color: 'var(--bone)', borderColor: 'var(--rule-on-dark)' }} onClick={reset}>
            Reset brew <span className="arrow">↺</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// Keep old name exported for app.jsx
const PourOver = BrewSim;
Object.assign(window, { PourOver, BrewSim });
