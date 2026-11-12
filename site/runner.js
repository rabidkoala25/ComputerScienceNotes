/* Runs Python (Pyodide) and JavaScript in background workers. Used by note pages and the editor. */
(() => {
  'use strict';

  const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/';
  const SQLJS = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/';
  const MAX_ROWS = 500;
  const RUNNABLE = {
    python: 'python', py: 'python', python3: 'python', javascript: 'javascript', js: 'javascript',
    sql: 'sql', sqlite: 'sql', mysql: 'sql', postgresql: 'sql',
  };
  const canRun = (lang) => !!RUNNABLE[String(lang || '').toLowerCase()];

  // ---------- Python ----------
  const PY_WORKER = `
    importScripts('${PYODIDE}pyodide.js');
    const WORK = '/home/pyodide/work';
    let py, builtins;
    const ready = (async () => {
      py = await loadPyodide({ indexURL: '${PYODIDE}' });
      builtins = py.pyimport('builtins');
      py.FS.mkdirTree(WORK);
      py.runPython(\`
import os, sys, warnings
os.environ['MPLBACKEND'] = 'AGG'
warnings.filterwarnings('ignore', message='.*non-interactive.*')
sys.dont_write_bytecode = True
def _notes_prepare(work):
    import importlib, shutil
    shutil.rmtree(os.path.join(work, '__pycache__'), ignore_errors=True)
    importlib.invalidate_caches()
    os.chdir(work)
    if work not in sys.path:
        sys.path.insert(0, work)
    for name, mod in list(sys.modules.items()):
        if (getattr(mod, '__file__', None) or '').startswith(work):
            del sys.modules[name]
def _notes_figures():
    if 'matplotlib.pyplot' not in sys.modules:
        return []
    import io, base64
    plt = sys.modules['matplotlib.pyplot']
    out = []
    for n in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(n).savefig(buf, format='png', dpi=110, bbox_inches='tight')
        out.append(base64.b64encode(buf.getvalue()).decode())
    plt.close('all')
    return out
\`);
    })();
    ready.then(() => postMessage({ type: 'ready' }), (e) => postMessage({ type: 'fatal', text: String(e) }));

    self.onmessage = async (e) => {
      const { code, files } = e.data;
      try { await ready; } catch { return; }
      const send = (type) => (text) => postMessage({ type, text });
      py.setStdout({ batched: send('stdout') });
      py.setStderr({ batched: send('stderr') });
      py.setStdin({ stdin: () => null });
      try {
        for (const f of files || []) {
          const p = WORK + '/' + f.name;
          py.FS.mkdirTree(p.split('/').slice(0, -1).join('/'));
          py.FS.writeFile(p, f.content);
        }
        py.globals.get('_notes_prepare')(WORK);
        await py.loadPackagesFromImports(code, { messageCallback: send('status'), errorCallback: send('stderr') });
        const ns = builtins.dict();
        ns.set('__name__', '__main__');
        const result = await py.runPythonAsync(code, { globals: ns });
        if (result !== undefined && result !== null) {
          postMessage({ type: 'result', text: builtins.repr(result) });
          if (result.destroy) result.destroy();
        }
        const figProxy = py.globals.get('_notes_figures')();
        for (const b64 of figProxy.toJs()) postMessage({ type: 'image', src: 'data:image/png;base64,' + b64 });
        figProxy.destroy();
        ns.destroy();
      } catch (err) {
        postMessage({ type: 'error', text: String(err && err.message || err) });
      }
      postMessage({ type: 'done' });
    };`;

  const SQL_WORKER = `
    importScripts('${SQLJS}sql-wasm.js');
    let SQL, db;
    const ready = initSqlJs({ locateFile: (file) => '${SQLJS}' + file }).then((loaded) => {
      SQL = loaded;
      db = new SQL.Database();
    });
    const show = (value) => value instanceof Uint8Array ? '[' + value.length + ' bytes]' : value;
    self.onmessage = async (e) => {
      try { await ready; } catch (err) {
        postMessage({ type: 'error', text: "SQL didn't load: " + err });
        postMessage({ type: 'done' });
        return;
      }
      if (e.data.reset) {
        db.close();
        db = new SQL.Database();
        postMessage({ type: 'stdout', text: 'Database reset. All tables are gone.' });
        postMessage({ type: 'done' });
        return;
      }
      try {
        const results = db.exec(e.data.code);
        const changed = db.getRowsModified();
        if (!results.length) postMessage({ type: 'stdout', text: changed ? 'Done. ' + changed + (changed === 1 ? ' row' : ' rows') + ' changed.' : 'Done.' });
        for (const result of results) {
          postMessage({
            type: 'table',
            columns: result.columns,
            rows: result.values.slice(0, ${MAX_ROWS}).map((row) => row.map(show)),
            total: result.values.length,
          });
        }
      } catch (err) {
        postMessage({ type: 'error', text: String(err && err.message || err) });
      }
      postMessage({ type: 'done' });
    };`;

  let sqlWorker = null;
  let sqlPage = null;
  function getSqlWorker() {
    const page = location.pathname + location.hash.split('?')[0];
    if (sqlWorker && sqlPage !== page) { sqlWorker.terminate(); sqlWorker = null; }
    if (!sqlWorker) {
      sqlWorker = new Worker(URL.createObjectURL(new Blob([SQL_WORKER], { type: 'text/javascript' })));
      sqlPage = page;
    }
    return sqlWorker;
  }

  function runSql(message, onEvent) {
    const worker = getSqlWorker();
    let finished = false;
    worker.onmessage = (e) => {
      onEvent(e.data);
      if (e.data.type === 'done') finished = true;
    };
    worker.onerror = (e) => {
      onEvent({ type: 'error', text: e.message });
      onEvent({ type: 'done' });
      finished = true;
    };
    worker.postMessage(message);
    return {
      stop() {
        if (finished) return;
        worker.terminate();
        sqlWorker = null;
        onEvent({ type: 'stderr', text: 'Stopped. The database was reset, so run the blocks that create your tables again.' });
        onEvent({ type: 'done' });
        finished = true;
      },
    };
  }

  let pyWorker = null;
  let pyLoaded = false;
  function getPyWorker() {
    if (!pyWorker) {
      pyWorker = new Worker(URL.createObjectURL(new Blob([PY_WORKER], { type: 'text/javascript' })));
      pyLoaded = false;
    }
    return pyWorker;
  }

  // ---------- JavaScript ----------
  const JS_WORKER = `
    const show = (a) => typeof a === 'string' ? a : (() => { try { return JSON.stringify(a, null, 2); } catch { return String(a); } })();
    const send = (type) => (...a) => postMessage({ type, text: a.map(show).join(' ') });
    console.log = console.info = console.debug = send('stdout');
    console.warn = console.error = send('stderr');
    console.table = send('stdout');
    self.onmessage = async (e) => {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      try { await new AsyncFunction(e.data.code)(); }
      catch (err) { postMessage({ type: 'error', text: String(err && err.stack || err) }); }
      postMessage({ type: 'done' });
    };`;

  // run(lang, code, files, onEvent) -> { stop() }
  // files: [{ name, content }] written next to the code (Python can import or open them)
  function run(lang, code, files, onEvent) {
    const kind = RUNNABLE[String(lang).toLowerCase()];

    if (kind === 'sql') return runSql({ code }, onEvent);
    let worker, finished = false;
    const finish = () => { finished = true; };

    if (kind === 'javascript') {
      worker = new Worker(URL.createObjectURL(new Blob([JS_WORKER], { type: 'text/javascript' })));
      worker.onmessage = (e) => {
        onEvent(e.data);
        if (e.data.type === 'done') { finish(); worker.terminate(); }
      };
      worker.onerror = (e) => { onEvent({ type: 'error', text: e.message }); onEvent({ type: 'done' }); finish(); };
      worker.postMessage({ code });
      return { stop() { if (!finished) { worker.terminate(); onEvent({ type: 'stderr', text: 'Stopped.' }); onEvent({ type: 'done' }); finish(); } } };
    }

    if (kind === 'python') {
      worker = getPyWorker();
      if (!pyLoaded) onEvent({ type: 'status', text: 'Loading Python. The first run downloads about 10 MB and can take a few seconds.' });
      worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'ready') { pyLoaded = true; onEvent({ type: 'status', text: '' }); return; }
        if (m.type === 'fatal') { pyWorker = null; onEvent({ type: 'error', text: `Python didn't load: ${m.text}` }); onEvent({ type: 'done' }); finish(); return; }
        onEvent(m);
        if (m.type === 'done') finish();
      };
      worker.postMessage({ code, files });
      return {
        stop() {
          if (finished) return;
          worker.terminate();
          pyWorker = null; // next run starts a fresh interpreter
          onEvent({ type: 'stderr', text: 'Stopped. Python restarts on the next run.' });
          onEvent({ type: 'done' });
          finish();
        },
      };
    }

    onEvent({ type: 'error', text: `Running ${lang} isn't supported here. Python, JavaScript and SQL can run in the browser.` });
    onEvent({ type: 'done' });
    return { stop() {} };
  }

  // ---------- UI ----------
  // mount(host, { lang, getCode, getFiles }) adds a Run button and an output area to host.
  function mount(host, { lang, getCode, getFiles = async () => [], label = 'Run' }) {
    const bar = document.createElement('div');
    bar.className = 'run-bar';
    const isSql = RUNNABLE[String(lang).toLowerCase()] === 'sql';
    bar.innerHTML = `<button type="button" class="run-btn">${label}</button><button type="button" class="run-stop" hidden>Stop</button>${isSql ? '<button type="button" class="linklike run-reset">Reset database</button>' : ''}<span class="run-status" aria-live="polite"></span>`;
    const out = document.createElement('div');
    out.className = 'run-out';
    out.hidden = true;
    out.setAttribute('aria-live', 'polite');
    host.append(bar, out);
    const btn = bar.querySelector('.run-btn');
    const stopBtn = bar.querySelector('.run-stop');
    const status = bar.querySelector('.run-status');
    let job = null;

    const line = (cls, text) => {
      const last = out.lastElementChild;
      if (last && last.tagName === 'PRE' && last.className === cls) last.textContent += '\n' + text;
      else { const pre = document.createElement('pre'); pre.className = cls; pre.textContent = text; out.append(pre); }
    };

    async function start() {
      if (job) return;
      out.hidden = false;
      out.innerHTML = '';
      btn.disabled = true;
      stopBtn.hidden = false;
      status.textContent = 'Running…';
      const t0 = performance.now();
      let files = [];
      try { files = await getFiles(); } catch (e) { line('run-err', `Couldn't load attached files: ${e.message}`); }
      job = run(lang, getCode(), files, (ev) => {
        if (ev.type === 'stdout') line('run-text', ev.text);
        else if (ev.type === 'stderr') line('run-text run-warn', ev.text);
        else if (ev.type === 'result') line('run-text run-result', ev.text);
        else if (ev.type === 'error') line('run-err', ev.text);
        else if (ev.type === 'status') status.textContent = ev.text || 'Running…';
        else if (ev.type === 'table') out.append(tableElement(ev));
        else if (ev.type === 'image') { const img = document.createElement('img'); img.src = ev.src; img.alt = 'Figure'; img.className = 'run-fig'; out.append(img); }
        else if (ev.type === 'done') {
          job = null;
          btn.disabled = false;
          stopBtn.hidden = true;
          status.textContent = `Finished in ${((performance.now() - t0) / 1000).toFixed(1)} s`;
          if (!out.childElementCount) line('run-text run-empty', 'No output.');
        }
      });
    }
    btn.addEventListener('click', start);
    bar.querySelector('.run-reset')?.addEventListener('click', () => {
      if (job) return;
      out.hidden = false;
      out.innerHTML = '';
      runSql({ reset: true }, (ev) => {
        if (ev.type === 'stdout') line('run-text run-empty', ev.text);
        else if (ev.type === 'error') line('run-err', ev.text);
      });
    });
    stopBtn.addEventListener('click', () => job && job.stop());
    return { run: start };
  }

  function tableElement({ columns, rows, total }) {
    const wrap = document.createElement('div');
    wrap.className = 'run-table-wrap';
    const table = document.createElement('table');
    table.className = 'run-table';
    const headRow = table.createTHead().insertRow();
    for (const column of columns) {
      const th = document.createElement('th');
      th.textContent = column;
      headRow.append(th);
    }
    const body = table.createTBody();
    for (const row of rows) {
      const tr = body.insertRow();
      for (const value of row) {
        const td = tr.insertCell();
        if (value === null) { td.textContent = 'NULL'; td.className = 'run-null'; }
        else td.textContent = value;
      }
    }
    const caption = document.createElement('p');
    caption.className = 'run-table-caption';
    caption.textContent = rows.length < total ? `Showing ${rows.length} of ${total} rows` : `${total} ${total === 1 ? 'row' : 'rows'}`;
    wrap.append(table, caption);
    return wrap;
  }

  window.NotesRunner = { canRun, run, mount };
})();
