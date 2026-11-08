/* Light Up the Festival — a gold diya that draws itself, one clap at a time. */
(() => {
  'use strict';

  // ---------- Settings you may want to change ----------
  const CFG = {
    TOP: 'HAPPY',                                  // small line above the big word
    MAIN: 'DIWALI',                                // the big word
    // Printed letter by letter at the very end ('' to hide). Names and emoji are fine.
    MESSAGE: "Happy Diwali, Veda! 🪔❤️ Wishing you all the happiness, love and success this year. I hope everything you've been wishing for comes true and this year brings you lots of beautiful moments, smiles and endless joy. Keep shining and have the best Diwali! ✨🫶🏻",
    CLAP_SENSITIVITY: 1,                           // lower = reacts to quieter sounds (try 0.7), higher = needs louder claps (1.5)
    MUSIC_VOLUME: 0.55                             // 0 to 1
  };
  const STAGE_NAMES = ['Waiting for the first clap', 'Rangoli petals', 'Decorative base', 'Clay diya', 'Wick and flame', 'Final details'];
  const MAX_STAGE = 5;

  // ---------- helpers ----------
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const easeOut = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
  const easeInOut = p => { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sky = $('sky'), fxc = $('fx'), artc = $('art');
  const sk = sky.getContext('2d'), fx = fxc.getContext('2d'), a = artc.getContext('2d');
  const hud = { snd: $('snd'), n: $('stageN'), name: $('stageName'), fill: $('fill'), lvl: $('lvl'), meter: $('meterWrap') };
  const startEl = $('start'), goBtn = $('go'), nomicBtn = $('nomic'), note = $('note');
  const tools = $('tools'), muteBtn = $('mute'), nextBtn = $('next'), hint = $('hint'), replayBtn = $('replay');
  const bgm = $('bgm');

  let W = 0, H = 0, DPR = 1, u = 100, cx = 0, cy = 0, SQ = 0.3, R = 100;
  let started = false, stage = 0, micOn = false, muted = false;
  let stars = [], groups = {}, goldGrad = null, px = 0, py = 0, tm = 0;

  // =====================================================================
  //  GEOMETRY  (everything is computed in screen space so lines stay crisp)
  // =====================================================================
  function buildGeometry() {
    const portrait = H > W * 1.1;
    u = Math.min(W * 0.355, H * (portrait ? 0.26 : 0.28));
    cx = W / 2;
    cy = H * (portrait ? 0.68 : 0.78);
    SQ = 0.34;
    R = u * 1.26;
    const D = u;
    const E = (r, ang) => [cx + r * Math.cos(ang), cy + r * SQ * Math.sin(ang)];
    const line = (fn, n) => { const p = []; for (let i = 0; i <= n; i++) p.push(fn(i / n)); return p; };
    const petal = (a0, r0, r1, w) => {
      const off = s => w * Math.sin(Math.PI * Math.pow(s, 0.65));
      const pts = [], N = 22;
      for (let i = 0; i <= N; i++) { const s = i / N; pts.push(E(r0 + (r1 - r0) * s, a0 - off(s))); }
      for (let i = N; i >= 0; i--) { const s = i / N; pts.push(E(r0 + (r1 - r0) * s, a0 + off(s))); }
      return pts;
    };
    const bez = (p0, p1, p2, p3, n) => line(t => {
      const m = 1 - t;
      return [m*m*m*p0[0] + 3*m*m*t*p1[0] + 3*m*t*t*p2[0] + t*t*t*p3[0],
              m*m*m*p0[1] + 3*m*m*t*p1[1] + 3*m*t*t*p2[1] + t*t*t*p3[1]];
    }, n);

    // ---- stage 1: rangoli ring ----
    const g1 = { stage: 1, dur: 2.8, polys: [], dots: [], fillAlpha: 0.06 };
    g1.polys.push(line(t => E(R * (0.93 + 0.028 * Math.abs(Math.cos(t * Math.PI * 2 * 24))), t * Math.PI * 2), 480));
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      g1.polys.push(petal(ang, R * 0.5, R * 0.9, Math.PI / 24 * 0.95));
      g1.polys.push(petal(ang + Math.PI / 24, R * 0.54, R * 0.76, Math.PI / 24 * 0.55));
    }
    for (let i = 0; i < 72; i++) { const [x, y] = E(R * 1.0, (i / 72) * Math.PI * 2 + 0.02); g1.dots.push([x, y, u * 0.011]); }
    for (let i = 0; i < 48; i++) { const [x, y] = E(R * 0.97, (i / 48) * Math.PI * 2 + 0.065); g1.dots.push([x, y, u * 0.006]); }
    for (let i = 0; i < 24; i++) { const [x, y] = E(R * 0.62, (i / 24) * Math.PI * 2 + Math.PI / 24); g1.dots.push([x, y, u * 0.014]); }

    // ---- stage 2: decorative base ----
    const g2 = { stage: 2, dur: 2.4, polys: [], dots: [], fillAlpha: 0.05 };
    for (const k of [0.5, 0.45, 0.4, 0.3]) g2.polys.push(line(t => E(R * k, t * Math.PI * 2), 120));
    for (let i = 0; i < 16; i++) g2.polys.push(petal((i / 16) * Math.PI * 2, R * 0.2, R * 0.43, Math.PI / 16 * 0.8));
    for (let i = 0; i < 36; i++) { const [x, y] = E(R * 0.355, (i / 36) * Math.PI * 2); g2.dots.push([x, y, u * 0.008]); }
    for (let i = 0; i < 16; i++) { const [x, y] = E(R * 0.15, (i / 16) * Math.PI * 2); g2.dots.push([x, y, u * 0.007]); }

    // ---- stage 3: the clay diya ----
    const g3 = { stage: 3, dur: 2.6, polys: [], dots: [], fillAlpha: 0 };
    const rimY = cy - 0.44 * D, rimRX = 0.56 * D, rimRY = 0.13 * D;
    const bl = bez([cx - rimRX, rimY], [cx - rimRX, cy - 0.24 * D], [cx - 0.42 * D, cy - 0.12 * D], [cx - 0.24 * D, cy - 0.07 * D], 40);
    const baseC = [cx, cy - 0.06 * D], baseRX = 0.24 * D, baseRY = 0.05 * D;
    const bottom = line(t => [baseC[0] - baseRX * Math.cos(t * Math.PI), baseC[1] + baseRY * Math.sin(t * Math.PI)], 30);
    const br = bl.map(p => [2 * cx - p[0], p[1]]).reverse();
    g3.body = [...bl, ...bottom, ...br];
    g3.polys.push(g3.body);
    g3.polys.push(line(t => [cx + rimRX * Math.cos(t * Math.PI * 2), rimY + rimRY * Math.sin(t * Math.PI * 2)], 90));
    g3.polys.push(line(t => [cx + rimRX * 0.86 * Math.cos(t * Math.PI * 2), rimY + rimRY * 0.8 * Math.sin(t * Math.PI * 2)], 90));
    g3.polys.push(line(t => [cx + 0.33 * D * Math.cos(t * Math.PI), cy - 0.0 * D + 0.075 * D * Math.sin(t * Math.PI)], 40).map(p => [p[0], p[1] + 0.01 * D]));
    for (const t of [0.22, 0.48, 0.74]) {
      const p = bl[Math.round(t * 40)];
      const hw = cx - p[0];
      g3.polys.push(line(s => [cx + hw * Math.cos(s * Math.PI), p[1] + hw * 0.232 * Math.sin(s * Math.PI)], 50));
      for (let i = 1; i < 9; i++) {
        const ang = (i / 9) * Math.PI;
        g3.dots.push([cx + hw * 0.9 * Math.cos(ang), p[1] + hw * 0.232 * 0.9 * Math.sin(ang) + hw * 0.04, D * 0.009]);
      }
    }
    // bowl silhouette (filled so the mandala behind it is hidden)
    const rimBack = line(t => [cx + rimRX * Math.cos(-t * Math.PI), rimY + rimRY * Math.sin(-t * Math.PI)], 40);
    g3.silhouette = [...bl, ...bottom, ...br, ...rimBack];
    g3.rim = { x: cx, y: rimY, rx: rimRX, ry: rimRY };

    groups = { g1, g2, g3 };
    for (const g of Object.values(groups)) g.p = stage >= g.stage ? 1 : 0;

    goldGrad = a.createLinearGradient(0, cy - 1.4 * D, 0, cy + 0.4 * D);
    goldGrad.addColorStop(0, '#fff6d0');
    goldGrad.addColorStop(0.5, '#f3cf7a');
    goldGrad.addColorStop(1, '#c8912e');
  }

  function makeStars() {
    const n = Math.round(clamp((W * H) / 5500, 90, 260));
    stars = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() < 0.08 ? rnd(1.4, 2.2) : rnd(0.4, 1.3),
      sp: rnd(0.5, 2.2), ph: Math.random() * 6.28, z: rnd(0.2, 1), big: Math.random() < 0.06
    }));
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    for (const c of [sky, fxc, artc]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
    buildGeometry();
    makeStars();
  }

  // =====================================================================
  //  AUDIO  (your MP3 if present, otherwise a built-in raga-style ambience + synthesized effects)
  // =====================================================================
  let AC = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, synthOn = false, fileOk = false;

  function initAudio() {
    if (AC) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    AC = new Ctor();
    master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
    const verb = AC.createConvolver();
    const len = Math.floor(AC.sampleRate * 2.6), imp = AC.createBuffer(2, len, AC.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = imp.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = imp;
    const wet = AC.createGain(); wet.gain.value = 0.32; verb.connect(wet); wet.connect(master);
    sfxBus = AC.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master); sfxBus.connect(verb);
    musicBus = AC.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master); musicBus.connect(verb);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  function bell(freq, t, dur, vol, bus) {
    if (!AC) return;
    for (const [m, v] of [[1, 1], [2.01, 0.35], [2.76, 0.12]]) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.value = freq * m;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, t + dur / m);
      o.connect(g); g.connect(bus || sfxBus);
      o.start(t); o.stop(t + dur + 0.05);
    }
  }
  function noiseHit(t, dur, vol, type, f0, f1) {
    if (!AC) return;
    const s = AC.createBufferSource(); s.buffer = noiseBuf;
    const f = AC.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = AC.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
  }
  const SCALE = [0, 2, 4, 7, 9];                       // Bhupali / major pentatonic
  const noteHz = (deg, oct) => 261.63 * Math.pow(2, (SCALE[((deg % 5) + 5) % 5] + 12 * (oct + Math.floor(deg / 5))) / 12);

  const sfx = {
    chime(n) { if (!AC) return; const t = AC.currentTime + 0.01; [0, 2, 4].forEach((d, i) => bell(noteHz(n + d, 1), t + i * 0.09, 1.6, 0.16)); },
    whoosh() { if (!AC) return; noiseHit(AC.currentTime, 0.7, 0.09, 'bandpass', 300, 2400); },
    boom(v = 1) {
      if (!AC) return; const t = AC.currentTime;
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.5);
      g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.65);
      noiseHit(t, 0.5, 0.22 * v, 'lowpass', 900, 120);
      for (let i = 0; i < 14; i++) noiseHit(t + 0.15 + Math.random() * 0.9, 0.05, 0.05 * v, 'highpass', 3500);
    },
    ignite() {
      if (!AC) return; const t = AC.currentTime;
      noiseHit(t, 0.9, 0.16, 'lowpass', 200, 1800);
      [0, 2, 4, 5, 7].forEach((d, i) => bell(noteHz(d, 2), t + 0.15 + i * 0.07, 2.2, 0.1));
    },
    finale() { if (!AC) return; const t = AC.currentTime; [0, 2, 4, 7, 9].forEach((d, i) => bell(noteHz(d, 1), t + i * 0.12, 2.8, 0.13)); }
  };

  function startSynthMusic() {
    if (synthOn || !AC) return;
    synthOn = true;
    const tonic = 130.81;
    let nextT = AC.currentTime + 0.3, beat = 0, deg = 2, melT = nextT + 1.2;
    const pluck = (f, t) => {
      for (const det of [-4, 4]) {
        const o = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain();
        o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
        fl.type = 'lowpass'; fl.frequency.setValueAtTime(1500, t); fl.frequency.exponentialRampToValueAtTime(380, t + 2.5);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0005, t + 3.4);
        o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 3.5);
      }
    };
    const tick = () => {
      const horizon = AC.currentTime + 0.5;
      while (nextT < horizon) {                         // tanpura-style drone: Pa Sa Sa low-Sa
        const seq = [tonic * 1.5, tonic * 2, tonic * 2, tonic];
        pluck(seq[beat % 4], nextT);
        beat++; nextT += 0.95;
      }
      while (melT < horizon) {                          // slow improvised melody
        if (Math.random() < 0.14) { melT += 0.62; continue; }
        deg = clamp(deg + Math.floor(rnd(-2, 3)), -2, 9);
        if (Math.random() < 0.08) deg = 5;
        const dur = [0.62, 0.62, 1.24, 1.24, 1.86, 2.5][Math.floor(Math.random() * 6)];
        bell(noteHz(deg, 1), melT, dur + 1.2, 0.07, musicBus);
        melT += dur;
      }
    };
    setInterval(tick, 120); tick();
  }

  function startMusic() {
    bgm.volume = 0;
    const fadeIn = () => { let v = 0; const id = setInterval(() => { v = Math.min(CFG.MUSIC_VOLUME, v + 0.03); bgm.volume = v; if (v >= CFG.MUSIC_VOLUME) clearInterval(id); }, 90); };
    const fallback = () => { fileOk = false; startSynthMusic(); };
    bgm.addEventListener('error', fallback, { once: true });
    const p = bgm.play();
    if (p && p.then) p.then(() => { fileOk = true; fadeIn(); }).catch(fallback);
  }

  // ---- clap detection (microphone) ----
  let analyser = null, tdBuf = null, noise = 0.01, prevRms = 0, lastClap = 0, micStream = null;
  async function startMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nomic');
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
    const src = AC.createMediaStreamSource(micStream);
    const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;   // claps are bright; hum and voices are not
    analyser = AC.createAnalyser(); analyser.fftSize = 1024;
    tdBuf = new Float32Array(analyser.fftSize);
    src.connect(hp); hp.connect(analyser);
    micOn = true;
  }
  function pollMic(now) {
    if (!micOn || !analyser) return;
    analyser.getFloatTimeDomainData(tdBuf);
    let s = 0; for (let i = 0; i < tdBuf.length; i++) s += tdBuf[i] * tdBuf[i];
    const rms = Math.sqrt(s / tdBuf.length);
    hud.lvl.style.width = Math.round(clamp(rms / 0.25, 0, 1) * 100) + '%';
    const thr = Math.max(0.05 * CFG.CLAP_SENSITIVITY, noise * 4.5 * CFG.CLAP_SENSITIVITY);
    if (rms > thr && rms > prevRms * 1.35 && now - lastClap > 600) { lastClap = now; advance('clap'); }
    else if (rms < thr * 0.6) noise = noise * 0.99 + rms * 0.01;
    prevRms = rms;
  }

  // =====================================================================
  //  FIREWORKS  (own canvas, additive blending, trails)
  // =====================================================================
  const parts = [], rockets = [];
  const PALETTES = [[42, 100, 62], [330, 90, 68], [275, 85, 72], [22, 100, 60], [0, 0, 96], [200, 90, 70], [48, 100, 80]];
  const unitScale = () => Math.min(W, H) / 700;

  function spark(x, y, vx, vy, life, h, s, l, size, grav, drag) {
    if (parts.length > 2200) return;
    parts.push({ x, y, px: x, py: y, vx, vy, life, age: 0, h, s, l, size, grav, drag });
  }
  function burst(x, y, big, type) {
    const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const pal2 = Math.random() < 0.4 ? PALETTES[Math.floor(Math.random() * PALETTES.length)] : pal;
    const sc = unitScale() * (big ? 1.25 : 1);
    type = type || ['peony', 'peony', 'ring', 'willow'][Math.floor(Math.random() * 4)];
    const n = type === 'willow' ? 70 : big ? 150 : 100;
    const tilt = rnd(0.4, 1);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rnd(-0.03, 0.03);
      const p = i % 3 === 0 ? pal2 : pal;
      if (type === 'ring') {
        const sp = 250 * sc;
        spark(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp * tilt, rnd(1.2, 1.7), p[0], p[1], p[2], 1.6, 60 * sc, 0.965);
      } else if (type === 'willow') {
        const sp = rnd(90, 230) * sc;
        spark(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, rnd(2.2, 3.1), 44, 100, 66, 1.4, 90 * sc, 0.975);
      } else {
        const sp = rnd(60, 320) * sc;
        spark(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, rnd(1.1, 1.9), p[0], p[1], p[2], rnd(1.2, 2.2), 110 * sc, 0.962);
      }
    }
    const d = Math.abs(y - H * 0.4) / H;
    if (started) sfx.boom(clamp(1.1 - d, 0.35, 1) * (big ? 1 : 0.8));
  }
  function launch(tx, ty, big, type) {
    rockets.push({ x: clamp(tx + rnd(-60, 60), 20, W - 20), y: H + 10, tx, ty, t: 0, dur: rnd(0.8, 1.25), big, type, sx: 0 });
    rockets[rockets.length - 1].sx = rockets[rockets.length - 1].x;
    if (started) sfx.whoosh();
  }
  function randomSkyPoint() { return [rnd(W * 0.08, W * 0.92), rnd(H * 0.1, H * 0.5)]; }

  let nextAuto = 1.2;
  function updateFx(dt) {
    nextAuto -= dt;
    if (nextAuto <= 0) {
      const [x, y] = randomSkyPoint();
      launch(x, y, stage >= 4 && Math.random() < 0.4);
      nextAuto = (stage === 0 ? rnd(2.6, 4.2) : stage < 3 ? rnd(1.8, 3) : stage < 5 ? rnd(1.2, 2.2) : rnd(0.6, 1.3)) * (reduce ? 1.8 : 1);
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.t += dt;
      const p = clamp(r.t / r.dur, 0, 1), e = 1 - Math.pow(1 - p, 2);
      r.px = r.x; r.py = r.y;
      r.x = r.sx + (r.tx - r.sx) * e; r.y = H + 10 + (r.ty - H - 10) * e;
      spark(r.x, r.y, rnd(-12, 12), rnd(10, 50), rnd(0.35, 0.6), 40, 90, 70, 1.1, 40, 0.95);
      if (p >= 1) { burst(r.tx, r.ty, r.big, r.type); rockets.splice(i, 1); }
    }
    if (stage >= 5 && started) {                         // sparkler fountain from the flame
      const n = Math.round(70 * dt * (reduce ? 0.5 : 1)), sc = unitScale();
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + rnd(-0.55, 0.55), sp = rnd(180, 470) * sc;
        spark(cx + rnd(-4, 4), cy - 0.5 * u, Math.cos(ang) * sp, Math.sin(ang) * sp, rnd(0.8, 1.7), rnd(36, 52), 100, rnd(68, 90), rnd(1, 2), 520 * sc, 0.985);
      }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.px = p.x; p.py = p.y;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy = p.vy * d + p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  function drawFx() {
    fx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!parts.length && !rockets.length) { fx.clearRect(0, 0, W, H); return; }
    fx.globalCompositeOperation = 'destination-out';
    fx.fillStyle = 'rgba(0,0,0,0.24)';
    fx.fillRect(0, 0, W, H);
    fx.globalCompositeOperation = 'lighter';
    fx.lineCap = 'round';
    for (const p of parts) {
      const k = 1 - p.age / p.life;
      const tw = 0.75 + 0.25 * Math.sin(p.age * 40 + p.x);
      fx.strokeStyle = `hsla(${p.h},${p.s}%,${p.l}%,${Math.pow(k, 0.8) * tw})`;
      fx.lineWidth = p.size * (0.5 + 0.5 * k);
      fx.beginPath(); fx.moveTo(p.px, p.py); fx.lineTo(p.x, p.y); fx.stroke();
    }
    fx.globalCompositeOperation = 'source-over';
  }

  // =====================================================================
  //  SKY
  // =====================================================================
  function drawSky(t) {
    sk.setTransform(DPR, 0, 0, DPR, 0, 0);
    const warm = clamp(stage / MAX_STAGE, 0, 1);
    const g = sk.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, Math.max(W, H) * 0.85);
    g.addColorStop(0, '#16239a'); g.addColorStop(0.35, '#0b1263'); g.addColorStop(0.7, '#060a3a'); g.addColorStop(1, '#02030f');
    sk.fillStyle = g; sk.fillRect(0, 0, W, H);
    // slow nebula drift
    sk.globalCompositeOperation = 'lighter';
    for (const [col, fx_, fy_, ph, r] of [['120,60,220', 0.021, 0.017, 0, 0.55], ['40,90,255', 0.017, 0.025, 2.1, 0.6], ['255,90,160', 0.013, 0.019, 4.2, 0.4]]) {
      const x = W * (0.5 + 0.35 * Math.sin(t * fx_ * 6.28 + ph)), y = H * (0.45 + 0.3 * Math.cos(t * fy_ * 6.28 + ph));
      const rad = Math.max(W, H) * r;
      const ng = sk.createRadialGradient(x, y, 0, x, y, rad);
      const al = col.startsWith('255') ? 0.03 + 0.05 * warm : 0.07;
      ng.addColorStop(0, `rgba(${col},${al})`); ng.addColorStop(1, `rgba(${col},0)`);
      sk.fillStyle = ng; sk.fillRect(0, 0, W, H);
    }
    sk.globalCompositeOperation = 'source-over';
    // stars
    for (const s of stars) {
      const x = s.x * W + px * 10 * s.z, y = s.y * H + py * 8 * s.z;
      const al = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      sk.fillStyle = `rgba(255,244,214,${al * (0.5 + 0.5 * s.z)})`;
      sk.beginPath(); sk.arc(x, y, s.r, 0, 6.283); sk.fill();
      if (s.big) {
        sk.strokeStyle = `rgba(255,244,214,${al * 0.5})`; sk.lineWidth = 0.7;
        sk.beginPath(); sk.moveTo(x - s.r * 4, y); sk.lineTo(x + s.r * 4, y); sk.moveTo(x, y - s.r * 4); sk.lineTo(x, y + s.r * 4); sk.stroke();
      }
    }
  }

  // =====================================================================
  //  THE DIYA, MANDALA, FLAME AND TEXT
  // =====================================================================
  const PASS = [{ w: 3.4, alpha: 0.13, color: '#ffcf70' }, { w: 1, alpha: 0.96, color: null }];

  function drawGroup(g, e) {
    if (e <= 0.001) return;
    const N = g.polys.length, S = 0.85, lw = Math.max(1.1, u * 0.0085);
    a.lineCap = 'round'; a.lineJoin = 'round';
    if (g.silhouette) {
      a.globalAlpha = clamp(e * 1.4, 0, 1);
      a.fillStyle = 'rgba(14,10,46,0.92)';
      a.beginPath(); g.silhouette.forEach((p, i) => (i ? a.lineTo(p[0], p[1]) : a.moveTo(p[0], p[1]))); a.closePath(); a.fill();
      const r = g.rim;
      a.fillStyle = 'rgba(8,5,30,0.95)';
      a.beginPath(); a.ellipse(r.x, r.y, r.rx * 0.86, r.ry * 0.8, 0, 0, 6.283); a.fill();
      a.globalAlpha = 1;
    }
    for (const pass of PASS) {
      a.lineWidth = lw * pass.w;
      a.strokeStyle = pass.color || goldGrad;
      a.globalAlpha = pass.alpha;
      a.beginPath();
      for (let i = 0; i < N; i++) {
        const loc = clamp(e * (1 + S) - (i / N) * S, 0, 1);
        if (loc <= 0) continue;
        const poly = g.polys[i], n = Math.max(2, Math.floor((poly.length - 1) * loc) + 1);
        a.moveTo(poly[0][0], poly[0][1]);
        for (let k = 1; k < n; k++) a.lineTo(poly[k][0], poly[k][1]);
      }
      a.stroke();
    }
    if (g.fillAlpha) {
      a.globalAlpha = g.fillAlpha * e; a.fillStyle = '#e0a940';
      for (let i = 0; i < N; i++) {
        const loc = clamp(e * (1 + S) - (i / N) * S, 0, 1);
        if (loc < 1 || g.polys[i].length > 100) continue;
        a.beginPath(); g.polys[i].forEach((p, k) => (k ? a.lineTo(p[0], p[1]) : a.moveTo(p[0], p[1]))); a.fill();
      }
    }
    a.globalAlpha = 1; a.fillStyle = goldGrad;
    for (let i = 0; i < g.dots.length; i++) {
      const loc = clamp(e * (1 + S) - (i / g.dots.length) * S, 0, 1);
      if (loc <= 0) continue;
      const d = g.dots[i];
      a.globalAlpha = loc; a.beginPath(); a.arc(d[0], d[1], d[2] * (0.4 + 0.6 * loc), 0, 6.283); a.fill();
    }
    a.globalAlpha = 1;
  }

  let flameLvl = 0, textP = 0, textT = 0, doneT = 0;
  function drawFlame(t, dt) {
    const target = stage >= 4 ? 1 : 0;
    flameLvl += (target - flameLvl) * (1 - Math.exp(-dt * 2.2));
    if (flameLvl < 0.005) return;
    const L = easeOut(flameLvl), D = u;
    const fx0 = cx, fy0 = cy - 0.47 * D;
    const flick = 1 + 0.045 * Math.sin(t * 9) + 0.03 * Math.sin(t * 17.3), sway = Math.sin(t * 6.1) * 0.012 * D + Math.sin(t * 11.7) * 0.006 * D;
    const h = 0.86 * D * L * flick, w = 0.15 * D * L;

    a.globalCompositeOperation = 'lighter';
    // glow on the mandala floor
    a.save(); a.translate(cx, cy); a.scale(1, SQ);
    const fg = a.createRadialGradient(0, 0, 0, 0, 0, R * 1.15);
    fg.addColorStop(0, `rgba(255,190,110,${0.30 * L})`); fg.addColorStop(0.5, `rgba(255,120,150,${0.10 * L})`); fg.addColorStop(1, 'rgba(255,120,150,0)');
    a.fillStyle = fg; a.beginPath(); a.arc(0, 0, R * 1.15, 0, 6.283); a.fill(); a.restore();
    // big purple/pink halo
    const hy = fy0 - h * 0.45, hr = D * 1.9 * (0.4 + 0.6 * L);
    const hg = a.createRadialGradient(fx0, hy, 0, fx0, hy, hr);
    hg.addColorStop(0, `rgba(255,215,150,${0.42 * L})`); hg.addColorStop(0.25, `rgba(255,130,190,${0.20 * L})`);
    hg.addColorStop(0.6, `rgba(150,70,220,${0.10 * L})`); hg.addColorStop(1, 'rgba(120,60,200,0)');
    a.fillStyle = hg; a.fillRect(fx0 - hr, hy - hr, hr * 2, hr * 2);
    // soft rays
    a.save(); a.translate(fx0, hy); a.rotate(t * 0.05); a.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * 6.283, len = D * (1 + 0.3 * Math.sin(t * 1.3 + i * 2.1)) * L;
      const rg = a.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len);
      rg.addColorStop(0, `rgba(255,220,160,${0.09 * L})`); rg.addColorStop(1, 'rgba(255,220,160,0)');
      a.strokeStyle = rg; a.beginPath(); a.moveTo(0, 0); a.lineTo(Math.cos(ang) * len, Math.sin(ang) * len); a.stroke();
    }
    a.restore();
    a.globalCompositeOperation = 'source-over';

    // wick
    a.strokeStyle = '#2b1a10'; a.lineWidth = Math.max(2, D * 0.018); a.lineCap = 'round';
    a.beginPath(); a.moveTo(fx0, fy0 + 0.02 * D); a.lineTo(fx0, fy0 - 0.045 * D * L); a.stroke();

    // flame body
    const tip = [fx0 + sway * 2, fy0 - h];
    const body = (ww, hh, tipX) => {
      a.beginPath(); a.moveTo(fx0, fy0);
      a.bezierCurveTo(fx0 + ww, fy0 - hh * 0.2, fx0 + ww * 0.7, fy0 - hh * 0.72, tipX, fy0 - hh);
      a.bezierCurveTo(fx0 - ww * 0.7, fy0 - hh * 0.72, fx0 - ww, fy0 - hh * 0.2, fx0, fy0); a.closePath();
    };
    const og = a.createLinearGradient(0, fy0, 0, tip[1]);
    og.addColorStop(0, 'rgba(255,120,40,0.95)'); og.addColorStop(0.35, 'rgba(255,190,80,0.95)'); og.addColorStop(0.8, 'rgba(255,235,170,0.8)'); og.addColorStop(1, 'rgba(255,245,200,0.15)');
    a.fillStyle = og; body(w, h, tip[0]); a.fill();
    const ig = a.createLinearGradient(0, fy0, 0, fy0 - h * 0.8);
    ig.addColorStop(0, 'rgba(255,255,255,0.95)'); ig.addColorStop(0.6, 'rgba(255,248,210,0.9)'); ig.addColorStop(1, 'rgba(255,248,210,0)');
    a.fillStyle = ig; body(w * 0.42, h * 0.78, fx0 + sway); a.fill();
    const bg = a.createRadialGradient(fx0, fy0, 0, fx0, fy0, w * 0.9);
    bg.addColorStop(0, `rgba(90,130,255,${0.5 * L})`); bg.addColorStop(1, 'rgba(90,130,255,0)');
    a.fillStyle = bg; a.beginPath(); a.arc(fx0, fy0, w * 0.9, 0, 6.283); a.fill();
  }

  // ---- the final message: word-wrapped, fitted into the space above the flame, typed out letter by letter ----
  const seg = (typeof Intl !== 'undefined' && Intl.Segmenter) ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const graphemes = str => (seg ? Array.from(seg.segment(str), x => x.segment) : Array.from(str));
  let msgCache = { key: '', lines: [], fsK: 1, msgFs: 16, lineH: 22, maxW: 300, total: 0 };
  let msgT = 0;

  function layoutMessage(portrait0, baseFs, flameTop) {
    const key = `${W}x${H}|${CFG.MESSAGE}`;
    if (msgCache.key === key) return msgCache;
    let k = 1, lines = [], msgFs = 16, lineH = 22, maxW = 300, topY = 0, mainY = 0, msgTop = 0, boxH = 0;
    for (let tries = 0; tries < 8; tries++) {
      const fsT = baseFs * k;
      msgFs = (portrait0 ? clamp(W * 0.039, 13, 18) : clamp(W * 0.0155, 15, 22)) * k;
      lineH = msgFs * 1.42;
      maxW = portrait0 ? W * 0.9 : Math.min(W * 0.8, 980);
      a.font = `italic 500 ${msgFs}px "Cormorant Garamond",Georgia,serif`;
      lines = []; let cur = '';
      for (const word of CFG.MESSAGE.split(' ')) {
        const test = cur ? cur + ' ' + word : word;
        if (cur && a.measureText(test).width > maxW) { lines.push(cur); cur = word; } else cur = test;
      }
      if (cur) lines.push(cur);
      topY = (portrait0 ? Math.max(H * 0.085, 104) : Math.max(H * 0.06, 52)) * (0.7 + 0.3 * k) + 8;
      mainY = topY + fsT * 0.9;
      msgTop = mainY + fsT * 0.62 + 10;
      boxH = lines.length * lineH + 26;
      if (msgTop + boxH <= flameTop - 4) break;
      k *= 0.9;
    }
    const counts = lines.map(l => graphemes(l).length + 1);
    msgCache = { key, lines, counts, total: counts.reduce((x, y) => x + y, 0), fsK: k, msgFs, lineH, maxW, topY, mainY, msgTop, boxH };
    return msgCache;
  }

  function drawText(t, dt) {
    const want = stage >= 5 ? 1 : 0;
    textT = clamp(textT + (want ? dt : -dt * 1.5), 0, 3.4);
    textP = textT / 3.4;
    if (want && textT > 2.4) msgT += dt; else if (!want) msgT = 0;
    if (textP <= 0.001) return;
    const portrait0 = H > W * 1.1;
    const baseFs = Math.min(W * 0.15, H * 0.105);
    const flameTop = cy - 1.4 * u;
    const L = CFG.MESSAGE ? layoutMessage(portrait0, baseFs, flameTop) : { fsK: 1, topY: Math.max(H * 0.085, portrait0 ? 104 : 60) + 8 };
    const fs = baseFs * L.fsK;
    const topY = L.topY, mainY = L.mainY || topY + fs * 0.9;
    a.textAlign = 'center'; a.textBaseline = 'middle';

    // small line
    const e0 = easeOut(textP * 3);
    a.globalAlpha = e0;
    a.font = `500 ${fs * 0.26}px "Cinzel","Trajan Pro",Georgia,serif`;
    a.fillStyle = '#ecd392';
    const top = CFG.TOP.split('');
    const sp0 = fs * 0.26 * 0.7;
    const tw = top.reduce((s, ch) => s + a.measureText(ch).width + sp0, -sp0);
    let x0 = cx - tw / 2;
    for (const ch of top) { const cw = a.measureText(ch).width; a.textAlign = 'left'; a.fillText(ch, x0, topY); x0 += cw + sp0; }

    // big word, letter by letter
    a.font = `700 ${fs}px "Cinzel","Trajan Pro",Georgia,serif`;
    const letters = CFG.MAIN.split(''), sp = fs * 0.1;
    const widths = letters.map(ch => a.measureText(ch).width);
    const total = widths.reduce((s, w) => s + w + sp, -sp);
    let x = cx - total / 2;
    const tg = a.createLinearGradient(0, mainY - fs * 0.5, 0, mainY + fs * 0.5);
    tg.addColorStop(0, '#fff6d0'); tg.addColorStop(0.5, '#f4cf74'); tg.addColorStop(1, '#bd8420');
    const shimmerX = cx - total / 2 + ((t * 0.25) % 1.6 - 0.3) * total;
    const sg = a.createLinearGradient(shimmerX - fs * 0.6, 0, shimmerX + fs * 0.6, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.7)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    letters.forEach((ch, i) => {
      const li = easeOut((textP * 2.4 - 0.25 - i * 0.12) / 0.7);
      if (li > 0) {
        a.save();
        a.globalAlpha = li;
        a.translate(x + widths[i] / 2, mainY + (1 - li) * fs * 0.3);
        a.scale(0.9 + 0.1 * li, 0.9 + 0.1 * li);
        a.textAlign = 'center';
        a.shadowColor = 'rgba(255,190,80,0.55)'; a.shadowBlur = fs * 0.28;
        a.fillStyle = tg; a.fillText(ch, 0, 0);
        a.shadowBlur = 0;
        if (textP > 0.9) { a.globalCompositeOperation = 'lighter'; a.translate(-(x + widths[i] / 2), 0); a.fillStyle = sg; a.textAlign = 'left'; a.fillText(ch, x, 0); }
        a.restore();
      }
      x += widths[i] + sp;
    });

    // the message, typed out
    if (CFG.MESSAGE && msgT > 0) {
      const fade = clamp(msgT / 0.8, 0, 1);
      let visible = Math.floor(msgT * 26);
      const boxW = Math.min(L.maxW + 34, W - 16), boxX = cx - boxW / 2, boxY = L.msgTop - 6;
      a.globalAlpha = fade * 0.5;
      a.fillStyle = 'rgba(4,6,31,0.7)';
      a.beginPath();
      if (a.roundRect) a.roundRect(boxX, boxY, boxW, L.boxH, 14); else a.rect(boxX, boxY, boxW, L.boxH);
      a.fill();
      a.globalAlpha = fade;
      a.font = `italic 500 ${L.msgFs}px "Cormorant Garamond",Georgia,serif`;
      a.textAlign = 'left'; a.textBaseline = 'middle';
      a.fillStyle = '#f8e9c0'; a.shadowColor = 'rgba(0,0,0,.85)'; a.shadowBlur = 6;
      L.lines.forEach((line, i) => {
        if (visible <= 0) return;
        const g = graphemes(line);
        const part = g.slice(0, Math.min(g.length, visible)).join('');
        visible -= L.counts[i];
        const lw = a.measureText(line).width;
        a.fillText(part, cx - lw / 2, boxY + 13 + L.lineH * (i + 0.5));
      });
      a.shadowBlur = 0;
    }
    a.globalAlpha = 1;
  }

  function drawArt(t, dt) {
    a.setTransform(DPR, 0, 0, DPR, 0, 0);
    a.clearRect(0, 0, W, H);
    for (const g of Object.values(groups)) {
      const target = stage >= g.stage ? 1 : 0;
      const step = dt / (reduce ? 0.4 : g.dur);
      g.p = target > g.p ? Math.min(1, g.p + step) : Math.max(0, g.p - step * 2);
      drawGroup(g, easeInOut(g.p));
    }
    drawFlame(t, dt);
    drawText(t, dt);
  }

  // =====================================================================
  //  STAGES
  // =====================================================================
  function setHud() {
    hud.n.textContent = `Stage ${stage}/${MAX_STAGE}`;
    hud.name.textContent = STAGE_NAMES[stage];
    hud.fill.style.width = (stage / MAX_STAGE) * 100 + '%';
    hud.snd.textContent = !started ? 'Sound: not started' : micOn ? 'Sound: listening for claps' : 'Sound: tap or press Space';
    hint.hidden = !started || stage >= MAX_STAGE;
    hint.textContent = micOn ? 'Clap, or tap anywhere, to light the next stage' : 'Tap anywhere (or press Space) to light the next stage';
  }

  let lastAdvance = 0;
  function advance() {
    if (!started) return;
    const now = performance.now();
    if (now - lastAdvance < 450) return;
    lastAdvance = now;
    if (stage >= MAX_STAGE) { const [x, y] = randomSkyPoint(); launch(x, y, true); return; }   // extra claps = extra fireworks
    stage++;
    setHud();
    sfx.chime(stage);
    const [x, y] = randomSkyPoint();
    launch(x, y, stage >= 3);
    if (stage === 2 || stage === 3) setTimeout(() => { const [x2, y2] = randomSkyPoint(); launch(x2, y2, false); }, 350);
    if (stage === 4) sfx.ignite();
    if (stage === 5) {
      sfx.finale();
      [0, 300, 700, 1200, 1800, 2500, 3300].forEach(ms => setTimeout(() => { if (stage >= 5) { const [fx_, fy_] = randomSkyPoint(); launch(fx_, fy_, true); } }, ms));
      setTimeout(() => { if (stage >= 5) replayBtn.hidden = false; }, 5500);
    }
  }
  function replay() {
    stage = 0; replayBtn.hidden = true; setHud();
    for (let i = 0; i < 3; i++) setTimeout(() => { const [x, y] = randomSkyPoint(); launch(x, y, false); }, i * 250);
  }

  // =====================================================================
  //  START / EVENTS
  // =====================================================================
  async function begin(useMic) {
    if (started) return;
    goBtn.disabled = true; nomicBtn.disabled = true;
    initAudio();
    if (AC && AC.state === 'suspended') AC.resume();
    if (useMic && AC) {
      try { await startMic(); hud.meter.hidden = false; }
      catch (err) {
        micOn = false;
        const insecure = !window.isSecureContext;
        note.textContent = insecure ? 'The microphone needs https, so tap anywhere to light each stage.' : 'No microphone access, so tap anywhere to light each stage.';
      }
    }
    started = true;
    startEl.classList.add('gone');
    tools.hidden = false;
    startMusic();
    setHud();
    nextAuto = 0.4;
    sfx.chime(0);
  }
  goBtn.addEventListener('click', () => begin(true));
  nomicBtn.addEventListener('click', () => begin(false));
  nextBtn.addEventListener('click', e => { e.stopPropagation(); advance(); });
  replayBtn.addEventListener('click', e => { e.stopPropagation(); replay(); });
  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    muted = !muted; bgm.muted = muted;
    if (master) master.gain.value = muted ? 0 : 0.9;
    muteBtn.classList.toggle('muted', muted);
    muteBtn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
  });
  document.addEventListener('pointerdown', e => {
    if (!started) return;
    if (e.target.closest('button')) return;
    advance();
  });
  window.addEventListener('keydown', e => {
    if (!started) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') { e.preventDefault(); advance(); }
  });
  window.addEventListener('pointermove', e => { px = (e.clientX / W - 0.5) * 2; py = (e.clientY / H - 0.5) * 2; }, { passive: true });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (AC) (document.hidden ? AC.suspend() : AC.resume()); });

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; tm += dt;
    pollMic(now);
    drawSky(tm);
    updateFx(dt); drawFx();
    drawArt(tm, dt);
    requestAnimationFrame(frame);
  }

  resize();
  setHud();
  requestAnimationFrame(frame);

  window.__diwali = { advance: () => { lastAdvance = 0; advance(); }, begin, get stage() { return stage; } };   // handy for testing
})();
