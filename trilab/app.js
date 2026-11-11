/* Lena's TriLab – App (Vanilla JS, kein Build-Schritt). Daten: localStorage, optional Supabase-Sync (sync.js). */
(function(){
'use strict';
const CFG=window.TRILAB_CONFIG||{},IC=window.IC,Sync=window.Sync,EN=window.TRILAB_EN||{dict:{},content:{}};
let LANG='de',C=window.TRILAB_CONTENT,SP,SPK,PRODUCTS,RANKS,DAYS;   // sprachabhängig, gesetzt in applyLang()
const KEY='trilab.v1';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const uid=()=>(crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:r&3|8).toString(16)}));
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const pd=s=>new Date(s+'T12:00:00');
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const weekStart=d=>{const x=new Date(d);x.setHours(12,0,0,0);return addDays(x,-((x.getDay()+6)%7))};
const isoWeek=d=>{const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const n=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-n);return Math.ceil(((t-Date.UTC(t.getUTCFullYear(),0,1))/864e5+1)/7)};
const LOC=()=>LANG==='en'?'en-GB':'de-DE';
const t=(de,en)=>LANG==='en'?en:de;
const fmtDate=s=>pd(s).toLocaleDateString(LOC(),{weekday:'short',day:'numeric',month:'short'});
const fmtLong=s=>pd(s).toLocaleDateString(LOC(),{day:'numeric',month:'long',year:'numeric'});
const fmtMin=m=>m>=60?`${Math.floor(m/60)}:${pad(Math.round(m%60))} h`:`${Math.round(m)} min`;
const fmtH=m=>{const h=m/60;return h<10?(LANG==='en'?h.toFixed(1):h.toFixed(1).replace('.',',')):Math.round(h)};
const fmtT=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h}:${pad(m)}:${pad(s%60)}`:`${m}:${pad(s%60)}`};
function parseT(v){v=(v||'').trim();if(!v)return null;const p=v.split(':').map(Number);if(p.length<2||p.length>3||p.some(x=>!isFinite(x)||x<0))return NaN;return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1]}
const sum=(a,f)=>a.reduce((t,x)=>t+(Number(x[f])||0),0);

/* ---------- State ---------- */
const defaults=()=>({v:1,profile:{name:'',goal:'olympic'},workouts:[],races:[],questions:[],faq:null,orders:[],sync:{cursor:{}},ui:{}});
let S=(()=>{try{const o=JSON.parse(localStorage.getItem(KEY)||'null');return o?{...defaults(),...o,profile:{...defaults().profile,...o.profile}}:defaults()}catch(e){return defaults()}})();
let storageOk=true;
function save(quiet){try{localStorage.setItem(KEY,JSON.stringify(S));storageOk=true}catch(e){if(storageOk)toast('Speichern fehlgeschlagen – bitte Daten exportieren');storageOk=false}if(!quiet)Sync.schedule()}
const live=a=>a.filter(x=>!x.del);
const W=()=>live(S.workouts),R=()=>live(S.races);
function removeRec(arr,id){const i=arr.findIndex(x=>x.id===id);if(i<0)return;if(Sync.active){arr[i].del=true;arr[i].u=Date.now();arr[i].d=1}else arr.splice(i,1)}

/* ---------- Sprache (DE/EN) ----------
   Deutsch ist die Quellsprache. Englisch: Inhalte aus i18n.en.js (content) + Textersetzung beim Rendern (dict). */
const detectLang=()=>((navigator.languages&&navigator.languages[0])||navigator.language||'de').toLowerCase().startsWith('de')?'de':'en';
function buildC(){
  const b=window.TRILAB_CONTENT,e=EN.content;if(LANG!=='en'||!e)return b;
  const ov=(o,x)=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,{...v,...(x&&x[k])}]));
  return {...b,sports:Object.fromEntries(Object.entries(b.sports).map(([k,v])=>[k,{...v,n:e.sports[k]||v.n}])),goals:ov(b.goals,e.goals),raceTypes:ov(b.raceTypes,e.raceTypes),
    shopCats:Object.fromEntries(Object.entries(b.shopCats).map(([k,v])=>[k,{...v,n:e.shopCats[k]||v.n}])),sessions:ov(b.sessions,e.sessions),tips:e.tips||b.tips,faq:e.faq||b.faq,
    products:b.products.map(p=>({...p,...(e.products[p.id]||{})}))};
}
function applyLang(){
  LANG=S.ui.lang==='de'||S.ui.lang==='en'?S.ui.lang:detectLang();
  C=buildC();SP=C.sports;SPK=Object.keys(SP);PRODUCTS=C.products;
  RANKS=LANG==='en'?['Rookie','Splash Starter','Pedal Pusher','Run Rebel','Triathlete','Brick Boss','Iron Mind','Legend']:['Rookie','Splash-Starter','Pedal-Pusher','Run-Rebel','Triathlet:in','Brick-Boss','Iron-Mind','Legende'];
  DAYS=LANG==='en'?['Mon','Tue','Wed','Thu','Fri','Sat','Sun']:['Mo','Di','Mi','Do','Fr','Sa','So'];
  document.documentElement.lang=LANG;
}
const MISS=window.__trMiss=new Set();
function trStr(s){
  if(LANG!=='en'||!s)return s;
  const lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],nums=[];
  const key=s.replace(/\s+/g,' ').trim().replace(/\d+(?:[.,]\d+)?/g,m=>{nums.push(m.replace(',','.'));return '{n}'});
  let v=EN.dict[key];if(v==null){if(/[A-Za-zÄÖÜäöüß]/.test(key))MISS.add(key);return s}
  let i=0;return lead+v.replace(/\{n\}/g,()=>nums[i++]??'')+trail;
}
function trDom(root){
  if(LANG!=='en'||!root)return;
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentNode&&n.parentNode.nodeName;return (!n.nodeValue.trim()||p==='TEXTAREA'||p==='SCRIPT'||p==='STYLE')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}});
  const list=[];while(w.nextNode())list.push(w.currentNode);list.forEach(n=>{n.nodeValue=trStr(n.nodeValue)});
  root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el=>['placeholder','aria-label','title'].forEach(at=>{const v=el.getAttribute(at);if(v)el.setAttribute(at,trStr(v))}));
}
const langBar=()=>`<div class="themes" role="group" aria-label="Sprache / Language">Sprache / Language<div class="row">${[['de','Deutsch'],['en','English']].map(([k,n])=>`<button type="button" data-a="lang" data-id="${k}" aria-pressed="${LANG===k}">${n}</button>`).join('')}</div></div>`;
applyLang();

/* ---------- Theme ---------- */
const THEMES=[['glow','Glow','linear-gradient(135deg,#5b5bff,#ffd23f)'],['aurora','Aurora','linear-gradient(135deg,#1fcfb5,#9a6bff)'],['light','Hell','linear-gradient(135deg,#ff7eb6,#8b6bff)']];
const themeOf=()=>{const t=S.ui.theme;return t==='dark'?'aurora':THEMES.some(x=>x[0]===t)?t:'glow'};
const themeBar=()=>`<div class="themes" role="group" aria-label="Design">Design<div class="row">${THEMES.map(([k,n,sw])=>`<button type="button" data-a="theme" data-id="${k}" aria-pressed="${themeOf()===k}"><i style="--sw:${sw}"></i>${n}</button>`).join('')}</div></div>`;
function applyTheme(){const t=themeOf();document.documentElement.dataset.theme=t;
  const dark=t!=='light';
  document.querySelectorAll('meta[name=theme-color]').forEach(m=>m.remove());
  const m=document.createElement('meta');m.name='theme-color';m.content=t==='glow'?'#0f1226':dark?'#080c15':'#fbf8ff';document.head.appendChild(m)}
applyTheme();
/* ---------- UI helpers ---------- */
const sdot=(sp,sm)=>`<span class="sdot ${sm?'sm':''}" style="--c:${SP[sp].col}">${IC(sp,sm?18:22)}</span>`;
const zone=(z,col)=>`<span class="zone" style="--c:${col}" title="Intensität ${z}/5">${[1,2,3,4,5].map(i=>`<i class="${i<=z?'on':''}"></i>`).join('')}</span>`;
let toastT;function toast(m){const el=$('#toast');el.textContent=trStr(m);el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2600)}
function sheet(html){$('#sheetBody').innerHTML=html;trDom($('#sheetBody'));$('#sheet').hidden=false;$('.panel').scrollTop=0}
function closeSheet(){$('#sheet').hidden=true}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
const ROUTES=[['home','Heute','home'],['plan','Plan','plan'],['log','Log','log'],['races','Rennen','flag'],['ask','Ask Lena','chat']];   // Labels deutsch, übersetzt in render()
const route=()=>{const r=(location.hash.replace('#/','')||'home');return r==='achv'||r==='shop'||ROUTES.some(x=>x[0]===r)?r:'home'};

/* ---------- Plan-Helfer ---------- */
const plan=()=>C.plans[S.profile.goal]||C.plans.olympic;
const planMin=g=>C.plans[g].days.flat().reduce((t,id)=>t+C.sessions[id].min,0);
const doneOn=(id,date)=>W().some(w=>w.plan===id&&w.date===date);
const weekOf=d=>{const s=weekStart(d);return [iso(s),iso(addDays(s,6))]};
const inRange=(w,a,b)=>w.date>=a&&w.date<=b;

function streak(){
  const days=new Set(W().map(w=>w.date));let d=new Date(),n=0;
  if(!days.has(iso(d)))d=addDays(d,-1);
  while(days.has(iso(d))){n++;d=addDays(d,-1)}
  return n;
}


/* ---------- Gamification: XP, Level, Abzeichen, Wochenquests (alles aus den Einträgen berechnet → sync-sicher) ---------- */
const needXP=n=>100+40*n;
function levelInfo(xp){let lvl=1,rest=xp;while(rest>=needXP(lvl)){rest-=needXP(lvl);lvl++}return {lvl,rest,need:needXP(lvl),rank:RANKS[Math.min(RANKS.length-1,Math.floor((lvl-1)/2))]}}
const wxp=w=>Math.round(30+Math.min(w.dur,180)*.6+(w.rpe>=7?10:0)+(w.source==='plan'?15:0));
function raceInfo(){
  const done=R().filter(r=>r.date<=today()&&totalOf(r)).sort((a,b)=>a.date.localeCompare(b.date));
  return done.map((r,i)=>{const t=totalOf(r),prior=done.slice(0,i).filter(x=>x.type===r.type).map(totalOf),pb=prior.length>0&&t<Math.min(...prior);return {r,pb,xp:100+(pb?50:0)}});
}
function weeksMap(){const m=new Map();W().forEach(w=>{const k=iso(weekStart(pd(w.date)));(m.get(k)||m.set(k,[]).get(k)).push(w)});return m}
const QUESTS=[
 {id:'tri',n:'Dreikampf',d:'Schwimmen, Rad und Laufen in einer Woche',ic:'brick',max:3,p:ws=>['swim','bike','run'].filter(k=>ws.some(w=>w.sport===k)).length},
 {id:'days',n:'Dranbleiben',d:'An 4 verschiedenen Tagen trainieren',ic:'flame',max:4,p:ws=>new Set(ws.map(w=>w.date)).size},
 {id:'stab',n:'Stabil bleiben',d:'Kraft und Mobility in einer Woche',ic:'mobility',max:2,p:ws=>['strength','mobility'].filter(k=>ws.some(w=>w.sport===k)).length}
];
const questProg=(q,ws)=>Math.min(q.max,q.p(ws));
function questKeys(){const s=new Set();for(const [k,ws] of weeksMap())for(const q of QUESTS)if(questProg(q,ws)>=q.max)s.add(k+':'+q.id);return s}
function weekStreak(){
  const m=weeksMap(),ok=k=>(m.get(k)||[]).length&&new Set(m.get(k).map(w=>w.date)).size>=3;
  let d=weekStart(new Date());if(!ok(iso(d)))d=addDays(d,-7);let n=0;while(ok(iso(d))){n++;d=addDays(d,-7)}return n;
}
function xpTotal(){return W().reduce((t,w)=>t+wxp(w),0)+20*new Set(W().map(w=>w.date)).size+raceInfo().reduce((t,x)=>t+x.xp,0)+60*questKeys().size}
function badgeList(){
  const ws=W(),days=new Set(ws.map(w=>w.date)).size,cnt=k=>ws.filter(w=>w.sport===k).length,km=k=>sum(ws.filter(w=>w.sport===k),'dist');
  const mx=(k)=>Math.max(0,...ws.filter(w=>w.sport===k).map(w=>w.dur)),qk=questKeys(),tri=[...qk].filter(x=>x.endsWith(':tri')).length,ri=raceInfo(),st=weekStreak();
  const B=(id,ic,n,d,ok)=>({id,ic,n,d,ok});
  return [
   B('d1','target','Erster Schritt','Erstes Training geloggt',days>=1),B('d10','flame','10 Trainingstage','An 10 Tagen trainiert',days>=10),B('d25','sparkle','25 Trainingstage','An 25 Tagen trainiert',days>=25),
   B('d50','heart','50 Trainingstage','An 50 Tagen trainiert',days>=50),B('d100','trophy','100 Trainingstage','An 100 Tagen trainiert',days>=100),
   B('sw10','swim','Wasserratte','10 × Schwimmen',cnt('swim')>=10),B('bk10','bike','Pedal-Power','10 × Rad',cnt('bike')>=10),B('rn10','run','Läuferherz','10 × Laufen',cnt('run')>=10),
   B('st10','strength','Kraftpaket','10 × Kraft',cnt('strength')>=10),B('mo10','mobility','Beweglich','10 × Mobility',cnt('mobility')>=10),
   B('br1','brick','Koppel-Premiere','Erstes Koppeltraining',cnt('brick')>=1),B('br10','brick','Brick-Boss','10 × Koppeltraining',cnt('brick')>=10),
   B('tri1','brick','Dreikampf','Alle drei Disziplinen in einer Woche',tri>=1),B('tri4','sparkle','Triathlon-Woche ×4','4 Dreikampf-Wochen',tri>=4),
   B('lr90','run','Langer Atem','Lauf ≥ 90 min',mx('run')>=90),B('lb180','bike','Langstrecke','Radausfahrt ≥ 3 h',mx('bike')>=180),
   B('sw10k','swim','10 km Wasser','10 km geschwommen',km('swim')>=10),B('bk500','route','500 km Rad','500 km Rad gefahren',km('bike')>=500),B('rn100','route','100 km Laufen','100 km gelaufen',km('run')>=100),
   B('r1','flag','Startnummer','Erstes Rennen mit Ergebnis',ri.length>=1),B('rpb','trophy','Bestzeit','Neue Bestzeit über eine Distanz',ri.some(x=>x.pb)),
   B('w4','flame','4 Wochen Serie','4 Wochen in Folge ≥ 3 Trainingstage',st>=4),B('w12','trophy','12 Wochen Serie','12 Wochen in Folge ≥ 3 Trainingstage',st>=12),
   B('q10','check','Quest-Jäger:in','10 Wochenquests erledigt',qk.size>=10),
   B('sup','heart','Supporter:in','Etwas im Shop gekauft',S.orders.length>=1)
  ];
}
const snap=()=>{const xp=xpTotal();return {xp,lv:levelInfo(xp).lvl,b:badgeList().filter(x=>x.ok).map(x=>x.id),q:[...questKeys()]}};
function confetti(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const c=document.createElement('canvas');c.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90';c.width=innerWidth;c.height=innerHeight;document.body.appendChild(c);
  const g=c.getContext('2d'),cols=['#27d6b4','#4f8cff','#9a6bff','#ff6fae','#ffb84d'],P=Array.from({length:90},()=>({x:innerWidth/2,y:innerHeight*.55,vx:(Math.random()-.5)*14,vy:-Math.random()*15-4,s:5+Math.random()*6,c:cols[Math.random()*5|0],r:Math.random()*6}));
  let f=0;(function step(){g.clearRect(0,0,c.width,c.height);P.forEach(p=>{p.vy+=.45;p.x+=p.vx;p.y+=p.vy;p.r+=.2;g.fillStyle=p.c;g.save();g.translate(p.x,p.y);g.rotate(p.r);g.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);g.restore()});if(++f<100)requestAnimationFrame(step);else c.remove()})();
}
function celebrate(a,title){
  const b=snap(),gain=b.xp-a.xp,nb=badgeList().filter(x=>x.ok&&!a.b.includes(x.id)),nq=b.q.filter(k=>!a.q.includes(k)).map(k=>QUESTS.find(q=>q.id===k.split(':')[1])),up=b.lv>a.lv,li=levelInfo(b.xp);
  const big=up||nb.length||nq.length;
  sheet(`<div class="stack" style="text-align:center"><div class="sdot" style="--c:#7b7cff;width:64px;height:64px;border-radius:22px;margin:0 auto">${IC(big?'trophy':'check',32)}</div><h2>${esc(title)}</h2>
   <div class="big num">+${gain}<small>XP</small></div>
   ${up?`<div class="note-line">${IC('sparkle',20)}<span><b>Level ${li.lvl}</b> – ${esc(li.rank)}!</span></div>`:''}
   ${nq.map(q=>`<div class="note-line">${IC(q.ic,20)}<span>Quest erledigt: <b>${esc(q.n)}</b> (+60 XP)</span></div>`).join('')}
   ${nb.map(x=>`<div class="note-line">${IC(x.ic,20)}<span>Neues Abzeichen: <b>${esc(x.n)}</b></span></div>`).join('')}
   <div><div class="bar"><i style="width:${li.rest/li.need*100}%"></i></div><div class="tiny muted" style="margin-top:4px">Level ${li.lvl} · ${li.rest}/${li.need} XP</div></div>
   <button class="btn primary block" data-a="closeSheet">Weiter</button></div>`);
  if(big||gain>=60)confetti();
}
function levelCard(link){
  const xp=xpTotal(),L=levelInfo(xp);
  return `<${link?'a href="#/achv"':'div'} class="card row${link?' t-t':''}" style="gap:14px;text-decoration:none;color:inherit"><div class="lvlbadge">${L.lvl}</div><div class="grow"><div class="row sp"><b>${esc(L.rank)}</b><span class="small muted num">${L.rest} / ${L.need} XP</span></div><div class="bar" style="margin-top:6px"><i style="width:${L.rest/L.need*100}%"></i></div><div class="tiny muted" style="margin-top:4px">Noch ${L.need-L.rest} XP bis Level ${L.lvl+1}</div></div>${link?`<span class="muted">${IC('chev',18)}</span>`:''}</${link?'a':'div'}>`;
}
function questsCard(){
  const ws=weeksMap().get(iso(weekStart(new Date())))||[];
  return `<div class="card"><div class="row sp" style="margin-bottom:10px"><div class="lbl">Wochenquests</div><span class="tag">+60 XP je Quest</span></div><div class="stack" style="gap:12px">${QUESTS.map(q=>{const p=questProg(q,ws),done=p>=q.max;
    return `<div class="row"><span class="sdot sm" style="--c:${done?'var(--ok)':'#7b7cff'}">${IC(done?'check':q.ic,18)}</span><div class="grow"><div class="row sp"><b class="small">${q.n}</b><span class="tiny muted num">${p}/${q.max}</span></div><div class="bar" style="margin-top:4px;--c:${done?'var(--ok)':'var(--violet)'}"><i style="width:${p/q.max*100}%"></i></div><div class="tiny muted" style="margin-top:2px">${q.d}</div></div></div>`}).join('')}</div></div>`;
}

/* ---------- Views ---------- */
function sessionCard(id,date,extra=''){
  const s=C.sessions[id],sp=SP[s.sp],done=date&&doneOn(id,date);
  return `<button class="item ${done?'done':''}" data-a="session" data-id="${id}" data-date="${date||''}">
    ${sdot(s.sp)}<span class="grow"><b>${esc(s.t)}</b><br><span class="muted small">${sp.n} · ${fmtMin(s.min)} · ${zone(s.z,sp.col)}</span>${extra}</span>
    ${done?`<span class="tick">${IC('check',22)}</span>`:`<span class="muted">${IC('chev',18)}</span>`}</button>`;
}

function vHome(){
  const g=C.goals[S.profile.goal],[a,b]=weekOf(new Date()),wk=W().filter(w=>inRange(w,a,b));
  const mins=sum(wk,'dur'),target=planMin(S.profile.goal),pct=Math.min(1,mins/target),R0=54,circ=2*Math.PI*R0;
  const idx=(new Date().getDay()+6)%7,todays=plan().days[idx];
  const next=R().filter(r=>r.date>=today()).sort((x,y)=>x.date.localeCompare(y.date))[0];
  const hr=new Date().getHours(),hi=hr<11?t('Guten Morgen','Good morning'):hr<18?'Hi':t('Guten Abend','Good evening'),name=S.profile.name?`, ${esc(S.profile.name)}`:'';
  const by=SPK.map(k=>[k,sum(wk.filter(w=>w.sport===k),'dur')]).filter(x=>x[1]>0),mx=Math.max(1,...by.map(x=>x[1]));
  const doy=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/864e5),tip=C.tips[doy%C.tips.length],st=streak();
  const days=next?Math.round((pd(next.date)-pd(today()))/864e5):0;
  return `<div class="pagehead"><h1>${hi}${name}</h1></div><div class="stack">
  <div class="card hero"><div class="row"><span style="position:relative;z-index:1">${IC('target',26)}</span>
    <div style="position:relative;z-index:1"><div class="lbl" style="color:rgba(255,255,255,.8)">Road to</div><h2 style="font-size:1.25rem">${esc(g.n)}</h2><div class="small muted">${esc(g.sub)}</div></div></div></div>
  <div class="card t-o"><div class="row" style="gap:18px">
    <div class="ring"><svg width="132" height="132" viewBox="0 0 132 132"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--g1)"/><stop offset="1" style="stop-color:var(--g2)"/></linearGradient></defs>
      <circle cx="66" cy="66" r="${R0}" fill="none" stroke="var(--card2)" stroke-width="14"/>
      <circle cx="66" cy="66" r="${R0}" fill="none" stroke="url(#rg)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ*(1-pct)}"/></svg>
      <div class="mid"><div><div class="big num" style="font-size:1.6rem">${fmtH(mins)}<small>h</small></div><div class="tiny muted">von ${fmtH(target)} h</div></div></div></div>
    <div class="grow stack" style="gap:10px"><div><div class="lbl">Diese Woche</div><div class="small muted">${wk.length} Einheit${wk.length===1?'':'en'} geloggt</div></div>
      <div class="row small" style="color:var(--pink);font-weight:800">${IC('flame',20)}${st} Tag${st===1?'':'e'} in Folge</div></div></div></div>
  ${levelCard(true)}
  <div><div class="row sp" style="margin-bottom:8px"><h2>Heute im Plan</h2><a href="#/plan" class="small" style="font-weight:700;text-decoration:none">Woche ansehen</a></div>
    <div class="stack" style="gap:10px">${todays.length?todays.map(id=>sessionCard(id,today())).join(''):`<div class="rest">${IC('moon',20)} Ruhetag – Erholung gehört zum Training.</div>`}</div></div>
  ${next?`<a href="#/races" class="card row" style="text-decoration:none;color:inherit">${sdot('brick')}<div class="grow"><div class="lbl">Nächster Wettkampf</div><b>${esc(next.name)}</b><div class="small muted">${fmtDate(next.date)}</div></div><div class="big num" style="font-size:1.6rem">${days}<small>${days===1?'Tag':'Tage'}</small></div></a>`:''}
  <div class="card"><div class="lbl" style="margin-bottom:10px">Woche nach Sportart</div>${by.length?`<div class="stack" style="gap:10px">${by.map(([k,m])=>`<div class="row">${sdot(k,1)}<div class="grow"><div class="bar" style="--c:${SP[k].col}"><i style="width:${m/mx*100}%"></i></div></div><b class="small num" style="min-width:56px;text-align:right">${fmtMin(m)}</b></div>`).join('')}</div>`:'<p class="muted small">Noch nichts geloggt – los geht’s!</p>'}</div>
  ${questsCard()}
  <a href="#/shop" class="card row" style="text-decoration:none;color:inherit">${tileIc('bag','#ff5c9d')}<div class="grow"><b>Lena’s Shop</b><div class="small muted">Persönlicher Plan, Beratung &amp; Garmin-Anbindung</div></div><span class="muted">${IC('chev',18)}</span></a>
  <div class="card row" style="align-items:flex-start">${IC('sparkle',22)}<div><div class="lbl">Tipp des Tages</div><p style="margin-top:4px">${esc(tip)}</p></div></div></div>`;
}

function vPlan(){
  const mode=S.ui.pm||'week',g=S.profile.goal,ws=weekStart(new Date()),t=today();
  const goals=`<div class="chips scroll">${Object.entries(C.goals).map(([k,v])=>`<button class="chip ${k===g?'on':''}" data-a="goal" data-id="${k}">${esc(v.n)}</button>`).join('')}</div>`;
  let body='';
  if(mode==='week'){
    body=`<div class="small muted" style="margin:2px 0 4px">Wochenumfang ca. <b>${fmtH(planMin(g))} h</b> · ${esc(C.goals[g].sub)}</div><div class="stack">`+
      plan().days.map((ids,i)=>{const d=iso(addDays(ws,i));return `<div class="daycol"><div class="dayname ${d===t?'today':''}"><b>${DAYS[i]}</b><small>${pd(d).getDate()}.</small></div>
        <div class="stack" style="gap:8px">${ids.length?ids.map(id=>sessionCard(id,d)).join(''):`<div class="rest">${IC('moon',18)} Ruhetag</div>`}</div></div>`}).join('')+'</div>';
  }else{
    const f=S.ui.pf||'all',list=Object.entries(C.sessions).filter(([,s])=>f==='all'||s.sp===f);
    body=`<div class="chips scroll"><button class="chip ${f==='all'?'on':''}" data-a="pfilter" data-id="all">Alle</button>${SPK.filter(k=>k!=='other').map(k=>`<button class="chip ${f===k?'on':''}" style="--c:${SP[k].col}" data-a="pfilter" data-id="${k}">${IC(k,16)}${SP[k].n}</button>`).join('')}</div>
      <div class="stack" style="gap:10px;margin-top:6px">${list.map(([id])=>sessionCard(id,null)).join('')}</div>`;
  }
  return `<div class="pagehead"><h1>Trainingsplan</h1></div><div class="stack">
    <div class="seg"><button class="${mode==='week'?'on':''}" data-a="pmode" data-id="week">Meine Woche</button><button class="${mode==='lib'?'on':''}" data-a="pmode" data-id="lib">Bibliothek</button></div>
    ${mode==='week'?goals:''}${body}</div>`;
}

function weekChart(){
  const now=weekStart(new Date()),N=8,cols=[];
  for(let i=N-1;i>=0;i--){const s=addDays(now,-7*i),a=iso(s),b=iso(addDays(s,6)),ws=W().filter(w=>inRange(w,a,b));
    cols.push({kw:isoWeek(s),by:SPK.map(k=>[k,sum(ws.filter(w=>w.sport===k),'dur')]),tot:sum(ws,'dur')})}
  const mx=Math.max(60,...cols.map(c=>c.tot)),H=110,bw=24,gap=12;
  return `<svg viewBox="0 0 ${N*(bw+gap)} ${H+22}" width="100%" role="img" aria-label="Trainingszeit der letzten 8 Wochen">`+cols.map((c,i)=>{
    let y=H;const x=i*(bw+gap)+gap/2;
    const bars=c.by.filter(p=>p[1]>0).map(([k,m])=>{const h=m/mx*H;y-=h;return `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(h-1.5,1)}" rx="5" fill="${SP[k].col}"/>`}).join('');
    return bars+`<text x="${x+bw/2}" y="${H+15}" text-anchor="middle" font-size="9" fill="var(--muted)" font-weight="700">KW${c.kw}</text>`}).join('')+'</svg>';
}

function vLog(){
  const f=S.ui.lf||'all',all=W().filter(w=>f==='all'||w.sport===f).sort((a,b)=>b.date.localeCompare(a.date)||b.u-a.u);
  const total=sum(W(),'dur'),km=sum(W().filter(w=>['run','bike','swim'].includes(w.sport)),'dist');
  const groups=new Map();all.forEach(w=>{const k=iso(weekStart(pd(w.date)));(groups.get(k)||groups.set(k,[]).get(k)).push(w)});
  return `<div class="pagehead"><h1>Training</h1><label class="btn sm" style="cursor:pointer">${IC('upload',16)}GPX/TCX<input type="file" id="imp" accept=".gpx,.tcx" multiple hidden></label></div><div class="stack">
  <div class="card"><div class="row sp" style="margin-bottom:6px"><div class="lbl">Letzte 8 Wochen</div><div class="tiny muted">Gesamt ${fmtMin(total)} · ${Math.round(km)} km</div></div>${weekChart()}
    <div class="chips" style="margin-top:8px">${SPK.filter(k=>W().some(w=>w.sport===k)).map(k=>`<span class="tiny muted row" style="gap:4px"><i style="width:9px;height:9px;border-radius:3px;background:${SP[k].col};display:inline-block"></i>${SP[k].n}</span>`).join('')}</div></div>
  <div class="chips scroll"><button class="chip ${f==='all'?'on':''}" data-a="lfilter" data-id="all">Alle</button>${SPK.map(k=>`<button class="chip ${f===k?'on':''}" style="--c:${SP[k].col}" data-a="lfilter" data-id="${k}">${IC(k,16)}${SP[k].n}</button>`).join('')}</div>
  ${all.length?[...groups].map(([k,ws])=>`<div><div class="lbl" style="margin:4px 2px 8px">KW ${isoWeek(pd(k))} · ${fmtMin(sum(ws,'dur'))}</div><div class="stack" style="gap:8px">${ws.map(w=>{const sp=SP[w.sport];return `<button class="item" data-a="editW" data-id="${w.id}">${sdot(w.sport)}<span class="grow"><b>${sp.n}</b> <span class="muted small">· ${fmtDate(w.date)}</span><br><span class="muted small">${fmtMin(w.dur)}${w.dist?` · ${(LANG==='en'?String(w.dist):String(w.dist).replace('.',','))} km`:''}${w.rpe?` · RPE ${w.rpe}`:''}${w.source&&w.source!=='manual'?` · <span class="tag">${w.source==='plan'?'Plan':w.source.toUpperCase()}</span>`:''}</span>${w.note?`<br><span class="small">${esc(w.note.slice(0,80))}</span>`:''}</span><span class="muted">${IC('chev',18)}</span></button>`}).join('')}</div></div>`).join('')
    :`<div class="empty">${IC('log',34)}<p>Noch keine Einheiten.<br>Tippe auf <b>+</b> und logge dein erstes Training.</p></div>`}</div>
  <button class="fab" data-a="newW" aria-label="Training hinzufügen">${IC('plus',28)}</button>`;
}

const splitsOf=r=>['swim','t1','bike','t2','run'].filter(k=>r.res?.[k]);
const totalOf=r=>r.res?.tot||(splitsOf(r).length?splitsOf(r).reduce((t,k)=>t+r.res[k],0):null);
function vRaces(){
  const t=today(),up=R().filter(r=>r.date>=t).sort((a,b)=>a.date.localeCompare(b.date)),past=R().filter(r=>r.date<t).sort((a,b)=>b.date.localeCompare(a.date));
  const best={};past.forEach(r=>{const x=totalOf(r);if(x&&(!best[r.type]||x<best[r.type]))best[r.type]=x});
  const card=(r,isPast)=>{const x=totalOf(r),sp=splitsOf(r),days=Math.round((pd(r.date)-pd(t))/864e5);
    return `<button class="item" style="align-items:flex-start;flex-direction:column;gap:10px" data-a="editR" data-id="${r.id}"><div class="row" style="width:100%">${sdot('brick')}<span class="grow"><b>${esc(r.name)}</b><br><span class="muted small">${fmtLong(r.date)} · ${C.raceTypes[r.type]?.n||''}${r.loc?` · ${esc(r.loc)}`:''}</span></span>
      ${isPast?(x?`<span style="text-align:right"><b class="num" style="font-size:1.1rem">${fmtT(x)}</b>${best[r.type]===x?'<br><span class="tag pb">Bestzeit</span>':''}</span>`:''):`<span style="text-align:right"><b class="num" style="font-size:1.4rem">${days}</b><br><span class="tiny muted">${days===1?'Tag':'Tage'}</span></span>`}</div>
      ${isPast&&sp.length?`<div style="width:100%"><div class="stackbar">${sp.map(k=>`<i style="flex:${r.res[k]};background:${k==='t1'||k==='t2'?'var(--line)':SP[k].col}"></i>`).join('')}</div>
        <div class="row wrap tiny muted" style="gap:4px 12px;margin-top:6px">${sp.map(k=>`<span>${{swim:'Swim',t1:'T1',bike:'Bike',t2:'T2',run:'Run'}[k]} <b>${fmtT(r.res[k])}</b></span>`).join('')}</div></div>`:''}
      ${!isPast&&r.goal?`<span class="small muted">Ziel: <b>${fmtT(r.goal)}</b></span>`:''}</button>`};
  return `<div class="pagehead"><h1>Wettkämpfe</h1></div><div class="stack">
  ${up.length?`<div class="card hero"><div class="lbl" style="color:rgba(255,255,255,.8)">Nächster Start</div><h2 style="font-size:1.3rem;margin:4px 0">${esc(up[0].name)}</h2><div class="big num">${Math.round((pd(up[0].date)-pd(t))/864e5)}<small style="color:rgba(255,255,255,.85)">Tage</small></div></div>`:''}
  <div><h2 style="margin-bottom:8px">Geplant</h2><div class="stack" style="gap:10px">${up.length?up.map(r=>card(r,false)).join(''):`<div class="empty">${IC('flag',34)}<p>Noch kein Wettkampf geplant.</p></div>`}</div></div>
  ${past.length?`<div><h2 style="margin-bottom:8px">Ergebnisse</h2><div class="stack" style="gap:10px">${past.map(r=>card(r,true)).join('')}</div></div>`:''}
  <button class="fab" data-a="newR" aria-label="Wettkampf hinzufügen">${IC('plus',28)}</button></div>`;
}

function vAsk(){
  const mine=S.questions.filter(q=>Sync.admin?q.uid===Sync.user?.id||!q.uid:true).sort((a,b)=>b.created-a.created);
  const inbox=Sync.admin?S.questions.filter(q=>!q.answer&&q.uid&&q.uid!==Sync.user?.id).sort((a,b)=>a.created-b.created):[];
  const remote=(S.faq||[]).filter(f=>!f.lang||f.lang===LANG),faq=remote.length?remote:C.faq;
  return `<div class="pagehead"><h1>Ask Lena</h1></div><div class="stack">
  <div class="card hero"><div class="row" style="position:relative;z-index:1">${IC('chat',28)}<div><h2>Frag Lena</h2><div class="small muted">Training, Wettkampf, Ernährung, Mindset – Lena antwortet persönlich.</div></div></div></div>
  <a href="#/shop" class="card row" style="text-decoration:none;color:inherit">${tileIc('chat','#25b6e8')}<div class="grow"><b>Mehr als eine kurze Antwort?</b><div class="small muted">Beratungsgespräch oder Express-Antwort im Shop</div></div><span class="muted">${IC('chev',18)}</span></a>
  <div class="card stack" style="gap:10px"><textarea id="q" maxlength="500" placeholder="Deine Frage an Lena …"></textarea>
    <div class="row sp"><span class="tiny muted">Max. 5 Fragen pro Tag${Sync.configured&&!Sync.active?' · zum Absenden bitte anmelden':''}</span><button class="btn primary" data-a="ask">${IC('send',18)}Senden</button></div></div>
  ${inbox.length?`<div><h2 style="margin-bottom:8px">Posteingang (${inbox.length})</h2><div class="stack">${inbox.map(q=>`<div class="card stack" style="gap:8px"><div class="tiny muted"><span class="tag">${esc((q.lang||'de').toUpperCase())}</span> ${esc(q.who||t('Athlet:in','Athlete'))} · ${new Date(q.created).toLocaleDateString(LOC())}</div><div class="bubble">${esc(q.text)}</div>
    <textarea id="ans-${q.id}" placeholder="Deine Antwort …"></textarea><label class="row small"><input type="checkbox" id="pub-${q.id}" checked> In den FAQ veröffentlichen (anonym)</label>
    <button class="btn primary" data-a="answer" data-id="${q.id}">Antworten</button></div>`).join('')}</div></div>`:''}
  ${mine.length?`<div><h2 style="margin-bottom:8px">Meine Fragen</h2><div class="stack" style="gap:10px">${mine.map(q=>`<div class="stack" style="gap:6px"><div class="bubble me">${esc(q.text)}</div>${q.answer?`<div class="bubble"><b>Lena:</b> ${esc(q.answer)}</div>`:`<div class="tiny muted" style="text-align:right">${q.r?'Wartet auf Lenas Antwort':Sync.configured?'Wird gesendet, sobald du angemeldet & online bist':'Offline-Modus – wird nicht gesendet'}</div>`}</div>`).join('')}</div></div>`:''}
  <div><h2 style="margin-bottom:8px">Häufige Fragen</h2><div class="stack" style="gap:10px">${faq.map(f=>`<details class="faq"><summary>${esc(f.text)}${IC('chev',18)}</summary><div class="a">${esc(f.answer)}</div></details>`).join('')}</div></div></div>`;
}


function vAchv(){
  const xp=xpTotal(),L=levelInfo(xp),B=badgeList(),got=B.filter(x=>x.ok).length,st=weekStreak(),ds=streak();
  return `<div class="pagehead"><div><a href="#/home" class="small" style="text-decoration:none;font-weight:700">‹ Zurück</a><h1>Erfolge</h1></div><span class="tag">${got} / ${B.length}</span></div><div class="stack">
  <div class="card hero"><div class="row" style="position:relative;z-index:1;gap:16px"><div class="lvlbadge big2">${L.lvl}</div><div class="grow"><h2 style="font-size:1.3rem">${esc(L.rank)}</h2><div class="small muted num">${xp} XP gesamt</div><div class="bar" style="margin-top:8px;background:rgba(255,255,255,.22);--c:#fff"><i style="width:${L.rest/L.need*100}%"></i></div><div class="tiny muted" style="margin-top:4px">${L.rest} / ${L.need} XP bis Level ${L.lvl+1}</div></div></div></div>
  <div class="grid2"><div class="card t-o"><div class="lbl">Tage-Streak</div><div class="big num">${ds}<small>Tage</small></div></div><div class="card t-t"><div class="lbl">Wochen-Serie</div><div class="big num">${st}<small>Wochen</small></div></div></div>
  ${questsCard()}
  <div><h2 style="margin-bottom:10px">Abzeichen</h2><div class="badges">${B.map(x=>`<div class="badge ${x.ok?'':'locked'}"><span class="bi">${IC(x.ic,26)}</span><b>${esc(x.n)}</b><span class="tiny muted">${esc(x.d)}</span></div>`).join('')}</div></div>
  <div class="card"><div class="lbl" style="margin-bottom:8px">So gibt es XP</div><ul class="small" style="margin:0;padding-left:18px;display:grid;gap:4px">
   <li>Training: <b>30 XP</b> + 0,6 XP je Minute (bis 180 min)</li><li>Anstrengung RPE ≥ 7: <b>+10 XP</b></li><li>Einheit aus dem Plan: <b>+15 XP</b></li><li>Jeder Trainingstag: <b>+20 XP</b></li>
   <li>Wettkampf mit Ergebnis: <b>+100 XP</b>, neue Bestzeit <b>+50 XP</b></li><li>Wochenquest: <b>+60 XP</b></li></ul></div>
  <div class="card"><div class="lbl" style="margin-bottom:8px">Ränge</div>${RANKS.map((r,i)=>`<div class="row sp small" style="${Math.floor((L.lvl-1)/2)===i||(i===RANKS.length-1&&L.lvl>14)?'color:var(--violet);font-weight:800':'color:var(--muted)'}"><span>Level ${i*2+1}${i<RANKS.length-1?'–'+(i*2+2):'+'}</span><span>${r}</span></div>`).join('')}</div></div>`;
}

/* ---------- Shop (nur digital; Demo-Kasse. Echte Zahlung über Payment Links oder Checkout-Endpoint, siehe payments/README.md) ---------- */
const fmtEUR=c=>(c/100).toLocaleString(LOC(),{style:'currency',currency:'EUR'});
const prod=id=>PRODUCTS.find(p=>p.id===id);
const vatNote=()=>LANG==='en'?(CFG.vatNoteEn||'Small business under § 19 UStG – no VAT is charged.'):(CFG.vatNote||'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.');
const isDemo=p=>!(CFG.paymentLinks&&CFG.paymentLinks[p.id])&&!CFG.checkoutEndpoint;
const owned=id=>S.orders.some(o=>o.items.some(i=>i.id===id));
const tileIc=(ic,col,sm)=>`<span class="sdot ${sm?'sm':''}" style="--c:${col}">${IC(ic,sm?18:22)}</span>`;
function vShop(){
  const f=S.ui.sf||'all',cats=C.shopCats,list=PRODUCTS.filter(p=>f==='all'||p.cat===f),anyDemo=PRODUCTS.some(isDemo);
  const card=p=>{const ct=cats[p.cat],got=p.once&&owned(p.id);
    return `<div class="card prod"><div class="row" style="align-items:flex-start">${tileIc(ct.ic,ct.col)}<div class="grow"><b>${esc(p.n)}</b><div class="small muted" style="margin-top:2px">${esc(p.d)}</div></div></div>
      <div class="row sp" style="margin-top:12px"><b class="num" style="font-size:1.2rem">${fmtEUR(p.price)}</b>${got?`<span class="tag pb">${IC('check',12)} Gebucht</span>`:`<button class="btn primary sm" data-a="buy" data-id="${p.id}">${IC('bag',16)}Kaufen</button>`}</div></div>`};
  const orders=[...S.orders].sort((a,b)=>b.at-a.at);
  return `<div class="pagehead"><div><a href="#/home" class="small" style="text-decoration:none;font-weight:700">‹ Zurück</a><h1>Shop</h1></div>${IC('bag',26)}</div><div class="stack">
  ${anyDemo?`<div class="card hero"><div class="row" style="position:relative;z-index:1;align-items:flex-start">${IC('lock',24)}<div><h2>Demo-Modus</h2><div class="small muted">So sieht der Shop aus. Zahlungen werden nur simuliert – es wird nichts abgebucht.</div></div></div></div>`:''}
  <div class="chips scroll"><button class="chip ${f==='all'?'on':''}" data-a="sfilter" data-id="all">Alle</button>${Object.entries(cats).map(([k,v])=>`<button class="chip ${f===k?'on':''}" style="--c:${v.col}" data-a="sfilter" data-id="${k}">${IC(v.ic,16)}${v.n}</button>`).join('')}</div>
  <div class="stack" style="gap:12px">${list.map(card).join('')}</div>
  ${orders.length?`<div><h2 style="margin-bottom:8px">Meine Bestellungen</h2><div class="stack" style="gap:10px">${orders.map(o=>`<div class="card"><div class="row sp"><b class="small">${esc(o.no)}</b><span class="tag">${esc(o.status)}</span></div>${o.items.map(i=>`<div class="small" style="margin-top:6px">${esc(prod(i.id)?.n||i.n)}</div>`).join('')}<div class="row sp tiny muted" style="margin-top:8px"><span>${new Date(o.at).toLocaleDateString(LOC())}${o.demo?' · Demo':''}</span><b class="num" style="color:var(--ink)">${fmtEUR(o.total)}</b></div></div>`).join('')}</div></div>`:''}
  <p class="tiny muted">${t('Endpreise.','Final prices.')} ${esc(vatNote())} ${t('Impressum, AGB, Widerrufsbelehrung und Datenschutzerklärung vor dem Livegang ergänzen.','Add legal notice, terms, withdrawal policy and privacy policy before going live.')}</p></div>`;
}
const METHODS=[['card','Karte'],['paypal','PayPal'],['apple','Apple Pay'],['sepa','SEPA']];
function openCheckout(id){
  const p=prod(id),ct=C.shopCats[p.cat];
  F={shop:id,method:'card'};
  const link=CFG.paymentLinks&&CFG.paymentLinks[id];
  if(link){location.href=link;return}
  if(CFG.checkoutEndpoint)return realCheckout(p);
  sheet(`<div class="stack"><div class="row sp"><h2>Kasse <span class="tag pb">DEMO</span></h2><button class="iconbtn" data-a="closeSheet" aria-label="Schließen">${IC('x',20)}</button></div>
  <div class="row">${tileIc(ct.ic,ct.col)}<div class="grow"><b>${esc(p.n)}</b><div class="small muted">${esc(p.d)}</div></div></div>
  <div class="field"><label for="co-mail">E-Mail für Bestätigung und Lieferung</label><input type="email" id="co-mail" autocomplete="email" value="${esc(Sync.user?.email||'')}" placeholder="du@mail.de"></div>
  <div><div class="lbl" style="margin-bottom:6px">Zahlungsart</div><div class="chips" id="co-m">${METHODS.map(([k,n])=>`<button class="chip ${k==='card'?'on':''}" data-a="method" data-id="${k}">${n}</button>`).join('')}</div></div>
  <div class="card stack" style="gap:4px;box-shadow:none;background:var(--card2)"><div class="row sp"><b>Gesamt</b><b class="num" style="font-size:1.2rem">${fmtEUR(p.price)}</b></div><div class="tiny muted">${esc(vatNote())}</div></div>
  <label class="row small" style="align-items:flex-start"><input type="checkbox" id="co-agb" style="margin-top:3px"><span>Ich akzeptiere die AGB und die Datenschutzerklärung.</span></label>
  <label class="row small" style="align-items:flex-start"><input type="checkbox" id="co-wid" style="margin-top:3px"><span>Ich verlange ausdrücklich, dass Lena sofort mit der Leistung beginnt bzw. die digitalen Inhalte sofort bereitstellt. Mir ist bekannt, dass mein Widerrufsrecht bei vollständiger Erbringung erlischt bzw. mit Beginn der Bereitstellung verloren geht.</span></label>
  <button class="btn primary block" data-a="pay" id="co-pay">${IC('lock',18)}Zahlungspflichtig bestellen (Demo)</button>
  <p class="tiny muted" style="text-align:center">Demo: Es wird keine Zahlung ausgelöst. In der Live-Version läuft die Zahlung über Stripe.</p></div>`);
}
function pay(t){
  const p=prod(F.shop),v=id=>($('#'+id)?.value||'').trim();
  if(!/^\S+@\S+\.\S+$/.test(v('co-mail')))return toast('Bitte eine gültige E-Mail angeben');
  if(!$('#co-agb').checked)return toast('Bitte AGB und Datenschutz akzeptieren');
  if(!$('#co-wid').checked)return toast('Bitte der sofortigen Leistung zustimmen');
  t.disabled=true;t.textContent=trStr('Zahlung wird simuliert …');
  const before=snap();
  setTimeout(()=>{
    const o={id:uid(),no:'DEMO-'+Math.random().toString(36).slice(2,8).toUpperCase(),at:Date.now(),demo:true,items:[{id:p.id,n:p.n,q:1}],total:p.price,
      status:p.kind==='digital'?'Freigeschaltet':p.kind==='support'?'Danke!':'Bezahlt · Lena meldet sich',mail:v('co-mail'),method:F.method};
    S.orders.push(o);save();render();
    const nb=badgeList().filter(x=>x.ok&&!before.b.includes(x.id));
    const next={service:'Lena meldet sich in Kürze per E-Mail bei dir.',digital:'Die Garmin-Anbindung ist für dich freigeschaltet. Die Einrichtung folgt (Demo).',support:'Du bist großartig – danke für deinen Support!'}[p.kind];
    sheet(`<div class="stack" style="text-align:center"><div class="sdot" style="--c:var(--ok);width:64px;height:64px;border-radius:22px;margin:0 auto">${IC('check',32)}</div><h2>Danke für deine Bestellung!</h2>
      <div class="small muted">Bestellnummer <b>${o.no}</b><br>${esc(p.n)} · ${fmtEUR(o.total)}</div><p>${next}</p>
      ${nb.map(x=>`<div class="note-line">${IC(x.ic,20)}<span>Neues Abzeichen: <b>${esc(x.n)}</b></span></div>`).join('')}
      <button class="btn primary block" data-a="closeSheet">Zurück zum Shop</button><p class="tiny muted">Demo-Bestellung – es wurde nichts abgebucht.</p></div>`);
    confetti();
  },1100);
}
async function realCheckout(p){
  try{
    if(!Sync.user){toast('Bitte zuerst anmelden (Einstellungen)');return settings()}
    const {data}=await Sync.sb.auth.getSession();
    const r=await fetch(CFG.checkoutEndpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({product:p.id})});
    const j=await r.json();if(!r.ok||!j.url)throw new Error(j.error||'Fehler');location.href=j.url;
  }catch(e){toast(t('Checkout nicht möglich: ','Checkout not possible: ')+e.message)}
}

const VIEWS={shop:vShop,achv:vAchv,home:vHome,plan:vPlan,log:vLog,races:vRaces,ask:vAsk};
function render(){
  const r=route();
  $('#view').innerHTML=VIEWS[r]()+themeBar()+langBar();trDom($('#view'));
  $('#nav').innerHTML=ROUTES.map(([k,n,i])=>`<a href="#/${k}" class="${k===r?'on':''}">${IC(i,22)}${n}</a>`).join('');trDom($('#nav'));
  $('#nav').setAttribute('aria-label',t('Hauptnavigation','Main navigation'));
  $('#gear').innerHTML=IC('gear',20);$('#gear').setAttribute('aria-label',t('Einstellungen','Settings'));
  $('#lvlpill').innerHTML=`${IC('flame',16)}Lv ${levelInfo(xpTotal()).lvl}`;$('#lvlpill').setAttribute('aria-label',t('Level und Erfolge','Level and achievements'));
  const lb=$('#langbtn');lb.textContent=LANG==='de'?'EN':'DE';lb.setAttribute('aria-label',LANG==='de'?'Switch to English':'Auf Deutsch wechseln');
  const imp=$('#imp');if(imp)imp.onchange=()=>importFiles([...imp.files]);
  if(r==='ask'&&Sync.sb&&!S._faqAsked){S._faqAsked=1;Sync.faq().then(d=>{if(d&&d.length){S.faq=d;save(true);if(route()==='ask')render()}})}
}
window.addEventListener('hashchange',()=>{closeSheet();render();scrollTo(0,0)});

/* ---------- Formulare ---------- */
let F={};
function openSession(id,date){
  const s=C.sessions[id],sp=SP[s.sp];
  sheet(`<div class="stack"><div class="row">${sdot(s.sp)}<div class="grow"><h2>${esc(s.t)}</h2><div class="small muted">${sp.n} · ${fmtMin(s.min)} · ${zone(s.z,sp.col)}</div></div><button class="iconbtn" data-a="closeSheet" aria-label="Schließen">${IC('x',20)}</button></div>
    <ol class="steps">${s.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
    <div class="card row" style="align-items:flex-start;box-shadow:none;background:var(--card2)">${IC('sparkle',20)}<div class="small">${esc(s.tip)}</div></div>
    <button class="btn primary block" data-a="logPlan" data-id="${id}" data-date="${date||''}">${IC('check',18)}Als erledigt loggen</button></div>`);
}
function openWorkout(id,pre){
  const w=id?S.workouts.find(x=>x.id===id):null,p=pre||{};
  F={id:w?.id||null,sport:w?.sport||p.sport||'run',source:w?.source||p.source||'manual',plan:w?.plan||p.plan||null};
  sheet(`<div class="stack"><div class="row sp"><h2>${w?'Training bearbeiten':'Training loggen'}</h2><button class="iconbtn" data-a="closeSheet" aria-label="Schließen">${IC('x',20)}</button></div>
  <div class="chips" id="wsp">${SPK.map(k=>`<button class="chip ${k===F.sport?'on':''}" style="--c:${SP[k].col}" data-a="wsport" data-id="${k}">${IC(k,16)}${SP[k].n}</button>`).join('')}</div>
  <div class="grid2"><div class="field"><label for="wd">Datum</label><input type="date" id="wd" value="${w?.date||p.date||today()}" max="${today()}"></div>
    <div class="field"><label for="wm">Dauer (min)</label><input type="number" id="wm" inputmode="numeric" min="1" max="1440" value="${w?.dur??p.dur??''}"></div></div>
  <div class="field" id="wdistf" ${['strength','mobility'].includes(F.sport)?'hidden':''}><label for="wk">Distanz (km)</label><input type="number" id="wk" inputmode="decimal" step="0.01" min="0" max="1000" value="${w?.dist??''}"></div>
  <div class="field"><label for="wr">Anstrengung (RPE): <b id="wrv">${w?.rpe??5}</b>/10</label><input type="range" id="wr" min="1" max="10" value="${w?.rpe??5}"></div>
  <div class="field"><label for="wn">Notiz</label><textarea id="wn" maxlength="1000" placeholder="Wie hat es sich angefühlt?">${esc(w?.note||'')}</textarea></div>
  <button class="btn primary block" data-a="saveW">Speichern</button>
  ${w?`<button class="btn danger block" data-a="delW" data-id="${w.id}">${IC('trash',18)}Löschen</button>`:''}</div>`);
  $('#wr').oninput=e=>$('#wrv').textContent=e.target.value;
}
function saveW(){
  const dur=Math.round(Number($('#wm').value)),dist=$('#wk').value===''?null:Number($('#wk').value),date=$('#wd').value;
  if(!date||!(dur>=1&&dur<=1440))return toast('Bitte eine Dauer zwischen 1 und 1440 min eingeben');
  if(dist!=null&&!(dist>=0&&dist<=1000))return toast('Distanz bitte prüfen');
  const before=snap(),isNew=!F.id;
  const rec={id:F.id||uid(),date,sport:F.sport,dur,dist:['strength','mobility'].includes(F.sport)?null:dist,rpe:Number($('#wr').value),note:$('#wn').value.trim(),source:F.source,plan:F.plan,u:Date.now(),d:1};
  const i=S.workouts.findIndex(x=>x.id===rec.id);if(i>=0)S.workouts[i]=rec;else S.workouts.push(rec);
  save();render();
  if(isNew)celebrate(before,'Training gespeichert');else{closeSheet();toast('Gespeichert ✓')}
}

function openRace(id){
  const r=id?S.races.find(x=>x.id===id):null,res=r?.res||{};F={type:r?.type||'olympic'};
  const tf=(k,l,v)=>`<div class="field"><label for="r-${k}">${l}</label><input type="text" id="r-${k}" inputmode="numeric" placeholder="h:mm:ss" value="${v?fmtT(v):''}"></div>`;
  sheet(`<div class="stack"><div class="row sp"><h2>${r?'Wettkampf bearbeiten':'Wettkampf hinzufügen'}</h2><button class="iconbtn" data-a="closeSheet" aria-label="Schließen">${IC('x',20)}</button></div>
  <div class="field"><label for="r-name">Name</label><input type="text" id="r-name" maxlength="80" value="${esc(r?.name||'')}" placeholder="z. B. Challenge Roth"></div>
  <div class="chips" id="rtype">${Object.entries(C.raceTypes).map(([k,v])=>`<button class="chip ${k===F.type?'on':''}" data-a="rtype" data-id="${k}">${v.n}</button>`).join('')}</div>
  <div class="tiny muted" id="rtd">${C.raceTypes[F.type].d}</div>
  <div class="grid2"><div class="field"><label for="r-date">Datum</label><input type="date" id="r-date" value="${r?.date||''}"></div><div class="field"><label for="r-loc">Ort</label><input type="text" id="r-loc" maxlength="80" value="${esc(r?.loc||'')}"></div></div>
  ${tf('goal','Zielzeit',r?.goal)}
  <div class="lbl" style="margin-top:4px">Ergebnis (optional)</div>
  ${tf('tot','Gesamtzeit',res.tot)}
  <div class="grid2">${tf('swim','Schwimmen',res.swim)}${tf('t1','T1',res.t1)}${tf('bike','Rad',res.bike)}${tf('t2','T2',res.t2)}</div>${tf('run','Laufen',res.run)}
  <div class="field"><label for="r-place">Platzierung</label><input type="text" id="r-place" maxlength="40" value="${esc(r?.place||'')}" placeholder="z. B. AK 5 / Gesamt 42"></div>
  <div class="field"><label for="r-note">Notiz</label><textarea id="r-note" maxlength="1000">${esc(r?.note||'')}</textarea></div>
  <button class="btn primary block" data-a="saveR" data-id="${r?.id||''}">Speichern</button>
  ${r?`<button class="btn danger block" data-a="delR" data-id="${r.id}">${IC('trash',18)}Löschen</button>`:''}</div>`);
}
function saveR(id){
  const name=$('#r-name').value.trim(),date=$('#r-date').value;
  if(!name||!date)return toast('Name und Datum werden benötigt');
  const t={};for(const k of ['goal','tot','swim','t1','bike','t2','run']){const v=parseT($('#r-'+k).value);if(Number.isNaN(v))return toast('Zeiten bitte als h:mm:ss eingeben');t[k]=v}
  const before=snap();
  const rec={id:id||uid(),name,date,type:F.type,loc:$('#r-loc').value.trim(),goal:t.goal,res:{tot:t.tot,swim:t.swim,t1:t.t1,bike:t.bike,t2:t.t2,run:t.run},place:$('#r-place').value.trim(),note:$('#r-note').value.trim(),u:Date.now(),d:1};
  const i=S.races.findIndex(x=>x.id===rec.id);if(i>=0)S.races[i]=rec;else S.races.push(rec);
  save();render();
  const after=snap();if(after.xp>before.xp)celebrate(before,'Wettkampf gespeichert');else{closeSheet();toast('Wettkampf gespeichert ✓')}
}

/* ---------- GPX / TCX Import ---------- */
function hav(a,b){const R=6371,r=x=>x*Math.PI/180,dl=r(b[0]-a[0]),dn=r(b[1]-a[1]),h=Math.sin(dl/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
const guess=t=>{t=(t||'').toLowerCase();return /run|lauf/.test(t)?'run':/bik|cycl|rad|ride/.test(t)?'bike':/swim/.test(t)?'swim':'other'};
function xml(t){const d=new DOMParser().parseFromString(t,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('Datei nicht lesbar');return d}
function parseGpx(t){
  const d=xml(t),pts=[...d.getElementsByTagName('trkpt')];if(pts.length<2)throw new Error('Keine Trackpunkte');
  const P=pts.map(p=>[+p.getAttribute('lat'),+p.getAttribute('lon'),Date.parse(p.getElementsByTagName('time')[0]?.textContent)]);
  if(P.some(p=>!isFinite(p[2])))throw new Error('Zeitstempel fehlen');
  let km=0;for(let i=1;i<P.length;i++)km+=hav(P[i-1],P[i]);
  const st=new Date(P[0][2]);
  return {sport:guess(d.getElementsByTagName('type')[0]?.textContent),dur:Math.max(1,Math.round((P.at(-1)[2]-P[0][2])/6e4)),dist:Math.round(km*100)/100,date:iso(st),source:'gpx'};
}
function parseTcx(t){
  const d=xml(t),act=d.getElementsByTagName('Activity')[0];if(!act)throw new Error('Keine Aktivität');
  const laps=[...d.getElementsByTagName('Lap')],sec=laps.reduce((s,l)=>s+(+l.getElementsByTagName('TotalTimeSeconds')[0]?.textContent||0),0),m=laps.reduce((s,l)=>s+(+l.getElementsByTagName('DistanceMeters')[0]?.textContent||0),0);
  const idt=new Date(act.getElementsByTagName('Id')[0]?.textContent);if(isNaN(idt)||!sec)throw new Error('Daten unvollständig');
  return {sport:guess(act.getAttribute('Sport')),dur:Math.max(1,Math.round(sec/60)),dist:Math.round(m/10)/100,date:iso(idt),source:'tcx'};
}
async function importFiles(files){
  let ok=0,dup=0,bad=0;
  for(const f of files){try{
    const x=/\.tcx$/i.test(f.name)?parseTcx(await f.text()):parseGpx(await f.text());
    if(W().some(w=>w.date===x.date&&w.sport===x.sport&&Math.abs(w.dur-x.dur)<=1)){dup++;continue}
    S.workouts.push({id:uid(),date:x.date,sport:x.sport,dur:x.dur,dist:x.dist||null,rpe:null,note:'',source:x.source,plan:null,u:Date.now(),d:1});ok++;
  }catch(e){bad++}}
  save();render();toast(t(`${ok} importiert${dup?` · ${dup} Duplikat${dup>1?'e':''}`:''}${bad?` · ${bad} fehlgeschlagen`:''}`,`${ok} imported${dup?` · ${dup} duplicate${dup>1?'s':''}`:''}${bad?` · ${bad} failed`:''}`));
}

/* ---------- Einstellungen ---------- */
function settings(step){
  const sy=Sync,P=S.profile,st={off:'Nicht angemeldet',idle:'Bereit',syncing:'Synchronisiere …',ok:'Synchronisiert',err:t('Fehler: ','Error: ')+(sy.err||'')}[sy.status];
  let acct;
  if(!sy.configured)acct=`<p class="small muted">Offline-Modus: Deine Daten bleiben auf diesem Gerät. Sichere sie regelmäßig über den Export.</p>`;
  else if(sy.active)acct=`<div class="small">Angemeldet als <b>${esc(sy.user.email||'')}</b>${sy.admin?' <span class="tag pb">Lena · Admin</span>':''}<br><span class="muted">${esc(st)}</span></div>
    <div class="row wrap"><button class="btn sm" data-a="syncNow">Jetzt synchronisieren</button><button class="btn sm ghost" data-a="signout">Abmelden</button></div>`;
  else if(step==='code')acct=`<p class="small muted">${t(`Wir haben dir einen Code an <b>${esc(F.email)}</b> geschickt.`,`We sent a code to <b>${esc(F.email)}</b>.`)}</p><div class="field"><label for="s-code">6-stelliger Code</label><input type="text" id="s-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></div><button class="btn primary block" data-a="verify">Bestätigen</button>`;
  else acct=`<p class="small muted">Melde dich an, um dein Training auf allen Geräten zu sichern und Lena Fragen zu stellen. Kein Passwort nötig.</p><div class="field"><label for="s-mail">E-Mail</label><input type="email" id="s-mail" autocomplete="email" placeholder="du@mail.de"></div><button class="btn primary block" data-a="sendCode">Code senden</button>`;
  sheet(`<div class="stack"><div class="row sp"><h2>Einstellungen</h2><button class="iconbtn" data-a="closeSheet" aria-label="Schließen">${IC('x',20)}</button></div>
  <div class="card stack" style="gap:10px;box-shadow:none;background:var(--card2)"><div class="lbl">Profil</div>
    <div class="field"><label for="s-name">Vorname</label><input type="text" id="s-name" maxlength="40" value="${esc(P.name)}"></div>
    <div class="field"><label for="s-goal">Ziel</label><select id="s-goal">${Object.entries(C.goals).map(([k,v])=>`<option value="${k}" ${k===P.goal?'selected':''}>${esc(v.n)} – ${esc(v.sub)}</option>`).join('')}</select></div>
    <button class="btn sm" data-a="saveProfile">Profil speichern</button></div>
  <div class="card stack" style="gap:10px;box-shadow:none;background:var(--card2)"><div class="lbl">Design</div>${themeBar().replace('margin-top:26px','').replace('">Design<div','"><div')}${langBar().replace('margin-top:26px','margin-top:6px')}</div>
  <div class="card stack" style="gap:10px;box-shadow:none;background:var(--card2)"><div class="lbl">Konto &amp; Sync</div>${acct}</div>
  <div class="card stack" style="gap:8px;box-shadow:none;background:var(--card2)"><div class="row"><span class="sdot sm" style="--c:#25b6e8">${IC('watch',18)}</span><div class="lbl">Garmin (optional)</div></div>
    ${owned('garmin-setup')?`<p class="small"><span class="tag pb">${IC('check',12)} Gebucht</span> Die Garmin-Anbindung ist für dich freigeschaltet. Lena richtet sie in Kürze ein (Demo).</p>`:CFG.garmin?`<p class="small muted">Verbinde dein Garmin-Konto, damit Aktivitäten automatisch im Log landen.</p><button class="btn sm" data-a="garmin">Mit Garmin verbinden</button>`:`<p class="small muted">Direkte Garmin-Anbindung folgt. Bis dahin: In Garmin Connect eine Aktivität öffnen → ⋯ → <i>Exportieren als GPX/TCX</i> und im Tab „Training“ über „GPX/TCX“ importieren.</p><a class="btn sm" href="#/shop" data-a="closeSheet">Garmin-Anbindung im Shop</a>`}</div>
  <div class="card stack" style="gap:10px;box-shadow:none;background:var(--card2)"><div class="lbl">Daten</div><div class="row wrap">
    <button class="btn sm" data-a="exportJson">${IC('download',16)}Backup (JSON)</button><button class="btn sm" data-a="exportCsv">${IC('download',16)}Log (CSV)</button>
    <label class="btn sm" style="cursor:pointer">${IC('upload',16)}Backup laden<input type="file" id="s-imp" accept=".json" hidden></label></div>
    ${sy.active?`<button class="btn danger sm" data-a="delAccount">Konto &amp; alle Daten löschen</button>`:`<button class="btn danger sm" data-a="wipe">Lokale Daten löschen</button>`}</div>
  <div class="row wrap"><a class="btn sm ghost" href="${esc(CFG.instagram)}" target="_blank" rel="noopener">${IC('insta',16)}Instagram</a><a class="btn sm ghost" href="${esc(CFG.linktree)}" target="_blank" rel="noopener">Links</a></div>
  <p class="tiny muted">Lena’s TriLab ersetzt keine ärztliche oder trainerliche Beratung. Bei Beschwerden oder Vorerkrankungen vor Trainingsbeginn ärztlich abklären lassen. Training auf eigene Verantwortung.</p></div>`);
  const imp=$('#s-imp');if(imp)imp.onchange=()=>importJson(imp.files[0]);
}
function download(name,type,text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
async function importJson(f){
  try{const o=JSON.parse(await f.text());if(!o||!Array.isArray(o.workouts)||!Array.isArray(o.races))throw 0;
    const have=new Set(S.workouts.map(x=>x.id));o.workouts.forEach(w=>{if(!have.has(w.id)){w.d=1;S.workouts.push(w)}});
    const hr=new Set(S.races.map(x=>x.id));o.races.forEach(r=>{if(!hr.has(r.id)){r.d=1;S.races.push(r)}});
    save();closeSheet();render();toast('Backup geladen ✓')}catch(e){toast('Ungültige Backup-Datei')}
}

/* ---------- Aktionen ---------- */
const A={
  closeSheet,settings:()=>settings(),
  lang:t=>{S.ui.lang=t.dataset.id||(LANG==='de'?'en':'de');save(true);applyLang();const open=!$('#sheet').hidden;render();if(open)settings()},
  sfilter:t=>{S.ui.sf=t.dataset.id;save(true);render()},buy:t=>openCheckout(t.dataset.id),
  method:t=>{F.method=t.dataset.id;document.querySelectorAll('#co-m .chip').forEach(c=>c.classList.toggle('on',c===t))},pay,
  theme:t=>{S.ui.theme=t.dataset.id;save(true);applyTheme();document.querySelectorAll('[data-a=theme]').forEach(c=>c.setAttribute('aria-pressed',c.dataset.id===t.dataset.id))},
  session:t=>openSession(t.dataset.id,t.dataset.date),
  logPlan:t=>{const s=C.sessions[t.dataset.id];openWorkout(null,{sport:s.sp,dur:s.min,plan:t.dataset.id,source:'plan',date:t.dataset.date&&t.dataset.date<=today()?t.dataset.date:today()})},
  goal:t=>{S.profile.goal=t.dataset.id;S.profileTouched=1;save();Sync.active&&Sync.saveProfile(S.profile);render()},
  pmode:t=>{S.ui.pm=t.dataset.id;save(true);render()},pfilter:t=>{S.ui.pf=t.dataset.id;save(true);render()},lfilter:t=>{S.ui.lf=t.dataset.id;save(true);render()},
  newW:()=>openWorkout(),editW:t=>openWorkout(t.dataset.id),
  wsport:t=>{F.sport=t.dataset.id;document.querySelectorAll('#wsp .chip').forEach(c=>c.classList.toggle('on',c===t));$('#wdistf').hidden=['strength','mobility'].includes(F.sport)},
  saveW,delW:t=>{if(confirm(trStr('Training wirklich löschen?'))){removeRec(S.workouts,t.dataset.id);save();closeSheet();render()}},
  newR:()=>openRace(),editR:t=>openRace(t.dataset.id),
  rtype:t=>{F.type=t.dataset.id;document.querySelectorAll('#rtype .chip').forEach(c=>c.classList.toggle('on',c===t));$('#rtd').textContent=C.raceTypes[F.type].d},
  saveR:t=>saveR(t.dataset.id||null),delR:t=>{if(confirm(trStr('Wettkampf wirklich löschen?'))){removeRec(S.races,t.dataset.id);save();closeSheet();render()}},
  ask:()=>{
    const v=$('#q').value.trim();if(v.length<3)return toast('Bitte eine Frage eingeben');
    S.questions.push({id:uid(),text:v,lang:LANG,created:Date.now(),answer:null,pub:false,u:Date.now(),d:1});save();render();
    toast(Sync.active?'Frage gesendet ✓':Sync.configured?'Gespeichert – wird nach der Anmeldung gesendet':'Gespeichert (Offline-Modus)');
  },
  answer:t=>{const q=S.questions.find(x=>x.id===t.dataset.id),v=$('#ans-'+q.id).value.trim();if(!v)return toast('Bitte eine Antwort eingeben');
    q.answer=v;q.at=Date.now();q.pub=$('#pub-'+q.id).checked;q.d=1;save();render();toast('Antwort gespeichert ✓')},
  saveProfile:()=>{S.profile.name=$('#s-name').value.trim();S.profile.goal=$('#s-goal').value;S.profileTouched=1;save();Sync.active&&Sync.saveProfile(S.profile).catch(()=>{});closeSheet();render();toast('Profil gespeichert ✓')},
  sendCode:async el=>{const e=$('#s-mail').value.trim();if(!/^\S+@\S+\.\S+$/.test(e))return toast('Bitte gültige E-Mail eingeben');el.disabled=true;
    try{await Sync.sendCode(e);F.email=e;settings('code')}catch(x){toast(t('Fehler: ','Error: ')+x.message);el.disabled=false}},
  verify:async t=>{const c=$('#s-code').value.trim();if(!c)return;t.disabled=true;try{await Sync.verify(F.email,c);toast('Angemeldet ✓');setTimeout(()=>settings(),300)}catch(x){toast('Code ungültig oder abgelaufen');t.disabled=false}},
  syncNow:async()=>{await Sync.run();render();settings();toast(Sync.status==='ok'?'Synchronisiert ✓':'Sync-Fehler')},
  signout:async()=>{await Sync.signOut();settings()},
  delAccount:async()=>{if(!confirm(trStr('Konto und ALLE Daten unwiderruflich löschen?')))return;try{await Sync.deleteAccount();S=defaults();save(true);closeSheet();render();toast('Konto gelöscht')}catch(e){toast(t('Fehler: ','Error: ')+e.message)}},
  wipe:()=>{if(confirm(trStr('Alle lokalen Daten löschen? Das kann nicht rückgängig gemacht werden.'))){S=defaults();save(true);closeSheet();render()}},
  exportJson:()=>download(`trilab-backup-${today()}.json`,'application/json',JSON.stringify({workouts:W(),races:R(),profile:S.profile},null,1)),
  exportCsv:()=>{const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;download(`trilab-log-${today()}.csv`,'text/csv',[t('Datum,Sport,Minuten,km,RPE,Notiz,Quelle','Date,Sport,Minutes,km,RPE,Note,Source'),...W().sort((a,b)=>a.date.localeCompare(b.date)).map(w=>[w.date,SP[w.sport]?.n,w.dur,w.dist??'',w.rpe??'',q(w.note),w.source].join(','))].join('\n'))},
  garmin:()=>toast('Garmin-Anbindung: siehe README')
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t&&A[t.dataset.a])A[t.dataset.a](t,e)});

/* ---------- Start ---------- */
render();
Sync.init({get:()=>S,save,changed:render});
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
