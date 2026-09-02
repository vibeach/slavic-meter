// Slavic Meter — slide from Cattolica (chill) to Podgorica (unleashed)
// Waypoints trace the Adriatic + Balkan coast/interior south-east.

const WAYPOINTS = [
  { pct: 0,   name: "Cattolica",   country: "🇮🇹 Italia",       emoji: "🌞",   lat: 43.9700, lon: 12.7400, quote: "Prendiamo pizzetta da Staccoli, circles celebration." },
  { pct: 8,   name: "Rimini",      country: "🇮🇹 Italia",       emoji: "🍦",   lat: 44.0678, lon: 12.5695, quote: "Visitiamo Duomo insieme, messaggi con animali" },
  { pct: 18,  name: "Trieste",     country: "🇮🇹 Italia (mixed)", emoji: "☕",   lat: 45.6495, lon: 13.7768, quote: "Comincio a non rispondere a alcune domande" },
  { pct: 28,  name: "Koper",       country: "🇸🇮 Slovenija",    emoji: "🙂",   lat: 45.5481, lon: 13.7302, quote: "Making Grrrr sound, smiling" },
  { pct: 38,  name: "Pula",        country: "🇭🇷 Hrvatska",    emoji: "😐",   lat: 44.8666, lon: 13.8496, quote: "Ha risposto 'ok'. Solo 'ok'. Attenzione." },
  { pct: 48,  name: "Zadar",       country: "🇭🇷 Hrvatska",    emoji: "😒",   lat: 44.1194, lon: 15.2314, quote: "risponde con 👍" },
  { pct: 58,  name: "Split",       country: "🇭🇷 Hrvatska",    emoji: "😤",   lat: 43.5081, lon: 16.4402, quote: "👍, 45min later" },
  { pct: 68,  name: "Dubrovnik",   country: "🇭🇷 Hrvatska",    emoji: "🙄",   lat: 42.6507, lon: 18.0944, quote: "👍, 1.5h later" },
  { pct: 78,  name: "Kotor",       country: "🇲🇪 Crna Gora",   emoji: "😠",   lat: 42.4247, lon: 18.7712, quote: "Silence, only sending reels on Instagram" },
  { pct: 88,  name: "Budva",       country: "🇲🇪 Crna Gora",   emoji: "🤬",   lat: 42.2911, lon: 18.8403, quote: "Shows she's on Instagram, but no reels" },
  { pct: 100, name: "Montenegro",  country: "🇲🇪 Crna Gora",   emoji: "🐍",   img: "montenegro.jpg", lat: 42.7087, lon: 19.3744, quote: "Risponde 'c'è' senza mandare circle push." },
];

const map = L.map('map', { zoomControl: true, scrollWheelZoom: false })
  .setView([44.0, 16.0], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Draw the full path
const pathCoords = WAYPOINTS.map(w => [w.lat, w.lon]);
L.polyline(pathCoords, {
  color: '#d94f3a',
  weight: 4,
  opacity: 0.55,
  dashArray: '8, 6',
  lineJoin: 'round'
}).addTo(map);

// Static markers at each waypoint (small dots)
WAYPOINTS.forEach(w => {
  L.circleMarker([w.lat, w.lon], {
    radius: 5,
    color: '#fff',
    fillColor: '#d94f3a',
    fillOpacity: 0.85,
    weight: 2
  }).addTo(map).bindTooltip(`${w.name} · ${w.pct}%`, { permanent: false });
});

// Fit bounds nicely
map.fitBounds(pathCoords, { padding: [30, 30] });

// Big animated cursor marker (emoji)
const cursorIcon = L.divIcon({
  className: '',
  html: '<div class="custom-marker" id="cursorMarker">🌞</div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});
const cursor = L.marker([WAYPOINTS[0].lat, WAYPOINTS[0].lon], { icon: cursorIcon, zIndexOffset: 1000 }).addTo(map);

// ── Position interpolation ──
function interp(pct) {
  // Find segment
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i], b = WAYPOINTS[i+1];
    if (pct >= a.pct && pct <= b.pct) {
      const t = (pct - a.pct) / (b.pct - a.pct);
      return {
        lat: a.lat + (b.lat - a.lat) * t,
        lon: a.lon + (b.lon - a.lon) * t,
        prev: a, next: b, t
      };
    }
  }
  const last = WAYPOINTS[WAYPOINTS.length - 1];
  return { lat: last.lat, lon: last.lon, prev: last, next: last, t: 0 };
}

// Snap to nearest waypoint for display card
function nearest(pct) {
  let best = WAYPOINTS[0], bd = Infinity;
  for (const w of WAYPOINTS) {
    const d = Math.abs(w.pct - pct);
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}

// Build waypoint buttons
const wpContainer = document.getElementById('waypoints');
function iconHtml(w, klass) {
  return w.img
    ? `<img class="${klass} wp-icon-img" src="/static/${w.img}" alt="${w.name}">`
    : `<span class="${klass}">${w.emoji}</span>`;
}
WAYPOINTS.forEach((w, idx) => {
  const btn = document.createElement('button');
  btn.className = 'wp-btn';
  btn.dataset.pct = w.pct;
  btn.dataset.idx = idx;
  btn.innerHTML = `${iconHtml(w, 'wp-emoji')}${w.name}`;
  btn.addEventListener('click', () => {
    slider.value = w.pct;
    animateTo(w.pct);
  });
  wpContainer.appendChild(btn);
});

const slider = document.getElementById('slider');
const cityName = document.getElementById('cityName');
const cityCountry = document.getElementById('cityCountry');
const moodEmoji = document.getElementById('moodEmoji');
const pctLabel = document.getElementById('pctLabel');
const quote = document.getElementById('quote');
const flag = document.getElementById('flag');
const cursorMarker = () => document.getElementById('cursorMarker');

function bgLevel(pct) {
  if (pct < 15) return 0;
  if (pct < 35) return 1;
  if (pct < 55) return 2;
  if (pct < 70) return 3;
  if (pct < 88) return 4;
  return 5;
}

function update(pct) {
  const p = interp(pct);
  cursor.setLatLng([p.lat, p.lon]);
  const near = nearest(pct);
  cityName.textContent = near.name;
  cityCountry.textContent = near.country;
  // Mood card: image when provided, emoji otherwise
  if (near.img) {
    moodEmoji.innerHTML = `<img class="mood-img" src="/static/${near.img}" alt="${near.name}">`;
  } else {
    moodEmoji.textContent = near.emoji;
  }
  flag.textContent = near.country.split(' ')[0];
  pctLabel.textContent = Math.round(pct) + '%';
  quote.textContent = near.quote;

  const cm = cursorMarker();
  if (cm) {
    if (near.img) {
      cm.innerHTML = `<img src="/static/${near.img}" alt="${near.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
    } else {
      cm.textContent = near.emoji;
    }
  }

  document.body.dataset.level = bgLevel(pct);

  // Highlight active waypoint button
  document.querySelectorAll('.wp-btn').forEach(b => {
    b.classList.toggle('active', +b.dataset.pct === near.pct);
  });

  // Shake at high slavic
  if (pct >= 80) {
    moodEmoji.classList.remove('shaking');
    void moodEmoji.offsetWidth;
    moodEmoji.classList.add('shaking');
  }

  // Emoji scale bounce
  moodEmoji.style.transform = `scale(${1 + pct/400})`;
}

// Smooth animate slider to a target
function animateTo(target, dur = 700) {
  const start = parseFloat(slider.value);
  const t0 = performance.now();
  function step(now) {
    const k = Math.min(1, (now - t0) / dur);
    const ease = 0.5 - Math.cos(Math.PI * k) / 2; // easeInOutSine
    const val = start + (target - start) * ease;
    slider.value = val;
    update(val);
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

slider.addEventListener('input', e => update(parseFloat(e.target.value)));

// Initial paint (honour ?pct= or #pct= for shareable state)
const initPct = (() => {
  const m = window.location.search.match(/pct=(\d+(?:\.\d+)?)/) ||
            window.location.hash.match(/pct=(\d+(?:\.\d+)?)/);
  return m ? Math.max(0, Math.min(100, parseFloat(m[1]))) : 0;
})();
slider.value = initPct;
update(initPct);

// Little idle-nudge only when landing at default 0 — skip if ?pct= given
if (initPct === 0) {
  window.addEventListener('load', () => {
    setTimeout(() => animateTo(30, 900), 600);
    setTimeout(() => animateTo(0, 900), 1700);
  });
}

// ── Save entry to backend ─────────────────────────────────────
const saveBtn = document.getElementById('saveBtn');
const saveMsg = document.getElementById('saveMsg');
const noteInput = document.getElementById('note');

async function saveEntry() {
  const value = parseFloat(slider.value);
  const note = (noteInput.value || '').trim();
  saveBtn.disabled = true;
  saveMsg.textContent = 'invio...';
  saveMsg.className = 'save-msg';
  try {
    const r = await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, note })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    saveMsg.textContent = `✅ salvato #${j.id} · ${j.emoji} ${j.city} (${j.value}%)`;
    saveMsg.className = 'save-msg ok';
    noteInput.value = '';
  } catch (e) {
    saveMsg.textContent = '❌ errore: ' + e.message;
    saveMsg.className = 'save-msg err';
  } finally {
    saveBtn.disabled = false;
    setTimeout(() => { saveMsg.textContent = ''; saveMsg.className = 'save-msg'; }, 4500);
  }
}
saveBtn.addEventListener('click', saveEntry);
noteInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveEntry(); });

// ── Sweets reveal ─────────────────────────────────────────────
const sweetsBtn = document.getElementById('sweetsBtn');
const sweetsReveal = document.getElementById('sweetsReveal');
const SWEETS_IMGS = [
  '/static/sweets-truck-1.jpg', '/static/sweets-truck-2.jpg',
  '/static/sweets-truck-3.jpg', '/static/sweets-truck-4.jpg',
  '/static/sweets-truck-5.jpg'
];
let sweetsIdx = 0;
const sweetsImg = document.getElementById('sweetsImg');
sweetsBtn.addEventListener('click', () => {
  // First click reveals; subsequent clicks rotate to a NEW random image
  if (sweetsReveal.hasAttribute('hidden')) {
    sweetsReveal.removeAttribute('hidden');
  } else {
    // Pick a NEW random image different from current
    let next;
    do { next = Math.floor(Math.random() * SWEETS_IMGS.length); }
    while (SWEETS_IMGS.length > 1 && next === sweetsIdx);
    sweetsIdx = next;
    sweetsImg.src = SWEETS_IMGS[sweetsIdx];
  }
  setTimeout(() => sweetsReveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
});

// ── Call ask ──────────────────────────────────────────────────
const callAskBtn = document.getElementById('callAskBtn');
const callAskMsg = document.getElementById('callAskMsg');
callAskBtn.addEventListener('click', async () => {
  callAskBtn.disabled = true;
  callAskMsg.textContent = 'invio...';
  callAskMsg.className = 'callask-msg';
  try {
    const r = await fetch('/api/call-ask', { method: 'POST' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    callAskMsg.textContent = `📨 richiesta chiamata inviata (#${j.id})`;
    callAskMsg.className = 'callask-msg ok';
  } catch (e) {
    callAskMsg.textContent = '❌ errore: ' + e.message;
    callAskMsg.className = 'callask-msg err';
  } finally {
    setTimeout(() => { callAskBtn.disabled = false; }, 3000);
    setTimeout(() => { callAskMsg.textContent = ''; callAskMsg.className = 'callask-msg'; }, 6000);
  }
});

// ── Topo video reveal ─────────────────────────────────────────
const topoBtn = document.getElementById('topoBtn');
const topoReveal = document.getElementById('topoReveal');
topoBtn.addEventListener('click', () => {
  const wasHidden = topoReveal.hasAttribute('hidden');
  if (wasHidden) {
    topoReveal.removeAttribute('hidden');
    topoBtn.textContent = '🎥 hide video';
    setTimeout(() => {
      topoReveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const v = topoReveal.querySelector('video');
      if (v) v.play().catch(() => {});
    }, 100);
  } else {
    const v = topoReveal.querySelector('video');
    if (v) v.pause();
    topoReveal.setAttribute('hidden', '');
    topoBtn.textContent = '🐭 check video Topo made for Mamma at party on first day';
  }
});
