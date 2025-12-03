// js/pdf.js
// Funkcje eksportu HTML do PDF przy użyciu html2pdf.js (załadowane w index.html).
// Zawiera ogólną funkcję exportPdf oraz specjalną funkcję exportR7Pdf generującą układ R-7.

export async function exportPdf(elementOrHtml, filename = 'document.pdf') {
  let node;
  if (typeof elementOrHtml === 'string') {
    node = document.createElement('div');
    node.innerHTML = elementOrHtml;
  } else {
    node = elementOrHtml;
  }
  const opt = {
    margin:       10,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  return html2pdf().set(opt).from(node).save();
}

/* Buduje PDF w układzie zgodnym z załączonym wzorem R-7 (uproszczony, czytelny) */
export async function exportR7Pdf(report, filename = 'R7.pdf') {
  const meta = report.r7Meta || {};
  const rows = (report.r7List || []).map((v, i) => {
    return `<tr>
      <td style="border:1px solid #333; padding:4px; text-align:center;">${i+1}</td>
      <td style="border:1px solid #333; padding:4px;">${escapeHtml(v.evn)}</td>
      <td style="border:1px solid #333; padding:4px; text-align:center;">${escapeHtml(v.country)}</td>
      <td style="border:1px solid #333; padding:4px; text-align:center;">${escapeHtml(v.operator)}</td>
      <td style="border:1px solid #333; padding:4px;">${escapeHtml(v.series)}</td>
      <td style="border:1px solid #333; padding:4px; text-align:center;">${escapeHtml(v.operator_code)}</td>
      <td style="border:1px solid #333; padding:4px; text-align:right;">${v.length!=null?v.length:''}</td>
      <td style="border:1px solid #333; padding:4px; text-align:right;">${v.payload!=null?v.payload:''}</td>
      <td style="border:1px solid #333; padding:4px; text-align:right;">${v.empty_mass!=null?v.empty_mass:''}</td>
      <td style="border:1px solid #333; padding:4px; text-align:right;">${v.brake_mass!=null?v.brake_mass:''}</td>
      <td style="border:1px solid #333; padding:4px;">${escapeHtml(v.from)}</td>
      <td style="border:1px solid #333; padding:4px;">${escapeHtml(v.to)}</td>
      <td style="border:1px solid #333; padding:4px;">${escapeHtml(v.notes)}</td>
    </tr>`;
  }).join('\n');

  // Podsumowanie analizy (jeśli jest)
  const analysis = report._analysis || {};
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; font-size:12px; padding:10px;">
    <h3 style="text-align:center; margin-bottom:6px;">Wykaz pojazdów kolejowych w składzie pociągu (R-7)</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
      <tr>
        <td style="width:25%"><strong>Nr pociągu:</strong> ${escapeHtml(report.sectionA?.trainNumber||'')}</td>
        <td style="width:25%"><strong>Wyprawiony dnia:</strong> ${escapeHtml(report.sectionA?.date||'')}</td>
        <td style="width:25%"><strong>Ze stacji:</strong> ${escapeHtml(meta.from||'')}</td>
        <td style="width:25%"><strong>Do stacji:</strong> ${escapeHtml(meta.to||'')}</td>
      </tr>
      <tr>
        <td><strong>Maszynista:</strong> ${escapeHtml(meta.driver||'')}</td>
        <td colspan="3"><strong>Kierownik pociągu:</strong> ${escapeHtml(meta.conductor||'')}</td>
      </tr>
    </table>

    <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #333; padding:4px;">Lp.</th>
          <th style="border:1px solid #333; padding:4px;">EVN / ID</th>
          <th style="border:1px solid #333; padding:4px;">Państwo</th>
          <th style="border:1px solid #333; padding:4px;">Ekspl.</th>
          <th style="border:1px solid #333; padding:4px;">Typ/seria</th>
          <th style="border:1px solid #333; padding:4px;">Kod</th>
          <th style="border:1px solid #333; padding:4px;">Długość (m)</th>
          <th style="border:1px solid #333; padding:4px;">Masa ład. (t)</th>
          <th style="border:1px solid #333; padding:4px;">Masa własna (t)</th>
          <th style="border:1px solid #333; padding:4px;">Masa ham. (t)</th>
          <th style="border:1px solid #333; padding:4px;">Stacja nadania</th>
          <th style="border:1px solid #333; padding:4px;">Stacja przezn.</th>
          <th style="border:1px solid #333; padding:4px;">Uwagi</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div style="margin-top:10px;">
      <strong>Podsumowanie analizy:</strong>
      <div>Długość składu: ${analysis.length ?? '-'} m</div>
      <div>Masa składu (wagony): ${analysis.massWagons ?? '-'} t</div>
      <div>Masa pociągu (lok.+wagony): ${analysis.massTotal ?? '-'} t</div>
      <div>Masa hamująca składu (wagony): ${analysis.brakeWagons ?? '-'} t</div>
      <div>Masa hamująca pociągu: ${analysis.brakeTotal ?? '-'} t</div>
      <div>Procent rzeczywisty masy składu: ${analysis.pctWagons ?? '-'} %</div>
      <div>Procent rzeczywisty masy pociągu: ${analysis.pctTotal ?? '-'} %</div>
    </div>
  </div>
  `;

  const node = document.createElement('div');
  node.innerHTML = html;
  return exportPdf(node, filename);
}

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
