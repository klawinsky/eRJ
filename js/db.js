// js/db.js
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  limit
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- Users ---------- */
export async function listUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}

export async function getUserByEmailOrId(key) {
  const docRef = doc(db, 'users', key);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) return { uid: docSnap.id, ...docSnap.data() };
  const q = query(collection(db, 'users'), where('email', '==', key));
  const snap = await getDocs(q);
  if (!snap.empty) return { uid: snap.docs[0].id, ...snap.docs[0].data() };
  const q2 = query(collection(db, 'users'), where('id', '==', key));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) return { uid: snap2.docs[0].id, ...snap2.docs[0].data() };
  return null;
}

export async function addUserProfile({ uid, name, id, zdp, email, role, status }) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { name, id, zdp, email, role: role || 'user', status: status || 'active', createdAt: new Date().toISOString() });
  return true;
}

export async function registerUser({ name, id, zdp, email, role, status }) {
  const docRef = await addDoc(collection(db, 'users'), { name, id, zdp, email, role: role || 'user', status: status || 'active', createdAt: new Date().toISOString() });
  return { uid: docRef.id, name, id, email };
}

export async function updateUser(key, patch) {
  const u = await getUserByEmailOrId(key);
  if (!u) throw new Error('Nie znaleziono użytkownika');
  const ref = doc(db, 'users', u.uid);
  await updateDoc(ref, patch);
  const updated = await getDoc(ref);
  return { uid: updated.id, ...updated.data() };
}

export async function deleteUser(key) {
  const u = await getUserByEmailOrId(key);
  if (!u) throw new Error('Nie znaleziono użytkownika');
  await deleteDoc(doc(db, 'users', u.uid));
  return true;
}

export async function findUserByIdOrEmail(key) {
  return await getUserByEmailOrId(key);
}

/* ---------- Reports ---------- */
export async function listReports() {
  const snap = await getDocs(collection(db, 'reports'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveReport(report) {
  if (report.id) {
    const ref = doc(db, 'reports', report.id);
    await setDoc(ref, report, { merge: true });
    return report;
  }
  if (report.number) {
    const q = query(collection(db, 'reports'), where('number', '==', report.number), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const ref = doc(db, 'reports', snap.docs[0].id);
      await setDoc(ref, report, { merge: true });
      return { id: snap.docs[0].id, ...report };
    }
  }
  const docRef = await addDoc(collection(db, 'reports'), report);
  report.id = docRef.id;
  return report;
}

export async function getReport(numberOrId) {
  try {
    const ref = doc(db, 'reports', numberOrId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...snap.data() };
  } catch (e) {}
  const q = query(collection(db, 'reports'), where('number', '==', numberOrId), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  return null;
}

/* ---------- Counter (transaction-safe) ---------- */
export async function nextCounter() {
  const counterRef = doc(db, 'meta', 'counters');
  const newVal = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    let v = 0;
    if (snap.exists()) v = snap.data().reportsCounter || 0;
    v = v + 1;
    tx.set(counterRef, { reportsCounter: v }, { merge: true });
    return v;
  });
  return newVal;
}

/* ---------- Phonebook ---------- */
export async function listPhonebookLocal() {
  const snap = await getDocs(collection(db, 'phonebook'));
  return snap.docs.map(d => d.data());
}

export async function replacePhonebookLocal(entries) {
  const snap = await getDocs(collection(db, 'phonebook'));
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'phonebook', d.id));
  }
  for (const e of entries) {
    await addDoc(collection(db, 'phonebook'), e);
  }
  return entries;
}
