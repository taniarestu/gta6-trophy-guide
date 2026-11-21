// Leonida Platinum Guide — offline trophy tracker (vanilla ES module, no libraries).
// State lives only in localStorage; the trophy data comes from data/trophies.json.
// All user-visible text is set with textContent, never innerHTML with data, so
// notes and imported files cannot inject markup. Source links are built from
// the JSON data at runtime; this file contains no network addresses.
const KEY = 'leonida-platinum-guide-v1';
const SEED_EARNED = [2, 3, 8, 16, 20, 21, 33, 35, 42, 44, 46, 53];
const KIND_LABELS = {
  platinum: 'Platinum', story: 'Story', character: 'Character quest', activity: 'Activity',
  collectible: 'Collectible', robbery: 'Robbery', misc: 'Side moment', completion: '100% completion'
};
const KIND_CHIPS = [
  ['all', 'All'], ['story', 'Story'], ['character', 'Character quests'],
  ['activity', 'Activities'], ['collectible', 'Collectibles'], ['robbery', 'Robberies'], ['misc', 'Side moments']
];
// Next-up order: the missable first, then the next story trophy, then quick wins.
const NEXT_UP = [
  { id: 28, eta: '~30 min', why: 'The only possibly missable trophy — do the Chapter 1 meditation now or never.' },
  { id: 2, eta: 'Story', why: 'First mission of Chapter 1 — it pops on its own as you play.' },
  { id: 3, eta: 'Story', why: 'Finish Chapter 1; it pops as Chapter 2 begins.' },
  { id: 35, eta: '~15 min', why: 'Stand by a busy road and scan passing traffic with the WAiNK app.' },
  { id: 31, eta: '~1 h', why: 'Scan landmarks, curiosities and sculptures as you explore.' },
  { id: 53, eta: 'Passive', why: 'Spend $100,000 across shops while kitting out both characters.' },
  { id: 16, eta: 'Passive', why: 'Try the nine activity types once — most arrive on their own.' },
  { id: 15, eta: '~10 h', why: '250 stunts; under-the-bridge flights are the quickest.' },
  { id: 14, eta: '~100 h', why: 'The long grind — the 100% checklist. Save it for Step 2 of the roadmap.' }
];

let doc = null;
let state = loadState();
let selectedId = null;
let filters = { q: '', kind: 'all', grade: 'all', onlyUnearned: false, onlyMissable: false };

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { earned: [], notes: {}, settings: { spoiler: true, theme: 'paper' } };
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      settings: {
        spoiler: parsed.settings && parsed.settings.spoiler !== false,
        theme: parsed.settings && parsed.settings.theme === 'night' ? 'night' : 'paper'
      }
    };
  } catch (e) {
    return { earned: [], notes: {}, settings: { spoiler: true, theme: 'paper' } };
  }
}
function saveState() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: session-only */ }
}
function earnedSet() { return new Set(state.earned); }
function isEarned(t) { return earnedSet().has(t.name); }
function pointsEarned() {
  const set = earnedSet();
  return doc.trophies.filter((t) => set.has(t.name)).reduce((a, t) => a + (t.points || 0), 0);
}
function trophyById(id) { return doc.trophies.find((t) => t.id === id); }

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}
function badge(text, cls) { return el('span', 'badge' + (cls ? ' ' + cls : ''), text); }

function applyTheme() {
  const theme = state.settings.theme;
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.setAttribute('aria-pressed', String(theme === 'night'));
  btn.textContent = theme === 'night' ? 'Paper theme' : 'Night theme';
  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = theme;
}
function applySpoiler() {
  const on = state.settings.spoiler;
  const btn = document.getElementById('spoilerToggle');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? 'Spoilers hidden' : 'Spoilers shown';
  const chk = document.getElementById('spoilerCheck');
  if (chk) chk.checked = on;
}
function masked(t) { return t.secret && state.settings.spoiler && !isEarned(t); }

function renderKpis() {
  const n = state.earned.length;
  const total = doc.trophies.length;
  document.getElementById('kpiCount').textContent = n + ' / ' + total + ' earned';
  const bar = document.getElementById('kpiBar');
  bar.style.width = Math.round((n / total) * 100) + '%';
  document.getElementById('kpiBarWrap').setAttribute('aria-valuenow', String(n));
  document.getElementById('kpiPoints').textContent = pointsEarned() + ' / 1,350';
}

function matchesFilters(t) {
  if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
  if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
  if (filters.onlyUnearned && isEarned(t)) return false;
  if (filters.onlyMissable && !t.missable) return false;
  if (filters.q) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.chapter ? 'chapter ' + t.chapter : '')).toLowerCase();
    if (!hay.includes(filters.q)) return false;
  }
  return true;
}

function renderList() {
  const list = document.getElementById('trophyList');
  list.replaceChildren();
  const shown = doc.trophies.filter(matchesFilters);
  document.getElementById('resultCount').textContent =
    'Showing ' + shown.length + ' of ' + doc.trophies.length + ' trophies' +
    (filters.q ? ' for “' + filters.q + '”' : '');
  document.getElementById('emptyState').hidden = shown.length > 0;
  for (const t of shown) {
    const li = el('li', 'trophy-card' + (isEarned(t) ? ' earned' : '') + (selectedId === t.id ? ' selected' : ''));
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = isEarned(t);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('change', () => {
      const set = earnedSet();
      if (box.checked) set.add(t.name); else set.delete(t.name);
      state.earned = [...set];
      saveState();
      renderKpis();
      renderList();
      renderDetail();
      renderNextUp();
    });
    li.append(box);
    const body = el('div');
    const head = el('div', 'trophy-head');
    head.append(el('h3', 'trophy-name', masked(t) ? 'Hidden story trophy' : t.name));
    body.append(head);
    body.append(el('p', 'trophy-desc', masked(t) ? 'Hidden story trophy — earn it to reveal its name and description.' : t.description));
    const meta = el('div', 'trophy-meta');
    meta.append(badge(t.grade, t.grade));
    if (t.kind !== 'platinum') meta.append(badge(KIND_LABELS[t.kind] || t.kind));
    if (t.chapter) meta.append(badge('Chapter ' + t.chapter));
    if (t.count) meta.append(badge('Target: ' + t.count.toLocaleString('en-US')));
    if (t.missable) meta.append(badge('Missable', 'missable'));
    if (isEarned(t)) meta.append(badge('Earned', 'earned-badge'));
    body.append(meta);
    if (!masked(t) && t.quote) {
      const q = el('p', 'quote');
      const idx = t.quote.indexOf(': ');
      if (idx > 0) {
        q.append(el('cite', null, t.quote.slice(0, idx) + ': '));
        q.append(document.createTextNode(t.quote.slice(idx + 2)));
      } else {
        q.textContent = t.quote;
      }
      body.append(q);
    }
    li.append(body);
    const btn = el('button', 'guide-btn', 'Read guide');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Read the guide for ' + t.name);
    btn.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(); });
    li.append(btn);
    list.append(li);
  }
}

function renderDetail() {
  const pane = document.getElementById('detail');
  const t = selectedId ? trophyById(selectedId) : null;
  if (!t) { pane.hidden = true; pane.replaceChildren(); return; }
  pane.hidden = false;
  pane.replaceChildren();
  const close = el('button', 'detail-close', 'Close');
  close.type = 'button';
  close.addEventListener('click', () => { selectedId = null; renderList(); renderDetail(); });
  pane.append(close);
  pane.append(el('h2', null, masked(t) ? 'Hidden story trophy' : t.name));
  const meta = el('div', 'trophy-meta');
  meta.append(badge(t.grade, t.grade));
  if (t.kind !== 'platinum') meta.append(badge(KIND_LABELS[t.kind] || t.kind));
  if (t.chapter) meta.append(badge('Chapter ' + t.chapter));
  if (t.count) meta.append(badge('Target: ' + t.count.toLocaleString('en-US')));
  if (t.missable) meta.append(badge('Missable', 'missable'));
  pane.append(meta);
  pane.append(el('p', 'trophy-desc', masked(t) ? 'Hidden story trophy — earn it to reveal its description.' : t.description));
  if (t.missable) {
    const warn = el('div', 'warn-box');
    warn.append(el('h3', null, 'Missable — read this first'));
    warn.append(el('p', null, 'This is the only trophy in the game that can be missed. The Chapter 1 meditation at Jason\u2019s house is gone after Chapter 1, and it is still unconfirmed whether the trophy needs it. Do it anyway: the morning after Down to Earth, talk to Lucia in the kitchen, follow her to the balcony and choose Accept.'));
    pane.append(warn);
  }
  if (!masked(t)) {
    if (t.quote) {
      const q = el('blockquote', 'quote');
      const idx = t.quote.indexOf(': ');
      if (idx > 0) {
        q.append(el('cite', null, t.quote.slice(0, idx) + ': '));
        q.append(document.createTextNode(t.quote.slice(idx + 2)));
      } else {
        q.textContent = t.quote;
      }
      pane.append(q);
    }
    pane.append(el('h3', null, 'How to get it'));
    pane.append(el('p', 'guide-text', t.guide));
    const src = el('div', 'sources');
    src.append(el('h3', null, 'Sources'));
    const ul = el('ul');
    for (const s of t.sources || []) {
      const li = el('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.textContent = s.label;
      a.target = '_blank';
      a.rel = 'noopener';
      li.append(a);
      ul.append(li);
    }
    src.append(ul);
    pane.append(src);
    const noteBox = el('div', 'note-box');
    noteBox.append(el('label', null, 'Your notes'));
    const ta = document.createElement('textarea');
    ta.value = state.notes[t.id] || '';
    ta.setAttribute('aria-label', 'Personal notes for ' + t.name);
    const saved = el('p', 'note-saved');
    ta.addEventListener('change', () => {
      if (ta.value.trim()) state.notes[t.id] = ta.value;
      else delete state.notes[t.id];
      saveState();
      saved.textContent = 'Note saved on this device.';
    });
    noteBox.append(ta);
    noteBox.append(saved);
    pane.append(noteBox);
  } else {
    pane.append(el('p', 'masked', 'Spoiler protection is on. Tick this trophy earned in the checklist to reveal its guide.'));
  }
  const mark = el('button', 'mark-btn', isEarned(t) ? 'Mark as not earned' : 'Mark as earned');
  mark.type = 'button';
  mark.addEventListener('click', () => {
    const set = earnedSet();
    if (set.has(t.name)) set.delete(t.name); else set.add(t.name);
    state.earned = [...set];
    saveState();
    renderKpis();
    renderList();
    renderDetail();
    renderNextUp();
  });
  pane.append(mark);
}

function nextUpItems() {
  const set = earnedSet();
  const out = [];
  for (const n of NEXT_UP) {
    const t = trophyById(n.id);
    if (!t || set.has(t.name)) continue;
    out.push({ t, eta: n.eta, why: n.why });
    if (out.length === 3) break;
  }
  return out;
}
function renderNextUpList(ol) {
  ol.replaceChildren();
  for (const [i, item] of nextUpItems().entries()) {
    const li = el('li');
    li.append(el('span', 'rank', String(i + 1)));
    const mid = el('div');
    mid.append(el('strong', null, masked(item.t) ? 'Hidden story trophy' : item.t.name));
    mid.append(el('p', 'why', item.why));
    li.append(mid);
    li.append(el('span', 'eta', item.eta));
    ol.append(li);
  }
  if (nextUpItems().length === 0) {
    const li = el('li');
    li.append(el('p', null, 'All suggested trophies are earned — check the Checklist tab for what is left.'));
    ol.append(li);
  }
}
function renderNextUp() {
  renderNextUpList(document.getElementById('nextUpPlanner'));
  renderNextUpList(document.getElementById('nextUpMissables'));
}

function renderMissCard() {
  const card = document.getElementById('missCard');
  card.replaceChildren();
  const t = trophyById(28);
  card.append(el('h3', null, t.name + ' — the only possibly missable trophy'));
  const meta = el('div', 'trophy-meta');
  meta.append(badge(t.grade, t.grade));
  meta.append(badge('Target: 18 meditation spots'));
  meta.append(badge('Missable', 'missable'));
  card.append(meta);
  card.append(el('p', 'guide-text', t.guide));
  const q = el('p', 'quote');
  q.append(el('cite', null, 'PowerPyx: '));
  q.append(document.createTextNode('there is 1 missable meditation in Chapter 1 at Jason\u2019s house; it raises the counter by 1 but is not marked as a Meditation Spot, so it is unclear if it is required.'));
  card.append(q);
  const btn = el('button', 'guide-btn', 'Open the full guide');
  btn.type = 'button';
  btn.addEventListener('click', () => {
    selectedId = 28;
    showView('checklist');
    renderList();
    renderDetail();
    document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  card.append(btn);
}

function showView(name) {
  for (const b of document.querySelectorAll('.tab')) {
    const active = b.dataset.view === name;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  for (const v of document.querySelectorAll('.view')) v.hidden = v.id !== 'view-' + name;
}

function buildChips() {
  const wrap = document.getElementById('kindChips');
  for (const [value, label] of KIND_CHIPS) {
    const b = el('button', 'chip', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(filters.kind === value));
    b.addEventListener('click', () => {
      filters.kind = value;
      for (const c of wrap.children) c.setAttribute('aria-pressed', String(c.textContent === label));
      renderList();
    });
    wrap.append(b);
  }
}

function applyShotPreset() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (!shot) return;
  // Screenshot presets: a class per shot lets CSS bring the right content
  // into the 1280x800 viewport without scrolling (headless --screenshot
  // captures a blank frame when the page is scrolled by script).
  document.documentElement.classList.add('shot-' + shot);
  // Screenshot presets: seed a plausible 12/55 progress on a fresh profile only.
  if (state.earned.length === 0) {
    state.earned = SEED_EARNED.map((id) => trophyById(id).name);
    saveState();
  }
  if (shot === '2') { selectedId = 28; showView('checklist'); }
  else if (shot === '3') { showView('missables'); }
  else if (shot === '4') {
    filters.q = 'stunt';
    document.getElementById('search').value = 'stunt';
    showView('checklist');
  } else { showView('checklist'); }
}

async function boot() {
  try {
    const res = await fetch('data/trophies.json');
    doc = await res.json();
  } catch (e) {
    document.getElementById('trophyList').replaceChildren(
      el('li', null, 'Could not load the trophy data. Check that data/trophies.json is present and reload.')
    );
    return;
  }
  buildChips();
  applyTheme();
  applySpoiler();
  applyShotPreset();
  renderKpis();
  renderList();
  renderDetail();
  renderMissCard();
  renderNextUp();

  for (const b of document.querySelectorAll('.tab')) {
    b.addEventListener('click', () => showView(b.dataset.view));
  }
  document.getElementById('search').addEventListener('input', (e) => {
    filters.q = e.target.value.trim().toLowerCase();
    renderList();
  });
  document.getElementById('grade').addEventListener('change', (e) => {
    filters.grade = e.target.value;
    renderList();
  });
  document.getElementById('onlyUnearned').addEventListener('change', (e) => {
    filters.onlyUnearned = e.target.checked;
    renderList();
  });
  document.getElementById('onlyMissable').addEventListener('change', (e) => {
    filters.onlyMissable = e.target.checked;
    renderList();
  });
  document.getElementById('themeToggle').addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'night' ? 'paper' : 'night';
    saveState();
    applyTheme();
  });
  document.getElementById('spoilerToggle').addEventListener('click', () => {
    state.settings.spoiler = !state.settings.spoiler;
    saveState();
    applySpoiler();
    renderList();
    renderDetail();
    renderNextUp();
  });
  document.getElementById('spoilerCheck').addEventListener('change', (e) => {
    state.settings.spoiler = e.target.checked;
    saveState();
    applySpoiler();
    renderList();
    renderDetail();
    renderNextUp();
  });
  document.getElementById('themeSelect').addEventListener('change', (e) => {
    state.settings.theme = e.target.value;
    saveState();
    applyTheme();
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    a.download = 'leonida-platinum-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const msg = document.getElementById('importMsg');
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const names = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(names)) throw new Error('bad file');
      const known = new Set(doc.trophies.map((t) => t.name));
      const clean = names.filter((n) => typeof n === 'string' && known.has(n));
      state.earned = [...new Set(clean)];
      if (parsed.notes && typeof parsed.notes === 'object') {
        for (const [id, text] of Object.entries(parsed.notes)) {
          if (trophyById(Number(id)) && typeof text === 'string') state.notes[Number(id)] = text.slice(0, 2000);
        }
      }
      saveState();
      renderKpis();
      renderList();
      renderDetail();
      renderNextUp();
      msg.textContent = 'Imported ' + state.earned.length + ' earned trophies.';
    } catch (err) {
      msg.textContent = 'That file could not be imported — it is not a progress export from this guide.';
    }
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Reset all progress and notes? This cannot be undone.')) return;
    state = { earned: [], notes: {}, settings: state.settings };
    selectedId = null;
    saveState();
    renderKpis();
    renderList();
    renderDetail();
    renderNextUp();
  });
}

boot();
