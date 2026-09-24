# Notes site

Write notes in Markdown, push them to GitHub, read them on GitHub Pages with search, topics, tags, dates, maths, diagrams and links between notes.

## Set up (once)

1. Create a new GitHub repository and push these files to its `main` branch.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push any change (or run the workflow from the **Actions** tab). The site appears at `https://<your-username>.github.io/<repo-name>/`.

Change the site title and description in `config.json`.

## Write a note in the browser

1. Select **New note** in the sidebar (or **Edit** on any note).
2. Write with the toolbar or shortcuts (Ctrl+B, Ctrl+I, Ctrl+K link, Ctrl+Shift+K link to a note, Ctrl+E code, Ctrl+M maths, Ctrl+H heading). Paste or drop screenshots straight in. Type `[[` to pick another note to link.
3. Under **Files**, add code (`main.py`), upload data (`results.csv`), and press **Run** (Ctrl+Enter). Python and JavaScript run in the browser; Python can import the note's other `.py` files and open its CSVs, and numpy, pandas and matplotlib load automatically.
4. Select **Finish note** (Ctrl+S), set the date, topics and tags, then:
   - **Save to repo folder** (Chrome and Edge): pick your local clone once; files are written straight into the right place.
   - **Download .zip**: unzip into the root of the repo; the paths inside put everything in the right folder.
5. Commit and push.

Drafts save in your browser as you type, so closing the tab loses nothing.

## Add a note by hand

Create a `.md` file anywhere inside `notes/`, commit and push. The site rebuilds in about a minute.

```
notes/
  getting-started.md
  data-structures/                     ← folder name becomes the topic
    arrays-and-linked-lists.md
    assets/arrays-and-linked-lists/    ← everything that belongs to that note
      linked-list.svg                  ← images
      linked_list.py                   ← code and data files
      timing.py
```

Files in a note's `assets/<note name>/` folder belong to it: they share its date, topics and tags, their contents are searchable, they're listed under the note with Run buttons, and their languages appear under **Code** in the sidebar filters (or search `lang:python`).

A header at the top of the note is optional:

```yaml
---
title: Arrays and linked lists
date: 2026-09-24
topics: [Data structures]
tags: [arrays, complexity]
description: One line shown in lists.
---
```

Without it, the title comes from the file name, the date from a date in the file name (`2026-09-24-arrays.md` or `24.09.2026 arrays.md`) or else the first git commit, and the topic from the folder. Add `draft: true` to hide a note.

Open `notes/getting-started.md` for every feature in one place: callouts, hidden self-test answers, maths, Mermaid diagrams, `[[wiki links]]`, tables and task lists.

## VS Code

Open the repository folder in VS Code and the included `.vscode/` settings:

- turn on autocomplete in Markdown files,
- save pasted images to `assets/<note name>/` so two notes never fight over `image.png`,
- add snippets: type `note` for the header, `callout`, `qa` for a hidden-answer question, `wiki` for a link.

## Preview locally

```
node scripts/build.mjs
python -m http.server -d _site 8000
```

Then open http://localhost:8000. Needs Node 18 or newer, no `npm install`.

## How it works

`scripts/build.mjs` copies `site/` (the viewer) and `notes/` into `_site/`, and writes `_site/index.json` with each note's title, dates, topics, tags, searchable text and backlinks. The viewer loads that index and renders the Markdown in the browser. The editor (`site/editor.js`) and code runner (`site/runner.js`, using [Pyodide](https://pyodide.org) for Python) load only when you use them, so reading stays fast. Nothing is sent anywhere: drafts stay in your browser until you save them. `.github/workflows/deploy.yml` runs the build on every push to `main` and publishes `_site/`.
