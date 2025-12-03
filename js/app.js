// js/app.js
// Samodzielny, kompletny skrypt obsługi nawigacji, raportów i R-7.
// Przechowuje dane w localStorage pod kluczami: erj_reports, erj_r7lists

/* ---------- Helpers ---------- */
const qs = id => document.getElementById(id);
const el = (tag, cls) => { const d = document.createElement(tag); if (cls) d.className = cls; return d; };
const nowISO = () => new Date().toISOString();
const uid = (p='id') => `${p}_${Date.now()}_${Math.floor(Math.random()*1000)}`;

/* ---------- Local storage simple DB ---------- */
function read(key, def = []) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; }
}
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function listReports() { return read('erj_reports', []); }
function saveReport(report) {
  const arr = listReports();
  const idx = arr.findIndex(r => r.id === report.id);
  if (idx >= 0) arr[idx] = report; else arr.push(report);
  write('erj_reports', arr);
}
function nextReportNumber() {
  const c = parseInt(localStorage.getItem('erj_counter') || '0', 10) + 1;
  localStorage.setItem('erj_counter', String(c));
  const d = new Date();
  const DD = String(d.getDate()).padStart(2,'0');
  const MM = String(d.getMonth()+1).padStart(2,'0');
  const YY = String(d.getFullYear()).slice(-2);
  return `${String(c).padStart(3,'0')}/${DD}/${MM}/${YY}`;
}

function listR7() { return read('erj_r7lists', []); }
function saveR7(listObj) {
  const arr = listR7();
  const idx = arr.findIndex(r => r.id === listObj.id);
  if (idx >= 0) arr[idx] = listObj; else arr.push(listObj);
  write('erj_r7lists', arr);
}

/* ---------- UI refs ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const dashboard = qs('dashboard');
  const handleTrainMenu = qs('handleTrainMenu');
  const takeOverMenu = qs('takeOverMenu');
  const reportPanel = qs('reportPanel');
  const r7CreatePanel = qs('r7CreatePanel');
  const phonebookPanel = qs('phonebookPanel');

  // dashboard tiles
  const tileHandleTrain = qs('tileHandleTrain');
  const tileTakeOver = qs('tileTakeOver');
  const tilePhonebook = qs('tilePhonebook');

  // handleTrain buttons
  const backFromHandle = qs('backFromHandle');
  const homeFromHandle = qs('homeFromHandle');
  const btnNewReport = qs('btnNewReport');
  const btnNewR7 = qs('btnNewR7');

  // takeover buttons
  const btnTakeoverReport = qs('btnTakeoverReport');
  const btnTakeoverR7 = qs('btnTakeoverR7');
  const backFromTakeover = qs('backFromTakeover');
  const homeFromTakeover = qs('homeFromTakeover');

  // report panel elements
  const rp_back = qs('rp_back');
  const rp_home = qs('rp_home');
  const rp_trainNumber = qs('rp_trainNumber');
  const rp_date = qs('rp_date');
  const rp_driver = qs('rp_driver');
  const rp_conductor = qs('rp_conductor');
  const rp_save = qs('rp_save');
  const rp_export = qs('rp_export');
  const reportsList = qs('reportsList');

  // r7 panel elements
  const r7_back = qs('r7_back');
  const r7_home = qs('r7_home');
  const r7_train = qs('r7_train');
  const r7_date_input = qs('r7_date_input');
  const r7_from_input = qs('r7_from_input');
  const r7_to_input = qs('r7_to_input');
  const r7_add_loco = qs('r7_add_loco');
  const r7_add_wagon = qs('r7_add_wagon');
  const r7_save = qs('r7_save');
  const r7Items = qs('r7Items');

  // phonebook
  const backFromPhonebook = qs('backFromPhonebook');
  const homeFromPhonebook = qs('homeFromPhonebook');
  const phonebookBody = qs('phonebookBody');

  // navigation helpers
  function show(elm) { if(!elm) return; elm.classList.remove('hidden'); }
  function hide(elm) { if(!elm) return; elm.classList.add('hidden'); }
  function showOnly(elm) {
    [dashboard, handleTrainMenu, takeOverMenu, reportPanel, r7CreatePanel, phonebookPanel].forEach(x => { if(!x) return; if(x===elm) show(x); else hide(x); });
  }

  // initial state
  showOnly(dashboard);

  /* ---------- Dashboard navigation ---------- */
  tileHandleTrain && tileHandleTrain.addEventListener('click', () => { showOnly(handleTrainMenu); });
  backFromHandle && backFromHandle.addEventListener('click', () => { showOnly(dashboard); });
  homeFromHandle && homeFromHandle.addEventListener('click', () => { showOnly(dashboard); });

  tileTakeOver && tileTakeOver.addEventListener('click', () => { showOnly(takeOverMenu); });
  backFromTakeover && backFromTakeover.addEventListener('click', () => { showOnly(dashboard); });
  homeFromTakeover && homeFromTakeover.addEventListener('click', () => { showOnly(dashboard); });

  tilePhonebook && tilePhonebook.addEventListener('click', () => { renderPhonebook(); showOnly(phonebookPanel); });
  backFromPhonebook && backFromPhonebook.addEventListener('click', () => { showOnly(dashboard); });
  homeFromPhonebook && homeFromPhonebook.addEventListener('click', () => { showOnly(dashboard); });

  /* ---------- New Report flow ---------- */
  btnNewReport && btnNewReport.addEventListener('click', () => {
    // create empty report and open report panel for editing
    const id = uid('report');
    const number = nextReportNumber();
    const report = {
      id, number, createdAt: nowISO(), trainNumber: '', date: new Date().toISOString().slice(0,10),
      driver: '', conductor: '', notes: '', r7Id: null
    };
    saveReport(report);
    openReportEditor(report.id);
  });

  // open report editor by id
  function openReportEditor(reportId) {
    const reports = listReports();
    const rep = reports.find(r => r.id === reportId);
    if (!rep) { alert('Nie znaleziono raportu'); return; }
    // populate fields
    rp_trainNumber.value = rep.trainNumber || rep.number || '';
    rp_date.value = rep.date || '';
    rp_driver.value = rep.driver || '';
    rp_conductor.value = rep.conductor || '';
    // store current id on panel element
    reportPanel.setAttribute('data-current-id', rep.id);
    renderReportsList(); // show history
    showOnly(reportPanel);
  }

  // save report
  rp_save && rp_save.addEventListener('click', () => {
    const id = reportPanel.getAttribute('data-current-id');
    if (!id) return alert('Brak aktywnego raportu');
    const reports = listReports();
    const rep = reports.find(r => r.id === id);
    if (!rep) return alert('Nie znaleziono raportu');
    rep.trainNumber = rp_trainNumber.value.trim();
    rep.date = rp_date.value || rep.date;
    rep.driver = rp_driver.value.trim();
    rep.conductor = rp_conductor.value.trim();
    rep.updatedAt = nowISO();
    saveReport(rep);
    alert('Zapisano raport');
    renderReportsList();
  });

  rp_export && rp_export.addEventListener('click', () => {
    const id = reportPanel.getAttribute('data-current-id');
    if (!id) return alert('Brak aktywnego raportu');
    const reports = listReports();
    const rep = reports.find(r => r.id === id);
    if (!rep) return alert('Nie znaleziono raportu');
    const blob = new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(rep.number||rep.id).replace(/\//g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  rp_back && rp_back.addEventListener('click', () => { showOnly(handleTrainMenu); });
  rp_home && rp_home.addEventListener('click', () => { showOnly(dashboard); });

  function renderReportsList() {
    const arr = listReports().slice().reverse();
    reportsList.innerHTML = '';
    if (!arr.length) { reportsList.innerHTML = '<div class="text-muted small">Brak zapisanych raportów.</div>'; return; }
    arr.forEach(r => {
      const d = el('div','list-group-item d-flex justify-content-between align-items-center');
      d.innerHTML = `<div><strong>${r.number || r.trainNumber || '—'}</strong> <div class="small text-muted">${r.date || ''} · ${r.driver || ''}</div></div>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary btn-open" data-id="${r.id}">Otwórz</button>
          <button class="btn btn-sm btn-outline-danger btn-del" data-id="${r.id}">Usuń</button>
        </div>`;
      d.querySelector('.btn-open').addEventListener('click', () => openReportEditor(r.id));
      d.querySelector('.btn-del').addEventListener('click', () => {
        if (!confirm('Usunąć raport?')) return;
        const all = listReports().filter(x => x.id !== r.id);
        write('erj_reports', all);
        renderReportsList();
      });
      reportsList.appendChild(d);
    });
  }

  /* ---------- R-7 creation flow ---------- */
  btnNewR7 && btnNewR7.addEventListener('click', () => {
    // create new empty R7 list and open editor
    const id = uid('r7');
    const r7 = { id, createdAt: nowISO(), trainNumber: '', date: new Date().toISOString().slice(0,10), from:'', to:'', items: [] };
    saveR7(r7);
    openR7Editor(r7.id);
  });

  function openR7Editor(r7Id) {
    const arr = listR7();
    const r7 = arr.find(x => x.id === r7Id);
    if (!r7) return alert('Nie znaleziono wykazu R-7');
    r7_train.value = r7.trainNumber || '';
    r7_date_input.value = r7.date || '';
    r7_from_input.value = r7.from || '';
    r7_to_input.value = r7.to || '';
    r7CreatePanel.setAttribute('data-current-id', r7.id);
    renderR7Items();
    showOnly(r7CreatePanel);
  }

  r7_back && r7_back.addEventListener('click', () => { showOnly(handleTrainMenu); });
  r7_home && r7_home.addEventListener('click', () => { showOnly(dashboard); });

  r7_add_loco && r7_add_loco.addEventListener('click', () => {
    const id = r7CreatePanel.getAttribute('data-current-id');
    if (!id) return alert('Brak aktywnego wykazu R-7');
    const arr = listR7();
    const r7 = arr.find(x => x.id === id);
    if (!r7) return;
    const evn = prompt('EVN lokomotywy:','');
    if (evn === null) return;
    const length = parseFloat(prompt('Długość (m):','20')) || 0;
    const empty_mass = parseFloat(prompt('Masa własna (t):','80')) || 0;
    const brake_mass = parseFloat(prompt('Masa hamująca (t):','80')) || 0;
    r7.items.push({ type:'locomotive', evn, length, empty_mass, payload:0, brake_mass, brake_type:'G', from:'', to:'', notes:'' });
    saveR7(r7);
    renderR7Items();
  });

  r7_add_wagon && r7_add_wagon.addEventListener('click', () => {
    const id = r7CreatePanel.getAttribute('data-current-id');
    if (!id) return alert('Brak aktywnego wykazu R-7');
    const arr = listR7();
    const r7 = arr.find(x => x.id === id);
    if (!r7) return;
    const evn = prompt('EVN wagonu:','');
    if (evn === null) return;
    const length = parseFloat(prompt('Długość (m):','12')) || 0;
    const empty_mass = parseFloat(prompt('Masa własna (t):','20')) || 0;
    const payload = parseFloat(prompt('Masa ładunku (t):','10')) || 0;
    const brake_mass = parseFloat(prompt('Masa hamująca (t):','30')) || 0;
    r7.items.push({ type:'wagon', evn, length, empty_mass, payload, brake_mass, brake_type:'G', from:'', to:'', notes:'' });
    saveR7(r7);
    renderR7Items();
  });

  r7_save && r7_save.addEventListener('click', () => {
    const id = r7CreatePanel.getAttribute('data-current-id');
    if (!id) return alert('Brak aktywnego wykazu R-7');
    const arr = listR7();
    const r7 = arr.find(x => x.id === id);
    if (!r7) return;
    r7.trainNumber = r7_train.value.trim();
    r7.date = r7_date_input.value || r7.date;
    r7.from = r7_from_input.value.trim();
    r7.to = r7_to_input.value.trim();
    r7.updatedAt = nowISO();
    saveR7(r7);
    alert('Zapisano wykaz R-7');
    renderR7Items();
  });

  function renderR7Items() {
    const id = r7CreatePanel.getAttribute('data-current-id');
    if (!id) { r7Items.innerHTML = '<div class="text-muted small">Brak aktywnego wykazu.</div>'; return; }
    const arr = listR7();
    const r7 = arr.find(x => x.id === id);
    if (!r7) { r7Items.innerHTML = '<div class="text-muted small">Nie znaleziono wykazu.</div>'; return; }
    if (!r7.items || !r7.items.length) { r7Items.innerHTML = '<div class="text-muted small">Brak pojazdów.</div>'; return; }
    r7Items.innerHTML = '';
    r7.items.forEach((it, idx) => {
      const row = el('div','r7-row');
      row.innerHTML = `<div><strong>${it.type==='locomotive'?'Lok.':'Wag.'} ${it.evn}</strong><div class="small text-muted">Dł: ${it.length} m · Masa własna: ${it.empty_mass} t · Masa ham.: ${it.brake_mass} t</div></div>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary btn-edit" data-idx="${idx}">Edytuj</button>
          <button class="btn btn-sm btn-outline-danger btn-del" data-idx="${idx}">Usuń</button>
        </div>`;
      row.querySelector('.btn-del').addEventListener('click', () => {
        if (!confirm('Usuń pojazd?')) return;
        r7.items.splice(idx,1);
        saveR7(r7);
        renderR7Items();
      });
      row.querySelector('.btn-edit').addEventListener('click', () => {
        const newNotes = prompt('Uwagi:', it.notes || '');
        if (newNotes === null) return;
        it.notes = newNotes;
        saveR7(r7);
        renderR7Items();
      });
      r7Items.appendChild(row);
    });
  }

  /* ---------- Takeover actions (search & open) ---------- */
  btnTakeoverReport && btnTakeoverReport.addEventListener('click', () => {
    // show simple prompt to enter report number or list
    const q = prompt('Wpisz numer pociągu lub numer raportu (lub zostaw puste, aby wyświetlić listę):','');
    const arr = listReports();
    if (!q) {
      // show list and allow open
      const pick = arr.map((r,i)=>`${i+1}. ${r.number || r.trainNumber || '(brak)'} — ${r.date || ''}`).join('\n');
      const sel = prompt('Wybierz numer z listy (np. 1):\n' + (pick || 'Brak raportów'), '');
      const idx = parseInt(sel,10) - 1;
      if (!isNaN(idx) && arr[idx]) openReportEditor(arr[idx].id);
      return;
    }
    // try find by number or trainNumber
    const found = arr.find(r => (r.number && r.number.includes(q)) || (r.trainNumber && r.trainNumber.includes(q)));
    if (found) openReportEditor(found.id); else alert('Nie znaleziono raportu dla podanego numeru.');
  });

  btnTakeoverR7 && btnTakeoverR7.addEventListener('click', () => {
    const arr = listR7();
    if (!arr.length) return alert('Brak zapisanych wykazów R-7.');
    const pick = arr.map((r,i)=>`${i+1}. ${r.trainNumber || '(brak)'} — ${r.date || ''}`).join('\n');
    const sel = prompt('Wybierz wykaz z listy (np. 1):\n' + pick, '');
    const idx = parseInt(sel,10) - 1;
    if (!isNaN(idx) && arr[idx]) openR7Editor(arr[idx].id);
  });

  /* ---------- Phonebook (dummy) ---------- */
  function renderPhonebook() {
    const sample = [
      { name:'Dyspozytor', role:'Dyspozycja', number:'+48 22 111 22 33' },
      { name:'Kierownik', role:'Kierownik pociągu', number:'+48 600 700 800' }
    ];
    phonebookBody.innerHTML = '';
    sample.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.name}</td><td>${s.role}</td><td>${s.number}</td>`;
      phonebookBody.appendChild(tr);
    });
  }

  /* ---------- Initial render of lists if needed ---------- */
  // nothing to do on load; lists render when panels open
});
