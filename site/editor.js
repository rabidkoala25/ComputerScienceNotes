/* Note editor: write Markdown with a formatting toolbar, paste images, attach and run code files,
   then save everything (note + images + code) as one package with shared date, topics and tags. */
(() => {
  'use strict';

  const A = window.NotesApp;
  const { $, $$, esc, lc } = A;
  const CM_BASE = 'https://cdn.jsdelivr.net/npm/codemirror@5.65.16/';
  const JSZIP = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
  const TEXT_EXT = /\.(py|js|mjs|ts|c|h|cpp|cc|hpp|java|cs|kt|swift|go|rs|rb|php|lua|pl|r|jl|m|sh|bash|sql|html|css|tex|csv|tsv|txt|json|ya?ml|md)$/i;
  const EXT_LANG = {
    py: 'python', js: 'javascript', mjs: 'javascript', ts: 'typescript', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp',
    java: 'java', cs: 'csharp', kt: 'kotlin', r: 'r', jl: 'julia', m: 'matlab', sh: 'bash', bash: 'bash', sql: 'sql',
  };
  const CM_MODE = {
    py: 'python', js: 'javascript', mjs: 'javascript', ts: 'text/typescript', json: 'application/json',
    c: 'text/x-csrc', h: 'text/x-csrc', cpp: 'text/x-c++src', cc: 'text/x-c++src', hpp: 'text/x-c++src',
    java: 'text/x-java', cs: 'text/x-csharp', kt: 'text/x-kotlin', r: 'r', jl: 'julia', m: 'octave',
    sh: 'shell', bash: 'shell', sql: 'text/x-sql', yaml: 'yaml', yml: 'yaml', md: 'markdown',
  };
  const STARTERS = {
    py: '# Python runs right here in the browser (numpy, pandas and matplotlib load automatically).\n\n',
    js: '// JavaScript runs in the browser. console.log() output appears below.\n\n',
  };

  const extOf = (name) => ((name.match(/\.([^./]+)$/) || [])[1] || '').toLowerCase();
  const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const folderSlug = (s) => String(s || '').split('/').map(slug).filter(Boolean).join('/');
  const today = () => A.isoOf(new Date());
  const cleanName = (s) => String(s || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/[^\p{L}\p{N}._/-]+/gu, '-');

  // ---------- IndexedDB (drafts and the chosen repo folder) ----------
  const idb = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        const r = indexedDB.open('notes-editor', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('drafts'); r.result.createObjectStore('handles'); };
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      });
    },
    async op(store, mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => res(req && req.result);
        tx.onerror = () => rej(tx.error);
      });
    },
    get(store, key) { return this.op(store, 'readonly', (s) => s.get(key)); },
    set(store, key, val) { return this.op(store, 'readwrite', (s) => s.put(val, key)); },
    del(store, key) { return this.op(store, 'readwrite', (s) => s.delete(key)); },
  };

  // ---------- library loading ----------
  let libs = null;
  function loadCss(href) {
    if ($(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.append(l);
  }
  function loadLibs() {
    libs = libs || (async () => {
      loadCss(CM_BASE + 'lib/codemirror.css');
      loadCss(CM_BASE + 'addon/hint/show-hint.css');
      await A.loadScript(CM_BASE + 'lib/codemirror.js');
      await Promise.all([
        'mode/markdown/markdown.js', 'mode/python/python.js', 'mode/javascript/javascript.js', 'mode/clike/clike.js',
        'mode/r/r.js', 'mode/julia/julia.js', 'mode/shell/shell.js', 'mode/sql/sql.js', 'mode/octave/octave.js',
        'mode/yaml/yaml.js', 'addon/edit/continuelist.js', 'addon/edit/closebrackets.js', 'addon/edit/matchbrackets.js',
        'addon/hint/show-hint.js', 'addon/display/placeholder.js',
      ].map((p) => A.loadScript(CM_BASE + p)));
    })();
    libs.catch(() => { libs = null; });
    return libs;
  }

  // ---------- front matter ----------
  function parseFrontMatter(src) {
    const m = src.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
    if (!m) return { data: {}, body: src.replace(/^\uFEFF/, '') };
    const data = {};
    let key = null;
    const scalar = (v) => { v = String(v).trim(); return /^(["']).*\1$/.test(v) ? v.slice(1, -1) : v; };
    for (const line of m[1].split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const item = line.match(/^\s*-\s+(.*)$/);
      if (item && key) { if (!Array.isArray(data[key])) data[key] = []; data[key].push(scalar(item[1])); continue; }
      const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (!kv) continue;
      key = kv[1];
      const v = kv[2].trim();
      data[key] = v === '' ? [] : v.startsWith('[') && v.endsWith(']') ? v.slice(1, -1).split(',').map(scalar).filter(Boolean) : scalar(v);
    }
    return { data, body: src.slice(m[0].length) };
  }
  const yamlStr = (s) => (/^[\p{L}\p{N}][^:#\[\]{},"']*$/u.test(s) && s.trim() === s ? s : JSON.stringify(s));
  const yamlList = (a) => `[${a.map((x) => yamlStr(String(x).replace(/,/g, ' '))).join(', ')}]`;
  function frontMatter(meta) {
    const lines = ['---', `title: ${yamlStr(meta.title || 'Untitled')}`, `date: ${meta.date || today()}`];
    if (meta.topics.length) lines.push(`topics: ${yamlList(meta.topics)}`);
    if (meta.tags.length) lines.push(`tags: ${yamlList(meta.tags)}`);
    if (meta.description) lines.push(`description: ${yamlStr(meta.description)}`);
    for (const [k, v] of Object.entries(meta.extra || {})) lines.push(`${k}: ${Array.isArray(v) ? yamlList(v) : yamlStr(String(v))}`);
    lines.push('---', '');
    return lines.join('\n');
  }

  // ---------- state ----------
  let host = null, cm = null, fileCm = null, d = null, previewTimer = null, saveTimer = null, closed = true;
  const urls = new Map(); // file name -> object URL (images and binaries)

  function newDraft() {
    const { state } = A;
    const label = (field, key) => state.labels[field].get(key) || key;
    return {
      key: 'new', path: null, md: '', activeFile: null, removed: [],
      meta: {
        title: '', date: today(),
        topics: [...state.topics].map((k) => label('topics', k)),
        tags: [...state.tags].map((k) => label('tags', k)),
        description: '', folder: '', file: '', extra: {},
      },
      files: [],
    };
  }

  function target() {
    const notesDir = A.state.site.notesDir || 'notes';
    if (d.path) {
      const dir = d.path.split('/').slice(0, -1).join('/');
      const base = d.path.split('/').pop().replace(/\.md$/i, '');
      return { mdPath: d.path, dir, base, assetDir: `${dir}/assets/${base}` };
    }
    const folder = folderSlug(d.meta.folder || d.meta.topics[0] || '');
    const base = slug(d.meta.file || d.meta.title) || `note-${d.meta.date || today()}`;
    const dir = folder ? `${notesDir}/${folder}` : notesDir;
    return { mdPath: `${dir}/${base}.md`, dir, base, assetDir: `${dir}/assets/${base}` };
  }

  // ---------- open / close ----------
  async function open(container, noteSlug) {
    closed = false;
    host = container;
    host.innerHTML = '<section class="empty"><p class="muted">Loading the editor…</p></section>';
    await loadLibs();

    const key = noteSlug ? `edit:${noteSlug}` : 'new';
    let saved = null;
    try { saved = await idb.get('drafts', key); } catch { /* private mode: no drafts */ }
    let restored = false;
    if (saved) { d = saved; restored = true; }
    else if (noteSlug) d = await loadExisting(noteSlug);
    else d = newDraft();
    if (closed) return;
    d.key = key;
    render(restored);
  }

  async function loadExisting(noteSlug) {
    const n = A.state.bySlug.get(noteSlug);
    if (!n) throw new Error(`No note called “${noteSlug}”`);
    const res = await fetch(n.path.split('/').map(encodeURIComponent).join('/'), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Couldn't load ${n.path} (HTTP ${res.status})`);
    const { data, body } = parseFrontMatter(await res.text());
    const toList = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',').map((x) => x.trim()) : []);
    const { title, date, topics, topic, tags, description, ...extra } = data;
    const files = [];
    for (const f of n.files || []) {
      if (!f.text) continue;
      try { files.push({ name: f.name, kind: 'text', content: await A.fetchText(f), existing: true }); } catch { /* skip unreadable */ }
    }
    return {
      key: `edit:${noteSlug}`, path: n.path, md: body.replace(/^\n+/, ''), removed: [],
      activeFile: files[0]?.name || null,
      meta: {
        title: title || n.title, date: date || n.date,
        topics: toList(topics ?? topic).length ? toList(topics ?? topic) : n.topics,
        tags: toList(tags), description: description || '', folder: '', file: '', extra,
      },
      files,
    };
  }

  function close() {
    if (closed) return;
    closed = true;
    flushSave();
    clearTimeout(previewTimer);
    for (const u of urls.values()) URL.revokeObjectURL(u);
    urls.clear();
    cm = null; fileCm = null;
    const dlg = $('#ed-finish');
    if (dlg) dlg.remove();
  }

  // ---------- autosave ----------
  function setStatus(text) { const s = $('.ed-status', host); if (s) s.textContent = text; }
  function scheduleSave() {
    setStatus('Saving draft…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 500);
  }
  function flushSave() {
    clearTimeout(saveTimer);
    if (!d) return;
    const copy = { ...d, files: d.files.map(({ url, ...f }) => f) };
    idb.set('drafts', d.key, copy).then(
      () => { if (!closed) setStatus('Draft saved in this browser'); },
      () => { if (!closed) setStatus('Drafts can’t be saved in this browser (private window?)'); },
    );
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && !closed) flushSave(); });
  window.addEventListener('beforeunload', () => { if (!closed) flushSave(); });

  // ---------- rendering ----------
  const ICON = {
    bold: '<b>B</b>', italic: '<i>I</i>', strike: '<s>S</s>', heading: 'H', code: '<code>`</code>',
    block: '<code>{ }</code>', link: 'Link', wiki: '[[ ]]', ul: '•', ol: '1.', task: '☐', quote: '❝', math: '∑',
  };
  const TOOLS = [
    ['heading', 'Heading (cycles H1, H2, H3)', 'Ctrl+H'], ['bold', 'Bold', 'Ctrl+B'], ['italic', 'Italic', 'Ctrl+I'],
    ['strike', 'Strikethrough', ''], '|',
    ['ul', 'Bulleted list', ''], ['ol', 'Numbered list', ''], ['task', 'Checklist', ''], ['quote', 'Quote', ''], '|',
    ['code', 'Inline code', 'Ctrl+E'], ['block', 'Code block', 'Ctrl+Shift+E'], ['math', 'Inline maths', 'Ctrl+M'], '|',
    ['link', 'Link', 'Ctrl+K'], ['wiki', 'Link to another note', 'Ctrl+Shift+K'],
  ];

  function render(restored) {
    const view = A.store.get('editor-view', matchMedia('(min-width: 1100px)').matches ? 'split' : 'write');
    host.innerHTML = `
      <section class="editor" aria-label="Note editor">
        <header class="ed-head">
          <label class="visually-hidden" for="ed-title">Title</label>
          <input id="ed-title" class="ed-title" placeholder="Untitled note" autocomplete="off" value="${esc(d.meta.title)}">
          <div class="ed-actions">
            <span class="ed-status" aria-live="polite">${restored ? 'Restored your unsaved draft' : ''}</span>
            <button type="button" class="linklike" data-ed="discard">${d.path ? 'Discard changes' : 'Discard draft'}</button>
            <div class="seg" role="group" aria-label="Layout">
              ${['write', 'split', 'preview'].map((v) => `<button type="button" data-view="${v}" aria-pressed="${v === view}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}
            </div>
            <button type="button" class="btn" data-ed="finish">Finish note</button>
          </div>
        </header>
        ${d.path ? `<p class="ed-editing">Editing <code>${esc(d.path)}</code>. <a href="#/note/${encodeURI(d.key.slice(5))}">View note</a></p>` : ''}
        <div class="ed-toolbar" role="toolbar" aria-label="Formatting">
          ${TOOLS.map((t) => (t === '|' ? '<span class="tb-sep" aria-hidden="true"></span>'
            : `<button type="button" class="tb" data-cmd="${t[0]}" title="${t[1]}${t[2] ? ` (${t[2]})` : ''}" aria-label="${t[1]}">${ICON[t[0]]}</button>`)).join('')}
          <span class="tb-sep" aria-hidden="true"></span>
          <button type="button" class="tb tb-wide" data-cmd="image" title="Insert image (or paste / drop one)">Image</button>
          <label class="visually-hidden" for="ed-insert">Insert block</label>
          <select id="ed-insert" class="tb-select">
            <option value="">Insert…</option>
            <option value="callout:NOTE">Note callout</option>
            <option value="callout:TIP">Tip callout</option>
            <option value="callout:DEFINITION">Definition</option>
            <option value="callout:EXAMPLE">Example</option>
            <option value="callout:WARNING">Warning</option>
            <option value="question">Question with hidden answer</option>
            <option value="table">Table</option>
            <option value="mathblock">Maths block</option>
            <option value="pycell">Python code block</option>
            <option value="mermaid">Diagram (Mermaid)</option>
            <option value="hr">Divider</option>
          </select>
          <input type="file" id="ed-image-input" accept="image/*" multiple hidden>
        </div>
        <div class="ed-panes" data-view="${view}">
          <div class="ed-src"><textarea id="ed-md"></textarea></div>
          <div class="ed-preview" aria-label="Preview"><div class="prose"></div></div>
        </div>
        <section class="ed-files" aria-labelledby="ed-files-h">
          <div class="ed-files-head">
            <h2 id="ed-files-h">Files</h2>
            <div class="file-tabs" role="tablist" aria-label="Files in this note"></div>
            <div class="ed-files-add">
              <form class="ed-newfile" hidden>
                <label class="visually-hidden" for="ed-newfile-name">File name</label>
                <input id="ed-newfile-name" placeholder="main.py" autocomplete="off" spellcheck="false">
                <button type="submit" class="btn btn-small">Add</button>
                <button type="button" class="linklike" data-ed="cancel-file">Cancel</button>
              </form>
              <button type="button" class="linklike" data-ed="new-file">New code file</button>
              <button type="button" class="linklike" data-ed="upload-file">Upload file</button>
              <input type="file" id="ed-file-input" multiple hidden>
            </div>
          </div>
          <div class="ed-file-body"></div>
          <p class="ed-hint">Files are saved in <code class="ed-assetdir"></code> with the note, so they share its date, topics and tags and show up in search. Python files can import each other and open CSV files from this list.</p>
        </section>
      </section>`;

    // Markdown editor
    cm = CodeMirror.fromTextArea($('#ed-md', host), {
      mode: { name: 'markdown', fencedCodeBlockHighlighting: true, highlightFormatting: true },
      lineWrapping: true, lineNumbers: false, autoCloseBrackets: '()[]{}', matchBrackets: true, indentUnit: 2, tabSize: 2,
      placeholder: 'Start writing. Paste or drop images straight in. Type [[ to link another note.',
      extraKeys: keymap(),
    });
    cm.setValue(d.md);
    cm.clearHistory();
    cm.on('change', () => { d.md = cm.getValue(); scheduleSave(); schedulePreview(); });
    cm.on('paste', onPaste);
    cm.on('drop', onDrop);
    cm.on('inputRead', (ed) => {
      const cur = ed.getCursor();
      if (ed.getRange({ line: cur.line, ch: Math.max(0, cur.ch - 2) }, cur) === '[[') showWikiHint(ed);
    });

    $('#ed-title', host).addEventListener('input', (e) => { d.meta.title = e.target.value; scheduleSave(); updateAssetDir(); });
    $('#ed-title', host).addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); cm.focus(); } });
    host.querySelector('.editor').addEventListener('click', onEditorClick);
    $('#ed-insert', host).addEventListener('change', (e) => { if (e.target.value) insertSnippet(e.target.value); e.target.value = ''; });
    $('#ed-image-input', host).addEventListener('change', async (e) => {
      for (const f of e.target.files) await addImage(f, null);
      e.target.value = '';
    });
    $('#ed-file-input', host).addEventListener('change', async (e) => {
      for (const f of e.target.files) await addUploadedFile(f);
      e.target.value = '';
    });
    $('.ed-newfile', host).addEventListener('submit', (e) => {
      e.preventDefault();
      const name = cleanName($('#ed-newfile-name', host).value) || 'main.py';
      addTextFile(name.includes('.') ? name : name + '.py', null);
      $('.ed-newfile', host).hidden = true;
    });
    $('.ed-preview', host).addEventListener('click', onPreviewClick);

    for (const f of d.files) if (f.blob) urls.set(f.name, URL.createObjectURL(f.blob));
    renderFileTabs();
    updateAssetDir();
    updatePreview();
    requestAnimationFrame(() => { cm.refresh(); (d.meta.title ? cm : $('#ed-title', host)).focus(); });
  }

  function updateAssetDir() {
    const el = $('.ed-assetdir', host);
    if (el) el.textContent = target().assetDir + '/';
  }

  function keymap() {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    const mod = mac ? 'Cmd' : 'Ctrl';
    return {
      [`${mod}-B`]: () => command('bold'), [`${mod}-I`]: () => command('italic'), [`${mod}-E`]: () => command('code'),
      [`Shift-${mod}-E`]: () => command('block'), [`${mod}-K`]: () => command('link'), [`Shift-${mod}-K`]: () => command('wiki'),
      [`${mod}-M`]: () => command('math'), [`${mod}-H`]: () => command('heading'), [`${mod}-S`]: () => openFinish(),
      Enter: 'newlineAndIndentContinueMarkdownList',
      Tab: (ed) => (ed.somethingSelected() || /^\s*([-*+]|\d+[.)])\s/.test(ed.getLine(ed.getCursor().line)) ? ed.execCommand('indentMore') : ed.replaceSelection('  ')),
      'Shift-Tab': 'indentLess',
    };
  }

  // ---------- formatting commands ----------
  function wrap(before, after = before, placeholder = 'text') {
    // Markdown ignores **bold ** with spaces inside the markers, so leave edge spaces outside
    const raw = cm.getSelection();
    if (raw && raw.trim() && raw !== raw.trim() && !raw.includes('\n')) {
      const a = cm.indexFromPos(cm.getCursor('from'));
      const lead = raw.length - raw.trimStart().length;
      cm.setSelection(cm.posFromIndex(a + lead), cm.posFromIndex(a + lead + raw.trim().length));
    }
    const from = cm.getCursor('from'), to = cm.getCursor('to');
    const sel = cm.getSelection();
    if (sel) {
      const pre = cm.getRange({ line: from.line, ch: Math.max(0, from.ch - before.length) }, from);
      const post = cm.getRange(to, { line: to.line, ch: to.ch + after.length });
      if (pre === before && post === after) {
        cm.operation(() => {
          cm.replaceRange('', to, { line: to.line, ch: to.ch + after.length });
          cm.replaceRange('', { line: from.line, ch: from.ch - before.length }, from);
        });
      } else if (sel.startsWith(before) && sel.endsWith(after) && sel.length >= before.length + after.length) {
        cm.replaceSelection(sel.slice(before.length, sel.length - after.length), 'around');
      } else {
        cm.replaceSelection(before + sel + after);
        const end = cm.getCursor();
        cm.setSelection(cm.posFromIndex(cm.indexFromPos(end) - after.length - sel.length), cm.posFromIndex(cm.indexFromPos(end) - after.length));
      }
    } else {
      cm.replaceRange(before + placeholder + after, from);
      const start = cm.indexFromPos(from) + before.length;
      cm.setSelection(cm.posFromIndex(start), cm.posFromIndex(start + placeholder.length));
    }
    cm.focus();
  }

  function selectedLines() {
    let from = cm.getCursor('from').line, to = cm.getCursor('to').line;
    if (to > from && cm.getCursor('to').ch === 0) to--;
    const lines = [];
    for (let i = from; i <= to; i++) lines.push(i);
    return lines;
  }

  const LIST_PREFIX = /^(\s*)(?:[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s?)?/;
  function toggleList(kind) {
    const is = { ul: /^\s*[-*+]\s+(?!\[[ xX]\])/, ol: /^\s*\d+[.)]\s+/, task: /^\s*[-*+]\s+\[[ xX]\]\s+/, quote: /^\s*>/ }[kind];
    const lines = selectedLines();
    const used = lines.filter((l) => cm.getLine(l).trim() || lines.length === 1);
    const allHave = used.every((l) => is.test(cm.getLine(l)));
    let n = 1;
    cm.operation(() => {
      for (const l of used) {
        const text = cm.getLine(l);
        const m = text.match(LIST_PREFIX);
        const rest = text.slice(m[0].length);
        const prefix = allHave ? '' : { ul: '- ', ol: `${n++}. `, task: '- [ ] ', quote: '> ' }[kind];
        cm.replaceRange(m[1] + prefix + rest, { line: l, ch: 0 }, { line: l, ch: text.length });
      }
    });
    cm.focus();
  }

  function cycleHeading() {
    cm.operation(() => {
      for (const l of selectedLines()) {
        const text = cm.getLine(l);
        const m = text.match(/^(#{1,6})\s+/);
        const level = m ? m[1].length : 0;
        const next = level >= 3 ? '' : '#'.repeat(level + 1) + ' ';
        cm.replaceRange(next + text.slice(m ? m[0].length : 0), { line: l, ch: 0 }, { line: l, ch: text.length });
      }
    });
    cm.focus();
  }

  // Inserts a block on its own lines; sel = [start, end] inside text to select afterwards
  function insertBlock(text, sel) {
    const c = cm.getCursor('from');
    const line = cm.getLine(c.line);
    let pos, prefix = '';
    if (line.trim()) { pos = { line: c.line, ch: line.length }; prefix = '\n\n'; }
    else { pos = { line: c.line, ch: 0 }; if (c.line > 0 && cm.getLine(c.line - 1).trim()) prefix = '\n'; }
    const nextLine = cm.getLine(pos.line + 1);
    // A blank line after the block stops the next paragraph from joining a quote or list
    const suffix = nextLine === undefined || nextLine.trim() ? '\n\n' : '\n';
    cm.replaceRange(prefix + text + suffix, pos, line.trim() ? pos : { line: c.line, ch: line.length });
    const start = cm.indexFromPos(pos) + prefix.length;
    const [a, b] = sel || [text.length, text.length];
    cm.setSelection(cm.posFromIndex(start + a), cm.posFromIndex(start + b));
    cm.focus();
  }

  function command(name) {
    const sel = cm.getSelection();
    switch (name) {
      case 'bold': return wrap('**', '**', 'bold text');
      case 'italic': return wrap('*', '*', 'italic text');
      case 'strike': return wrap('~~', '~~', 'text');
      case 'code': return wrap('`', '`', 'code');
      case 'math': return wrap('$', '$', 'x^2');
      case 'heading': return cycleHeading();
      case 'ul': case 'ol': case 'task': case 'quote': return toggleList(name);
      case 'wiki': return wrap('[[', ']]', 'Note title');
      case 'link': {
        if (/^https?:\/\/\S+$/.test(sel)) {
          const start = cm.indexFromPos(cm.getCursor('from'));
          cm.replaceSelection(`[link text](${sel})`);
          cm.setSelection(cm.posFromIndex(start + 1), cm.posFromIndex(start + 10));
          cm.focus();
          return;
        }
        return wrap('[', '](https://)', 'link text');
      }
      case 'block': {
        if (sel) { cm.replaceSelection('```python\n' + sel + '\n```'); cm.focus(); return; }
        return insertBlock('```python\n\n```', [3, 9]);
      }
      case 'image': return $('#ed-image-input', host).click();
      default: return undefined;
    }
  }

  function insertSnippet(kind) {
    if (kind.startsWith('callout:')) {
      const type = kind.slice(8);
      const title = { NOTE: 'Note', TIP: 'Tip', DEFINITION: 'Term', EXAMPLE: 'Example', WARNING: 'Watch out' }[type];
      const text = `> [!${type}] ${title}\n> `;
      return insertBlock(text, [text.indexOf(title), text.indexOf(title) + title.length]);
    }
    const snippets = {
      question: ['> [!QUESTION]- Question\n> Answer', 'Question'],
      table: ['| Column 1 | Column 2 |\n|----------|----------|\n|          |          |', 'Column 1'],
      mathblock: ['$$\n\n$$', null, [3, 3]],
      pycell: ['```python\nprint("hello")\n```', 'print("hello")'],
      mermaid: ['```mermaid\nflowchart LR\n  A --> B\n```', 'A --> B'],
      hr: ['---', null],
    };
    const [text, select, range] = snippets[kind];
    const i = select ? text.indexOf(select) : -1;
    insertBlock(text, range || (i >= 0 ? [i, i + select.length] : null));
  }

  function showWikiHint(ed) {
    ed.showHint({
      completeSingle: false,
      hint: (e) => {
        const cur = e.getCursor();
        const line = e.getLine(cur.line).slice(0, cur.ch);
        const start = line.lastIndexOf('[[');
        if (start < 0) return null;
        const q = lc(line.slice(start + 2));
        const list = A.state.notes.filter((n) => n._title.includes(q)).slice(0, 12)
          .map((n) => ({ text: n.title + ']]', displayText: n.title }));
        const closing = e.getRange(cur, { line: cur.line, ch: cur.ch + 2 }) === ']]';
        return { list, from: { line: cur.line, ch: start + 2 }, to: closing ? { line: cur.line, ch: cur.ch + 2 } : cur };
      },
    });
  }

  // ---------- images and files ----------
  function uniqueName(name) {
    let n = name, i = 1;
    const exists = (x) => d.files.some((f) => f.name === x);
    while (exists(n)) { const m = name.match(/^(.*?)(\.[^.]+)?$/); n = `${m[1]}-${i++}${m[2] || ''}`; }
    return n;
  }

  async function addImage(file, pos) {
    let name = cleanName(file.name);
    if (!name || /^image\.(png|jpe?g)$/i.test(name) || !IMAGE_EXT.test(name)) {
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      name = `image-1.${ext}`;
    }
    name = uniqueName(name.split('/').pop());
    d.files.push({ name, kind: 'image', blob: file, type: file.type });
    urls.set(name, URL.createObjectURL(file));
    const alt = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    const text = `![${alt}](assets/${target().base}/${name})`;
    if (pos) cm.setCursor(pos);
    const c = cm.getCursor();
    const line = cm.getLine(c.line);
    cm.replaceRange((c.ch > 0 && line.trim() ? '\n' : '') + text + '\n', c);
    renderFileTabs();
    scheduleSave();
  }

  async function addUploadedFile(file) {
    if (IMAGE_EXT.test(file.name) && file.type.startsWith('image/')) return addImage(file, null);
    const name = uniqueName(cleanName(file.name) || 'file');
    if (TEXT_EXT.test(name) && file.size < 2_000_000) addTextFile(name, await file.text());
    else {
      d.files.push({ name, kind: 'binary', blob: file, type: file.type });
      urls.set(name, URL.createObjectURL(file));
      d.activeFile = name;
      renderFileTabs();
      scheduleSave();
    }
  }

  function addTextFile(name, content) {
    name = uniqueName(name);
    d.files.push({ name, kind: 'text', content: content ?? (STARTERS[extOf(name)] || '') });
    d.activeFile = name;
    renderFileTabs();
    scheduleSave();
    if (fileCm && content == null) { fileCm.focus(); fileCm.setCursor(fileCm.lineCount(), 0); }
  }

  function removeFile(name) {
    const f = d.files.find((x) => x.name === name);
    if (!f) return;
    if (!confirm(`Remove ${name} from this note?`)) return;
    d.files = d.files.filter((x) => x !== f);
    if (f.existing) d.removed.push(name);
    if (urls.has(name)) { URL.revokeObjectURL(urls.get(name)); urls.delete(name); }
    if (d.activeFile === name) d.activeFile = null;
    renderFileTabs();
    scheduleSave();
    schedulePreview();
  }

  function onPaste(ed, e) {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    files.forEach((f) => addImage(f, null));
  }

  function onDrop(ed, e) {
    const files = [...(e.dataTransfer?.files || [])];
    if (!files.length) return;
    e.preventDefault();
    const pos = ed.coordsChar({ left: e.clientX, top: e.clientY });
    for (const f of files) {
      if (f.type.startsWith('image/')) addImage(f, pos);
      else addUploadedFile(f);
    }
  }

  function renderFileTabs() {
    const tabs = $('.ed-files .file-tabs', host);
    if (!tabs) return;
    if (!d.files.some((f) => f.name === d.activeFile)) d.activeFile = (d.files.find((f) => f.kind === 'text') || d.files[0])?.name || null;
    tabs.innerHTML = d.files.map((f) => `<button type="button" role="tab" class="file-tab file-${f.kind}" data-edfile="${esc(f.name)}" aria-selected="${f.name === d.activeFile}">${esc(f.name)}</button>`).join('');
    renderFileBody();
  }

  function renderFileBody() {
    const body = $('.ed-file-body', host);
    const f = d.files.find((x) => x.name === d.activeFile);
    fileCm = null;
    if (!f) {
      body.innerHTML = '<p class="ed-files-empty">No files yet. Add a Python file to run code alongside this note, or drop in a CSV to analyse.</p>';
      return;
    }
    const head = `<div class="file-head"><span>${esc(f.kind === 'image' ? 'Image' : f.kind === 'binary' ? 'File' : (A.labels[EXT_LANG[extOf(f.name)]] || extOf(f.name).toUpperCase() || 'Text'))}</span>
      <span class="file-head-actions">${f.kind === 'image' ? `<button type="button" class="linklike" data-ed="insert-image" data-name="${esc(f.name)}">Insert in note</button>` : ''}
      <button type="button" class="linklike" data-ed="rename-file" data-name="${esc(f.name)}">Rename</button>
      <button type="button" class="linklike danger" data-ed="remove-file" data-name="${esc(f.name)}">Remove</button></span></div>`;
    if (f.kind === 'image') { body.innerHTML = head + `<img class="ed-file-img" src="${esc(urls.get(f.name))}" alt="${esc(f.name)}">`; return; }
    if (f.kind === 'binary') { body.innerHTML = head + `<p class="muted">This file is saved with the note but can’t be edited here.</p>`; return; }
    body.innerHTML = head + '<div class="ed-code"></div>';
    fileCm = CodeMirror($('.ed-code', body), {
      value: f.content, mode: CM_MODE[extOf(f.name)] || null, lineNumbers: true, indentUnit: 4, tabSize: 4,
      matchBrackets: true, autoCloseBrackets: true, viewportMargin: Infinity,
      extraKeys: {
        Tab: (ed) => (ed.somethingSelected() ? ed.execCommand('indentMore') : ed.replaceSelection(' '.repeat(ed.getOption('indentUnit')))),
        'Shift-Tab': 'indentLess',
        'Ctrl-Enter': () => runner && runner.run(), 'Cmd-Enter': () => runner && runner.run(),
      },
    });
    fileCm.on('change', () => { f.content = fileCm.getValue(); scheduleSave(); });
    let runner = null;
    const lang = EXT_LANG[extOf(f.name)];
    if (/^(python|javascript)$/.test(lang)) {
      A.ensureRunner().then(() => {
        if (!body.isConnected || d.activeFile !== f.name) return;
        runner = NotesRunner.mount(body, { lang, getCode: () => f.content, getFiles: draftFiles, label: `Run ${f.name.split('/').pop()}` });
        $('.run-bar', body).insertAdjacentHTML('beforeend', '<span class="run-key">Ctrl+Enter</span>');
      });
    }
  }

  const draftFiles = async () => d.files.filter((f) => f.kind === 'text').map((f) => ({ name: f.name, content: f.content }));

  // ---------- preview ----------
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 250);
  }
  function resolveAsset(raw) {
    const m = raw.match(/(?:^|\/)assets\/[^/]+\/(.+)$/) || raw.match(/^([^/]+)$/);
    if (!m) return null;
    let name = m[1];
    try { name = decodeURIComponent(name); } catch { /* keep */ }
    return urls.get(name) || null;
  }
  function updatePreview() {
    if (closed || !host) return;
    const pane = $('.ed-preview .prose', host);
    if (!pane) return;
    const t = target();
    const fake = { slug: '__draft', path: t.mdPath, title: d.meta.title };
    pane.innerHTML = A.renderMarkdown(d.md || '*Nothing written yet.*');
    A.enhance(pane, fake, { resolveAsset });
    A.addRunButtons(pane, draftFiles).catch(() => {});
    A.renderMermaid(pane).catch(() => {});
  }
  function onPreviewClick(e) {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#/note/__draft')) {
      e.preventDefault();
      const h = new URLSearchParams(href.split('?')[1] || '').get('h');
      const el = h && ($('#h-' + CSS.escape(h), a.closest('.prose')));
      if (el) el.scrollIntoView({ block: 'start' });
    } else if (href.startsWith('#/')) {
      e.preventDefault();
      window.open(href, '_blank');
    }
  }

  // ---------- clicks in the editor ----------
  function onEditorClick(e) {
    const t = e.target;
    const tb = t.closest('.tb[data-cmd]');
    if (tb) { command(tb.dataset.cmd); return; }
    const v = t.closest('.seg [data-view]');
    if (v) {
      $('.ed-panes', host).dataset.view = v.dataset.view;
      $$('.seg [data-view]', host).forEach((b) => b.setAttribute('aria-pressed', String(b === v)));
      A.store.set('editor-view', v.dataset.view);
      cm.refresh();
      return;
    }
    const tab = t.closest('[data-edfile]');
    if (tab) { d.activeFile = tab.dataset.edfile; renderFileTabs(); return; }
    const act = t.closest('[data-ed]')?.dataset.ed;
    const name = t.closest('[data-name]')?.dataset.name;
    if (act === 'finish') openFinish();
    else if (act === 'discard') discard();
    else if (act === 'new-file') { const f = $('.ed-newfile', host); f.hidden = false; $('#ed-newfile-name', host).value = d.files.some((x) => x.name === 'main.py') ? '' : 'main.py'; $('#ed-newfile-name', host).focus(); }
    else if (act === 'cancel-file') $('.ed-newfile', host).hidden = true;
    else if (act === 'upload-file') $('#ed-file-input', host).click();
    else if (act === 'remove-file') removeFile(name);
    else if (act === 'insert-image') { const text = `![${name.replace(/\.[^.]+$/, '')}](assets/${target().base}/${name})`; cm.replaceSelection(text); cm.focus(); }
    else if (act === 'rename-file') renameFile(name);
  }

  function renameFile(name) {
    const f = d.files.find((x) => x.name === name);
    const next = cleanName(prompt('New file name', name) || '');
    if (!f || !next || next === name) return;
    if (d.files.some((x) => x.name === next)) { alert(`There is already a file called ${next}.`); return; }
    if (f.existing) d.removed.push(name);
    f.existing = false;
    f.name = next;
    if (urls.has(name)) { urls.set(next, urls.get(name)); urls.delete(name); }
    if (f.kind === 'image') cm.setValue(cm.getValue().split(`/${name})`).join(`/${next})`));
    d.activeFile = next;
    renderFileTabs();
    scheduleSave();
  }

  async function discard() {
    const msg = d.path ? 'Discard your changes to this note? The published version stays as it is.' : 'Delete this draft? This can’t be undone.';
    if (!confirm(msg)) return;
    try { await idb.del('drafts', d.key); } catch { /* ignore */ }
    const key = d.key;
    closed = true;
    for (const u of urls.values()) URL.revokeObjectURL(u);
    urls.clear();
    await open(host, key.startsWith('edit:') ? key.slice(5) : null);
  }

  // ---------- finish: details + save ----------
  function chipField(id, label, values, suggestions, hint) {
    return `<div class="fld"><label for="${id}">${label}</label>
      <div class="chipbox" data-field="${id}">
        ${values.map((v) => `<span class="chip chip-edit">${esc(v)}<button type="button" data-remove="${esc(v)}" aria-label="Remove ${esc(v)}">×</button></span>`).join('')}
        <input id="${id}" list="${id}-list" autocomplete="off" placeholder="${values.length ? '' : 'Type and press Enter'}">
      </div>
      <datalist id="${id}-list">${suggestions.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>
      ${hint ? `<p class="fld-hint">${hint}</p>` : ''}</div>`;
  }

  function openFinish() {
    $('#ed-finish')?.remove();
    const m = d.meta;
    const topicsAll = [...A.state.labels.topics.values()];
    const tagsAll = [...A.state.labels.tags.values()];
    const dlg = document.createElement('dialog');
    dlg.id = 'ed-finish';
    dlg.className = 'finish';
    const canFolder = 'showDirectoryPicker' in window;
    dlg.innerHTML = `
      <form method="dialog" class="finish-form">
        <h2>Finish note</h2>
        <div class="fld"><label for="f-title">Title</label><input id="f-title" value="${esc(m.title)}" placeholder="Untitled note" required></div>
        <div class="fld-row">
          <div class="fld"><label for="f-date">Date</label><input id="f-date" type="date" value="${esc(m.date || today())}"></div>
          <div class="fld"><label for="f-desc">One-line summary <span class="opt">optional</span></label><input id="f-desc" value="${esc(m.description)}"></div>
        </div>
        ${chipField('f-topics', 'Topics', m.topics, topicsAll, d.path ? '' : 'The first topic also picks the folder.')}
        ${chipField('f-tags', 'Tags', m.tags, tagsAll, '')}
        ${d.path ? '' : `<div class="fld-row">
          <div class="fld"><label for="f-folder">Folder <span class="opt">inside ${esc(A.state.site.notesDir || 'notes')}/</span></label><input id="f-folder" value="${esc(m.folder)}" placeholder="from first topic"></div>
          <div class="fld"><label for="f-file">File name</label><input id="f-file" value="${esc(m.file)}" placeholder="from title"></div>
        </div>`}
        <div class="finish-summary" aria-live="polite"></div>
        <div class="finish-actions">
          ${canFolder ? '<button type="button" class="btn" data-save="folder">Save to repo folder</button>' : ''}
          <button type="button" class="${canFolder ? 'btn btn-quiet' : 'btn'}" data-save="download">Download</button>
          <button type="button" class="btn btn-quiet" data-save="copy">Copy Markdown</button>
          <button type="button" class="linklike" data-save="close">Back to editing</button>
        </div>
        <div class="finish-result" aria-live="polite"></div>
      </form>`;
    document.body.append(dlg);

    const read = () => {
      m.title = $('#f-title', dlg).value.trim();
      m.date = $('#f-date', dlg).value || today();
      m.description = $('#f-desc', dlg).value.trim();
      if (!d.path) { m.folder = $('#f-folder', dlg).value.trim(); m.file = $('#f-file', dlg).value.trim(); }
      const t = $('#ed-title', host); if (t) t.value = m.title;
      summary();
      updateAssetDir();
      scheduleSave();
    };
    const summary = () => {
      const t = target();
      const extra = d.files.length;
      $('.finish-summary', dlg).innerHTML = `<p>Saves <code>${esc(t.mdPath)}</code>${extra ? ` and ${extra} ${extra === 1 ? 'file' : 'files'} in <code>${esc(t.assetDir)}/</code>` : ''}.</p>
        ${d.removed.length ? `<p class="fld-hint">Removed files: ${d.removed.map(esc).join(', ')}. ${canFolder ? 'Saving to the repo folder deletes them;' : ''} after downloading, delete them from the repo yourself.</p>` : ''}`;
      const dl = $('[data-save="download"]', dlg);
      dl.textContent = extra ? 'Download .zip' : 'Download .md';
    };

    dlg.addEventListener('input', (e) => { if (!e.target.closest('.chipbox')) read(); });
    for (const box of $$('.chipbox', dlg)) {
      const field = box.dataset.field === 'f-topics' ? 'topics' : 'tags';
      const input = $('input', box);
      const commit = () => {
        const v = input.value.replace(/,/g, ' ').replace(/^#/, '').trim();
        if (v && !m[field].some((x) => lc(x) === lc(v))) {
          m[field].push(v);
          input.insertAdjacentHTML('beforebegin', `<span class="chip chip-edit">${esc(v)}<button type="button" data-remove="${esc(v)}" aria-label="Remove ${esc(v)}">×</button></span>`);
          input.placeholder = '';
          scheduleSave(); summary(); updateAssetDir();
        }
        input.value = '';
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
        else if (e.key === 'Backspace' && !input.value && m[field].length) {
          m[field].pop(); input.previousElementSibling?.remove(); scheduleSave(); summary(); updateAssetDir();
        }
      });
      input.addEventListener('change', commit); // picking from the suggestion list
      input.addEventListener('blur', commit);
      box.addEventListener('click', (e) => {
        const rm = e.target.closest('[data-remove]');
        if (rm) { m[field] = m[field].filter((x) => x !== rm.dataset.remove); rm.parentElement.remove(); scheduleSave(); summary(); updateAssetDir(); }
        else input.focus();
      });
    }

    $('form', dlg).addEventListener('submit', (e) => e.preventDefault());
    dlg.addEventListener('click', async (e) => {
      const next = e.target.closest('[data-ed-next]');
      if (next) {
        dlg.close();
        if (next.dataset.edNext === 'new') {
          await idb.del('drafts', d.key).catch(() => {});
          if (location.hash === '#/new') { closed = true; await open(host, null); } else location.hash = '#/new';
        }
        return;
      }
      const b = e.target.closest('[data-save]');
      if (!b) return;
      if (b.dataset.save === 'close') { dlg.close(); return; }
      read();
      if (!m.title) { $('#f-title', dlg).focus(); result('Add a title first.', true); return; }
      b.disabled = true;
      try {
        if (b.dataset.save === 'copy') {
          await navigator.clipboard.writeText(buildMarkdown());
          result(`Copied. Paste it into <code>${esc(target().mdPath)}</code>.`);
        } else if (b.dataset.save === 'download') await download();
        else await saveToFolder();
      } catch (err) {
        if (err.name !== 'AbortError') result(esc(err.message || String(err)), true);
      } finally { b.disabled = false; }
    });
    dlg.addEventListener('close', () => dlg.remove());
    const result = (html, isError) => {
      const r = $('.finish-result', dlg);
      r.className = 'finish-result' + (isError ? ' is-error' : ' is-ok');
      r.innerHTML = html;
    };
    dlg.result = result;
    summary();
    dlg.showModal();
    $(m.title ? '#f-topics' : '#f-title', dlg).focus();
  }

  function buildMarkdown() {
    const t = target();
    let body = d.md.replace(/\s+$/, '') + '\n';
    // Point image and file links at the final folder, even if the title changed after pasting
    for (const f of d.files) {
      const re = new RegExp(`(\\]\\(<?)assets/[^/)\\s>]+/${f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[)\\s>])`, 'g');
      body = body.replace(re, `$1assets/${t.base}/${f.name}`);
    }
    return frontMatter(d.meta) + '\n' + body;
  }

  function outputs() {
    const t = target();
    const out = [{ path: t.mdPath, data: buildMarkdown() }];
    for (const f of d.files) out.push({ path: `${t.assetDir}/${f.name}`, data: f.kind === 'text' ? f.content : f.blob });
    return out;
  }

  async function download() {
    const files = outputs();
    const t = target();
    const dlg = $('#ed-finish');
    if (files.length === 1) {
      saveBlob(new Blob([files[0].data], { type: 'text/markdown' }), `${t.base}.md`);
      dlg.result(`Downloaded <code>${esc(t.base)}.md</code>. Move it to <code>${esc(t.mdPath)}</code> in your repo, then commit and push.`);
    } else {
      if (!window.JSZip) await A.loadScript(JSZIP);
      const zip = new JSZip();
      for (const f of files) zip.file(f.path, f.data);
      saveBlob(await zip.generateAsync({ type: 'blob' }), `${t.base}.zip`);
      dlg.result(`Downloaded <code>${esc(t.base)}.zip</code>. Unzip it into the root of your repo (it contains the <code>${esc(A.state.site.notesDir || 'notes')}/</code> folder, so everything lands in the right place), then commit and push.`);
    }
    afterSave();
  }

  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async function repoHandle(forceNew) {
    let h = forceNew ? null : await idb.get('handles', 'repo').catch(() => null);
    if (h && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await h.requestPermission({ mode: 'readwrite' })) !== 'granted') h = null;
    if (!h) {
      h = await window.showDirectoryPicker({ id: 'notes-repo', mode: 'readwrite' });
      let ok = false;
      try { await h.getFileHandle('config.json'); ok = true; } catch { /* not the repo root */ }
      if (!ok && !confirm(`“${h.name}” has no config.json, so it may not be the root of your notes repo. Save here anyway?`)) {
        const e = new Error('cancelled'); e.name = 'AbortError'; throw e;
      }
      await idb.set('handles', 'repo', h).catch(() => {});
    }
    return h;
  }

  async function saveToFolder() {
    const rootDir = await repoHandle(false);
    const files = outputs();
    for (const f of files) {
      const parts = f.path.split('/');
      let dir = rootDir;
      for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: true });
      const fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
      const w = await fh.createWritable();
      await w.write(f.data);
      await w.close();
    }
    const t = target();
    for (const name of d.removed) {
      try {
        let dir = rootDir;
        const parts = `${t.assetDir}/${name}`.split('/');
        for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p);
        await dir.removeEntry(parts[parts.length - 1]);
      } catch { /* already gone */ }
    }
    d.removed = [];
    $('#ed-finish').result(`Saved ${files.length} ${files.length === 1 ? 'file' : 'files'} to <code>${esc(rootDir.name)}/${esc(t.dir)}/</code>. Commit and push to publish.
      <button type="button" class="linklike" data-ed-change-folder>Use a different folder</button>`);
    $('[data-ed-change-folder]')?.addEventListener('click', async () => { await idb.del('handles', 'repo').catch(() => {}); saveToFolder().catch((e) => e.name !== 'AbortError' && $('#ed-finish').result(esc(e.message), true)); });
    afterSave();
  }

  function afterSave() {
    flushSave();
    const r = $('#ed-finish .finish-result');
    if (!r || $('[data-ed-next]', r)) return;
    r.insertAdjacentHTML('beforeend', `<p class="finish-next">
      <button type="button" class="linklike" data-ed-next="new">Start a new note</button>
      <button type="button" class="linklike" data-ed-next="keep">Keep editing</button></p>`);
  }

  window.NotesEditor = { open, close };
})();
