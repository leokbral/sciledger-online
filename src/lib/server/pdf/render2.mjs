import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [,, INPUT, OUTPUT] = process.argv;
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const HEADER = `<span style="display:none"></span>`;

const FOOTER = `
<div style="width:100%;font-family:Inter,Helvetica,Arial,sans-serif;font-size:6.5pt;color:#7C8AA8;
     padding:0 18mm;">
  <div style="border-top:.5pt solid #E4E8F0;padding-top:2.4mm;display:flex;
       justify-content:space-between;align-items:center;">
    <span><i>Ferreira Cabral et al.</i> &nbsp;·&nbsp; doi.org/10.63000/sciledger.2026.118 &nbsp;·&nbsp; CC BY 4.0</span>
    <span><span style="color:#101A3D;font-weight:700;letter-spacing:-.02em;">SciLedger</span>
      &nbsp;<span style="color:#2563EB;">·</span>&nbsp;
      <span class="pageNumber"></span>&thinsp;/&thinsp;<span class="totalPages"></span></span>
  </div>
</div>`;

const chrome = spawn(CHROME,['--headless','--disable-gpu','--no-sandbox',
  '--remote-debugging-port=9345','--remote-allow-origins=*','about:blank'],{stdio:'ignore'});
const sleep = ms => new Promise(r=>setTimeout(r,ms));
await sleep(2500);

const tab = await (await fetch('http://127.0.0.1:9345/json/new?' + encodeURIComponent('file://'+process.cwd()+'/'+INPUT), {method:'PUT'})).json();
await sleep(4000);

const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
const send = (id,method,params={}) => new Promise(res=>{
  const h = e => { const m = JSON.parse(e.data); if (m.id===id){ ws.removeEventListener('message',h); res(m.result);} };
  ws.addEventListener('message',h); ws.send(JSON.stringify({id,method,params}));
});

const pdf = await send(1,'Page.printToPDF',{
  printBackground:true,
  paperWidth:8.27, paperHeight:11.69,
  marginTop:0.472, marginBottom:0.57,  // 12mm / 14.5mm
  marginLeft:0, marginRight:0,          // full-bleed bands
  displayHeaderFooter:true,
  headerTemplate:HEADER, footerTemplate:FOOTER
});
writeFileSync(OUTPUT, Buffer.from(pdf.data,'base64'));
ws.close(); chrome.kill();
console.log('ok →', OUTPUT);
