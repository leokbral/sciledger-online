import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as fontkit from 'fontkit';
import { chromium } from 'playwright';

// Offline asset production only. Does not import or start the application.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const font = fontkit.openSync(path.join(root, 'fonts/InterVariable.ttf'));
const C = { primary:'#2563EB', secondary:'#0EA5E9', accent:'#6366F1', dark:'#111827', light:'#F9FAFB', reverse:'#60A5FA', white:'#FFFFFF', black:'#000000' };
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const n = v => Number(v.toFixed(4));

// Two complementary editorial strokes. One master, rotated 180 degrees.
// 96-unit grid; 18-unit stem; 24-unit outer radius; 6-unit inner radius.
// Opposing middle terminals leave an 8-unit open channel.
const master = 'M76 4H28C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52H44V34H28C24.6863 34 22 31.3137 22 28C22 24.6863 24.6863 22 28 22H76Z';
function mark(color=C.primary, micro=false) {
  // Micro master widens the horizontal aperture from 12 to 16 units.
  const d = micro ? 'M76 4H28C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52H44V36H28C23.5817 36 20 32.4183 20 28C20 23.5817 23.5817 20 28 20H76Z' : master;
  return `<g fill="${color}"><path d="${d}"/><path d="${d}" transform="rotate(180 48 48)"/></g>`;
}
function lettering(text, x, y, size, color=C.dark, weight=600, tracking=-0.6) {
  const f = font.getVariation({wght:weight,opsz:32});
  const run = f.layout(text);
  const scale = size/f.unitsPerEm;
  const top = Math.max(...run.glyphs.map((g,i)=>g.bbox.maxY+run.positions[i].yOffset));
  let cursor = 0;
  const paths = run.glyphs.map((g,i)=>{
    const p = run.positions[i];
    const result = `<path d="${g.path.toSVG()}" transform="translate(${n(cursor+p.xOffset*scale)} ${n(-p.yOffset*scale)}) scale(${n(scale)} ${n(-scale)})"/>`;
    cursor += p.xAdvance*scale+tracking;
    return result;
  }).join('');
  return { width:cursor-tracking, svg:`<g aria-label="${esc(text)}" fill="${color}" transform="translate(${n(x)} ${n(y+top*scale)})">${paths}</g>` };
}
const W = Math.ceil(112+lettering('SciLedger',0,0,56).width+20);
function lockup(ink=C.dark, blue=C.primary) {
  return `<g transform="translate(18 20) scale(.75)">${mark(blue)}</g>${lettering('SciLedger',112,34,56,ink).svg}`;
}
function svg(w,h,body,title,viewBox=`0 0 ${w} ${h}`) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}" role="img" aria-labelledby="title"><title id="title">${esc(title)}</title>${body}</svg>\n`;
}
const outputs=[];
function save(dir,name,data,w,h,pngW) {
  fs.writeFileSync(path.join(root,dir,`${name}.svg`),data);
  outputs.push({dir,name,w,h,pngW});
}
for(const [suffix,ink,blue] of [['',C.dark,C.primary],['-light',C.dark,C.primary],['-dark',C.white,C.reverse],['-monochrome',C.black,C.black],['-white',C.white,C.white]]) {
  save('logo',`sciledger-logo${suffix}`,svg(W,112,lockup(ink,blue),`SciLedger — logo${suffix}`),W,112,2400);
}
for(const [suffix,color] of [['',C.primary],['-dark',C.reverse],['-monochrome',C.black],['-white',C.white]]) {
  save('logo',`sciledger-symbol${suffix}`,svg(112,112,mark(color),'SciLedger — símbolo Registro entre pares','-8 -8 112 112'),112,112,1024);
}
for(const [suffix,color] of [['',C.dark],['-white',C.white]]) {
  const word=lettering('SciLedger',12,14,64,color);
  const w=Math.ceil(word.width+24);
  save('logo',`sciledger-wordmark${suffix}`,svg(w,94,word.svg,'SciLedger — wordmark'),w,94,2000);
}
for(const [suffix,ink,blue] of [['',C.dark,C.primary],['-dark',C.white,C.reverse]]) {
  const word=lettering('SciLedger',0,0,34,ink,600,-.3);
  const body=`<g transform="translate(72 14)">${mark(blue)}</g><g transform="translate(${n((240-word.width)/2)} 128)">${word.svg}</g>`;
  save('logo',`sciledger-compact${suffix}`,svg(240,190,body,'SciLedger — composição compacta'),240,190,1200);
}
const favicon=`<rect width="32" height="32" rx="7" fill="${C.primary}"/><g transform="translate(4 4) scale(.25)">${mark(C.white,true)}</g>`;
save('logo','sciledger-favicon',svg(32,32,favicon,'SciLedger — favicon'),32,32,512);

// Presentation artwork uses the exact export paths, never approximated HTML marks.
const text=(s,x,y,size=18,color=C.dark,weight=400)=>lettering(s,x,y,size,color,weight,0).svg;
const placeLogo=(x,y,w,ink=C.dark,blue=C.primary)=>`<g transform="translate(${x} ${y}) scale(${w/W})">${lockup(ink,blue)}</g>`;
const rect=(x,y,w,h,fill,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
let board=rect(0,0,1600,1120,C.light);
board+=text('SciLedger',64,48,25,C.dark,600)+text('IDENTIDADE VISUAL  /  01',1210,55,14,C.dark,500);
board+=text('Registro entre pares',64,113,58,C.dark,600);
board+=text('Conhecimento científico com autoria, revisão e histórico.',67,186,23,'#4B5563');
board+=rect(64,249,1472,326,C.white,18)+placeLogo(410,320,780);
board+=text('ASSINATURA PRINCIPAL',96,280,12,'#6B7280',600);
board+=rect(64,599,344,280,C.primary,18)+`<g transform="translate(153 655) scale(1.72)">${mark(C.white)}</g>`;
board+=rect(432,599,1104,280,C.dark,18)+text('APLICAÇÃO SOBRE FUNDO ESCURO',472,632,12,'#9CA3AF',600)+placeLogo(653,682,660,C.white,C.reverse);
board+=text('PALETA',64,918,13,C.dark,600);
for(const [i,[label,color]] of Object.entries([['Primary',C.primary],['Secondary',C.secondary],['Accent',C.accent],['Dark',C.dark],['Light',C.light]])) {
  const x=64+Number(i)*224;
  board+=rect(x,950,200,54,color,8)+text(label,x,1020,14,C.dark,500)+text(color,x,1045,14,'#6B7280');
}
board+=text('Inter SemiBold',1240,943,24,C.dark,600)+text('Símbolo + nome em curvas',1240,982,15,'#6B7280')+text('SVG / PNG · v1.0',1240,1025,15,'#6B7280');
save('previews','sciledger-brand-board',svg(1600,1120,board,'SciLedger — apresentação da identidade final'),1600,1120,1600);

let qa=rect(0,0,1400,970,C.light)+text('SciLedger / prova de aplicação',44,35,30,C.dark,600);
qa+=rect(44,99,1312,85,C.white,8)+placeLogo(60,110,190)+text('Publish       Review       Hub',910,129,18,'#4B5563');
qa+=text('Navbar · assinatura com 190 px de largura',44,202,15,'#6B7280');
qa+=rect(44,254,630,215,C.white,12)+placeLogo(100,307,510,C.black,C.black);
qa+=rect(698,254,658,215,C.dark,12)+placeLogo(775,307,510,C.white,C.white);
qa+=text('Uma tinta · preto',60,428,15,'#6B7280')+text('Uma tinta · branco',720,428,15,'#9CA3AF');
qa+=text('Favicon · 16 / 24 / 32 / 48 / 64 px',44,514,21,C.dark,600);
let qx=48;
for(const size of [16,24,32,48,64]) {
  qa+=`<g transform="translate(${qx} 571) scale(${size/32})">${favicon}</g>`+text(String(size),qx,655,14,'#6B7280'); qx+=102;
}
qa+=text('Símbolo · 24 / 32 / 48 / 64 px',720,514,21,C.dark,600);
qx=722;
for(const size of [24,32,48,64]) { qa+=`<g transform="translate(${qx} 568) scale(${size/112})"><g transform="translate(8 8)">${mark()}</g></g>`+text(String(size),qx,655,14,'#6B7280');qx+=110; }
qa+=rect(44,717,1312,180,C.white,12)+text('Área de proteção',72,745,23,C.dark,600)+text('x = metade da haste principal · 9 unidades',72,792,18,'#6B7280')+text('Mínimo externo: x em todos os lados da área de tinta.',72,824,16,'#6B7280');
qa+=`<g transform="translate(980 750)"><rect x="-5" y="-5" width="106" height="106" fill="none" stroke="#0EA5E9" stroke-dasharray="4 4"/>${mark()}<path d="M-5 -16H4M-5 -20V-12M4 -20V-12" stroke="#111827"/>${text('x',-3,-40,13)}</g>`;
save('previews','sciledger-application-checks',svg(1400,970,qa,'SciLedger — provas de escala, contraste e aplicação'),1400,970,1400);

let variants=rect(0,0,1500,970,C.light)+text('SciLedger / versões e tamanhos mínimos',44,35,32,C.dark,600);
variants+=text('Arquivos finais em curvas · as proporções abaixo reproduzem os SVGs exportados.',44,88,18,'#6B7280');
const examples=[['sciledger-logo','Horizontal · 160 px',160],['sciledger-wordmark','Wordmark · 110 px',110],['sciledger-compact','Compacta · 140 px',140],['sciledger-logo-dark','Horizontal em fundo escuro',300],['sciledger-wordmark-white','Wordmark branco',210],['sciledger-compact-dark','Compacta em fundo escuro',190]];
for(let i=0;i<examples.length;i++) {
  const [name,label,width]=examples[i], col=i%3,row=Math.floor(i/3), x=44+col*476,y=150+row*382;
  const dark=row===1, meta=outputs.find(o=>o.name===name);
  const content=fs.readFileSync(path.join(root,'logo',`${name}.svg`),'utf8').replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'').replace(/<title[^>]*>.*?<\/title>/,'');
  variants+=rect(x,y,452,350,dark?C.dark:C.white,12)+text(label,x+24,y+25,17,dark?'#D1D5DB':'#4B5563',500);
  const hh=width*meta.h/meta.w;
  variants+=`<g transform="translate(${x+(452-width)/2} ${y+90+(226-hh)/2}) scale(${width/meta.w})">${content}</g>`;
}
save('previews','sciledger-variants',svg(1500,970,variants,'SciLedger — versões e mínimos digitais'),1500,970,1500);

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({deviceScaleFactor:1});
await page.route('**/*', route=>route.abort());
const report={font:{family:font.familyName,version:font.version,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,'fonts/InterVariable.ttf'))).digest('hex')},assets:[]};
try {
  for(const item of outputs) {
    const source=fs.readFileSync(path.join(root,item.dir,`${item.name}.svg`),'utf8');
    const xmlErrors=await page.evaluate(s=>new DOMParser().parseFromString(s,'image/svg+xml').getElementsByTagName('parsererror').length,source);
    if(xmlErrors || /<(text|image|script|foreignObject)\b/.test(source) || /\bhref=/.test(source)) throw Error(`Invalid or dependent SVG: ${item.name}`);
    const width=item.pngW, height=Math.round(width*item.h/item.w);
    await page.setViewportSize({width,height});
    await page.setContent(`<style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block;width:100vw;height:100vh}</style>${source}`);
    const dir=item.dir==='logo'?'png':'previews';
    await page.screenshot({path:path.join(root,dir,`${item.name}.png`),omitBackground:true});
    report.assets.push({svg:`${item.dir}/${item.name}.svg`,png:`${dir}/${item.name}.png`,width,height,xmlValid:true,outlined:true});
  }
  for(const size of [16,24,32,48,64]) {
    await page.setViewportSize({width:size,height:size});
    await page.setContent(`<style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block;width:100vw;height:100vh}</style>${svg(32,32,favicon,'SciLedger')}`);
    await page.screenshot({path:path.join(root,'png',`sciledger-favicon-${size}.png`),omitBackground:true});
  }
} finally {await browser.close();}
fs.writeFileSync(path.join(root,'source/validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Exported ${outputs.length} self-contained SVGs, ${outputs.length+5} PNGs. Primary viewBox: ${W} × 112.`);
