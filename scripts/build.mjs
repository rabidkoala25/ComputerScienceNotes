#!/usr/bin/env node
// Builds the site into _site/:
//   1. copies the viewer (site/) and your notes folder (with images) into _site/
//   2. reads every .md note, its front matter, git dates and links
//   3. writes _site/index.json, which the viewer uses for lists, filters, search and backlinks
// No dependencies. Run from the repo root: node scripts/build.mjs

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const config = readJSON('config.json', {});
const notesDir = String(config.notesDir || 'notes').replace(/\/+$/, '');
const outDir = path.join(root, '_site');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
const toPosix = (p) => p.split(path.sep).join('/');

// ---------- front matter (a small YAML subset: key: value, [a, b] lists, "- item" lists) ----------
function parseFrontMatter(src) {
  const m = src.match(/^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { data: {}, body: src.replace(/^\uFEFF/, '') };
  const data = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(scalar(item[1]));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    key = kv[1];
    const v = kv[2].trim();
    if (v === '') data[key] = [];
    else if (v.startsWith('[') && v.endsWith(']')) data[key] = v.slice(1, -1).split(',').map(scalar).filter((s) => s !== '');
    else data[key] = scalar(v);
  }
  return { data, body: src.slice(m[0].length) };
}
function scalar(s) {
  s = String(s).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s;
}
function toList(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
}

// Accepts 2026-09-24, 2026-9-24, 24.09.2026 (anywhere in the string, so filenames work too)
function normDate(v) {
  if (!v || typeof v !== 'string') return null;
  let m = v.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

const slugify = (s) => String(s).toLowerCase().trim()
  .split('/').map((seg) => seg.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')).filter(Boolean).join('/');

const humanize = (s) => {
  const t = String(s).replace(/^\d{4}-\d{2}-\d{2}[-_ ]*/, '').replace(/[-_]+/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : String(s);
};

// Plain text for search: keeps words, drops Markdown syntax.
function plain(md) {
  return md
    .replace(/^\s{0,3}(```|~~~)[^\n]*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, (_, a, b) => b || a)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[!\w+\][-+]?/g, ' ')
    .replace(/^\s{0,3}(#{1,6}|>+|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/\[[ xX]\]\s/g, '')
    .replace(/(\*\*|__|~~|`|\$\$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- git dates ----------
let gitOK = false;
try { execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'pipe' }); gitOK = true; } catch {}
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}
function gitDates(file) {
  if (!gitOK) return {};
  try {
    const out = git(['log', '--follow', '--format=%aI', '--', file]).split('\n').filter(Boolean);
    return out.length ? { created: out[out.length - 1].slice(0, 10), updated: out[0].slice(0, 10) } : {};
  } catch { return {}; }
}
function repoInfo() {
  let repo = config.repo || process.env.GITHUB_REPOSITORY || '';
  let branch = config.branch || process.env.GITHUB_REF_NAME || '';
  if (gitOK && !repo) {
    try {
      const m = git(['remote', 'get-url', 'origin']).match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
      if (m) repo = m[1];
    } catch {}
  }
  if (gitOK && !branch) { try { branch = git(['rev-parse', '--abbrev-ref', 'HEAD']); } catch {} }
  return { repo, branch: branch || 'main' };
}

// ---------- attached files: everything in assets/<note file name>/ ----------
const CODE_LANGS = {
  py: 'python', js: 'javascript', mjs: 'javascript', ts: 'typescript', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp',
  hpp: 'cpp', java: 'java', cs: 'csharp', kt: 'kotlin', swift: 'swift', go: 'go', rs: 'rust', rb: 'ruby',
  php: 'php', lua: 'lua', pl: 'perl', r: 'r', jl: 'julia', m: 'matlab', sh: 'bash', bash: 'bash', sql: 'sql',
  html: 'xml', css: 'css', tex: 'latex',
};
const DATA_LANGS = { csv: 'csv', tsv: 'csv', txt: 'plaintext', json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown', ipynb: 'json' };
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const NOT_LANGS = new Set(['plaintext', 'text', 'txt', 'csv', 'json', 'yaml', 'markdown', 'md', 'mermaid', 'math', 'latex', 'xml', 'html', 'css', 'console', 'output']);
const LANG_ALIASES = { py: 'python', python3: 'python', js: 'javascript', ts: 'typescript', sh: 'bash', shell: 'bash', zsh: 'bash', 'c++': 'cpp', 'c#': 'csharp', rscript: 'r' };
const normLang = (l) => { const k = String(l).toLowerCase(); return LANG_ALIASES[k] || k; };

function listFiles(dir, prefix = '') {
  let out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) out = out.concat(listFiles(path.join(dir, e.name), prefix + e.name + '/'));
    else out.push(prefix + e.name);
  }
  return out.sort();
}

function attachments(abs) {
  const dir = path.join(path.dirname(abs), 'assets', path.basename(abs).replace(/\.md$/i, ''));
  const files = [];
  let text = '';
  for (const name of listFiles(dir)) {
    if (IMAGE_EXT.test(name)) continue;
    const ext = (name.match(/\.([^.]+)$/) || [])[1]?.toLowerCase() || '';
    const lang = CODE_LANGS[ext] || DATA_LANGS[ext] || null;
    const full = path.join(dir, name);
    const size = fs.statSync(full).size;
    files.push({ name, path: toPosix(path.relative(root, full)), lang, size, text: !!lang });
    if (lang && size < 500000) text += ` ${name} ${fs.readFileSync(full, 'utf8').slice(0, 20000)}`;
  }
  return { files, text };
}

// ---------- collect notes ----------
function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'assets') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.md$/i.test(e.name)) out.push(p);
  }
  return out;
}

const files = fs.existsSync(notesDir) ? walk(notesDir).sort() : [];
const notes = [];
const usedSlugs = new Set();

for (const abs of files) {
  const rel = toPosix(path.relative(root, abs));
  const inner = toPosix(path.relative(notesDir, abs));
  const src = fs.readFileSync(abs, 'utf8');
  const { data, body } = parseFrontMatter(src);
  if (data.draft === true) continue;

  const base = path.basename(abs).replace(/\.md$/i, '');
  const gd = gitDates(rel);
  const mtime = fs.statSync(abs).mtime.toISOString().slice(0, 10);
  const date = normDate(String(data.date ?? '')) || normDate(base) || gd.created || mtime;
  let updated = normDate(String(data.updated ?? '')) || gd.updated || mtime;
  if (updated < date) updated = date;

  const folders = inner.split('/').slice(0, -1);
  let topics = toList(data.topics ?? data.topic);
  if (!topics.length && folders.length) topics = [humanize(folders[0])];
  const tags = toList(data.tags).map((t) => t.replace(/^#/, ''));

  let slug = slugify(inner.replace(/\.md$/i, '')) || 'note';
  for (let i = 2; usedSlugs.has(slug); i++) slug = `${slugify(inner.replace(/\.md$/i, ''))}-${i}`;
  usedSlugs.add(slug);

  const text = plain(body);
  const words = text ? text.split(' ').length : 0;
  const att = attachments(abs);
  const langs = new Set();
  for (const m of body.matchAll(/^[ \t]{0,3}(?:`{3,}|~{3,})[ \t]*([\w+#-]+)/gm)) langs.add(normLang(m[1]));
  for (const f of att.files) if (f.lang) langs.add(f.lang);
  notes.push({
    slug,
    path: rel,
    title: data.title ? String(data.title) : humanize(base),
    date,
    updated,
    topics,
    tags,
    description: data.description ? String(data.description) : '',
    words,
    minutes: Math.max(1, Math.round(words / 200)),
    excerpt: text.length > 180 ? text.slice(0, 180).replace(/\s+\S*$/, '') + '…' : text,
    text: (text.slice(0, 40000) + att.text).trim(),
    files: att.files,
    langs: [...langs].filter((l) => !NOT_LANGS.has(l)).sort(),
    backlinks: [],
    _body: body,
  });
}

// ---------- links and backlinks ----------
const byPath = new Map(notes.map((n) => [n.path, n]));
const bySlug = new Map(notes.map((n) => [n.slug, n]));
const byTitle = new Map(notes.map((n) => [n.title.toLowerCase(), n]));
const byBase = new Map();
for (const n of notes) { const b = n.slug.split('/').pop(); if (!byBase.has(b)) byBase.set(b, n); }

function resolveWiki(target) {
  const t = target.trim().replace(/#.*$/, '').replace(/\.md$/i, '');
  return byTitle.get(t.toLowerCase()) || bySlug.get(slugify(t)) || byBase.get(slugify(t.split('/').pop())) || null;
}

for (const n of notes) {
  const targets = new Set();
  for (const m of n._body.matchAll(/\[\[([^\]|\n]+)(?:\|[^\]\n]+)?\]\]/g)) {
    const t = resolveWiki(m[1]);
    if (t) targets.add(t);
  }
  for (const m of n._body.matchAll(/\]\(<?([^)\s>#]+\.md)(?:#[^)\s>]*)?>?\)/gi)) {
    if (/^[a-z]+:/i.test(m[1])) continue;
    let p;
    try { p = decodeURIComponent(m[1]); } catch { p = m[1]; }
    const full = p.startsWith('/') ? p.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(n.path), p));
    const t = byPath.get(full);
    if (t) targets.add(t);
  }
  for (const t of targets) if (t !== n && !t.backlinks.includes(n.slug)) t.backlinks.push(n.slug);
}

// ---------- write output ----------
fs.rmSync(outDir, { recursive: true, force: true });
fs.cpSync(path.join(root, 'site'), outDir, { recursive: true });
if (fs.existsSync(notesDir)) {
  fs.cpSync(notesDir, path.join(outDir, notesDir), {
    recursive: true,
    filter: (s) => !path.basename(s).startsWith('.'),
  });
}
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

notes.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
const { repo, branch } = repoInfo();
const index = {
  site: {
    title: config.title || 'Notes',
    description: config.description || '',
    notesDir,
    repo,
    branch,
    built: new Date().toISOString(),
  },
  notes: notes.map(({ _body, ...n }) => n),
};
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index));

console.log(`Built ${notes.length} note${notes.length === 1 ? '' : 's'} into _site/${repo ? ` (repo: ${repo}@${branch})` : ''}`);
