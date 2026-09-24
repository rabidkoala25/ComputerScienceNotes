/* Notes viewer: reads index.json (made by scripts/build.mjs) and renders Markdown notes in the browser. */
(() => {
  'use strict';

  const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
  const TAG_LIMIT = 18;
  const HEATMAP_WEEKS = 26;
  const CALLOUTS = {
    note: 'Note', info: 'Info', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution',
    question: 'Question', definition: 'Definition', example: 'Example', summary: 'Summary', todo: 'To do',
  };

  const LANG_NAMES = {
    python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', cpp: 'C++', c: 'C', csharp: 'C#', java: 'Java',
    r: 'R', julia: 'Julia', matlab: 'MATLAB', bash: 'Shell', sql: 'SQL', rust: 'Rust', go: 'Go', kotlin: 'Kotlin',
  };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lc = (s) => String(s).toLowerCase();
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const state = {
    site: {}, notes: [], bySlug: new Map(),
    labels: { topics: new Map(), tags: new Map(), langs: new Map() },
    q: '', topics: new Set(), tags: new Set(), langs: new Set(), day: null, view: 'home',
    sort: store.get('notes-sort', 'newest'),
    showAllTags: false, current: null, cache: new Map(),
  };

  const main = $('#main');
  const listEl = $('#note-list');
  const searchEl = $('#search');
  const pageBase = location.href.split('#')[0];
  const siteBase = new URL('.', pageBase);

  // ---------- dates ----------
  const toDate = (iso) => new Date(iso + 'T00:00:00');
  const thisYear = new Date().getFullYear();
  const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function fmt(iso, style = 'long') {
    if (!iso) return '';
    const d = toDate(iso);
    if (style === 'short') {
      return d.toLocaleDateString(undefined, d.getFullYear() === thisYear
        ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (style === 'month') return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ---------- startup ----------
  async function init() {
    bindUI();
    updateThemeButton();
    let data;
    try {
      const res = await fetch('index.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`index.json returned HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      main.innerHTML = `<section class="empty"><h1>The note index didn’t load</h1>
        <p>This page reads <code>index.json</code>, which the build script creates. To preview locally, run
        <code>node scripts/build.mjs</code> and serve the <code>_site</code> folder, for example with
        <code>python -m http.server -d _site</code>.</p><p class="muted">${esc(err.message)}</p></section>`;
      return;
    }
    state.site = data.site || {};
    state.notes = (data.notes || []).map((n) => ({
      ...n,
      _title: lc(n.title),
      _text: lc(n.text || ''),
      _tags: n.tags.map(lc),
      _topics: n.topics.map(lc),
      files: n.files || [],
      langs: n.langs || [],
      _langs: (n.langs || []).map(lc),
    }));
    for (const n of state.notes) {
      state.bySlug.set(n.slug, n);
      n.topics.forEach((t) => state.labels.topics.has(lc(t)) || state.labels.topics.set(lc(t), t));
      n.tags.forEach((t) => state.labels.tags.has(lc(t)) || state.labels.tags.set(lc(t), t));
      n.langs.forEach((t) => state.labels.langs.has(lc(t)) || state.labels.langs.set(lc(t), LANG_NAMES[lc(t)] || t));
    }
    $$('[data-site-title]').forEach((el) => { el.textContent = state.site.title || 'Notes'; });
    $('#sort').value = state.sort;
    renderFilters();
    renderList();
    route();
    window.addEventListener('hashchange', route);
  }

  function bindUI() {
    searchEl.addEventListener('input', debounce(() => { state.q = searchEl.value; refresh(); }, 120));
    $('#sort').addEventListener('change', (e) => {
      state.sort = e.target.value;
      store.set('notes-sort', state.sort);
      renderList();
      if (state.view === 'home') showHome();
    });
    $('#theme-toggle').addEventListener('click', toggleTheme);
    $('#menu-toggle').addEventListener('click', () => setDrawer(!document.body.classList.contains('drawer-open')));
    $('#scrim').addEventListener('click', () => setDrawer(false));
    $('#lightbox').addEventListener('click', closeLightbox);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    matchMedia('(min-width: 1200px)').addEventListener('change', syncTocOpen);
  }

  function refresh() {
    renderFilters();
    renderList();
    if (state.view === 'home') showHome();
  }

  // ---------- filtering and search ----------
  function parseQuery(q) {
    const terms = [], tags = [], topics = [], langs = [];
    for (const tok of lc(q).match(/"[^"]+"|\S+/g) || []) {
      const t = tok.replace(/^"|"$/g, '');
      if (t.startsWith('tag:')) { if (t.length > 4) tags.push(t.slice(4)); }
      else if (t.startsWith('topic:')) { if (t.length > 6) topics.push(t.slice(6)); }
      else if (t.startsWith('lang:')) { if (t.length > 5) langs.push(t.slice(5)); }
      else if (t) terms.push(t);
    }
    return { terms, tags, topics, langs };
  }
  const searchTerms = () => parseQuery(state.q).terms.filter((t) => t.length > 1);
  const hasFilters = () => !!(state.q.trim() || state.topics.size || state.tags.size || state.langs.size || state.day);

  function filtered({ ignoreDay = false } = {}) {
    const { terms, tags, topics, langs } = parseQuery(state.q);
    const out = [];
    for (const n of state.notes) {
      if (state.topics.size && !n._topics.some((t) => state.topics.has(t))) continue;
      if ([...state.tags].some((t) => !n._tags.includes(t))) continue;
      if (state.langs.size && !n._langs.some((t) => state.langs.has(t))) continue;
      if (langs.some((t) => !n._langs.some((x) => x.includes(t) || lc(LANG_NAMES[x] || '').includes(t)))) continue;
      if (!ignoreDay && state.day && n.date !== state.day) continue;
      if (tags.some((t) => !n._tags.some((x) => x.includes(t)))) continue;
      if (topics.some((t) => !n._topics.some((x) => x.includes(t)))) continue;
      let score = 0, ok = true;
      for (const t of terms) {
        const inTitle = n._title.includes(t);
        const inTags = n._tags.some((x) => x.includes(t)) || n._topics.some((x) => x.includes(t));
        const inText = n._text.includes(t);
        if (!inTitle && !inTags && !inText) { ok = false; break; }
        score += (inTitle ? 10 : 0) + (inTags ? 4 : 0) + (inText ? 1 : 0);
      }
      if (ok) out.push({ n, score });
    }
    const by = {
      newest: (a, b) => b.n.date.localeCompare(a.n.date) || a.n.title.localeCompare(b.n.title),
      oldest: (a, b) => a.n.date.localeCompare(b.n.date) || a.n.title.localeCompare(b.n.title),
      updated: (a, b) => b.n.updated.localeCompare(a.n.updated) || b.n.date.localeCompare(a.n.date),
      title: (a, b) => a.n.title.localeCompare(b.n.title),
    }[state.sort] || (() => 0);
    out.sort(terms.length ? (a, b) => b.score - a.score || by(a, b) : by);
    return out.map((o) => o.n);
  }

  function snippet(n, terms) {
    if (!terms.length || !n.text) return '';
    let idx = -1, hit = '';
    for (const t of terms) { const i = n._text.indexOf(t); if (i >= 0 && (idx < 0 || i < idx)) { idx = i; hit = t; } }
    if (idx < 0) return '';
    const start = Math.max(0, idx - 50);
    const raw = (start > 0 ? '…' : '') + n.text.slice(start, idx + hit.length + 70) + '…';
    const re = new RegExp(`(${terms.map(escRe).join('|')})`, 'gi');
    return raw.split(re).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
  }

  // ---------- sidebar ----------
  function facetCounts(field) {
    const m = new Map();
    for (const n of state.notes) for (const k of n['_' + field]) m.set(k, (m.get(k) || 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  function chip(field, key, count) {
    const label = state.labels[field].get(key) || key;
    return `<button type="button" class="chip" data-facet="${field}" data-key="${esc(key)}" aria-pressed="${state[field].has(key)}">${field === 'tags' ? '#' : ''}${esc(label)}${count != null ? `<span class="chip-n">${count}</span>` : ''}</button>`;
  }

  function renderFilters() {
    const topics = facetCounts('topics');
    const tags = facetCounts('tags');
    const langs = facetCounts('langs');
    const shownTags = state.showAllTags ? tags : tags.filter(([k], i) => i < TAG_LIMIT || state.tags.has(k));
    $('#filters').innerHTML = `
      ${state.day ? `<p class="active-day">Written on ${esc(fmt(state.day))}. <button type="button" class="linklike" data-day="${state.day}">Show all dates</button></p>` : ''}
      ${topics.length ? `<div class="facet"><h2 class="facet-title" title="Shows notes in any selected topic">Topics</h2>
        <div class="chips">${topics.map(([k, c]) => chip('topics', k, c)).join('')}</div></div>` : ''}
      ${tags.length ? `<div class="facet"><h2 class="facet-title" title="Shows notes that have every selected tag">Tags</h2>
        <div class="chips">${shownTags.map(([k, c]) => chip('tags', k, c)).join('')}</div>
        ${tags.length > TAG_LIMIT ? `<button type="button" class="linklike" data-action="more-tags">${state.showAllTags ? 'Show fewer tags' : `Show all ${tags.length} tags`}</button>` : ''}</div>` : ''}
      ${langs.length ? `<div class="facet"><h2 class="facet-title" title="Notes with code or files in any selected language">Code</h2>
        <div class="chips">${langs.map(([k, c]) => chip('langs', k, c)).join('')}</div></div>` : ''}
      ${hasFilters() ? '<button type="button" class="linklike clear" data-action="clear">Clear search and filters</button>' : ''}`;
  }

  function renderList() {
    const items = filtered();
    const terms = searchTerms();
    $('#count').textContent = hasFilters() ? `${items.length} of ${state.notes.length} notes` : `${state.notes.length} notes`;
    listEl.innerHTML = items.length ? items.map((n) => `
      <a class="item" href="#/note/${encodeURI(n.slug)}" data-slug="${esc(n.slug)}"${state.current === n ? ' aria-current="page"' : ''}>
        <span class="item-title">${esc(n.title)}</span>
        <span class="item-meta"><time datetime="${n.date}">${esc(fmt(n.date, 'short'))}</time>${n.topics[0] ? `<span>${esc(n.topics[0])}</span>` : ''}${n.files.length ? `<span class="item-files">${n.files.length} ${n.files.length === 1 ? 'file' : 'files'}</span>` : ''}</span>
        ${terms.length ? `<span class="item-snip">${snippet(n, terms)}</span>` : ''}
      </a>`).join('')
      : `<p class="list-empty">${state.notes.length ? 'No notes match.' : 'No notes yet.'}</p>`;
  }

  function markCurrent() {
    $$('.item', listEl).forEach((a) => {
      if (state.current && a.dataset.slug === state.current.slug) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function setDrawer(open) {
    document.body.classList.toggle('drawer-open', open);
    $('#scrim').hidden = !open;
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
    if (open) searchEl.focus();
  }

  // ---------- routing ----------
  function route() {
    const raw = location.hash.slice(1);
    const toEditor = raw === '/new' || raw.startsWith('/edit/');
    if (state.view === 'editor' && window.NotesEditor) window.NotesEditor.close();
    if (toEditor) {
      state.current = null;
      state.view = 'editor';
      markCurrent();
      let slug = null;
      if (raw.startsWith('/edit/')) { try { slug = decodeURIComponent(raw.slice(6)); } catch { slug = raw.slice(6); } }
      openEditor(slug);
    } else if (raw.startsWith('/note/')) {
      state.view = 'note';
      const rest = raw.slice(6);
      const qi = rest.indexOf('?');
      let slug = qi < 0 ? rest : rest.slice(0, qi);
      try { slug = decodeURIComponent(slug); } catch { /* keep raw */ }
      const heading = qi < 0 ? null : new URLSearchParams(rest.slice(qi + 1)).get('h');
      if (state.current && state.current.slug === slug && $('.note', main)) scrollToHeading(heading);
      else showNote(slug, heading);
    } else {
      state.current = null;
      state.view = 'home';
      markCurrent();
      showHome();
      window.scrollTo(0, 0);
    }
    setDrawer(false);
  }

  async function openEditor(slug) {
    document.title = `${slug ? 'Edit note' : 'New note'} | ${state.site.title || 'Notes'}`;
    main.innerHTML = '<section class="empty"><p class="muted">Opening the editor…</p></section>';
    try {
      if (!window.NotesEditor) await loadScript('editor.js');
      if (state.view !== 'editor') return;
      await window.NotesEditor.open(main, slug);
    } catch (err) {
      main.innerHTML = `<section class="empty"><h1>The editor didn’t load</h1><p>${esc(err.message)}. Check your connection and reload the page.</p></section>`;
    }
  }

  // ---------- home ----------
  function showHome() {
    document.title = state.site.title || 'Notes';
    const total = state.notes.length;
    if (!total) {
      main.innerHTML = `<section class="empty"><h1>No notes yet</h1>
        <p>Add a Markdown file to the <code>${esc(state.site.notesDir || 'notes')}</code> folder, commit and push. The site rebuilds itself and the note appears here.</p></section>`;
      return;
    }
    const items = filtered();
    const latest = state.notes.reduce((m, n) => (n.date > m ? n.date : m), '');
    const topicCount = state.labels.topics.size;
    main.innerHTML = `
      <section class="home">
        <header class="home-head">
          <h1>${esc(state.site.title || 'Notes')}</h1>
          ${state.site.description ? `<p class="home-desc">${esc(state.site.description)}</p>` : ''}
          <p class="home-stats">${total} ${total === 1 ? 'note' : 'notes'}${topicCount ? ` in ${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}` : ''}, latest from ${esc(fmt(latest))}.</p>
          <button type="button" class="btn" data-action="random">Open a random note</button>
        </header>
        ${heatmap()}
        <section class="timeline" aria-labelledby="tl-h">
          <h2 id="tl-h">${hasFilters() ? `${items.length} matching ${items.length === 1 ? 'note' : 'notes'}` : 'All notes'}</h2>
          ${items.length ? timeline(items)
            : '<p>No notes match. <button type="button" class="linklike" data-action="clear">Clear search and filters</button></p>'}
        </section>
      </section>`;
  }

  function heatmap() {
    const counts = new Map();
    for (const n of filtered({ ignoreDay: true })) counts.set(n.date, (counts.get(n.date) || 0) + 1);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (HEATMAP_WEEKS - 1) * 7);
    let cells = '', inRange = 0;
    for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const iso = isoOf(d);
      const c = counts.get(iso) || 0;
      inRange += c;
      if (!c) { cells += '<span class="hm-cell" data-level="0"></span>'; continue; }
      const lvl = c === 1 ? 1 : c === 2 ? 2 : c <= 4 ? 3 : 4;
      const label = `${c} ${c === 1 ? 'note' : 'notes'} on ${fmt(iso)}`;
      cells += `<button type="button" class="hm-cell" data-level="${lvl}" data-day="${iso}" aria-pressed="${state.day === iso}" title="${esc(label)}" aria-label="${esc(label)}"></button>`;
    }
    return `<section class="activity" aria-labelledby="hm-h">
      <h2 id="hm-h">Writing activity</h2>
      <div class="hm-scroll"><div class="hm">${cells}</div></div>
      <p class="hm-caption">${inRange} ${inRange === 1 ? 'note' : 'notes'} in the last six months. Select a day to see what you wrote.</p>
    </section>`;
  }

  function timeline(items) {
    const terms = searchTerms();
    const key = state.sort === 'updated' ? 'updated' : 'date';
    const grouped = !terms.length && state.sort !== 'title';
    const row = (n) => `<li><a class="tl-item" href="#/note/${encodeURI(n.slug)}">
        ${grouped ? `<span class="tl-day" aria-hidden="true">${toDate(n[key]).getDate()}</span>` : ''}
        <span class="tl-body">
          <span class="tl-title">${esc(n.title)}</span>
          <span class="tl-desc">${terms.length ? snippet(n, terms) : esc(n.description || n.excerpt)}</span>
          <span class="tl-meta"><time datetime="${n[key]}">${esc(fmt(n[key]))}</time>${[...n.topics, ...n.tags.map((t) => '#' + t)].map((t) => `<span>${esc(t)}</span>`).join('')}${n.files.map((f) => `<code class="tl-file">${esc(f.name)}</code>`).join('')}</span>
        </span></a></li>`;
    if (!grouped) return `<ul class="tl-list">${items.map(row).join('')}</ul>`;
    const groups = [];
    for (const n of items) {
      const m = n[key].slice(0, 7);
      if (!groups.length || groups[groups.length - 1].m !== m) groups.push({ m, notes: [] });
      groups[groups.length - 1].notes.push(n);
    }
    return groups.map((g) => `<div class="tl-group"><h3>${esc(fmt(g.m + '-01', 'month'))}</h3>
      <ul class="tl-list">${g.notes.map(row).join('')}</ul></div>`).join('');
  }

  // ---------- note page ----------
  async function showNote(slug, heading) {
    const n = state.bySlug.get(slug);
    if (!n) {
      state.current = null;
      markCurrent();
      main.innerHTML = `<section class="empty"><h1>Note not found</h1><p>No note has the address <code>${esc(slug)}</code>. It may have been renamed or moved. <a href="#/">Go to all notes</a></p></section>`;
      return;
    }
    state.current = n;
    markCurrent();
    document.title = `${n.title} | ${state.site.title || 'Notes'}`;

    let src = state.cache.get(slug);
    if (src == null) {
      main.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(n.path.split('/').map(encodeURIComponent).join('/'), { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        src = await res.text();
        state.cache.set(slug, src);
      } catch (err) {
        main.removeAttribute('aria-busy');
        if (state.current !== n) return;
        main.innerHTML = `<section class="empty"><h1>${esc(n.title)} didn’t load</h1><p>The file <code>${esc(n.path)}</code> couldn’t be fetched (${esc(err.message)}). Reload the page to try again.</p></section>`;
        return;
      }
      main.removeAttribute('aria-busy');
    }
    if (state.current !== n) return; // another note was opened meanwhile

    main.innerHTML = noteHTML(n, renderMarkdown(src));
    const prose = $('.prose', main);
    enhance(prose, n);
    buildToc(prose, n);
    if (n.files.length) showFile(n, 0);
    addRunButtons(prose, noteFiles(n)).catch((e) => console.warn('Runner failed to load', e));
    const firstHit = markTerms(prose, searchTerms());
    if (heading) scrollToHeading(heading);
    else if (firstHit) firstHit.scrollIntoView({ block: 'center' });
    else window.scrollTo(0, 0);
    renderMermaid(prose).catch((e) => console.warn('Mermaid failed', e));
  }

  function noteHTML(n, body) {
    const { repo, branch } = state.site;
    const siblings = neighbours(n);
    const backlinks = (n.backlinks || []).map((s) => state.bySlug.get(s)).filter(Boolean);
    const edited = n.updated && n.updated !== n.date ? `<span>Edited ${esc(fmt(n.updated))}</span>` : '';
    return `
      <article class="note">
        <div class="note-margin"><time class="note-date" datetime="${n.date}">
          <span class="nd-day">${toDate(n.date).getDate()}</span>
          <span class="nd-month">${esc(toDate(n.date).toLocaleDateString(undefined, { month: 'short' }))}</span>
          <span class="nd-year">${toDate(n.date).getFullYear()}</span></time></div>
        <header class="note-head">
          <p class="note-date-inline"><time datetime="${n.date}">${esc(fmt(n.date))}</time></p>
          <h1>${esc(n.title)}</h1>
          ${n.description ? `<p class="note-desc">${esc(n.description)}</p>` : ''}
          <div class="note-meta">
            ${n.topics.map((t) => `<button type="button" class="chip chip-topic" data-facet="topics" data-key="${esc(lc(t))}" data-from-note>${esc(t)}</button>`).join('')}
            ${n.tags.map((t) => `<button type="button" class="chip" data-facet="tags" data-key="${esc(lc(t))}" data-from-note>#${esc(t)}</button>`).join('')}
            <span class="note-facts"><span>${n.minutes} min read</span>${edited}<a href="#/edit/${encodeURI(n.slug)}">Edit</a></span>
          </div>
        </header>
        <details class="toc" hidden><summary>Contents</summary><nav aria-label="Contents"></nav></details>
        <div class="note-body">
          <div class="prose">${body}</div>
          ${n.files.length ? filesHTML(n) : ''}
        </div>
        <footer class="note-foot">
          ${backlinks.length ? `<section class="backlinks"><h2>Linked from</h2><ul>${backlinks.map((b) => `<li><a href="#/note/${encodeURI(b.slug)}">${esc(b.title)}</a></li>`).join('')}</ul></section>` : ''}
          ${siblings.prev || siblings.next ? `<nav class="pager" aria-label="${siblings.topic ? `More in ${esc(siblings.topic)}` : 'More notes'}">
            ${siblings.prev ? `<a class="pager-prev" href="#/note/${encodeURI(siblings.prev.slug)}"><span>Earlier${siblings.topic ? ` in ${esc(siblings.topic)}` : ''}</span>${esc(siblings.prev.title)}</a>` : '<span></span>'}
            ${siblings.next ? `<a class="pager-next" href="#/note/${encodeURI(siblings.next.slug)}"><span>Later${siblings.topic ? ` in ${esc(siblings.topic)}` : ''}</span>${esc(siblings.next.title)}</a>` : ''}
          </nav>` : ''}
          ${repo ? `<p class="source-links">
            <a href="https://github.com/${esc(repo)}/edit/${esc(branch)}/${esc(n.path)}" target="_blank" rel="noopener">Edit on GitHub</a>
            <a href="https://github.com/${esc(repo)}/commits/${esc(branch)}/${esc(n.path)}" target="_blank" rel="noopener">Change history</a>
            <a href="${esc(n.path)}" target="_blank" rel="noopener">Raw Markdown</a></p>` : `<p class="source-links"><a href="${esc(n.path)}" target="_blank" rel="noopener">Raw Markdown</a></p>`}
        </footer>
      </article>`;
  }

  function filesHTML(n) {
    return `<section class="files" aria-labelledby="files-h">
      <h2 id="files-h">Files</h2>
      <div class="file-tabs" role="tablist" aria-label="Attached files">
        ${n.files.map((f, i) => `<button type="button" role="tab" class="file-tab" data-file="${i}" aria-selected="${i === 0}">${esc(f.name)}</button>`).join('')}
      </div>
      <div class="file-panel" role="tabpanel"></div>
    </section>`;
  }

  const fileUrl = (f) => f.path.split('/').map(encodeURIComponent).join('/');
  async function fetchText(f) {
    const key = 'file:' + f.path;
    if (!state.cache.has(key)) {
      const res = await fetch(fileUrl(f), { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${f.name}: HTTP ${res.status}`);
      state.cache.set(key, await res.text());
    }
    return state.cache.get(key);
  }
  // All text files of a note, for writing next to code that runs
  const noteFiles = (n) => () => Promise.all(n.files.filter((f) => f.text).map(async (f) => ({ name: f.name, content: await fetchText(f) })));

  async function showFile(n, i) {
    const f = n.files[i];
    const panel = $('.file-panel', main);
    if (!f || !panel) return;
    $$('.file-tab', main).forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.file === i)));
    const size = f.size > 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} bytes`;
    panel.innerHTML = `<div class="file-head"><span>${esc(f.lang ? (LANG_NAMES[f.lang] || f.lang) : 'File')}, ${size}</span>
      <a href="${esc(fileUrl(f))}" download="${esc(f.name.split('/').pop())}">Download</a></div>`;
    if (!f.text || f.size > 300000) {
      panel.insertAdjacentHTML('beforeend', `<p class="muted">${f.text ? 'Too large to show here.' : 'This file type can’t be shown here.'} Use Download to open it.</p>`);
      return;
    }
    let text;
    try { text = await fetchText(f); } catch (err) {
      panel.insertAdjacentHTML('beforeend', `<p class="muted">Couldn’t load this file (${esc(err.message)}).</p>`);
      return;
    }
    if (state.current !== n) return;
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = text;
    if (f.lang && window.hljs && hljs.getLanguage(f.lang)) { code.className = `language-${f.lang}`; hljs.highlightElement(code); }
    pre.append(code);
    const copy = document.createElement('button');
    copy.type = 'button'; copy.className = 'copy'; copy.textContent = 'Copy';
    pre.append(copy);
    panel.append(pre);
    if (canRunLang(f.lang)) {
      await ensureRunner();
      if (state.current !== n) return;
      NotesRunner.mount(panel, { lang: f.lang, getCode: () => text, getFiles: noteFiles(n), label: `Run ${f.name.split('/').pop()}` });
    }
  }

  const canRunLang = (lang) => /^(python|py|python3|javascript|js)$/i.test(lang || '');
  let runnerLoading = null;
  function ensureRunner() {
    if (window.NotesRunner) return Promise.resolve();
    runnerLoading = runnerLoading || loadScript('runner.js');
    return runnerLoading;
  }

  // Adds Run buttons under Python and JavaScript code blocks
  async function addRunButtons(prose, getFiles) {
    const blocks = $$('pre > code', prose).filter((c) => canRunLang((c.className.match(/language-([\w+#-]+)/) || [])[1]));
    if (!blocks.length) return;
    await ensureRunner();
    for (const code of blocks) {
      const lang = code.className.match(/language-([\w+#-]+)/)[1];
      const pre = code.parentElement;
      if (pre.nextElementSibling?.classList.contains('run-host')) continue;
      const host = document.createElement('div');
      host.className = 'run-host';
      pre.after(host);
      const src = code.textContent;
      NotesRunner.mount(host, { lang, getCode: () => src, getFiles });
    }
  }

  function neighbours(n) {
    const topic = n._topics[0];
    const pool = state.notes
      .filter((x) => (topic ? x._topics.includes(topic) : true))
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
    const i = pool.indexOf(n);
    return { topic: n.topics[0], prev: pool[i - 1], next: pool[i + 1] };
  }

  // ---------- Markdown rendering ----------
  function stripFrontMatter(src) {
    return src.replace(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '');
  }

  // Applies fn to every part of the text that is not a code block or inline code.
  function mapOutsideCode(src, fn) {
    const out = [];
    let buf = [], fence = null;
    const flush = () => {
      if (!buf.length) return;
      out.push(buf.join('\n').split(/(`+[^`]*?`+)/).map((p, i) => (i % 2 ? p : fn(p))).join(''));
      buf = [];
    };
    for (const line of src.split('\n')) {
      const m = line.match(/^\s{0,3}(`{3,}|~{3,})/);
      if (fence) {
        out.push(line);
        if (m && m[1][0] === fence[0] && m[1].length >= fence.length && !line.trim().replace(/^[`~]+/, '')) fence = null;
      } else if (m) {
        flush(); fence = m[1]; out.push(line);
      } else buf.push(line);
    }
    flush();
    return out.join('\n');
  }

  function resolveWiki(target) {
    const t = target.trim().replace(/#.*$/, '').replace(/\.md$/i, '');
    const key = lc(t);
    const slugish = key.replace(/[^\p{L}\p{N}/]+/gu, '-').replace(/^-+|-+$/g, '');
    const base = slugish.split('/').pop();
    return state.notes.find((n) => n._title === key)
      || state.bySlug.get(slugish)
      || state.notes.find((n) => n.slug.split('/').pop() === base)
      || null;
  }

  function renderMarkdown(src) {
    const math = [];
    const hold = (tex, display) => { math.push({ tex, display }); return `MATHPLACEHOLDER${math.length - 1}X`; };
    const text = mapOutsideCode(stripFrontMatter(src), (s) => s
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => hold(t, true))
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => hold(t, true))
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => hold(t, false))
      .replace(/(^|[^\\$\w])\$(?=\S)([^$\n]*?\S)\$(?![\w$])/g, (_, pre, t) => pre + hold(t, false))
      .replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, (_, target, label) => {
        const t = resolveWiki(target);
        const shown = (label || target).trim();
        return t ? `[${shown}](#/note/${encodeURI(t.slug)})`
          : `<span class="wiki-missing" title="No note called “${esc(target.trim())}” yet">${esc(shown)}</span>`;
      }));
    let html = window.marked ? marked.parse(text, { gfm: true }) : `<pre>${esc(text)}</pre>`;
    if (window.DOMPurify) html = DOMPurify.sanitize(html);
    return html.replace(/MATHPLACEHOLDER(\d+)X/g, (_, i) => {
      const { tex, display } = math[+i];
      if (!window.katex) return `<code>${esc(tex)}</code>`;
      return katex.renderToString(tex, { displayMode: display, throwOnError: false });
    });
  }

  function slugHeading(s) {
    return lc(s).trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
  }

  function enhance(prose, n, opts = {}) {
    const noteDir = new URL(n.path.split('/').slice(0, -1).map(encodeURIComponent).join('/') + '/', siteBase);
    const resolve = (raw) => {
      const local = opts.resolveAsset && opts.resolveAsset(raw);
      if (local) return new URL(local);
      return raw.startsWith('/') ? new URL(raw.slice(1), siteBase) : new URL(raw, noteDir);
    };
    const isExternal = (raw) => /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(raw);

    // Heading ids and anchors
    const used = new Set();
    for (const h of $$('h1, h2, h3, h4, h5, h6', prose)) {
      const base = slugHeading(h.textContent) || 'section';
      let id = base;
      for (let i = 1; used.has(id); i++) id = `${base}-${i}`;
      used.add(id);
      h.id = 'h-' + id;
      const a = document.createElement('a');
      a.className = 'anchor';
      a.href = `#/note/${encodeURI(n.slug)}?h=${encodeURIComponent(id)}`;
      a.setAttribute('aria-label', `Link to “${h.textContent}”`);
      a.textContent = '#';
      h.append(a);
    }

    // Images: resolve paths relative to the note's folder
    for (const img of $$('img', prose)) {
      const raw = img.getAttribute('src') || '';
      if (raw && !isExternal(raw)) img.src = resolve(raw).href;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.tabIndex = 0;
      img.classList.add('zoomable');
    }

    // Links: other notes, in-note headings, files, external sites
    const byUrl = new Map(state.notes.map((x) => [decodeURI(new URL(x.path.split('/').map(encodeURIComponent).join('/'), siteBase).pathname), x]));
    for (const a of $$('a[href]', prose)) {
      if (a.classList.contains('anchor')) continue;
      const raw = a.getAttribute('href');
      if (raw.startsWith('#/')) continue;
      if (raw.startsWith('#')) { a.href = `#/note/${encodeURI(n.slug)}?h=${encodeURIComponent(raw.slice(1))}`; continue; }
      if (isExternal(raw)) { a.target = '_blank'; a.rel = 'noopener'; continue; }
      const url = resolve(raw);
      const target = byUrl.get(decodeURI(url.pathname));
      if (target) {
        const h = url.hash ? `?h=${encodeURIComponent(decodeURIComponent(url.hash.slice(1)))}` : '';
        a.href = `#/note/${encodeURI(target.slug)}${h}`;
      } else a.href = url.href;
    }

    // Callouts: > [!NOTE] Title   and collapsible  > [!QUESTION]- Title
    for (const bq of $$('blockquote', prose)) {
      const p = bq.firstElementChild;
      if (!p || p.tagName !== 'P') continue;
      const m = p.innerHTML.match(/^\s*\[!([A-Za-z-]+)\]([-+]?)[ \t]*([^\n]*)\n?/);
      if (!m) continue;
      const type = lc(m[1]);
      const title = m[3].trim() || CALLOUTS[type] || m[1];
      p.innerHTML = p.innerHTML.slice(m[0].length);
      if (!p.innerHTML.trim()) p.remove();
      const box = document.createElement(m[2] ? 'details' : 'div');
      box.className = `callout callout-${CALLOUTS[type] ? type : 'note'}`;
      if (m[2] === '+') box.open = true;
      const head = document.createElement(m[2] ? 'summary' : 'p');
      head.className = 'callout-title';
      head.innerHTML = title;
      const body = document.createElement('div');
      body.className = 'callout-body';
      body.append(...bq.childNodes);
      box.append(head, body);
      bq.replaceWith(box);
    }

    // Tables scroll sideways on small screens
    for (const t of $$('table', prose)) {
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      t.replaceWith(wrap);
      wrap.append(t);
    }

    // Code: highlighting, language label, copy button (mermaid is handled separately)
    for (const code of $$('pre > code', prose)) {
      const lang = (code.className.match(/language-([\w+#-]+)/) || [])[1];
      if (lang === 'mermaid') continue;
      const pre = code.parentElement;
      if (lang && window.hljs && hljs.getLanguage(lang)) hljs.highlightElement(code);
      if (lang) pre.dataset.lang = lang;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy';
      btn.textContent = 'Copy';
      pre.append(btn);
    }
  }

  function buildToc(prose, n) {
    const toc = $('.toc', main);
    const heads = $$('h1, h2, h3', prose);
    if (heads.length < 2) return;
    const min = Math.min(...heads.map((h) => +h.tagName[1]));
    $('nav', toc).innerHTML = `<ul>${heads.map((h) => {
      const text = h.textContent.replace(/#$/, '').trim();
      return `<li class="toc-l${+h.tagName[1] - min}"><a href="#/note/${encodeURI(n.slug)}?h=${encodeURIComponent(h.id.slice(2))}" data-target="${h.id}">${esc(text)}</a></li>`;
    }).join('')}</ul>`;
    toc.hidden = false;
    syncTocOpen();
    if ('IntersectionObserver' in window) {
      const links = new Map($$('a', toc).map((a) => [a.dataset.target, a]));
      const obs = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          links.forEach((a) => a.removeAttribute('aria-current'));
          links.get(e.target.id)?.setAttribute('aria-current', 'true');
        }
      }, { rootMargin: '0px 0px -70% 0px' });
      heads.forEach((h) => obs.observe(h));
    }
  }

  function syncTocOpen() {
    const toc = $('.toc', main);
    if (toc) toc.open = matchMedia('(min-width: 1200px)').matches;
  }

  function scrollToHeading(id) {
    if (!id) return;
    const el = document.getElementById('h-' + id) || document.getElementById('h-' + slugHeading(id));
    if (el) el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function markTerms(root, terms) {
    if (!terms.length) return null;
    const re = new RegExp(terms.map(escRe).join('|'), 'gi');
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (t) => (t.parentElement.closest('pre, .katex, .anchor, button') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let first = null;
    for (const node of nodes) {
      const text = node.nodeValue;
      re.lastIndex = 0;
      if (!re.test(text)) continue;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = re.exec(text))) {
        frag.append(text.slice(last, m.index));
        const mk = document.createElement('mark');
        mk.className = 'hit';
        mk.textContent = m[0];
        frag.append(mk);
        first = first || mk;
        last = m.index + m[0].length;
      }
      frag.append(text.slice(last));
      node.replaceWith(frag);
    }
    return first;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Couldn't load ${src}`));
      document.head.append(s);
    });
  }

  async function renderMermaid(prose) {
    const blocks = $$('pre > code.language-mermaid', prose);
    if (!blocks.length) return;
    for (const code of blocks) {
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = code.textContent;
      code.parentElement.replaceWith(div);
    }
    if (!window.mermaid) await loadScript(MERMAID_SRC);
    const dark = document.documentElement.dataset.theme === 'dark';
    mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', fontFamily: 'Golos Text, system-ui, sans-serif' });
    await mermaid.run({ nodes: $$('.mermaid', prose) });
  }

  // ---------- interaction ----------
  function toggleFacet(field, key, forceOn = false) {
    if (forceOn) state[field].add(key);
    else if (state[field].has(key)) state[field].delete(key);
    else state[field].add(key);
  }

  function clearAll() {
    state.q = ''; searchEl.value = '';
    state.topics.clear(); state.tags.clear(); state.langs.clear(); state.day = null;
  }

  function onClick(e) {
    const t = e.target;

    const facet = t.closest('[data-facet]');
    if (facet) {
      const { facet: field, key } = facet.dataset;
      if (facet.hasAttribute('data-from-note')) {
        clearAll();
        toggleFacet(field, key, true);
        renderFilters(); renderList();
        location.hash = '#/';
        return;
      }
      toggleFacet(field, key);
      refresh();
      $(`#filters [data-facet="${field}"][data-key="${CSS.escape(key)}"]`)?.focus();
      return;
    }

    const day = t.closest('[data-day]');
    if (day) {
      state.day = state.day === day.dataset.day ? null : day.dataset.day;
      refresh();
      $(`.hm [data-day="${day.dataset.day}"]`)?.focus();
      return;
    }

    const action = t.closest('[data-action]')?.dataset.action;
    if (action === 'clear') { clearAll(); refresh(); return; }
    if (action === 'more-tags') { state.showAllTags = !state.showAllTags; renderFilters(); return; }
    if (action === 'random') {
      const pool = filtered();
      const pick = (pool.length ? pool : state.notes)[Math.floor(Math.random() * (pool.length || state.notes.length))];
      if (pick) location.hash = `#/note/${encodeURI(pick.slug)}`;
      return;
    }

    const tab = t.closest('.file-tab[data-file]');
    if (tab && state.current) { showFile(state.current, +tab.dataset.file); return; }

    if (t.matches('.prose img.zoomable')) { openLightbox(t); return; }

    if (t.matches('pre .copy')) {
      if (t.closest('.CodeMirror')) return;
      const code = t.parentElement.querySelector('code');
      navigator.clipboard?.writeText(code ? code.textContent : '').then(() => {
        t.textContent = 'Copied';
        setTimeout(() => { t.textContent = 'Copy'; }, 1500);
      }, () => { t.textContent = 'Copy failed'; });
    }
  }

  function onKey(e) {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (matchMedia('(max-width: 899px)').matches) setDrawer(true);
      searchEl.focus(); searchEl.select();
      return;
    }
    if (e.key === 'Escape') {
      if (!$('#lightbox').hidden) { closeLightbox(); return; }
      if (document.activeElement === searchEl) {
        if (searchEl.value) { searchEl.value = ''; state.q = ''; refresh(); } else searchEl.blur();
        return;
      }
      setDrawer(false);
    }
    if (e.key === 'Enter' && document.activeElement?.matches('.prose img.zoomable')) openLightbox(document.activeElement);
  }

  let lightboxReturn = null;
  function openLightbox(img) {
    const box = $('#lightbox');
    lightboxReturn = img;
    $('img', box).src = img.currentSrc || img.src;
    $('img', box).alt = img.alt;
    $('.lightbox-cap', box).textContent = img.alt || '';
    box.hidden = false;
    box.tabIndex = -1;
    box.focus();
  }
  function closeLightbox() {
    $('#lightbox').hidden = true;
    lightboxReturn?.focus();
  }

  function updateThemeButton() {
    const dark = document.documentElement.dataset.theme === 'dark';
    $('#theme-toggle').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('notes-theme', next);
    updateThemeButton();
    if (state.current && $('.mermaid', main)) {
      const y = window.scrollY;
      showNote(state.current.slug).then(() => window.scrollTo(0, y));
    }
  }

  // Shared with editor.js
  window.NotesApp = {
    state, $, $$, esc, lc, fmt, isoOf, loadScript, debounce, store,
    renderMarkdown, enhance, renderMermaid, addRunButtons, ensureRunner, fetchText, refreshSidebar: refresh,
    labels: LANG_NAMES,
  };

  init();
})();
