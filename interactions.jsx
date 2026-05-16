// Custom cursor + magnetic button hooks
const { useEffect, useRef, useState, useCallback } = React;

function CustomCursor() {
  const dotRef = React.useRef(null);
  const ringRef = React.useRef(null);
  const [magnet, setMagnet] = React.useState(false);
  // Skip custom cursor on touch / small viewports — use native cursor
  const isTouch = typeof window !== 'undefined' && (
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(max-width: 640px)').matches ||
    'ontouchstart' in window
  );

  React.useEffect(() => {
    if (isTouch) return;
    const dot = dotRef.current, ring = ringRef.current;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let raf;
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dot) dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      if (ring) ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    const onOver = (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      setMagnet(!!t.closest('button, a, .magnet, input, select, .pour-stage, .tour-hotspot, .tour-room-btn, .chip'));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
    };
  }, []);

  if (isTouch) return null;
  return (
    <React.Fragment>
      <div ref={dotRef} className="cursor-dot"></div>
      <div ref={ringRef} className={"cursor-ring" + (magnet ? " magnet" : "")}></div>
    </React.Fragment>
  );
}

// Reveal-on-scroll
function useReveal() {
  React.useEffect(() => {
    let raf;
    const check = () => {
      const vh = window.innerHeight;
      document.querySelectorAll('.reveal:not(.in)').forEach(el => {
        const r = el.getBoundingClientRect();
        // Trigger if element OR its enclosing section is meaningfully in view
        const sec = el.closest('section');
        const sr = sec ? sec.getBoundingClientRect() : null;
        const elemVisible = r.top < vh * 0.95 && r.bottom > 0;
        const sectionInView = sr && sr.top < vh * 0.5 && sr.bottom > vh * 0.2;
        if (elemVisible || sectionInView) {
          el.classList.add('in');
          // Cancel any stuck CSS transitions so opacity actually reaches 1
          if (el.getAnimations) el.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} });
        }
      });
      raf = requestAnimationFrame(check);
    };
    const id = setTimeout(() => { check(); }, 50);
    return () => { clearTimeout(id); cancelAnimationFrame(raf); };
  }, []);
}

// Magnetic button (light pull toward cursor)
function MagneticBtn({ children, className = '', onClick, ...rest }) {
  const ref = React.useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = (e.clientX - cx) * 0.18;
    const dy = (e.clientY - cy) * 0.32;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const onLeave = () => { const el = ref.current; if (el) el.style.transform = ''; };
  return (
    <button ref={ref} className={"btn magnet " + className} onClick={onClick}
      onMouseMove={onMove} onMouseLeave={onLeave} {...rest}>
      {children}
    </button>
  );
}

// Tiny click sound — generated on the fly via WebAudio (no asset file)
const AudioCtx = (() => {
  let ctx = null, on = false, ambGain = null, ambNodes = [];
  const ensure = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  return {
    setOn(v) { on = v; },
    isOn() { return on; },
    click() {
      if (!on) return;
      const c = ensure();
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 720;
      o.type = 'square';
      g.gain.value = 0.0001;
      o.connect(g).connect(c.destination);
      const t = c.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.start(t); o.stop(t + 0.08);
    },
    hover() {
      if (!on) return;
      const c = ensure();
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 1200;
      o.type = 'sine';
      g.gain.value = 0.0001;
      o.connect(g).connect(c.destination);
      const t = c.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.start(t); o.stop(t + 0.06);
    },
    startAmbient() {
      const c = ensure();
      this.stopAmbient();
      ambGain = c.createGain();
      ambGain.gain.value = 0.05;
      ambGain.connect(c.destination);
      // brown noise as cafe murmur base
      const bufferSize = 2 * c.sampleRate;
      const noiseBuf = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
      const noise = c.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;
      const filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 600;
      noise.connect(filt).connect(ambGain);
      noise.start();
      ambNodes.push(noise);
      // intermittent steam hiss
      const hissTick = () => {
        if (!ambGain) return;
        const o = c.createBufferSource();
        const buf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        o.buffer = buf;
        const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2400;
        const g = c.createGain(); g.gain.value = 0.06;
        o.connect(f).connect(g).connect(ambGain);
        o.start();
        setTimeout(hissTick, 6000 + Math.random() * 8000);
      };
      setTimeout(hissTick, 3000);
    },
    stopAmbient() {
      try { ambNodes.forEach(n => n.stop && n.stop()); } catch (_) {}
      ambNodes = [];
      if (ambGain) { try { ambGain.disconnect(); } catch (_) {} ambGain = null; }
    }
  };
})();

Object.assign(window, { CustomCursor, useReveal, MagneticBtn, AudioCtx });
