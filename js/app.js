// js/app.js
import { listUsers, getUserByEmailOrId, updateUser, deleteUser, saveReport, nextCounter, getReport, listReports, listPhonebook, replacePhonebook } from './db.js';
import { initAuth, registerUser, login, logout, currentUser, hashPassword } from './auth.js';
import { exportPdf } from './pdf.js';

function qs(id){ return document.getElementById(id); }
function el(tag, cls){ const d=document.createElement(tag); if(cls) d.className=cls; return d; }

document.addEventListener('DOMContentLoaded', async () => {
  const adminPlain = await initAuth();

  // UI refs
  const loginView = qs('loginView'), appShell = qs('appShell');
  const loginForm = qs('loginForm'), loginId = qs('loginId'), loginPassword = qs('loginPassword'), loginMsg = qs('loginMsg'), demoBtn = qs('demoBtn');
  const loggedUserInfo = qs('loggedUserInfo'), btnLogout = qs('btnLogout');

  const dashboard = qs('dashboard');
  const tileHandleTrain = qs('tileHandleTrain'), tileTakeOver = qs('tileTakeOver'), tileAdmin = qs('tileAdmin'), tilePhonebook = qs('tilePhonebook');

  const handleTrainMenu = qs('handleTrainMenu'), backFromHandle = qs('backFromHandle');
  const takeOverMenu = qs('takeOverMenu'), backFromTakeover = qs('backFromTakeover'), takeoverForm = qs('takeoverForm'), takeoverMsg = qs('takeoverMsg');

  const btnNewReport = qs('btnNewReport'), btnNewBrake = qs('btnNewBrake'), btnNewR7 = qs('btnNewR7');

  const adminPanel = qs('adminPanel'), usersTableBody = document.querySelector('#usersTable tbody'), addUserBtn = qs('addUserBtn'), modalUser = qs('modalUser'), formUser = qs('formUser'), userFormMsg = qs('userFormMsg');

  const phonebookPanel = qs('phonebookPanel'), phonebookTable = qs('phonebookTable').querySelector('tbody'), btnImportPhone = qs('btnImportPhone'), phoneImportFile = qs('phoneImportFile'), btnExportPhone = qs('btnExportPhone');

  const reportPanelContainer = qs('reportPanelContainer');

  // session helpers
  function showLogin(){ loginView.style.display='block'; appShell.style.display='none'; adminPanel.style.display='none'; phonebookPanel.style.display='none'; handleTrainMenu.style.display='none'; takeOverMenu.style.display='none'; reportPanelContainer.style.display='none'; }
  async function showAppFor(user){
    loginView.style.display='none'; appShell.style.display='block';
    loggedUserInfo.textContent = `${user.name} (${user.id}) · ${user.role}`;
    if(user.role==='admin') adminPanel.style.display='block'; else adminPanel.style.display='none';
    phonebookPanel.style.display='none';
    handleTrainMenu.style.display='none';
    takeOverMenu.style.display='none';
    reportPanelContainer.style.display='none';
    await refreshUsersTable();
    await refreshPhonebookTable();
  }

  const sess = currentUser();
  if(sess) await showAppFor(sess); else showLogin();

  // login
  loginForm.addEventListener('submit', async (e)=>{ e.preventDefault(); loginMsg.textContent=''; const id=loginId.value.trim(); const pw=loginPassword.value; if(!id||!pw) return loginMsg.textContent='Podaj login i hasło.'; const res=await login(id,pw); if(!res.ok) return loginMsg.textContent=res.reason||'Błąd logowania'; await showAppFor(res.user); });

  demoBtn.addEventListener('click', ()=>{ loginId.value='klawinski.pawel@gmail.com'; loginPassword.value=adminPlain; loginForm.dispatchEvent(new Event('submit',{cancelable:true})); });

  btnLogout.addEventListener('click', ()=>{ logout(); showLogin(); loginId.value=''; loginPassword.value=''; loginMsg.textContent=''; });

  // Dashboard navigation
  tileHandleTrain.addEventListener('click', ()=>{ dashboard.style.display='none'; handleTrainMenu.style.display='block'; });
  backFromHandle.addEventListener('click', ()=>{ handleTrainMenu.style.display='none'; dashboard.style.display='block'; });

  tileTakeOver.addEventListener('click', ()=>{ dashboard.style.display='none'; takeOverMenu.style.display='block'; });
  backFromTakeover.addEventListener('click', ()=>{ takeOverMenu.style.display='none'; dashboard.style.display='block'; });

  tileAdmin.addEventListener('click', async ()=>{ const u=currentUser(); if(!u||u.role!=='admin') return alert('Brak uprawnień.'); dashboard.style.display='none'; adminPanel.style.display='block'; await refreshUsersTable(); });
  // admin back handled by user clicking Dashboard tile or logout; keep simple: user can click Dashboard tile to return
  tilePhonebook.addEventListener('click', async ()=>{ dashboard.style.display='none'; phonebookPanel.style.display='block'; await refreshPhonebookTable(); });

  // TAKEOVER form
  takeoverForm.addEventListener('submit', async (e)=>{ e.preventDefault(); takeoverMsg.textContent=''; const trainNum = qs('takeoverTrainNumber').value.trim(); const date = qs('takeoverDate').value; if(!trainNum || !date) return takeoverMsg.textContent='Wypełnij numer pociągu i datę.'; // find report by number pattern or by createdBy train number - here we assume report number contains trainNum or exact match
    const reports = await listReports();
    const found = reports.find(r => (r.number && r.number.includes(trainNum)) || (r.createdBy && r.createdBy.id === trainNum) || (r.currentDriver && r.currentDriver.id === trainNum));
    if(!found) return takeoverMsg.textContent='Nie znaleziono raportu dla podanego numeru i daty.'; // simple check
    // mark takeover
    const u = currentUser();
    found.takenBy = { name: u.name, id: u.id, at: new Date().toISOString() };
    found.currentDriver = { name: u.name, id: u.id };
    await saveReport(found);
    // open report UI
    openReportUI(found);
  });

  // HANDLE TRAIN menu buttons
  btnNewReport.addEventListener('click', async ()=> {
    // open new report UI (we create minimal report UI inside reportPanelContainer)
    const u = currentUser();
    const name = u?.name || qs('userName')?.value || '';
    const id = u?.id || qs('userId')?.value || '';
    if(!name || !id) return alert('Brak danych prowadzącego. Uzupełnij profil.');
    const c = await nextCounter();
    const d = new Date();
    const DD = String(d.getDate()).padStart(2,'0');
    const MM = String(d.getMonth()+1).padStart(2,'0');
    const YY = String(d.getFullYear()).slice(-2);
    const XXX = String(c).padStart(3,'0');
    const number = `${XXX}/${DD}/${MM}/${YY}`;
    const report = {
      number,
      createdAt: new Date().toISOString(),
      createdBy: { name, id },
      currentDriver: { name, id },
      sectionA: { category:'', traction:'', trainNumber:'', route:'', date: d.toISOString().slice(0,10) },
      sectionB:[], sectionC:[], sectionD:[], sectionE:[], sectionF:[], sectionG:[], history:[]
    };
    await saveReport(report);
    openReportUI(report);
  });

  // New brake and R7 buttons are intentionally disabled (UI only)
  btnNewBrake.addEventListener('click', ()=>{ /* disabled */ });
  btnNewR7.addEventListener('click', ()=>{ /* disabled */ });

  // ---------- Admin users table ----------
  async function refreshUsersTable(){
    if(!usersTableBody) return;
    usersTableBody.innerHTML='';
    const users = await listUsers();
    users.forEach(u=>{
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${u.name||'-'}</td><td>${u.id||'-'}</td><td>${u.zdp||'-'}</td><td>${u.email||'-'}</td><td>${u.role||'-'}</td><td>${u.status||'-'}</td>
        <td><button class="btn btn-sm btn-outline-secondary me-1" data-action="edit" data-key="${u.email||u.id}">Edytuj</button><button class="btn btn-sm btn-outline-danger" data-action="del" data-key="${u.email||u.id}">Usuń</button></td>`;
      usersTableBody.appendChild(tr);
    });
  }

  formUser.addEventListener('submit', async (e)=>{ e.preventDefault(); userFormMsg.textContent=''; const mode=formUser.getAttribute('data-mode')||'add'; const idx=formUser.getAttribute('data-index')||''; const name=qs('u_name').value.trim(); const id=qs('u_id').value.trim(); const zdp=qs('u_zdp').value; const email=qs('u_email').value.trim(); const password=qs('u_password').value; const role=qs('u_role').value; const status=qs('u_status').value; if(!name||!id||!email||!password) return userFormMsg.textContent='Wypełnij wszystkie wymagane pola.'; try{ if(mode==='add'){ await registerUser({name,id,zdp,email,password,role,status}); } else { const patch={name,id,zdp,email,role,status}; if(password) patch.passwordHash = await hashPassword(password); await updateUser(idx,patch); } const bs=bootstrap.Modal.getInstance(modalUser); bs&&bs.hide(); formUser.reset(); await refreshUsersTable(); }catch(err){ userFormMsg.textContent = err.message||'Błąd zapisu użytkownika'; } });

  usersTableBody.addEventListener('click', async (e)=>{ const btn=e.target.closest('button'); if(!btn) return; const action=btn.getAttribute('data-action'); const key=btn.getAttribute('data-key'); if(action==='edit'){ const u=await getUserByEmailOrId(key); if(!u) return alert('Nie znaleziono użytkownika'); formUser.setAttribute('data-mode','edit'); formUser.setAttribute('data-index',key); qs('u_name').value=u.name||''; qs('u_id').value=u.id||''; qs('u_zdp').value=u.zdp||'WAW'; qs('u_email').value=u.email||''; qs('u_password').value=''; qs('u_role').value=u.role||'user'; qs('u_status').value=u.status||'active'; document.querySelector('#modalUser .modal-title').textContent='Edytuj użytkownika'; new bootstrap.Modal(modalUser).show(); } else if(action==='del'){ if(!confirm('Usunąć użytkownika?')) return; try{ await deleteUser(key); await refreshUsersTable(); }catch(err){ alert('Błąd usuwania: '+(err.message||err)); } } });

  addUserBtn.addEventListener('click', ()=>{ formUser.setAttribute('data-mode','add'); formUser.setAttribute('data-index',''); formUser.reset(); document.querySelector('#modalUser .modal-title').textContent='Dodaj użytkownika'; userFormMsg.textContent=''; });

  // ---------- Phonebook ----------
  async function refreshPhonebookTable(){
    const rows = await listPhonebook();
    phonebookTable.innerHTML = '';
    rows.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r.name||'-'}</td><td>${r.role||'-'}</td><td>${r.number||'-'}</td><td>${r.hours||'-'}</td><td><button class="btn btn-sm btn-outline-danger" data-del="${idx}">Usuń</button></td>`;
      phonebookTable.appendChild(tr);
    });
  }

  phonebookTable.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    const del = btn.getAttribute('data-del');
    if(del != null) {
      const arr = await listPhonebook();
      arr.splice(Number(del),1);
      await replacePhonebook(arr);
      await refreshPhonebookTable();
    }
  });

  btnImportPhone.addEventListener('click', ()=> phoneImportFile.click());
  phoneImportFile.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if(!f) return;
    const text = await f.text();
    // simple CSV parser: name,role,number,hours
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const entries = lines.map(line => {
      const cols = line.split(',');
      return { name: cols[0]?.trim(), role: cols[1]?.trim(), number: cols[2]?.trim(), hours: cols[3]?.trim() };
    });
    await replacePhonebook(entries);
    await refreshPhonebookTable();
    alert('Import zakończony');
  });

  btnExportPhone.addEventListener('click', async () => {
    const arr = await listPhonebook();
    const csv = arr.map(r => `${r.name||''},${r.role||''},${r.number||''},${r.hours||''}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'phonebook.csv'; a.click(); URL.revokeObjectURL(url);
  });

  // ---------- Report UI (minimal embedded) ----------
  // We'll create a simple report UI inside reportPanelContainer when opening a report
  function openReportUI(report) {
    reportPanelContainer.innerHTML = '';
    reportPanelContainer.style.display = 'block';
    dashboard.style.display = 'none';
    handleTrainMenu.style.display = 'none';
    takeOverMenu.style.display = 'none';
    adminPanel.style.display = 'none';
    phonebookPanel.style.display = 'none';

    const card = el('div','card p-3 mb-3');
    const header = el('div','d-flex justify-content-between align-items-center');
    header.innerHTML = `<h5>Raport: ${report.number}</h5><div><button id="closeReportBtn" class="btn btn-sm btn-danger">Zamknij raport</button></div>`;
    card.appendChild(header);
    card.appendChild(el('hr'));
    // Section A simple form
    const secA = el('div','mb-3');
    secA.innerHTML = `
      <h6>A - Dane ogólne</h6>
      <div class="row g-2">
        <div class="col-6 col-md-2"><label class="form-label small">Kategoria</label><select id="r_cat" class="form-select"><option></option><option>EX</option><option>MP</option><option>RJ</option><option>OS</option><option>PW</option></select></div>
        <div class="col-6 col-md-2"><label class="form-label small">Trakcja</label><select id="r_traction" class="form-select"><option></option><option>E</option><option>S</option></select></div>
        <div class="col-6 col-md-2"><label class="form-label small">Numer pociągu</label><input id="r_trainNumber" class="form-control"></div>
        <div class="col-6 col-md-3"><label class="form-label small">Relacja</label><input id="r_route" class="form-control"></div>
        <div class="col-6 col-md-3"><label class="form-label small">Data</label><input id="r_date" type="date" class="form-control"></div>
      </div>
    `;
    card.appendChild(secA);

    // Buttons: export JSON, PDF
    const actions = el('div','d-flex justify-content-between align-items-center');
    const left = el('div');
    const btnExportJson = el('button','btn btn-outline-info btn-sm me-2'); btnExportJson.textContent='Eksportuj JSON';
    const btnPreviewPdf = el('button','btn btn-success btn-sm'); btnPreviewPdf.textContent='Pobierz PDF';
    left.appendChild(btnExportJson); left.appendChild(btnPreviewPdf);
    actions.appendChild(left);
    card.appendChild(actions);

    reportPanelContainer.appendChild(card);

    // populate fields
    qs('r_cat').value = report.sectionA?.category || '';
    qs('r_traction').value = report.sectionA?.traction || '';
    qs('r_trainNumber').value = report.sectionA?.trainNumber || '';
    qs('r_route').value = report.sectionA?.route || '';
    qs('r_date').value = report.sectionA?.date || '';

    // save on change
    ['r_cat','r_traction','r_trainNumber','r_route','r_date'].forEach(id => {
      const elid = qs(id);
      elid.addEventListener('change', async () => {
        report.sectionA = {
          category: qs('r_cat').value,
          traction: qs('r_traction').value,
          trainNumber: qs('r_trainNumber').value,
          route: qs('r_route').value,
          date: qs('r_date').value
        };
        await saveReport(report);
      });
    });

    // close
    qs('closeReportBtn').addEventListener('click', () => {
      reportPanelContainer.style.display = 'none';
      dashboard.style.display = 'block';
      // show admin if admin
      const u = currentUser();
      if(u && u.role === 'admin') adminPanel.style.display = 'block';
    });

    // export JSON
    btnExportJson.addEventListener('click', () => {
      const dataStr = JSON.stringify(report, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${report.number.replace(/\//g,'-')}.json`; a.click(); URL.revokeObjectURL(url);
    });

    // preview PDF (simple)
    btnPreviewPdf.addEventListener('click', async () => {
      const container = document.createElement('div');
      container.style.padding = '12px';
      container.innerHTML = `<h3>Raport ${report.number}</h3><p>Prowadzący: ${report.currentDriver?.name || report.createdBy?.name}</p><h4>A - Dane ogólne</h4>
        <table style="width:100%;border-collapse:collapse;"><tr><th style="border:1px solid #ddd;padding:6px">Kategoria</th><td style="border:1px solid #ddd;padding:6px">${report.sectionA.category||'-'}</td></tr>
        <tr><th style="border:1px solid #ddd;padding:6px">Trakcja</th><td style="border:1px solid #ddd;padding:6px">${report.sectionA.traction||'-'}</td></tr>
        <tr><th style="border:1px solid #ddd;padding:6px">Numer</th><td style="border:1px solid #ddd;padding:6px">${report.sectionA.trainNumber||'-'}</td></tr>
        <tr><th style="border:1px solid #ddd;padding:6px">Relacja</th><td style="border:1px solid #ddd;padding:6px">${report.sectionA.route||'-'}</td></tr>
        <tr><th style="border:1px solid #ddd;padding:6px">Data</th><td style="border:1px solid #ddd;padding:6px">${report.sectionA.date||'-'}</td></tr></table>`;
      await exportPdf(container, `${report.number.replace(/\//g,'-')}.pdf`);
    });
  }

  // expose helper for takeover to open report
  window.openReportUI = openReportUI;

  // initial refreshes
  await refreshUsersTable();
  await refreshPhonebookTable();
});
