(() => {
  'use strict';

  const A = window.NotesApp;
  const { $, $$, esc, fmt } = A;
  const SIGNED_IN_KEY = 'notes-signed-in';

  const account = { user: null, role: 'visitor', requests: [], members: [] };
  let bar = null;
  let connecting = null;
  let clickWaiting = false;
  let busy = false;

  function connect() {
    connecting = connecting || (async () => {
      await A.loadScript('live.js');
      await NotesLive.prepare();
      firebase.auth().onAuthStateChanged(handleUser);
    })();
    connecting.catch(() => { connecting = null; });
    return connecting;
  }

  async function handleUser(user) {
    account.user = user;
    account.requests = [];
    account.members = [];
    if (!user) {
      A.store.set(SIGNED_IN_KEY, '');
      account.role = 'visitor';
    } else {
      A.store.set(SIGNED_IN_KEY, '1');
      account.role = await findRole(user);
      if (account.role === 'owner') watchAccessLists();
    }
    render();
    refreshRequestsPage();
  }

  async function canRead(path) {
    try {
      return { allowed: true, exists: (await firebase.database().ref(path).once('value')).exists() };
    } catch {
      return { allowed: false, exists: false };
    }
  }

  async function findRole(user) {
    if ((await canRead('requests')).allowed) return 'owner';
    if ((await canRead(`members/${user.uid}`)).exists) return 'member';
    if ((await canRead(`requests/${user.uid}`)).exists) return 'pending';
    return 'signed-in';
  }

  function watchAccessLists() {
    const toList = (snap) => Object.entries(snap.val() || {}).map(([uid, info]) => ({ uid, ...info }));
    firebase.database().ref('requests').on('value', (snap) => {
      account.requests = toList(snap).sort((a, b) => (a.requested || 0) - (b.requested || 0));
      render();
      refreshRequestsPage();
    });
    firebase.database().ref('members').on('value', (snap) => {
      account.members = toList(snap).sort((a, b) => String(a.name).localeCompare(String(b.name)));
      refreshRequestsPage();
    });
  }

  async function signIn() {
    if (!window.firebase || !firebase.apps.length) {
      clickWaiting = true;
      render();
      try { await connect(); } catch (err) { showMessage(NotesLive.explain(err)); }
      render();
      return;
    }
    clickWaiting = false;
    try {
      await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch (err) {
      showMessage(NotesLive.explain(err));
    }
  }

  async function requestAccess() {
    const user = account.user;
    busy = true;
    render();
    try {
      await firebase.database().ref(`requests/${user.uid}`).set({
        name: user.displayName || user.email,
        email: user.email,
        requested: firebase.database.ServerValue.TIMESTAMP,
      });
      account.role = 'pending';
    } catch (err) {
      showMessage(NotesLive.explain(err));
    }
    busy = false;
    render();
  }

  function showMessage(text) {
    const el = $('.account-msg', bar);
    if (el) el.textContent = text;
  }

  function render() {
    if (!bar) return;
    const user = account.user;
    const name = user ? esc(user.displayName || user.email) : '';
    const signOut = '<button type="button" class="linklike" data-account="sign-out">Sign out</button>';
    let html;
    if (!user) {
      html = `<button type="button" class="btn btn-small" data-account="sign-in">${!clickWaiting ? 'Sign in to comment' : window.firebase && firebase.apps.length ? 'Continue with Google' : 'Loading…'}</button>`;
    } else if (account.role === 'owner') {
      const waiting = account.requests.length;
      html = `<a href="#/requests" class="btn btn-small${waiting ? '' : ' btn-quiet'}">${waiting ? `Requests (${waiting})` : 'Comment access'}</a>${signOut}`;
    } else if (account.role === 'member') {
      html = `<span>${name}</span>${signOut}`;
    } else if (account.role === 'pending') {
      html = `<span>Access requested. You can comment once it’s approved.</span>${signOut}`;
    } else {
      html = `<span>${name}</span><button type="button" class="btn btn-small" data-account="request"${busy ? ' disabled' : ''}>Request access to comment</button>${signOut}`;
    }
    bar.innerHTML = `<div class="account-row">${html}</div><p class="account-msg" aria-live="polite"></p>`;
  }

  function personRow(person, actions) {
    const when = person.requested || person.approved;
    const date = when ? fmt(new Date(when).toISOString().slice(0, 10)) : '';
    return `<li class="person">
      <span class="person-name">${esc(person.name)}</span>
      <span class="person-email">${esc(person.email)}</span>
      <span class="person-date">${esc(date)}</span>
      <span class="person-actions">${actions}</span>
    </li>`;
  }

  function requestsHTML() {
    if (!account.user) {
      return `<h1>Comment access</h1><p>Sign in with the site owner’s Google account to manage who can comment.</p>
        <button type="button" class="btn" data-account="sign-in">Sign in</button>`;
    }
    if (account.role !== 'owner') {
      return '<h1>Comment access</h1><p>Only the site owner can see this page.</p>';
    }
    const waiting = account.requests.map((p) => personRow(p, `
      <button type="button" class="btn btn-small" data-approve="${esc(p.uid)}">Approve</button>
      <button type="button" class="linklike danger" data-decline="${esc(p.uid)}">Decline</button>`)).join('');
    const approved = account.members.map((p) => personRow(p, `
      <button type="button" class="linklike danger" data-remove="${esc(p.uid)}">Remove</button>`)).join('');
    return `<h1>Comment access</h1>
      <h2>Waiting for approval</h2>
      ${waiting ? `<ul class="people">${waiting}</ul>` : '<p class="muted">No requests right now.</p>'}
      <h2>Can comment</h2>
      ${approved ? `<ul class="people">${approved}</ul>` : '<p class="muted">Nobody yet.</p>'}`;
  }

  function refreshRequestsPage() {
    const page = $('.requests-page');
    if (page) page.innerHTML = requestsHTML();
  }

  async function showRequests(main) {
    main.innerHTML = '<section class="empty requests-page"><p class="muted">Loading…</p></section>';
    try {
      await connect();
    } catch (err) {
      $('.requests-page', main).innerHTML = `<p>${esc(err.message)}</p>`;
      return;
    }
    refreshRequestsPage();
  }

  async function approve(uid) {
    const person = account.requests.find((p) => p.uid === uid);
    if (!person) return;
    await firebase.database().ref().update({
      [`members/${uid}`]: { name: person.name, email: person.email, approved: firebase.database.ServerValue.TIMESTAMP },
      [`requests/${uid}`]: null,
    });
  }

  function onClick(e) {
    const t = e.target;
    const action = t.closest('[data-account]')?.dataset.account;
    if (action === 'sign-in') signIn();
    else if (action === 'sign-out') firebase.auth().signOut();
    else if (action === 'request') requestAccess();
    else if (t.closest('[data-approve]')) approve(t.closest('[data-approve]').dataset.approve);
    else if (t.closest('[data-decline]')) {
      const uid = t.closest('[data-decline]').dataset.decline;
      if (confirm('Decline this request?')) firebase.database().ref(`requests/${uid}`).remove();
    } else if (t.closest('[data-remove]')) {
      const uid = t.closest('[data-remove]').dataset.remove;
      if (confirm('Remove this person’s access to comment?')) firebase.database().ref(`members/${uid}`).remove();
    }
  }

  function init() {
    bar = document.createElement('div');
    bar.className = 'account-bar';
    document.body.append(bar);
    render();
    document.addEventListener('click', onClick);
    const preload = () => connect().then(render).catch(() => {});
    bar.addEventListener('pointerenter', preload, { once: true });
    bar.addEventListener('focusin', preload, { once: true });
    if (A.store.get(SIGNED_IN_KEY, '')) preload();
  }

  window.NotesAccount = { init, showRequests, state: account, connect };
})();
