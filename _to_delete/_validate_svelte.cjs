const fs = require('fs');
const { compile } = require('svelte/compiler');
const ts = require('typescript');
function preprocess(code){
  // transpile TS inside <script> blocks
  code = code.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g, (m, attrs, body) => {
    if(!/lang=["']ts["']/.test(attrs)) return m;
    const out = ts.transpileModule(body, { compilerOptions:{ target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }}).outputText;
    return '<script'+attrs.replace(/\s*lang=["']ts["']/,'')+'>'+out+'</script>';
  });
  // strip simple TS `as Type` casts that appear in markup expressions (real build handles these)
  code = code.replace(/\bas\s+[A-Za-z_$][\w$.]*(\s*\[\s*\])?/g, '');
  return code;
}
let bad=0;
for(const f of process.argv.slice(2)){
  try{
    const res = compile(preprocess(fs.readFileSync(f,'utf8')), { filename:f, generate:'client' });
    const w=res.warnings||[];
    console.log('OK   '+f+(w.length?('  ('+w.length+' warn)'):''));
    for(const x of w) console.log('     warn: '+(x.code||'')+' '+x.message);
  }catch(e){ bad++; console.log('FAIL '+f+'  @'+(e.start?e.start.line+':'+e.start.column:'?')); console.log('     '+(e&&e.message?e.message:e)); }
}
console.log('RESULT '+(bad?('FAILED:'+bad):'ALL_OK'));
