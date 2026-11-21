// Leonida Platinum Guide — offline trophy tracker, vanilla ES module, no libraries.
// Progress lives only in localStorage; trophy data comes from data/trophies.json.
// Every piece of user-visible text is set through textContent, never through
// innerHTML fed with data, so notes and imported files cannot inject markup.
// Source links are built from the JSON at runtime; no network address is
// hard-coded in this file, and the app makes no network request of its own.
const STORE_KEY = 'leonida-platinum-guide-v1';
const TOTAL_POINTS = 1350;
// Seeded progress for screenshots only: 12 of 55 earned, on a fresh profile.
const SEED_IDS = [2, 3, 8, 16, 20, 21, 33, 35, 42, 44, 46, 53];
const KIND_NAMES = {
  platinum: 'Platinum',
  story: 'Story',
  character: 'Character quest',
  activity: 'Activity',
  collectible: 'Collectible',
  robbery: 'Robbery',
  misc: 'Side moment',
  completion: '100% completion',
};
const KIND_FILTERS = [
  ['all', 'All'],
  ['story', 'Story'],
  ['character', 'Character quests'],
  ['activity', 'Activities'],
  ['collectible', 'Collectibles'],
  ['robbery', 'Robberies'],
  ['misc', 'Side moments'],
];
// Next-up order: the missable first, then the next story beats, then quick wins.
const PLAN = [
  { id: 28, eta: '~30 min', why: 'The only possibly missable trophy — do the Chapter 1 meditation now or never.' },
  { id: 2, eta: 'Story', why: 'First mission of Chapter 1 — it pops on its own as you play.' },
  { id: 3, eta: 'Story', why: 'Finish Chapter 1; it pops as Chapter 2 begins.' },
  { id: 35, eta: '~15 min', why: 'Stand by a busy road and scan passing traffic with the WAiNK app.' },
  { id: 31, eta: '~1 h', why: 'Scan landmarks, curiosities and sculptures as you explore.' },
  { id: 53, eta: 'Passive', why: 'Spend $100,000 across shops while kitting out both characters.' },
  { id: 16, eta: 'Passive', why: 'Try the nine activity types once — most arrive on their own.' },
  { id: 15, eta: '~10 h', why: '250 stunts; under-the-bridge flights are the quickest.' },
  { id: 14, eta: '~100 h', why: 'The long grind — the 100% checklist. Save it for Step 2 of the roadmap.' },
];

let data = null;
let prefs = readPrefs();
let openId = null;
let query = { text: '', kind: 'all', grade: 'all', unearnedOnly: false, missableOnly: false };

function readPrefs() {
  const fallback = { earned: [], notes: {}, settings: { spoiler: true, theme: 'paper' } };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      settings: {
        spoiler: !(parsed.settings && parsed.settings.spoiler === false),
        theme: parsed.settings && parsed.settings.theme === 'night' ? 'night' : 'paper',
      },
    };
  } catch (e) {
    return fallback;
  }
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) { /* storage blocked: session-only */ }
}
function earnedNames() { return new Set(prefs.earned); }
function earned(t) { return earnedNames().has(t.name); }
function findTrophy(id) { return data.trophies.find((t) => t.id === id); }
function pointsSoFar() {
  const set = earnedNames();
  return data.trophies.filter((t) => set.has(t.name)).reduce((sum, t) => sum + (t.points || 0), 0);
}
function isHidden(t) { return t.secret && prefs.settings.spoiler && !earned(t); }

function tag(name, cls, text) {
  const node = document.createElement(name);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}
function chip(text, cls) { return tag('span', 'badge' + (cls ? ' ' + cls : ''), text); }
function quoteNode(text, cls) {
  const node = tag('p', cls || 'quote');
  const cut = text.indexOf(': ');
  if (cut > 0) {
    node.append(tag('cite', null, text.slice(0, cut) + ': '));
    node.append(document.createTextNode(text.slice(cut + 2)));
  } else {
    node.textContent = text;
  }
  return node;
}
function metaBadges(t, into) {
  into.append(chip(t.grade, t.grade));
  if (t.kind !== 'platinum') into.append(chip(KIND_NAMES[t.kind] || t.kind));
  if (t.chapter) into.append(chip('Chapter ' + t.chapter));
  if (t.count) into.append(chip('Target: ' + t.count.toLocaleString('en-US')));
  if (t.missable) into.append(chip('Missable', 'missable'));
  if (earned(t)) into.append(chip('Earned', 'earned-badge'));
}

function syncTheme() {
  const theme = prefs.settings.theme;
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.setAttribute('aria-pressed', String(theme === 'night'));
  btn.textContent = theme === 'night' ? 'Paper theme' : 'Night theme';
  const sel = document.getElementById('themeSelect');
  if (sel) sel.value = theme;
}
function syncSpoiler() {
  const on = prefs.settings.spoiler;
  const btn = document.getElementById('spoilerToggle');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? 'Spoilers hidden' : 'Spoilers shown';
  const chk = document.getElementById('spoilerCheck');
  if (chk) chk.checked = on;
}

function refreshKpis() {
  const n = prefs.earned.length;
  const total = data.trophies.length;
  document.getElementById('kpiCount').textContent = n + ' / ' + total + ' earned';
  const bar = document.getElementById('kpiBar');
  bar.style.width = Math.round((n / total) * 100) + '%';
  document.getElementById('kpiBarWrap').setAttribute('aria-valuenow', String(n));
  document.getElementById('kpiPoints').textContent = pointsSoFar() + ' / ' + TOTAL_POINTS.toLocaleString('en-US');
}

function passesFilters(t) {
  if (query.kind !== 'all' && t.kind !== query.kind) return false;
  if (query.grade !== 'all' && t.grade !== query.grade) return false;
  if (query.unearnedOnly && earned(t)) return false;
  if (query.missableOnly && !t.missable) return false;
  if (query.text) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.chapter ? 'chapter ' + t.chapter : '')).toLowerCase();
    if (!hay.includes(query.text)) return false;
  }
  return true;
}

function toggleEarned(t, on) {
  const set = earnedNames();
  if (on) set.add(t.name); else set.delete(t.name);
  prefs.earned = [...set];
  persist();
  refreshKpis();
  drawList();
  drawDetail();
  drawNextUp();
}

function drawList() {
  const list = document.getElementById('trophyList');
  list.replaceChildren();
  const shown = data.trophies.filter(passesFilters);
  document.getElementById('resultCount').textContent =
    'Showing ' + shown.length + ' of ' + data.trophies.length + ' trophies' +
    (query.text ? ' for “' + query.text + '”' : '');
  document.getElementById('emptyState').hidden = shown.length > 0;
  for (const t of shown) {
    const li = tag('li', 'trophy-card' + (earned(t) ? ' earned' : '') + (openId === t.id ? ' selected' : ''));
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned(t);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('change', () => toggleEarned(t, box.checked));
    li.append(box);
    const body = tag('div');
    const head = tag('div', 'trophy-head');
    head.append(tag('h3', 'trophy-name', isHidden(t) ? 'Hidden story trophy' : t.name));
    body.append(head);
    body.append(tag('p', 'trophy-desc', isHidden(t)
      ? 'Hidden story trophy — earn it to reveal its name and description.'
      : t.description));
    const meta = tag('div', 'trophy-meta');
    metaBadges(t, meta);
    body.append(meta);
    if (!isHidden(t) && t.quote) body.append(quoteNode(t.quote));
    li.append(body);
    const btn = tag('button', 'guide-btn', 'Read guide');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Read the guide for ' + t.name);
    btn.addEventListener('click', () => { openId = t.id; drawList(); drawDetail(); });
    li.append(btn);
    list.append(li);
  }
}

function drawDetail() {
  const pane = document.getElementById('detail');
  const t = openId ? findTrophy(openId) : null;
  if (!t) { pane.hidden = true; pane.replaceChildren(); return; }
  pane.hidden = false;
  pane.replaceChildren();
  const close = tag('button', 'detail-close', 'Close');
  close.type = 'button';
  close.addEventListener('click', () => { openId = null; drawList(); drawDetail(); });
  pane.append(close);
  pane.append(tag('h2', null, isHidden(t) ? 'Hidden story trophy' : t.name));
  const meta = tag('div', 'trophy-meta');
  metaBadges(t, meta);
  pane.append(meta);
  pane.append(tag('p', 'trophy-desc', isHidden(t)
    ? 'Hidden story trophy — earn it to reveal its description.'
    : t.description));
  if (t.missable) {
    const warn = tag('div', 'warn-box');
    warn.append(tag('h3', null, 'Missable — read this first'));
    warn.append(tag('p', null, 'This is the only trophy in the game that can be missed. The Chapter 1 meditation at Jason’s house is gone after Chapter 1, and it is still unconfirmed whether the trophy needs it. Do it anyway: the morning after Down to Earth, talk to Lucia in the kitchen, follow her to the balcony and choose Accept.'));
    pane.append(warn);
  }
  if (!isHidden(t)) {
    if (t.quote) pane.append(quoteNode(t.quote, 'quote'));
    pane.append(tag('h3', null, 'How to get it'));
    pane.append(tag('p', 'guide-text', t.guide));
    const src = tag('div', 'sources');
    src.append(tag('h3', null, 'Sources'));
    const ul = tag('ul');
    for (const s of t.sources || []) {
      const li = tag('li');
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
    const notes = tag('div', 'note-box');
    notes.append(tag('label', null, 'Your notes'));
    const area = document.createElement('textarea');
    area.value = prefs.notes[t.id] || '';
    area.setAttribute('aria-label', 'Personal notes for ' + t.name);
    const saved = tag('p', 'note-saved');
    area.addEventListener('change', () => {
      if (area.value.trim()) prefs.notes[t.id] = area.value;
      else delete prefs.notes[t.id];
      persist();
      saved.textContent = 'Note saved on this device.';
    });
    notes.append(area);
    notes.append(saved);
    pane.append(notes);
  } else {
    pane.append(tag('p', 'masked', 'Spoiler protection is on. Tick this trophy earned in the checklist to reveal its guide.'));
  }
  const mark = tag('button', 'mark-btn', earned(t) ? 'Mark as not earned' : 'Mark as earned');
  mark.type = 'button';
  mark.addEventListener('click', () => toggleEarned(t, !earned(t)));
  pane.append(mark);
}

function nextUp() {
  const set = earnedNames();
  const out = [];
  for (const step of PLAN) {
    const t = findTrophy(step.id);
    if (!t || set.has(t.name)) continue;
    out.push({ t, eta: step.eta, why: step.why });
    if (out.length === 3) break;
  }
  return out;
}
function drawNextUpInto(ol) {
  ol.replaceChildren();
  const items = nextUp();
  for (const [i, item] of items.entries()) {
    const li = tag('li');
    li.append(tag('span', 'rank', String(i + 1)));
    const mid = tag('div');
    mid.append(tag('strong', null, isHidden(item.t) ? 'Hidden story trophy' : item.t.name));
    mid.append(tag('p', 'why', item.why));
    li.append(mid);
    li.append(tag('span', 'eta', item.eta));
    ol.append(li);
  }
  if (items.length === 0) {
    const li = tag('li');
    li.append(tag('p', null, 'All suggested trophies are earned — check the Checklist tab for what is left.'));
    ol.append(li);
  }
}
function drawNextUp() {
  drawNextUpInto(document.getElementById('nextUpPlanner'));
  drawNextUpInto(document.getElementById('nextUpMissables'));
}

function drawMissCard() {
  const card = document.getElementById('missCard');
  card.replaceChildren();
  const t = findTrophy(28);
  card.append(tag('h3', null, t.name + ' — the only possibly missable trophy'));
  const meta = tag('div', 'trophy-meta');
  meta.append(chip(t.grade, t.grade));
  meta.append(chip('Target: 18 meditation spots'));
  meta.append(chip('Missable', 'missable'));
  card.append(meta);
  card.append(tag('p', 'guide-text', t.guide));
  card.append(quoteNode('PowerPyx: there is 1 missable meditation in Chapter 1 at Jason’s house; it raises the counter by 1 but is not marked as a Meditation Spot, so it is unclear if it is required.'));
  const btn = tag('button', 'guide-btn', 'Open the full guide');
  btn.type = 'button';
  btn.addEventListener('click', () => {
    openId = 28;
    showView('checklist');
    drawList();
    drawDetail();
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

function buildKindChips() {
  const wrap = document.getElementById('kindChips');
  for (const [value, label] of KIND_FILTERS) {
    const b = tag('button', 'chip', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(query.kind === value));
    b.addEventListener('click', () => {
      query.kind = value;
      for (const c of wrap.children) c.setAttribute('aria-pressed', String(c.textContent === label));
      drawList();
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
  // Seed a plausible 12/55 progress on a fresh profile only.
  if (prefs.earned.length === 0) {
    prefs.earned = SEED_IDS.map((id) => findTrophy(id).name);
    persist();
  }
  if (shot === '2') { openId = 28; showView('checklist'); }
  else if (shot === '3') { showView('missables'); }
  else if (shot === '4') {
    query.text = 'stunt';
    document.getElementById('search').value = 'stunt';
    showView('checklist');
  } else { showView('checklist'); }
}

async function boot() {
  try {
    const res = await fetch('data/trophies.json');
    data = await res.json();
  } catch (e) {
    document.getElementById('trophyList').replaceChildren(
      tag('li', null, 'Could not load the trophy data. Check that data/trophies.json is present and reload.')
    );
    return;
  }
  buildKindChips();
  syncTheme();
  syncSpoiler();
  applyShotPreset();
  refreshKpis();
  drawList();
  drawDetail();
  drawMissCard();
  drawNextUp();

  for (const b of document.querySelectorAll('.tab')) {
    b.addEventListener('click', () => showView(b.dataset.view));
  }
  document.getElementById('search').addEventListener('input', (e) => {
    query.text = e.target.value.trim().toLowerCase();
    drawList();
  });
  document.getElementById('grade').addEventListener('change', (e) => {
    query.grade = e.target.value;
    drawList();
  });
  document.getElementById('onlyUnearned').addEventListener('change', (e) => {
    query.unearnedOnly = e.target.checked;
    drawList();
  });
  document.getElementById('onlyMissable').addEventListener('change', (e) => {
    query.missableOnly = e.target.checked;
    drawList();
  });
  document.getElementById('themeToggle').addEventListener('click', () => {
    prefs.settings.theme = prefs.settings.theme === 'night' ? 'paper' : 'night';
    persist();
    syncTheme();
  });
  document.getElementById('spoilerToggle').addEventListener('click', () => {
    prefs.settings.spoiler = !prefs.settings.spoiler;
    persist();
    syncSpoiler();
    drawList();
    drawDetail();
    drawNextUp();
  });
  document.getElementById('spoilerCheck').addEventListener('change', (e) => {
    prefs.settings.spoiler = e.target.checked;
    persist();
    syncSpoiler();
    drawList();
    drawDetail();
    drawNextUp();
  });
  document.getElementById('themeSelect').addEventListener('change', (e) => {
    prefs.settings.theme = e.target.value;
    persist();
    syncTheme();
  });
  document.getElementById('exportBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(prefs, null, 2)], { type: 'application/json' }));
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
      const known = new Set(data.trophies.map((t) => t.name));
      const clean = names.filter((n) => typeof n === 'string' && known.has(n));
      prefs.earned = [...new Set(clean)];
      if (parsed.notes && typeof parsed.notes === 'object') {
        for (const [id, text] of Object.entries(parsed.notes)) {
          if (findTrophy(Number(id)) && typeof text === 'string') prefs.notes[Number(id)] = text.slice(0, 2000);
        }
      }
      persist();
      refreshKpis();
      drawList();
      drawDetail();
      drawNextUp();
      msg.textContent = 'Imported ' + prefs.earned.length + ' earned trophies.';
    } catch (err) {
      msg.textContent = 'That file could not be imported — it is not a progress export from this guide.';
    }
    e.target.value = '';
  });
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!window.confirm('Reset all progress and notes? This cannot be undone.')) return;
    prefs = { earned: [], notes: {}, settings: prefs.settings };
    openId = null;
    persist();
    refreshKpis();
    drawList();
    drawDetail();
    drawNextUp();
  });
}

boot();
