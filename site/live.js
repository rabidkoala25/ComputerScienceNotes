(() => {
  'use strict';

  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const SEND_DELAY = 300;
  const MAX_IMAGE_BYTES = 3_000_000;
  const A = window.NotesApp;

  let firebaseReady = null;
  let sendTimer = null;
  let waitingSnapshot = null;
  let lastImageList = '';
  let errorHandler = () => {};
  let signedInUser = null;

  function loadFirebase() {
    const config = A.state.site.firebase;
    if (!config) return Promise.reject(new Error('Live mode isn’t set up yet: add your Firebase details to config.json.'));
    firebaseReady = firebaseReady || (async () => {
      await A.loadScript(SDK + 'firebase-app-compat.js');
      await Promise.all([
        A.loadScript(SDK + 'firebase-auth-compat.js'),
        A.loadScript(SDK + 'firebase-database-compat.js'),
      ]);
      if (!firebase.apps.length) firebase.initializeApp(config);
      return firebase;
    })();
    firebaseReady.catch(() => { firebaseReady = null; });
    return firebaseReady;
  }

  const liveRef = () => firebase.database().ref('live');

  function currentUser(fb) {
    return new Promise((resolve) => {
      const stopListening = fb.auth().onAuthStateChanged((user) => {
        stopListening();
        resolve(user);
      });
    });
  }

  async function prepare() {
    const fb = await loadFirebase();
    signedInUser = await currentUser(fb);
  }

  async function start(onError) {
    errorHandler = onError || (() => {});
    if (!signedInUser) {
      if (!window.firebase || !firebase.apps.length) await prepare();
      if (!signedInUser) {
        const result = await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
        signedInUser = result.user;
      }
    }
    await liveRef().child('on').set(true);
    await liveRef().child('on').onDisconnect().set(false);
    lastImageList = '';
  }

  function push(snapshot) {
    waitingSnapshot = snapshot;
    if (!sendTimer) sendTimer = setTimeout(send, SEND_DELAY);
  }

  function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function send() {
    sendTimer = null;
    const snapshot = waitingSnapshot;
    waitingSnapshot = null;
    if (!snapshot) return;
    const changes = {
      on: true,
      title: snapshot.title,
      path: snapshot.path,
      md: snapshot.md,
      files: snapshot.files,
      updated: firebase.database.ServerValue.TIMESTAMP,
    };
    const imageList = snapshot.images.map((image) => `${image.name}:${image.blob.size}`).join('|');
    if (imageList !== lastImageList) {
      const images = [];
      for (const image of snapshot.images) {
        if (image.blob.size > MAX_IMAGE_BYTES) continue;
        images.push({ name: image.name, data: await readAsDataUrl(image.blob) });
      }
      changes.images = images;
      lastImageList = imageList;
    }
    try {
      await liveRef().update(changes);
    } catch (err) {
      errorHandler(err);
    }
  }

  async function stop() {
    clearTimeout(sendTimer);
    sendTimer = null;
    waitingSnapshot = null;
    lastImageList = '';
    await liveRef().update({ on: false });
  }

  async function watch(onChange) {
    const fb = await loadFirebase();
    const ref = fb.database().ref('live');
    const listener = (snap) => onChange(snap.val() || {});
    ref.on('value', listener, (err) => onChange({ error: err.message }));
    return () => ref.off('value', listener);
  }

  function explain(err) {
    const code = String((err && err.code) || '');
    const message = String((err && err.message) || err);
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Sign-in cancelled.';
    if (code === 'auth/popup-blocked') return 'The sign-in window was blocked. Allow pop-ups for this site and try again.';
    if (code === 'auth/unauthorized-domain') return `Add ${location.hostname} to Firebase: Authentication, Settings, Authorized domains.`;
    if (/permission.denied/i.test(code + message)) return 'This Google account isn’t allowed to go live. Check the email in your database rules.';
    return `Live failed: ${message}`;
  }

  window.NotesLive = { prepare, start, push, stop, watch, explain };
})();
