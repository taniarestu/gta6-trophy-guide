// Leonida Platinum Guide — offline trophy tracker for GTA VI (PS5).
// Vanilla ES module, no libraries, no network calls: the only fetch is the
// local data file next to this script. Progress lives in localStorage only.

const DATA_URL = 'data/trophies.json';
const STORE_KEY = 'leonida-platinum-guide-v2';
const KIND_LABELS = {
  platinum: 'Platinum', story: 'Story', character: 'Character quest',
  activities: 'Activities', collectibles: 'Collectibles', robberies: 'Robberies',
  misc: 'Misc', side: 'Strangers & Freaks', completion: '100% completion',
  exploration: 'Exploration'
};
const KIND_RANK = {
  story: 1, character: 2, side: 3, activities: 4, collectibles: 5,
  robberies: 6, exploration: 7, misc: 8, completion: 9, platinum: 10
};
const ETA_BY_KIND = {
  story: 'Automatic — play the story', character: '30–60 min per quest line',
  side: '20–40 min per strand', activities: '1–4 h each',
  collectibles: '30 min – 3 h each', robberies: '30–60 min each',
  exploration: '1–2 h flying', misc: '5–30 min each',
  completion: 'About 100 h after the story', platinum: 'About 200 h in total'
};
const GRADE_POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };
const GRADE_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };

// Demo seed (?seed=N): pretends the first N story trophies are earned, in
// memory only, so screenshots look lived-in. Real progress is never touched
// while a seed is active.
const params = new URLSearchParams(location.search);
let liveQuery = params.get('q') || '';
const seedCount = Math.max(0, Math.min(12, Number.parseInt(params.get('seed') || '0', 10) || 0));
const demoMode = seedCount > 0;
if (params.get('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'night');

let trophies = [];
let earned = new Set();
let notes = {};
let spoilerOn = true;

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function loadStore() {
  if (demoMode) return;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.earned)) earned = new Set(saved.earned.filter((id) => typeof id === 'string'));
    if (saved.notes && typeof saved.notes === 'object') notes = saved.notes;
    if (typeof saved.spoilerOn === 'boolean') spoilerOn = saved.spoilerOn;
    if (saved.theme === 'night' || saved.theme === 'paper') applyTheme(saved.theme);
  } catch { /* corrupted save: start fresh rather than crash */ }
}

function saveStore() {
  if (demoMode) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      earned: [...earned], notes, spoilerOn,
      theme: document.documentElement.getAttribute('data-theme')
    }));
  } catch { /* storage full or blocked: progress still works in memory */ }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'night' ? 'Paper theme' : 'Night theme';
  btn.setAttribute('aria-pressed', String(theme === 'night'));
}

function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'night' ? 'paper' : 'night');
  saveStore();
}

function toggleEarned(id) {
  if (earned.has(id)) earned.delete(id); else earned.add(id);
  saveStore();
  render();
}

function byId(id) { return trophies.find((t) => t.id === id); }

function isHidden(t) { return spoilerOn && t.secret && !earned.has(t.id); }

function pointsEarned() {
  return trophies.reduce((sum, t) => sum + (earned.has(t.id) ? t.points : 0), 0);
}

function updateKpis() {
  document.getElementById('kpiEarned').textContent = `${earned.size} / ${trophies.length}`;
  document.getElementById('kpiPoints').textContent = `${pointsEarned()} / 1,350`;
  const pct = trophies.length ? Math.round((earned.size / trophies.length) * 100) : 0;
  document.getElementById('kpiPct').textContent = `${pct}%`;
  const bar = document.getElementById('kpiBar');
  bar.style.width = `${pct}%`;
  document.getElementById('kpiBarWrap').setAttribute('aria-valuenow', String(pct));
  const missableLeft = trophies.filter((t) => t.missable && !earned.has(t.id)).length;
  document.getElementById('kpiMissable').textContent = missableLeft ? `${missableLeft} left` : 'Done';
}

function gradeBadge(t) {
  return `<span class="medal medal-${esc(t.grade)}" title="${esc(t.grade)} trophy, ${t.points} PSN points" aria-label="${esc(t.grade)}">${GRADE_LETTER[t.grade] || '?'}</span>`;
}

function chips(t) {
  const seen = new Set();
  const parts = [];
  const add = (text, cls) => {
    if (!text || seen.has(text)) return;
    seen.add(text);
    parts.push(`<span class="chip${cls ? ` ${cls}` : ''}">${esc(text)}</span>`);
  };
  add(KIND_LABELS[t.kind] || t.kind, '');
  add(t.chapter, '');
  add(t.target, 'chip-target');
  if (t.secret) add('Hidden', 'chip-hidden');
  if (t.missable) add('Missable', 'chip-missable');
  return parts.join('');
}

function cardHtml(t) {
  const done = earned.has(t.id);
  const hidden = isHidden(t);
  const name = hidden ? 'Hidden story trophy' : t.name;
  const desc = hidden ? 'Hidden story trophy — earn it to reveal.' : t.description;
  return `<article class="card${done ? ' is-earned' : ''}">
    <div class="card-top">${gradeBadge(t)}
      <div class="card-head"><h3>${esc(name)}</h3><p class="card-desc">${esc(desc)}</p></div>
      <button type="button" class="earn-btn${done ? ' on' : ''}" data-earn="${esc(t.id)}" aria-pressed="${done}">${done ? '✓ Earned' : 'Mark earned'}</button>
    </div>
    <div class="card-chips">${chips(t)}</div>
    ${hidden ? '' : `<p class="card-quote">“${esc(t.quote)}”</p>`}
    <div class="card-foot"><a class="btn btn-small" href="#/trophy/${esc(t.id)}">Guide &amp; sources →</a>
    <span class="card-points">${t.points} pts</span></div>
  </article>`;
}

function filterState() {
  const q = liveQuery.trim().toLowerCase();
  const kind = params.get('kind') || document.getElementById('kindFilter')?.value || 'all';
  const grade = document.getElementById('gradeFilter')?.value || 'all';
  const unearnedOnly = document.getElementById('unearnedOnly')?.checked || false;
  const missableOnly = document.getElementById('missableOnly')?.checked || params.get('missable') === '1';
  return { q, kind, grade, unearnedOnly, missableOnly };
}

function applyFilters(list) {
  const f = filterState();
  return list.filter((t) => {
    if (f.kind !== 'all' && t.kind !== f.kind) return false;
    if (f.grade !== 'all' && t.grade !== f.grade) return false;
    if (f.unearnedOnly && earned.has(t.id)) return false;
    if (f.missableOnly && !t.missable) return false;
    if (f.q) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.target} ${t.chapter} ${t.kind}`.toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });
}

function checklistView() {
  const f = filterState();
  const shown = applyFilters(trophies);
  const kindOptions = ['all', ...Object.keys(KIND_LABELS)]
    .map((k) => `<option value="${k}"${f.kind === k ? ' selected' : ''}>${k === 'all' ? 'All kinds' : esc(KIND_LABELS[k])}</option>`).join('');
  const gradeOptions = ['all', 'platinum', 'gold', 'silver', 'bronze']
    .map((g) => `<option value="${g}"${f.grade === g ? ' selected' : ''}>${g === 'all' ? 'All grades' : g[0].toUpperCase() + g.slice(1)}</option>`).join('');
  return `<section class="filters" aria-label="Filter trophies">
    <input type="search" id="q" placeholder="Search trophies, guides, places…" value="${esc(liveQuery)}" aria-label="Search trophies">
    <select id="kindFilter" aria-label="Filter by kind">${kindOptions}</select>
    <select id="gradeFilter" aria-label="Filter by grade">${gradeOptions}</select>
    <label class="check"><input type="checkbox" id="unearnedOnly"> Not earned yet</label>
    <label class="check"><input type="checkbox" id="missableOnly"${f.missableOnly ? ' checked' : ''}> Missable only</label>
  </section>
  <p class="result-count">${shown.length} of ${trophies.length} trophies${f.q ? ` matching “${esc(liveQuery)}”` : ''}${demoMode ? ' · demo progress shown' : ''}</p>
  <div class="grid">${shown.map(cardHtml).join('') || '<p class="empty">No trophies match these filters. Clear the search or try another kind.</p>'}</div>`;
}

function trophyView(id) {
  const t = byId(id);
  if (!t) return `<p class="empty">That trophy is not in the list. <a href="#/checklist">Back to the checklist</a>.</p>`;
  const done = earned.has(t.id);
  const hidden = isHidden(t);
  const idx = trophies.findIndex((x) => x.id === id);
  const prev = trophies[idx - 1];
  const next = trophies[idx + 1];
  return `<article class="detail">
    <p><a href="#/checklist">← Back to checklist</a></p>
    <div class="detail-top">${gradeBadge(t)}
      <div><h2>${esc(hidden ? 'Hidden story trophy' : t.name)}</h2>
      <p class="detail-desc">${esc(hidden ? 'Hidden story trophy — earn it to reveal.' : t.description)}</p>
      <div class="card-chips">${chips(t)}<span class="chip">${t.points} PSN points</span></div></div>
      <button type="button" class="earn-btn big${done ? ' on' : ''}" data-earn="${esc(t.id)}" aria-pressed="${done}">${done ? '✓ Earned' : 'Mark earned'}</button>
    </div>
    ${t.missable ? `<div class="warn"><strong>⚠ Missable — read this first.</strong> This is the only trophy in the game that can be missed. Do the Chapter 1 meditation before the story moves on; everything else can be finished after the credits.</div>` : ''}
    ${hidden ? '<p class="detail-guide">Turn spoilers off (top of the page) or mark this trophy earned to read its guide.</p>' : `
    <h3>How to unlock it</h3>
    <p class="detail-guide">${esc(t.guide)}</p>
    <blockquote class="cite">“${esc(t.quote)}”</blockquote>
    <h3>Sources</h3>
    <ul class="sources">${t.sources.map((s) => `<li><strong>${esc(s.label)}</strong><br><span class="src-url">${esc(s.url)}</span></li>`).join('')}</ul>`}
    <h3>Your notes</h3>
    <textarea id="noteBox" rows="3" placeholder="Your own notes for this trophy — saved on this device only." aria-label="Your notes for this trophy">${esc(notes[t.id] || '')}</textarea>
    <p class="detail-nav">${prev ? `<a href="#/trophy/${esc(prev.id)}">← ${esc(isHidden(prev) ? 'Previous trophy' : prev.name)}</a>` : ''} ${next ? `<a href="#/trophy/${esc(next.id)}">${esc(isHidden(next) ? 'Next trophy' : next.name)} →</a>` : ''}</p>
  </article>`;
}

const HUNDRED_ROWS = [
  ['Optional missions', '100 of 200+ available', 'Do them as they appear'],
  ['Vehicle scans (WAiNK)', '200 of 277 base models', 'Scan every new vehicle'],
  ['Animal studies (binoculars)', '100 of 255 animals', 'Study, do not hunt'],
  ['Challenges', '70 of 80', 'Skip the 10 hardest'],
  ['Stunts', '300 of 397', 'Under-bridge flights are fastest'],
  ['Meditations', '15 of 18 spots', 'Do the Chapter 1 one — see Missables'],
  ['WAiNK scans', '100 locations', 'Landmarks, curiosities, sculptures'],
  ['Robberies', 'All: vaults, trucks, gang ops', '8 vaults, 39 gang operations'],
  ['Underwater discoveries', 'All', 'Dive every marked site'],
  ['Shooting Ranges', 'All gold medals', '42 golds, 12 ranges'],
  ['Drone races', 'All 42 races', 'Win at all 14 locations'],
  ["Bret's Target Decks", '15 decks', 'Hunt the marked animals']
];

function roadmapView() {
  return `<section class="page">
    <h2>Roadmap to platinum — about 200 hours</h2>
    <p class="lede">One playthrough is enough. There is no mission replay, no difficulty setting and no New Game+. Cheats disable trophies and saving, so leave them alone until the platinum pops.</p>
    <ol class="road-steps">
      <li><h3>Step 1 — Finish the story <span>60–80 hours</span></h3>
        <p>Play the five chapters and take optional missions and character quests as they appear; many are only offered for a while. Scan vehicles with WAiNK and study animals with binoculars as you go — progress already counts. Keep a manual save at the start and end of each chapter (15 manual slots plus 1 autosave).</p>
        <p><strong>Do not skip:</strong> the Chapter 1 meditation for Positive Mental Attitude — the only possibly missable trophy. See <a href="#/missables">Missables</a>.</p></li>
      <li><h3>Step 2 — 100% Completion checklist <span>about 100 hours</span></h3>
        <p>After the credits, open Progress, then Stats, then 100% Completion. The bar is forgiving — closer to 60% true completion — but a few rows must be finished in full.</p>
        <table class="hundred"><thead><tr><th>Row</th><th>Needed</th><th>Note</th></tr></thead><tbody>
        ${HUNDRED_ROWS.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}
        </tbody></table></li>
      <li><h3>Step 3 — Strangers &amp; Freaks and cleanup <span>about 10 hours</span></h3>
        <p>Stranger strands are not part of 100%, so finish the 8 that count toward Strangers &amp; Freaks, close out the character quest lines (Andy, Kenton, Billy, Randy, Tyrone, Bret), then sweep the misc trophies with the planner.</p></li>
    </ol>
    <p class="cite-line">Roadmap paraphrased from the PowerPyx trophy guide and GTABase roadmap; times are their estimates, not ours.</p>
  </section>`;
}

function missablesView() {
  const pma = byId('positive-mental-attitude');
  return `<section class="page">
    <h2>Missables — only one trophy can be missed</h2>
    <div class="warn big"><strong>Positive Mental Attitude</strong> is the only trophy PowerPyx flags as possibly missable. Everything else can be done after the story in free-roam.</div>
    ${pma ? `<article class="detail">
      <div class="detail-top">${gradeBadge(pma)}<div><h2>${esc(pma.name)}</h2>
      <p class="detail-desc">${esc(pma.description)}</p><div class="card-chips">${chips(pma)}</div></div></div>
      <p class="detail-guide">${esc(pma.guide)}</p>
      <blockquote class="cite">“${esc(pma.quote)}”</blockquote>
      <ul class="sources">${pma.sources.map((s) => `<li><strong>${esc(s.label)}</strong><br><span class="src-url">${esc(s.url)}</span></li>`).join('')}</ul>
    </article>` : ''}
    <h3>Save like it matters — there is no mission replay</h3>
    <p class="lede">Keep a manual save at the start and end of each chapter (10 saves), then rotate the remaining 5 slots during free-roam cleanup. That way a missed meditation, or any story choice you regret, costs you a chapter at most — never the whole run.</p>
    <h3>What is NOT missable</h3>
    <p class="lede">No other trophy is missable as far as the published guides know: optional missions that disappear do not block any trophy (there are far more than the 100 the checklist wants), quest givers who vanish for a while all come back, and every collectible needed for a trophy also spawns elsewhere. Cheat use is the real run-killer — it disables trophies and saving.</p>
  </section>`;
}

function nextUp() {
  const rank = (t) => (t.missable ? 0 : KIND_RANK[t.kind] ?? 9);
  return trophies
    .filter((t) => !earned.has(t.id))
    .sort((a, b) => rank(a) - rank(b) || trophies.indexOf(a) - trophies.indexOf(b));
}

function plannerView() {
  const queue = nextUp();
  const top = queue.slice(0, 3);
  return `<section class="page">
    <h2>Next-up planner</h2>
    <p class="lede">Suggested order: the missable trophy first, then the story in chapter order, then character quests, activities, collectibles and robberies, with the 100% grind last. Tick trophies off as you earn them and the plan updates itself.</p>
    ${queue.some((t) => t.missable) ? '<div class="warn"><strong>Do this first:</strong> Positive Mental Attitude — the Chapter 1 meditation. It is the only one you can miss.</div>' : '<div class="warn ok"><strong>Missable trophy done.</strong> Nothing left on this list can be missed.</div>'}
    <h3>Your next 3 trophies</h3>
    <ol class="next-list">${top.map((t, i) => `<li><span class="next-num">${i + 1}</span>
      <div><strong>${esc(isHidden(t) ? 'Hidden story trophy' : t.name)}</strong> <span class="chip">${esc(KIND_LABELS[t.kind] || t.kind)}</span>
      <p>${esc(t.target || '')} — ${esc(ETA_BY_KIND[t.kind] || '')}</p></div>
      <a class="btn btn-small" href="#/trophy/${esc(t.id)}">Guide →</a></li>`).join('') || '<li>Everything is earned — platinum is yours.</li>'}</ol>
    <h3>Full queue (${queue.length} left)</h3>
    <ul class="queue">${queue.map((t) => `<li><a href="#/trophy/${esc(t.id)}">${esc(isHidden(t) ? 'Hidden story trophy' : t.name)}</a> <span class="muted">${esc(KIND_LABELS[t.kind] || t.kind)} · ${esc(ETA_BY_KIND[t.kind] || '')}</span></li>`).join('')}</ul>
  </section>`;
}

function settingsView() {
  return `<section class="page">
    <h2>Settings &amp; data</h2>
    <h3>Appearance</h3>
    <p><button type="button" class="btn" id="themeBtn2">Switch theme (paper / night)</button></p>
    <h3>Spoilers</h3>
    <p class="lede">Spoilers hidden (the default) masks the name and description of hidden story trophies until you earn them. Turn it off to read every guide up front.</p>
    <h3>Your progress</h3>
    <p class="lede">${earned.size} of ${trophies.length} trophies earned · ${pointsEarned()} of 1,350 PSN points. Saved only in this browser.</p>
    <p><button type="button" class="btn" id="exportBtn">Export progress (JSON)</button>
    <label class="btn btn-ghost file-label">Import progress<input type="file" id="importFile" accept="application/json,.json" hidden></label>
    <button type="button" class="btn btn-danger" id="resetBtn">Reset all progress</button></p>
    <p id="importMsg" role="status"></p>
    <h3>About this guide</h3>
    <p class="lede">Fan-made, offline-first. Trophy names, descriptions and grades follow the official PlayStation list (via Exophase); hidden flags and grades were cross-checked on GTABase; every guide is written in our own words from the PowerPyx trophy guide and GTABase, with the source named on each card. Two steps are labelled “reported, not fully confirmed” because the sources disagree. No Rockstar artwork is used.</p>
  </section>`;
}

function currentRoute() {
  const hash = location.hash || '';
  if (hash.startsWith('#/')) {
    const [, route, arg] = hash.split('/');
    return { route: route || 'checklist', arg: arg || '' };
  }
  // Screenshot/deep-link form: ?view=roadmap&tro=<id> works without a hash.
  return { route: params.get('view') || 'checklist', arg: params.get('tro') || '' };
}

function render() {
  updateKpis();
  const view = document.getElementById('view');
  const { route, arg } = currentRoute();
  document.querySelectorAll('.tabs a').forEach((a) => {
    a.classList.toggle('active', a.dataset.view === route);
  });
  document.getElementById('roadmapStrip').style.display = route === 'checklist' ? '' : 'none';
  document.querySelector('.kpis').style.display = route === 'checklist' ? '' : 'none';
  if (route === 'roadmap') view.innerHTML = roadmapView();
  else if (route === 'missables') view.innerHTML = missablesView();
  else if (route === 'planner') view.innerHTML = plannerView();
  else if (route === 'settings') view.innerHTML = settingsView();
  else if (route === 'trophy' && arg) view.innerHTML = trophyView(decodeURIComponent(arg));
  else view.innerHTML = checklistView();
  bindView(route);
}

function bindView(route) {
  document.querySelectorAll('[data-earn]').forEach((b) => {
    b.addEventListener('click', () => toggleEarned(b.dataset.earn));
  });
  const q = document.getElementById('q');
  if (q) q.addEventListener('input', () => { liveQuery = q.value; renderListOnly(); });
  const kind = document.getElementById('kindFilter');
  if (kind) kind.addEventListener('change', renderListOnly);
  const grade = document.getElementById('gradeFilter');
  if (grade) grade.addEventListener('change', renderListOnly);
  const un = document.getElementById('unearnedOnly');
  if (un) un.addEventListener('change', renderListOnly);
  const mo = document.getElementById('missableOnly');
  if (mo) mo.addEventListener('change', renderListOnly);
  const noteBox = document.getElementById('noteBox');
  if (noteBox) {
    noteBox.addEventListener('input', () => {
      const id = currentRoute().arg || '';
      notes[decodeURIComponent(id)] = noteBox.value;
      saveStore();
    });
  }
  const themeBtn2 = document.getElementById('themeBtn2');
  if (themeBtn2) themeBtn2.addEventListener('click', toggleTheme);
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportProgress);
  const importFile = document.getElementById('importFile');
  if (importFile) importFile.addEventListener('change', importProgress);
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    if (window.confirm('Reset all earned trophies and notes?')) {
      earned = new Set(); notes = {}; saveStore(); render();
    }
  });
}

function renderListOnly() {
  // Re-render only the checklist grid + count, keeping the search box focused.
  const view = document.getElementById('view');
  const active = document.activeElement;
  const start = active && active.selectionStart;
  const end = active && active.selectionEnd;
  const wasSearch = active && active.id === 'q';
  view.innerHTML = checklistView();
  bindView('checklist');
  if (wasSearch) {
    const box = document.getElementById('q');
    box.focus();
    try { box.setSelectionRange(start, end); } catch { /* ignore */ }
  }
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ earned: [...earned], notes }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-platinum-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importProgress(event) {
  const file = event.target.files && event.target.files[0];
  const msg = document.getElementById('importMsg');
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.earned)) throw new Error('bad file');
    earned = new Set(data.earned.filter((id) => byId(id)));
    if (data.notes && typeof data.notes === 'object') notes = data.notes;
    saveStore(); render();
    if (msg) msg.textContent = `Imported ${earned.size} earned trophies.`;
  } catch {
    if (msg) msg.textContent = 'That file could not be imported — it is not a progress export from this guide.';
  }
}

async function boot() {
  loadStore();
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`could not load ${DATA_URL}`);
    const doc = await res.json();
    trophies = doc.trophies || [];
  } catch (err) {
    document.getElementById('view').innerHTML =
      '<p class="empty">The trophy list could not be loaded. Serve this folder over a local web server (for example: <code>node serve.ts</code>) and reload.</p>';
    return;
  }
  if (demoMode) {
    earned = new Set(trophies.filter((t) => t.kind === 'story').slice(0, seedCount).map((t) => t.id));
  }
  const spoiler = document.getElementById('spoilerToggle');
  spoiler.checked = spoilerOn;
  spoiler.addEventListener('change', () => { spoilerOn = spoiler.checked; saveStore(); render(); });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  if (params.get('theme') !== 'dark' && document.documentElement.getAttribute('data-theme') !== 'night') {
    // Theme already applied from storage in loadStore(); nothing to do.
  }
  applyTheme(document.documentElement.getAttribute('data-theme') || 'paper');
  window.addEventListener('hashchange', render);
  render();
}

boot();
