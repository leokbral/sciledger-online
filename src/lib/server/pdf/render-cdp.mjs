import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FILE   = 'file://' + process.cwd() + '/article-template.html';
const OUT    = 'sciledger-article-sample.pdf';

const HEADER = `
<div style="width:100%;font-family:Inter,Helvetica,Arial,sans-serif;font-size:7pt;color:#6B7280;
     padding:0 17mm 2mm;display:flex;justify-content:space-between;align-items:baseline;
     border-bottom:0.5pt solid #E5E7EB;">
  <span style="font-style:italic;">Ferreira Cabral et al. — Ledger-based provenance for peer review</span>
  <span style="font-weight:600;color:#172554;">SciLedger&nbsp;<span style="font-weight:400;color:#6B7280;">· 2026 · 4(2) · 118</span></span>
</div>`;

const FOOTER = `
<div style="width:100%;font-family:Inter,Helvetica,Arial,sans-serif;font-size:7pt;color:#6B7280;
     padding:2mm 17mm 0;display:flex;justify-content:space-between;align-items:center;
     border-top:0.5pt solid #E5E7EB;">
  <span>doi.org/10.63000/sciledger.2026.118 &nbsp;·&nbsp; CC BY 4.0</span>
  <span><span style="color:#172554;font-weight:600;">SciLedger</span> &nbsp;·&nbsp; page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;

const chrome = spawn(CHROME, ['--headless','--disable-gpu','--no-sandbox',
  '--remote-debugging-port=9333','--remote-allow-origins=*','about:blank'],{stdio:'ignore'});

const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(2500);

const tab = await (await fetch('http://127.0.0.1:9333/json/new?' + encodeURIComponent(FILE), {method:'PUT'})).json();
await sleep(3500); // let fonts + images settle

const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
const send = (id, method, params={}) => new Promise(res => {
  const h = e => { const m = JSON.parse(e.data); if (m.id === id) { ws.removeEventListener('message', h); res(m.result); } };
  ws.addEventListener('message', h);
  ws.send(JSON.stringify({id, method, params}));
});

const pdf = await send(1, 'Page.printToPDF', {
  printBackground: true,
  paperWidth: 8.27, paperHeight: 11.69,          // A4
  marginTop: 0.787, marginBottom: 0.709,          // 20mm / 18mm
  marginLeft: 0.669, marginRight: 0.669,          // 17mm
  displayHeaderFooter: true,
  headerTemplate: HEADER,
  footerTemplate: FOOTER,
  preferCSSPageSize: false
});
writeFileSync(OUT, Buffer.from(pdf.data, 'base64'));
ws.close(); chrome.kill();
console.log('PDF gerado:', OUT);
