// js/pdf.js
// Eksport PDF dla aplikacji eRJ — ulepszony eksport wykazu R-7.
// Wymaga html2pdf.js (załadowane w index.html).

/**
 * Eksportuje dowolny element HTML do PDF przy użyciu html2pdf.js
 * @param {HTMLElement|string} elementOrHtml
 * @param {string} filename
 */
export async function exportPdf(elementOrHtml, filename = 'document.pdf') {
  let node;
  if (typeof elementOrHtml === 'string') {
    node = document.createElement('div');
    node.innerHTML = elementOrHtml;
  } else {
    node = elementOrHtml;
  }
  const opt = {
    margin:       [8, 8, 8, 8],
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  return html2pdf().set(opt).from(node).save();
}

/**
 * Generuje PDF zgodny wizualnie z formularzem R-7:
 * - tabela zawiera dokładnie tyle wierszy, ile pojazdów w report.r7List
 * - w wierszu H1 sumowane są kolumny masowe oraz długość pojazdów
 * - podsumowanie analizy umieszczone jest na osobnej stronie
 *
 * @param {Object} report - obiekt raportu zawierający report.r7List (tablica pojazdów) i report._analysis (opcjonalnie)
 * @param {string} filename
 */
export async function exportR7Pdf(report, filename = 'R7.pdf') {
  const meta = report.r7Meta || {};
  const rows = Array.isArray(report.r7List) ? report.r7List : [];

  // Obliczenia sum dla H1 (długość + kolumny masowe)
  const sumLength = round2(rows.reduce((s, r) => s + toNumber(r.length), 0));
  const sumPayload = round2(rows.reduce((s, r) => s + toNumber(r.payload), 0));
  const sumEmpty = round2(rows.reduce((s, r) => s + toNumber(r.empty_mass), 0));
  const sumBrake = round2(rows.reduce((s, r) => s + toNumber(r.brake_mass), 0));

  // Analiza (jeśli już obliczona w raporcie, użyj jej; inaczej oblicz podstawowe wartości)
  const analysis = report._analysis || computeBasicAnalysis(rows);

  // Styl ogólny: zbliżony do formularza R-7
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; color:#111;">

    <!-- STRONA 1: Wykaz R-7 -->
    <div style="width:100%; padding:10px; box-sizing:border-box;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
        <div style="font-weight:700; font-size:15px;">Wykaz pojazdów kolejowych w składzie pociągu (R-7)</div>
        <div style="text-align:right; font-size:10.5px; color:#333;">
          <div>Nr dokumentu: <strong>${escapeHtml(report.number || '')}</strong></div>
          <div>Data wydruku: ${new Date().toLocaleString()}</div>
        </div>
      </div>

      <!-- Dane ogólne (nagłówek formularza) -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:8px; font-size:11px;">
        <tr>
          <td style="padding:6px; border:1px solid #333; width:25%"><strong>Nr pociągu:</strong> ${escapeHtml(report.sectionA?.trainNumber || '')}</td>
          <td style="padding:6px; border:1px solid #333; width:25%"><strong>Wyprawiony dnia:</strong> ${escapeHtml(report.sectionA?.date || '')}</td>
          <td style="padding:6px; border:1px solid #333; width:25%"><strong>Ze stacji:</strong> ${escapeHtml(meta.from || '')}</td>
          <td style="padding:6px; border:1px solid #333; width:25%"><strong>Do stacji:</strong> ${escapeHtml(meta.to || '')}</td>
        </tr>
        <tr>
          <td style="padding:6px; border:1px solid #333;"><strong>Maszynista:</strong> ${escapeHtml(meta.driver || '')}</td>
          <td colspan="3" style="padding:6px; border:1px solid #333;"><strong>Kierownik pociągu:</strong> ${escapeHtml(meta.conductor || '')}</td>
        </tr>
      </table>

      <!-- Tabela z pojazdami: generujemy tylko tyle wierszy, ile jest pojazdów -->
      <table style="width:100%; border-collapse:collapse; font-size:10.5px;">
        <thead>
          <tr style="background:#f3f3f3;">
            <th style="border:1px solid #333; padding:6px; width:3%;">Lp.</th>
            <th style="border:1px solid #333; padding:6px; width:14%;">Numer inw.</th>
            <th style="border:1px solid #333; padding:6px; width:6%;">Państwo</th>
            <th style="border:1px solid #333; padding:6px; width:6%;">Ekspl.</th>
            <th style="border:1px solid #333; padding:6px; width:12%;">Typ/seria</th>
            <th style="border:1px solid #333; padding:6px; width:6%;">Kod</th>
            <th style="border:1px solid #333; padding:6px; width:7%;">Długość (m)</th>
            <th style="border:1px solid #333; padding:6px; width:7%;">Masa ład. (t)</th>
            <th style="border:1px solid #333; padding:6px; width:7%;">Masa własna (t)</th>
            <th style="border:1px solid #333; padding:6px; width:7%;">Masa ham. (t)</th>
            <th style="border:1px solid #333; padding:6px; width:8%;">Stacja nadania</th>
            <th style="border:1px solid #333; padding:6px; width:8%;">Stacja przezn.</th>
            <th style="border:1px solid #333; padding:6px; width:10%;">Uwagi</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((v, i) => `
            <tr>
              <td style="border:1px solid #333; padding:6px; text-align:center;">${i+1}</td>
              <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.evn)}</td>
              <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.country)}</td>
              <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.operator)}</td>
              <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.series)}</td>
              <td style="border:1px solid #333; padding:6px; text-align:center;">${escapeHtml(v.operator_code)}</td>
              <td style="border:1px solid #333; padding:6px; text-align:right;">${v.length!=null?formatNumber(v.length):''}</td>
              <td style="border:1px solid #333; padding:6px; text-align:right;">${v.payload!=null?formatNumber(v.payload):''}</td>
              <td style="border:1px solid #333; padding:6px; text-align:right;">${v.empty_mass!=null?formatNumber(v.empty_mass):''}</td>
              <td style="border:1px solid #333; padding:6px; text-align:right;">${v.brake_mass!=null?formatNumber(v.brake_mass):''}</td>
              <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.from)}</td>
              <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.to)}</td>
              <td style="border:1px solid #333; padding:6px;">${escapeHtml(v.notes)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#fafafa;">
            <td style="border:1px solid #333; padding:6px; text-align:center;"><strong>H1</strong></td>
            <td colspan="6" style="border:1px solid #333; padding:6px; text-align:center;"><strong>SUMA</strong></td>
            <td style="border:1px solid #333; padding:6px; text-align:right;"><strong>${formatNumber(sumPayload)}</strong></td>
            <td style="border:1px solid #333; padding:6px; text-align:right;"><strong>${formatNumber(sumEmpty)}</strong></td>
            <td style="border:1px solid #333; padding:6px; text-align:right;"><strong>${formatNumber(sumBrake)}</strong></td>
            <td style="border:1px solid #333; padding:6px; text-align:right;"><strong>${formatNumber(sumLength)}</strong></td>
            <td colspan="2" style="border:1px solid #333; padding:6px;"></td>
          </tr>
        </tfoot>
      </table>

      <div style="font-size:10px; color:#444; margin-top:6px;">
        Formularz wygenerowany przez system eRJ; układ zbliżony do wzoru R-7.
      </div>
    </div>

    <!-- STRONA 2: Podsumowanie analizy (oddzielna strona) -->
    <div style="page-break-before:always; width:100%; padding:10px; box-sizing:border-box;">
      <div style="font-weight:700; font-size:13px; margin-bottom:8px;">Podsumowanie analizy</div>
      <table style="width:100%; border-collapse:collapse; font-size:11px;">
        <tbody>
          <tr><th style="text-align:left; padding:6px; border:1px solid #ddd; width:60%;">Długość składu (m)</th><td style="padding:6px; border:1px solid #ddd; text-align:right;">${analysis.length ?? '-'}</td></tr>
          <tr><th style="text-align:left; padding:6px; border:1px solid #ddd;">Masa składu (wagony) (t)</th><td style="padding:6px; border:1px solid #ddd; text-align:right;">${analysis.massWagons ?? '-'}</td></tr>
          <tr><th style="text-align:left; padding:6px; border:1px solid #ddd;">Masa pociągu (lokomotywy + wagony) (t)</th><td style="padding:6px; border:1px solid #ddd; text-align:right;">${analysis.massTotal ?? '-'}</td></tr>
          <tr><th style="text-align:left; padding:6px; border:1px solid #ddd;">Masa hamująca składu (wagony) (t)</th><td style="padding:6px; border:1px solid #ddd; text-align:right;">${analysis.brakeWagons ?? '-'}</td></tr>
          <tr><th style="text-align:left; padding:6px; border:1px solid #ddd;">Masa hamująca pociągu (t)</th><td style="padding:6px; border:1px solid #ddd; text-align:right;">${analysis.brakeTotal ?? '-'}</td></tr>
          <tr><th style="text-align:left; padding:6px; border:1px solid #ddd;">Procent rzeczywisty masy składu (%)</th><td style="padding:6px; border:1px solid #ddd; text-align:right;">${analysis.pctWagons ?? '-'}</td></tr>
          <tr><th style="text-align:left; padding:6px; border:1px solid #ddd;">Procent rzeczywisty masy pociągu (%)</th><td style="padding:6px; border:1px solid #ddd; text-align:right;">${analysis.pctTotal ?? '-'}</td></tr>
        </tbody>
      </table>

      <div style="margin-top:12px; font-size:10px; color:#444;">
        Uwaga: wartości obliczone automatycznie na podstawie danych wprowadzonych do wykazu R-7.
      </div>
    </div>

  </div>
  `;

  const node = document.createElement('div');
  node.innerHTML = html;
  return exportPdf(node, filename);
}

/* ---------- Pomocnicze funkcje ---------- */

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).toString().replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function round2(v) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}

function formatNumber(v) {
  if (v === null || v === undefined || v === '') return '';
  return Number(v).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function computeBasicAnalysis(rows) {
  const totalLength = round2(rows.reduce((s, r) => s + toNumber(r.length), 0));
  const massWagons = round2(rows.filter(r => r.type !== 'locomotive').reduce((s, r) => s + toNumber(r.empty_mass) + toNumber(r.payload), 0));
  const massLocos = round2(rows.filter(r => r.type === 'locomotive').reduce((s, r) => s + toNumber(r.empty_mass) + toNumber(r.payload), 0));
  const massTotal = round2(massWagons + massLocos);
  const brakeWagons = round2(rows.filter(r => r.type !== 'locomotive').reduce((s, r) => s + toNumber(r.brake_mass), 0));
  const brakeLocos = round2(rows.filter(r => r.type === 'locomotive').reduce((s, r) => s + toNumber(r.brake_mass), 0));
  const brakeTotal = round2(brakeWagons + brakeLocos);
  const pctWagons = massWagons > 0 ? round2((brakeWagons / massWagons) * 100) : 0;
  const pctTotal = massTotal > 0 ? round2((brakeTotal / massTotal) * 100) : 0;
  return {
    length: totalLength,
    massWagons,
    massTotal,
    brakeWagons,
    brakeTotal,
    pctWagons,
    pctTotal
  };
}
