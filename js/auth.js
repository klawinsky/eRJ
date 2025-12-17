// js/auth.js
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export async function initAuth() {
  // Zwracamy placeholder (kompatybilność z dotychczasowym kodem demo)
  return 'admin-placeholder';
}

export async function registerUser({ name, id, zdp, email, password, role, status }) {
  if (!email || !password) throw new Error('Email i hasło są wymagane');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name || '' });
  // zapis profilu w Firestore (db.addUserProfile)
  const { addUserProfile } = await import('./db.js');
  await addUserProfile({ uid: cred.user.uid, name, id, zdp, email, role: role || 'user', status: status || 'active' });
  return true;
}

export async function login(idOrEmail, password, remember = false) {
  const isEmail = /\S+@\S+\.\S+/.test(idOrEmail);
  let emailToUse = idOrEmail;
  if (!isEmail) {
    const { findUserByIdOrEmail } = await import('./db.js');
    const u = await findUserByIdOrEmail(idOrEmail);
    if (!u) return { ok: false, reason: 'Nieprawidłowy login' };
    emailToUse = u.email;
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, emailToUse, password);
    const user = { id: cred.user.uid, name: cred.user.displayName || cred.user.email, email: cred.user.email, role: 'user' };
    return { ok: true, user };
  } catch (err) {
    return { ok: false, reason: err.message || 'Błąd logowania' };
  }
}

export function logout() {
  return signOut(auth);
}

export function currentUser() {
  const u = auth.currentUser;
  if (!u) return null;
  return { id: u.uid, name: u.displayName || u.email, email: u.email };
}

export async function hashPassword(pw) {
  const enc = new TextEncoder();
  const data = enc.encode((pw || '') + '::erj_salt_v1');
  const buf = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex;
}

export function onAuthChange(cb) {
  return onAuthStateChanged(auth, (user) => {
    if (user) cb({ id: user.uid, name: user.displayName || user.email, email: user.email });
    else cb(null);
  });
}
