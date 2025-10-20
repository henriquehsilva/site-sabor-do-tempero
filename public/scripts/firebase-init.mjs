// /public/scripts/firebase-init.mjs
const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

function assertEnv() {
  const missing = REQUIRED.filter(k => !window.env?.[k] || String(window.env[k]).trim() === '');
  if (missing.length) throw new Error('Firebase CONFIGURATION_NOT_FOUND: ' + missing.join(', '));
}

// (Opcional) restringir domínios
function checkDomain() {
  const allow = window.env?.AUTHORIZED_DOMAINS;
  if (Array.isArray(allow) && allow.length) {
    const host = location.hostname.toLowerCase();
    const ok = allow.some(d => host === String(d).toLowerCase() || host.endsWith('.' + String(d).toLowerCase()));
    if (!ok) throw new Error(`Firebase DOMAIN_NOT_ALLOWED: '${host}' não autorizado.`);
  }
}

async function init() {
  try {
    if (window.__fb?.db) return;

    if (!window.env || !window.env.VITE_FIREBASE_API_KEY) {
      console.warn('[Firebase] window.env ausente – usando apenas localStorage.');
      return;
    }

    assertEnv();
    checkDomain();

    const [
      { initializeApp },
      { getAuth, signInAnonymously, onAuthStateChanged },
      { getFirestore, doc, collection, onSnapshot, setDoc, deleteDoc, serverTimestamp }
    ] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js')
    ]);

    const firebaseConfig = {
      apiKey: window.env.VITE_FIREBASE_API_KEY,
      authDomain: window.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: window.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: window.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: window.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: window.env.VITE_FIREBASE_APP_ID
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    try {
      await signInAnonymously(auth);
    } catch (err) {
      const code = err?.code || String(err);
      console.warn('[Firebase] Auth anônima falhou, fallback localStorage. Motivo:', code);
      return;
    }

    const db = getFirestore(app);
    let currentUid = null;
    onAuthStateChanged(auth, u => { currentUid = u?.uid || null; });

    window.__fb = {
      app, auth, db,
      doc, collection, onSnapshot, setDoc, deleteDoc, serverTimestamp,
      get uid() { return currentUid; }
    };

    console.log('[Firebase] OK – auth anônima ativa.');
  } catch (e) {
    console.warn('[Firebase] Falha ao inicializar, usando localStorage:', e.message || e);
  }
}

init();
