// js/app.js
// Poprawiona wersja app.js — pełny plik.
// Wymaga: js/db.js, js/auth.js, js/pdf.js, js/discounts.js

import { listUsers, getUserByEmailOrId, updateUser, deleteUser, saveReport, nextCounter, listReports, listPhonebookLocal, replacePhonebookLocal } from './db.js';
import { initAuth, registerUser, login, logout, currentUser, hashPassword } from './auth.js';
import { exportR7Pdf } from './pdf.js';
import { initDiscountsUI } from './discounts.js';

/* ---------- Helpers ---------- */
const qs = id => document.getElementById(id);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const el = (tag, cls) => { const d = document.createElement(tag); if (cls) d.className = cls; return d; };
const safeText = v => (v === undefined || v === null || v === '') ? '-' : v;
const toNumber = v => { const n = parseFloat(String(v || '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const round2 = v => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const adminPlain = await initAuth();

  // UI refs
  const loginView = qs('loginView'), appShell = qs('appShell');
  const loginForm = qs('loginForm'), loginId = qs('loginId'), loginPassword = qs('loginPassword'), loginMsg = qs('loginMsg'), demoBtn = qs('demoBtn'), rememberMe = qs('rememberMe');
  const loggedUserInfo = qs('loggedUserInfo'), btnLogout = qs('btnLogout'), btnHome = qs('btnHome');

  const dashboard = qs('dashboard');
  const tileHandleTrain = qs('tileHandleTrain'), tileTakeOver = qs('tileTakeOver'), tileAdmin = qs('tileAdmin'), tilePhonebook = qs('tilePhonebook'), tileDiscounts = qs('tileDiscounts');
  const tileRegiojetPL = qs('tileRegiojetPL'), tileRozkladCZ = qs('tileRozkladCZ');

  const handleTrainMenu = qs('handleTrainMenu'), backFromHandle = qs('backFromHandle'), homeFromHandle = qs('homeFromHandle');
  const takeOverMenu = qs('takeOverMenu'), backFromTakeover = qs('backFromTakeover'), homeFromTakeover = qs('homeFromTakeover'), takeoverForm = qs('takeoverForm'), takeoverMsg = qs('takeoverMsg');
  const phonebookPanel = qs('phonebookPanel'), backFromPhonebook = qs('backFromPhonebook'), homeFromPhonebook = qs('homeFromPhonebook');
  const discountsPanel = qs('discountsPanel'), backFromDiscounts = qs('backFromDiscounts'), homeFromDiscounts = qs('homeFromDiscounts');

  const btnNewReport = qs('btnNewReport'), btnNewR7 = qs('btnNewR7');

  const r7Panel = qs('r7Panel'), r7List = qs('r7List'), r7_addLocomotive = qs('r7_addLocomotive'), r7_addWagon = qs('r7_addWagon'), r7_analyze = qs('r7_analyze'), r7_print_pdf = qs('r7_print_pdf');
  const r7_trainNumber = qs('r7_trainNumber'), r7_date = qs('r7_date'), r7_from = qs('r7_from'), r7_to = qs('r7_to'), r7_driver = qs('r7_driver'), r7_conductor = qs('r7_conductor');
  const r7Results = qs('r7Results');

  const phonebookTableBody = qs('phonebookTable')?.querySelector('tbody');

  // session helpers
  function showLogin() { if (loginView) loginView.style.display = 'block'; if (appShell) appShell.style.display = 'none'; }
  async function showAppFor(user) {
    if (loginView) loginView.style.display = 'none'; if (appShell) appShell.style.display = 'block';
    if (loggedUserInfo) loggedUserInfo.textContent = `${user.name} (${user.id}) · ${user.role}`;
    // hide panels
    if (handleTrainMenu) handleTrainMenu.classList.add('hidden');
    if (takeOverMenu) takeOverMenu.classList.add('hidden');
    if (phonebookPanel) phonebookPanel.classList.add('hidden');
    if (discountsPanel) discountsPanel.classList.add('hidden');
    if (dashboard) dashboard.style.display = 'block';
    await refreshUsersTable();
    await loadPhonebookFromGithub();
  }

  // restore session if exists
  const sess = currentUser();
  showLogin();
  if (sess) await showAppFor(sess);

  /* ---------- Auth ---------- */
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginMsg) loginMsg.textContent = '';
      const id = loginId.value.trim();
      const pw = loginPassword.value;
      const remember = rememberMe && rememberMe.checked;
      if (!id || !pw) return loginMsg && (loginMsg.textContent = 'Podaj login i hasło.');
      const res = await login(id, pw, remember);
      if (!res.ok) return loginMsg && (loginMsg.textContent = res.reason || 'Błąd logowania');
      await showAppFor(res.user);
    });
  }

  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      if (loginId) loginId.value = 'klawinski.pawel@gmail.com';
      if (loginPassword) loginPassword.value = adminPlain;
      if (rememberMe) rememberMe.checked = true;
      loginForm && loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });
  }

  if (btnLogout) btnLogout.addEventListener('click', () => { logout(); showLogin(); if (loginId) loginId.value = ''; if (loginPassword) loginPassword.value = ''; if (loginMsg) loginMsg.textContent = ''; });

  if (btnHome) btnHome.addEventListener('click', () => {
    if (dashboard) dashboard.style.display = 'block';
    if (handleTrainMenu) handleTrainMenu.classList.add('hidden');
    if (takeOverMenu) takeOverMenu.classList.add('hidden');
    if (phonebookPanel) phonebookPanel.classList.add('hidden');
    if (discountsPanel) discountsPanel.classList.add('hidden');
  });

  /* ---------- Dashboard navigation ---------- */
  if (tileHandleTrain) tileHandleTrain.addEventListener('click', () => {
    if (dashboard) dashboard.style.display = 'none';
    if (handleTrainMenu) handleTrainMenu.classList.remove('hidden');
  });
  if (backFromHandle) backFromHandle.addEventListener('click', () => { if (handleTrainMenu) handleTrainMenu.classList.add('hidden'); if (dashboard) dashboard.style.display = 'block'; });
  if (homeFromHandle) homeFromHandle.addEventListener('click', () => { if (handleTrainMenu) handleTrainMenu.classList.add('hidden'); if (dashboard) dashboard.style.display = 'block'; });

  if (tileTakeOver) tileTakeOver.addEventListener('click', () => { if (dashboard) dashboard.style.display = 'none'; if (takeOverMenu) takeOverMenu.classList.remove('hidden'); });
  if (backFromTakeover) backFromTakeover.addEventListener('click', () => { if (takeOverMenu) takeOverMenu.classList.add('hidden'); if (dashboard) dashboard.style.display = 'block'; });
  if (homeFromTakeover) homeFromTakeover.addEventListener('click', () => { if (takeOverMenu) takeOverMenu.classList.add('hidden'); if (dashboard) dashboard.style.display = 'block'; });

  if (tilePhonebook) tilePhonebook.addEventListener('click', async () => { if (dashboard) dashboard.style.display = 'none'; if (phonebookPanel) phonebookPanel.classList.remove('hidden'); await loadPhonebookFromGithub(); });
  if (backFromPhonebook) backFromPhonebook.addEventListener('click', () => { if (phonebookPanel) phonebookPanel.classList.add('hidden'); if (dashboard) dashboard.style.display = 'block'; });
  if (homeFromPhonebook) homeFromPhonebook.addEventListener('click', () => { if (phonebookPanel) phonebookPanel.classList.add('hidden'); if (dashboard) dashboard.style.display = 'block'; });

  if (tileDiscounts) tileDiscounts.addEventListener('click', async () => { if (dashboard) dashboard.style.display = 'none'; if (discountsPanel) discountsPanel.classList.remove('hidden'); try { await initDiscountsUI(); } catch (err) { console.error(err); alert('Błąd ładowania zakładki zniżek.'); } });
  if (backFromDiscounts) backFromDiscounts.addEventListener('click', () => { if (discountsPanel) discountsPanel.classList.add('hidden'); if (dashboard) dashboard.style.display = 'block'; });
  if (homeFromDiscounts) homeFromDiscounts.addEventListener('click', () => { if (discountsPanel) discountsPanel.classList.add('hidden'); if (dashboard) dashboard.style.display = 'block'; });

  // external schedule links: ensure they open in new tab (anchors already present in HTML)
  if (tileRegiojetPL) tileRegiojetPL.addEventListener('click', (e) => {
    const a = tileRegiojetPL.querySelector('a');
    if (a) window.open(a.href, '_blank', 'noopener');
  });
  if (tileRozkladCZ) tileRozkladCZ.addEventListener('click', (e) => {
    const a = tileRozkladCZ.querySelector('a');
    if (a) window.open(a.href, '_blank', 'noopener');
  });

  /* ---------- Takeover form ---------- */
  if (takeoverForm) {
    takeoverForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (takeoverMsg) takeoverMsg.textContent = '';
      const trainNum = qs('takeoverTrainNumber').value.trim();
      const date = qs('takeoverDate').value;
      if (!trainNum || !date) return takeoverMsg && (takeoverMsg.textContent = 'Wypełnij numer pociągu i datę.');
      const reports = await listReports();
      const found = reports.find(r => (r.sectionA && r.sectionA.trainNumber && r.sectionA.trainNumber.includes(trainNum)));
      if (!found) return takeoverMsg && (takeoverMsg.textContent = 'Nie znaleziono raportu dla podanego numeru i daty.');
      const u = currentUser();
      found.takenBy = { name: u.name, id: u.id, at: new Date().toISOString() };
      found.currentDriver = { name: u.name, id: u.id };
      await saveReport(found);
      alert('Przejęto raport. Otwieranie widoku raportu...');
      // open handleTrainMenu and R-7 inside
      if (dashboard) dashboard.style.display = 'none';
      if (handleTrainMenu) handleTrainMenu.classList.remove('hidden');
      // set currentReport in window for compatibility with other modules
      window.currentReport = found;
      // render R7 list if present
      renderR7FromReport(found);
    });
  }

  /* ---------- Phonebook (load) ---------- */
  async function loadPhonebookFromGithub() {
    if (!phonebookTableBody) return;
    phonebookTableBody.innerHTML = '<tr><td colspan="4" class="text-muted small">Ładowanie...</td></tr>';
    try {
      // If you have a real raw URL, replace below. For now try local storage fallback.
      const local = await listPhonebookLocal();
      if (local && local.length) {
        renderPhonebook(local);
        return;
      }
      phonebookTableBody.innerHTML = '<tr><td colspan="4" class="text-muted small">Brak danych w lokalnym repozytorium.</td></tr>';
    } catch (err) {
      phonebookTableBody.innerHTML = '<tr><td colspan="4" class="text-danger small">Błąd ładowania książki telefonicznej.</td></tr>';
    }
  }
  function renderPhonebook(entries) {
    if (!phonebookTableBody) return;
    phonebookTableBody.innerHTML = '';
    entries.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${safeText(e.name)}</td><td>${safeText(e.role)}</td><td><a href="tel:${encodeURIComponent(e.number)}">${safeText(e.number)}</a></td><td>${safeText(e.hours)}</td>`;
      phonebookTableBody.appendChild(tr);
    });
  }

  /* ---------- R-7 helpers (render from report) ---------- */
  function renderR7FromReport(report) {
    const container = r7List;
    if (!container) return;
    container.innerHTML = '';
    const rows = (report.r7List || []);
    rows.forEach((v, i) => {
      const item = document.createElement('div');
      item.className = 'list-group-item d-flex justify-content-between align-items-start';
      item.innerHTML = `<div>
          <div><strong>${safeText(v.type==='locomotive'?'Lokomotywa':'Wagon')} ${safeText(v.evn)}</strong> <span class="small text-muted">(${safeText(v.series)})</span></div>
          <div class="small text-muted">Dł: ${safeText(v.length)} m · Masa własna: ${safeText(v.empty_mass)} t · Masa ład.: ${safeText(v.payload)} t · Masa ham.: ${safeText(v.brake_mass)} t</div>
        </div>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary r7-edit" data-idx="${i}">Edytuj</button>
          <button class="btn btn-sm btn-outline-danger r7-del" data-idx="${i}">Usuń</button>
        </div>`;
      container.appendChild(item);
    });
    // attach simple handlers (editing modal not implemented here; this keeps UI responsive)
    container.querySelectorAll('.r7-del').forEach(btn => btn.addEventListener('click', async (e) => {
      const idx = Number(btn.dataset.idx);
      if (!window.currentReport) return;
      window.currentReport.r7List.splice(idx, 1);
      await saveReport(window.currentReport);
      renderR7FromReport(window.currentReport);
    }));
  }

  // New report / new R7 buttons inside handleTrainMenu
  if (btnNewReport) {
    btnNewReport.addEventListener('click', async () => {
      const u = currentUser();
      const name = u?.name || '';
      const id = u?.id || '';
      if (!name || !id) return alert('Brak danych prowadzącego. Uzupełnij profil.');
      const c = await nextCounter();
      const d = new Date();
      const DD = String(d.getDate()).padStart(2, '0');
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const YY = String(d.getFullYear()).slice(-2);
      const XXX = String(c).padStart(3, '0');
      const number = `${XXX}/${DD}/${MM}/${YY}`;
      const report = {
        number,
        createdAt: new Date().toISOString(),
        createdBy: { name, id },
        currentDriver: { name, id },
        sectionA: { trainNumber: '', date: d.toISOString().slice(0, 10) },
        r7List: []
      };
      await saveReport(report);
      window.currentReport = report;
      if (dashboard) dashboard.style.display = 'none';
      if (handleTrainMenu) handleTrainMenu.classList.remove('hidden');
      renderR7FromReport(report);
      alert('Utworzono nowy raport: ' + number);
    });
  }

  if (btnNewR7) {
    btnNewR7.addEventListener('click', () => {
      if (!window.currentReport) return alert('Najpierw utwórz lub otwórz raport.');
      // open a simple prompt to add a wagon/loco (lightweight)
      const type = prompt('Typ pojazdu (locomotive/wagon):', 'wagon');
      if (!type) return;
      const evn = prompt('Numer EVN:','');
      const length = parseFloat(prompt('Długość (m):','0')) || 0;
      const empty_mass = parseFloat(prompt('Masa własna (t):','0')) || 0;
      const payload = parseFloat(prompt('Masa ładunku (t):','0')) || 0;
      const brake_mass = parseFloat(prompt('Masa hamująca (t):','0')) || 0;
      const entry = { type, evn, length, empty_mass, payload, brake_mass, series:'', country:'PL', operator:'RJ', operator_code:'', from:'', to:'', notes:'' };
      window.currentReport.r7List = window.currentReport.r7List || [];
      window.currentReport.r7List.push(entry);
      saveReport(window.currentReport);
      renderR7FromReport(window.currentReport);
    });
  }

  if (r7_addLocomotive) r7_addLocomotive.addEventListener('click', () => btnNewR7 && btnNewR7.click());
  if (r7_addWagon) r7_addWagon.addEventListener('click', () => btnNewR7 && btnNewR7.click());

  if (r7_analyze) r7_analyze.addEventListener('click', () => {
    if (!window.currentReport) return alert('Otwórz raport z wykazem R-7.');
    const list = window.currentReport.r7List || [];
    const totalLength = round2(list.reduce((s, v) => s + toNumber(v.length), 0));
    const massWagons = round2(list.filter(v => v.type !== 'locomotive').reduce((s, v) => s + toNumber(v.empty_mass) + toNumber(v.payload), 0));
    const massLocos = round2(list.filter(v => v.type === 'locomotive').reduce((s, v) => s + toNumber(v.empty_mass) + toNumber(v.payload), 0));
    const massTotal = round2(massWagons + massLocos);
    const brakeWagons = round2(list.filter(v => v.type !== 'locomotive').reduce((s, v) => s + toNumber(v.brake_mass), 0));
    const brakeLocos = round2(list.filter(v => v.type === 'locomotive').reduce((s, v) => s + toNumber(v.brake_mass), 0));
    const brakeTotal = round2(brakeWagons + brakeLocos);
    if (r7Results) r7Results.style.display = 'block';
    if (qs('res_length')) qs('res_length').textContent = totalLength;
    if (qs('res_mass_wagons')) qs('res_mass_wagons').textContent = massWagons;
    if (qs('res_mass_total')) qs('res_mass_total').textContent = massTotal;
    if (qs('res_brake_total')) qs('res_brake_total').textContent = brakeTotal;
    // store analysis
    window.currentReport._analysis = { length: totalLength, massWagons, massTotal, brakeTotal };
    saveReport(window.currentReport);
  });

  if (r7_print_pdf) r7_print_pdf.addEventListener('click', async () => {
    if (!window.currentReport) return alert('Brak wykazu do wydruku.');
    // update meta
    window.currentReport.r7Meta = {
      from: r7_from?.value || '',
      to: r7_to?.value || '',
      driver: r7_driver?.value || '',
      conductor: r7_conductor?.value || ''
    };
    window.currentReport.sectionA = window.currentReport.sectionA || {};
    window.currentReport.sectionA.trainNumber = r7_trainNumber?.value || window.currentReport.sectionA.trainNumber || '';
    window.currentReport.sectionA.date = r7_date?.value || window.currentReport.sectionA.date || '';
    await saveReport(window.currentReport);
    await exportR7Pdf(window.currentReport, `${(window.currentReport.number || 'R7').replace(/\//g, '-')}.pdf`);
  });

  /* ---------- Admin helpers (minimal) ---------- */
  async function refreshUsersTable() {
    // if admin panel exists, refresh; otherwise ignore
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const users = await listUsers();
    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${safeText(u.name)}</td><td>${safeText(u.id)}</td><td>${safeText(u.zdp)}</td><td>${safeText(u.email)}</td><td>${safeText(u.role)}</td><td>${safeText(u.status)}</td>
        <td><button class="btn btn-sm btn-outline-secondary me-1" data-action="edit" data-key="${u.email||u.id}">Edytuj</button><button class="btn btn-sm btn-outline-danger" data-action="del" data-key="${u.email||u.id}">Usuń</button></td>`;
      tbody.appendChild(tr);
    });
  }

  // initial load
  await refreshUsersTable();
  await loadPhonebookFromGithub();
});
