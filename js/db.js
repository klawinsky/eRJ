// js/db.js
// Prosty lokalny "DB" oparty na localStorage.
// Rozszerzony o obsługę zniżek ustawowych.

const LS_USERS = 'erj_users_v1';
const LS_REPORTS = 'erj_reports_v1';
const LS_PHONEBOOK = 'erj_phonebook_v1';
const LS_COUNTER = 'erj_counter_v1';
const LS_DISCOUNTS = 'erj_discounts_v1';

function read(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

/* ---------- Users ---------- */
export async function listUsers() {
  return read(LS_USERS, []);
}

export async function getUserByEmailOrId(key) {
  const users = read(LS_USERS, []);
  return users.find(u => (u.email && u.email === key) || (u.id && u.id === key)) || null;
}

export async function registerUser({ name, id, zdp, email, role, status }) {
  const users = read(LS_USERS, []);
  if (users.find(u => u.email === email || u.id === id)) throw new Error('Użytkownik już istnieje');
  users.push({ name, id, zdp, email, role: role || 'user', status: status || 'active' });
  write(LS_USERS, users);
  return true;
}

export async function updateUser(key, patch) {
  const users = read(LS_USERS, []);
  const idx = users.findIndex(u => (u.email && u.email === key) || (u.id && u.id === key));
  if (idx === -1) throw new Error('Nie znaleziono użytkownika');
  users[idx] = { ...users[idx], ...patch };
  write(LS_USERS, users);
  return users[idx];
}

export async function deleteUser(key) {
  let users = read(LS_USERS, []);
  users = users.filter(u => !((u.email && u.email === key) || (u.id && u.id === key)));
  write(LS_USERS, users);
  return true;
}

/* ---------- Reports ---------- */
export async function listReports() {
  return read(LS_REPORTS, []);
}

export async function saveReport(report) {
  const reports = read(LS_REPORTS, []);
  const idx = reports.findIndex(r => r.number === report.number);
  if (idx === -1) reports.push(report); else reports[idx] = report;
  write(LS_REPORTS, reports);
  return report;
}

export async function getReport(number) {
  const reports = read(LS_REPORTS, []);
  return reports.find(r => r.number === number) || null;
}

export async function nextCounter() {
  const c = read(LS_COUNTER, 0) + 1;
  write(LS_COUNTER, c);
  return c;
}

/* ---------- Phonebook (local cache) ---------- */
export async function listPhonebookLocal() {
  return read(LS_PHONEBOOK, []);
}

export async function replacePhonebookLocal(entries) {
  write(LS_PHONEBOOK, entries);
  return entries;
}

/* ---------- Discounts (zniżki) ---------- */
export async function listDiscounts() {
  // zwraca tablicę obiektów: { code, name, type, value, description }
  return read(LS_DISCOUNTS, seedDiscounts());
}

export async function replaceDiscounts(entries) {
  // entries: [{code,name,type,value,description}, ...]
  write(LS_DISCOUNTS, entries);
  return entries;
}

export async function addDiscount(entry) {
  const arr = read(LS_DISCOUNTS, seedDiscounts());
  arr.push(entry);
  write(LS_DISCOUNTS, arr);
  return entry;
}

export async function resetDiscountsToSeed() {
  const seed = seedDiscounts();
  write(LS_DISCOUNTS, seed);
  return seed;
}

/* ---------- Seed danych zniżek (przykładowe) ---------- */
function seedDiscounts() {
  // Domyślne przykładowe zniżki. Możesz je zastąpić danymi z załącznika.
  return [
    { code: 'U50', name: 'Ulgowy 50% (senior/uczestnik)', type: 'percent', value: '50', description: 'Zniżka 50% na bilety krajowe (wybrane grupy)' },
    { code: 'U37', name: 'Ulgowy 37% (student)', type: 'percent', value: '37', description: 'Zniżka 37% dla studentów i uczniów' },
    { code: 'D95', name: 'Dzieci 95% (dziecięca)', type: 'percent', value: '95', description: 'Zniżka 95% dla dzieci (wg przepisów)' },
    { code: 'EXEMPT', name: 'Zwolnienie 100% (osoby niepełnosprawne)', type: 'exemption', value: '100', description: 'Pełne zwolnienie dla uprawnionych osób' },
    { code: 'FAM', name: 'Rodzinny (stała)', type: 'fixed', value: 'bezpłatny/obniżony', description: 'Zniżki rodzinne i specjalne' }
  ];
}
