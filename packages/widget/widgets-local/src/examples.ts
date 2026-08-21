/** Built-in dependency-free Widget projects seeded into managed storage. */

export interface BuiltInWidget {
  readonly id: string
  readonly manifest: string
  readonly html: string
}

const calculatorManifest = {
  schemaVersion: 1,
  id: 'calculator',
  name: 'Quick Calculator',
  version: '1.1.0',
  runtime: 'static',
  entry: 'dist/index.html',
  aspectRatios: ['1:1'],
  defaultAspectRatio: '1:1',
  permissions: { network: [] },
  refresh: { mode: 'manual', minimumIntervalSeconds: 30 },
}

const goldManifest = {
  schemaVersion: 1,
  id: 'gold-price',
  name: 'Gold / USD',
  version: '1.1.0',
  runtime: 'static',
  entry: 'dist/index.html',
  aspectRatios: ['16:9'],
  defaultAspectRatio: '16:9',
  permissions: { network: ['xaus.com'] },
  refresh: { mode: 'on-open', minimumIntervalSeconds: 300 },
}

const calculatorHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;width:100%;height:100%;background:#f4f1ea;color:#171714;padding:clamp(11px,4.5vw,18px)}
.shell{height:100%;display:grid;grid-template-rows:auto minmax(46px,.72fr) minmax(0,3fr);gap:clamp(7px,2.5vw,12px)}.eyebrow{font:600 clamp(8px,2.8vw,10px)/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#777269}
.display{min-width:0;border-bottom:1px solid #c8c1b3;display:flex;align-items:flex-end;justify-content:flex-end;padding:4px 2px 8px;font:500 clamp(27px,10vw,46px)/1 ui-monospace,monospace;overflow:hidden;white-space:nowrap}
.keys{min-height:0;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(5,minmax(0,1fr));gap:clamp(4px,1.8vw,7px)}.keys button{min-width:0;min-height:0;border:1px solid #d7d0c4;background:#fbfaf7;color:inherit;border-radius:clamp(6px,2.8vw,9px);font:600 clamp(12px,4.5vw,16px)/1 system-ui;cursor:pointer;transition:transform .1s,background .15s}
.keys button:hover{background:#fff}.keys button:active{transform:scale(.96)}.keys .op{color:#9b6400;background:#f4e9d1}.keys .equals{background:#171714;color:#fff;border-color:#171714}.keys .wide{grid-column:span 2}
@media(prefers-color-scheme:dark){body{background:#191816;color:#f3efe6}.display{border-color:#444039}.keys button{background:#24221f;border-color:#3b3832}.keys button:hover{background:#2c2925}.keys .op{background:#3a3020;color:#edbd68}.keys .equals{background:#e7ded0;color:#181714}}
</style>
</head>
<body>
<main class="shell">
<div class="eyebrow">Local · Offline</div>
<output class="display" aria-live="polite">0</output>
<div class="keys" aria-label="Calculator keypad"></div>
</main>
<script>
const keys=['C','⌫','÷','×','7','8','9','−','4','5','6','+','1','2','3','=','0','.'];
const pad=document.querySelector('.keys');const out=document.querySelector('.display');let value='';
for(const key of keys){const button=document.createElement('button');button.textContent=key;button.type='button';
if('÷×−+'.includes(key))button.className='op';if(key==='=')button.className='equals';if(key==='0')button.className='wide';
button.onclick=()=>press(key);pad.append(button)}
function press(key){if(key==='C'){value='';return draw()}if(key==='⌫'){value=value.slice(0,-1);return draw()}if(key==='='){try{const safe=value.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-');if(!/^[0-9+\\-*/. ()]+$/.test(safe))throw 0;value=String(Function('"use strict";return ('+safe+')')())}catch{value='Error'}return draw()}if(value==='Error')value='';value+=key;draw()}
function draw(){out.textContent=value||'0'}document.addEventListener('keydown',event=>{const map={Enter:'=',Backspace:'⌫',Escape:'C','*':'×','/':'÷','-':'−'};const key=map[event.key]||event.key;if(keys.includes(key)){event.preventDefault();press(key)}})
</script>
</body>
</html>`

const goldHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;width:100%;height:100%;background:#11110f;color:#f6f0e3;padding:clamp(14px,3vw,24px)}
.shell{position:relative;height:100%;display:flex;flex-direction:column}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.eyebrow{font:600 clamp(8px,1.35vw,10px)/1.2 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#aa9c82}.state{font:500 clamp(9px,1.45vw,11px)/1.2 ui-monospace,monospace;color:#8c8372}.price{margin:clamp(5px,1.2vw,9px) 0 0;font:500 clamp(28px,6vw,56px)/.95 ui-monospace,monospace;letter-spacing:-.055em}.unit{font-size:.32em;letter-spacing:.02em;color:#aa9c82;margin-left:8px}.delta{margin-top:clamp(5px,1.3vw,10px);font:600 clamp(10px,1.7vw,13px)/1.2 ui-monospace,monospace}.delta.up{color:#82c98b}.delta.down{color:#ef8f7e}
.chart{position:relative;flex:1;min-height:0;margin-top:clamp(9px,2vw,18px);border-top:1px solid #2e2c26;border-bottom:1px solid #2e2c26;padding:clamp(7px,1.6vw,13px) 0}.chart svg{display:block;width:100%;height:100%;min-height:0;overflow:hidden}.line{fill:none;stroke:#d6ab54;stroke-width:2.2;vector-effect:non-scaling-stroke}.area{fill:url(#area)}.range{display:flex;justify-content:space-between;gap:12px;margin-top:clamp(6px,1.3vw,10px);font:500 clamp(8px,1.25vw,10px)/1.2 ui-monospace,monospace;color:#777064;white-space:nowrap}
.error{position:absolute;inset:auto 0 0;display:none;border:1px solid #5f3b31;background:#251a17;color:#f0b6a7;padding:10px;border-radius:8px;font-size:11px}.error.show{display:block}.retry{margin-top:8px;border:0;background:none;color:#f0b66b;padding:0;text-decoration:underline;cursor:pointer}
@media(prefers-color-scheme:light){body{background:#f4f0e7;color:#181713}.eyebrow,.unit{color:#807762}.state{color:#8c8270}.chart{border-color:#d8d0c0}.range{color:#8c8270}.error{background:#f9e9e3;color:#713628;border-color:#e5bdb0}}
</style>
</head>
<body>
<main class="shell">
<div class="top"><div><div class="eyebrow">XAU / USD · 90 trading days</div><div class="price">—<span class="unit">/ oz</span></div><div class="delta">Loading market data…</div></div><div class="state">LIVE</div></div>
<div class="chart"><svg viewBox="0 0 700 220" preserveAspectRatio="none" role="img" aria-label="Gold price trend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6ab54" stop-opacity=".34"/><stop offset="1" stop-color="#d6ab54" stop-opacity="0"/></linearGradient></defs><path class="area"/><path class="line"/></svg></div>
<div class="range"><span class="start">—</span><span>Source: xaus.com · Indicative only</span><span class="end">—</span></div>
<div class="error"><span></span><br><button class="retry" type="button">Try again</button></div>
</main>
<script>
const price=document.querySelector('.price');const delta=document.querySelector('.delta');const state=document.querySelector('.state');const errorBox=document.querySelector('.error');
document.querySelector('.retry').onclick=load;
async function load(){errorBox.classList.remove('show');state.textContent='SYNCING';delta.textContent='Loading market data…';
try{const response=await window.dshWidget.fetch('https://xaus.com/api/v1/history');if(response.status<200||response.status>=300)throw new Error('Provider returned HTTP '+response.status);
const data=JSON.parse(response.body);const points=data.points.slice(-90);if(points.length<2)throw new Error('History response contained too few points');render(points);state.textContent='LIVE'}
catch(error){state.textContent='STALE';delta.textContent='Market data unavailable';errorBox.querySelector('span').textContent=error.message;errorBox.classList.add('show')}}
function render(points){const values=points.map(point=>point.c);const min=Math.min(...values),max=Math.max(...values),span=max-min||1;const coords=values.map((value,index)=>[index/(values.length-1)*700,205-(value-min)/span*180]);
const line=coords.map((point,index)=>(index?'L':'M')+point[0].toFixed(1)+' '+point[1].toFixed(1)).join(' ');document.querySelector('.line').setAttribute('d',line);document.querySelector('.area').setAttribute('d',line+' L700 220 L0 220 Z');
const latest=values.at(-1),first=values[0],change=(latest-first)/first*100;price.innerHTML='$'+latest.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})+'<span class="unit">/ oz</span>';
delta.textContent=(change>=0?'+':'')+change.toFixed(2)+'% · 90D';delta.className='delta '+(change>=0?'up':'down');document.querySelector('.start').textContent=points[0].d;document.querySelector('.end').textContent=points.at(-1).d}
load();
</script>
</body>
</html>`

/** The two first-release examples written only when their project ids are absent. */
export const BUILT_IN_WIDGETS: readonly BuiltInWidget[] = [
  { id: 'calculator', manifest: `${JSON.stringify(calculatorManifest, null, 2)}\n`, html: calculatorHtml },
  { id: 'gold-price', manifest: `${JSON.stringify(goldManifest, null, 2)}\n`, html: goldHtml },
]
