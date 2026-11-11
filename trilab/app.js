/* Lena's TriLab – App (Vanilla JS, kein Build-Schritt). Daten: localStorage, optional Supabase-Sync (sync.js). */
(function(){
'use strict';
const CFG=window.TRILAB_CONFIG||{},C=window.TRILAB_CONTENT,IC=window.IC,Sync=window.Sync;
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
const DAYS=['Mo','Di','Mi','Do','Fr','Sa','So'];
const fmtDate=s=>pd(s).toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'});
const fmtLong=s=>pd(s).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'});
const fmtMin=m=>m>=60?`${Math.floor(m/60)}:${pad(Math.round(m%60))} h`:`${Math.round(m)} min`;
const fmtH=m=>{const h=m/60;return h<10?h.toFixed(1).replace('.',','):Math.round(h)};
const fmtT=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h}:${pad(m)}:${pad(s%60)}`:`${m}:${pad(s%60)}`};
function parseT(v){v=(v||'').trim();if(!v)return null;const p=v.split(':').map(Number);if(p.length<2||p.length>3||p.some(x=>!isFinite(x)||x<0))return NaN;return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1]}
const sum=(a,f)=>a.reduce((t,x)=>t+(Number(x[f])||0),0);
const SP=C.sports,SPK=Object.keys(SP);

/* ---------- State ---------- */
const defaults=()=>({v:1,profile:{name:'',goal:'olympic'},workouts:[],races:[],questions:[],faq:null,sync:{cursor:{}},ui:{}});
let S=(()=>{try{const o=JSON.parse(localStorage.getItem(KEY)||'null');return o?{...defaults(),...o,profile:{...defaults().profile,...o.profile}}:defaults()}catch(e){return defaults()}})();
let storageOk=true;
function save(quiet){try{localStorage.setItem(KEY,JSON.stringify(S));storageOk=true}catch(e){if(storageOk)toast('Speichern fehlgeschlagen – bitte Daten exportieren');storageOk=false}if(!quiet)Sync.schedule()}
const live=a=>a.filter(x=>!x.del);
const W=()=>live(S.workouts),R=()=>live(S.races);
function removeRec(arr,id){const i=arr.findIndex(x=>x.id===id);if(i<0)return;if(Sync.active){arr[i].del=true;arr[i].u=Date.now();arr[i].d=1}else arr.splice(i,1)}

/* ---------- UI helpers ---------- */
const sdot=(sp,sm)=>`<span class="sdot ${sm?'sm':''}" style="--c:${SP[sp].col}">${IC(sp,sm?18:22)}</span>`;
const zone=(z,col)=>`<span class="zone" style="--c:${col}" title="Intensität ${z}/5">${[1,2,3,4,5].map(i=>`<i class="${i<=z?'on':''}"></i>`).join('')}</span>`;
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600)}
function sheet(html){$('#sheetBody').innerHTML=html;$('#sheet').hidden=false;$('.panel').scrollTop=0}
function closeSheet(){$('#sheet').hidden=true}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
const ROUTES=[['home','Heute','home'],['plan','Plan','plan'],['log','Log','log'],['races','Rennen','flag'],['ask','Ask Lena','chat']];
const route=()=>{const r=(location.hash.replace('#/','')||'home');return ROUTES.some(x=>x[0]===r)?r:'home'};

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
  const hr=new Date().getHours(),hi=hr<11?'Guten Morgen':hr<18?'Hi':'Guten Abend',name=S.profile.name?`, ${esc(S.profile.name)}`:'';
  const by=SPK.map(k=>[k,sum(wk.filter(w=>w.sport===k),'dur')]).filter(x=>x[1]>0),mx=Math.max(1,...by.map(x=>x[1]));
  const doy=Math.floor((new Date()-new Date(new Date().getFullYear(),0,0))/864e5),tip=C.tips[doy%C.tips.length],st=streak();
  const days=next?Math.round((pd(next.date)-pd(today()))/864e5):0;
  return `<div class="pagehead"><h1>${hi}${name}</h1></div><div class="stack">
  <div class="card hero"><div class="row"><span style="position:relative;z-index:1">${IC('target',26)}</span>
    <div style="position:relative;z-index:1"><div class="lbl" style="color:rgba(255,255,255,.8)">Road to</div><h2 style="font-size:1.25rem">${esc(g.n)}</h2><div class="small muted">${esc(g.sub)}</div></div></div></div>
  <div class="card"><div class="row" style="gap:18px">
    <div class="ring"><svg width="132" height="132" viewBox="0 0 132 132"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7eb6"/><stop offset="1" stop-color="#8b6bff"/></linearGradient></defs>
      <circle cx="66" cy="66" r="${R0}" fill="none" stroke="var(--card2)" stroke-width="14"/>
      <circle cx="66" cy="66" r="${R0}" fill="none" stroke="url(#rg)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ*(1-pct)}"/></svg>
      <div class="mid"><div><div class="big num" style="font-size:1.6rem">${fmtH(mins)}<small>h</small></div><div class="tiny muted">von ${fmtH(target)} h</div></div></div></div>
    <div class="grow stack" style="gap:10px"><div><div class="lbl">Diese Woche</div><div class="small muted">${wk.length} Einheit${wk.length===1?'':'en'} geloggt</div></div>
      <div class="row small" style="color:var(--pink);font-weight:800">${IC('flame',20)}${st} Tag${st===1?'':'e'} in Folge</div></div></div></div>
  <div><div class="row sp" style="margin-bottom:8px"><h2>Heute im Plan</h2><a href="#/plan" class="small" style="font-weight:700;text-decoration:none">Woche ansehen</a></div>
    <div class="stack" style="gap:10px">${todays.length?todays.map(id=>sessionCard(id,today())).join(''):`<div class="rest">${IC('moon',20)} Ruhetag – Erholung gehört zum Training.</div>`}</div></div>
  ${next?`<a href="#/races" class="card row" style="text-decoration:none;color:inherit">${sdot('brick')}<div class="grow"><div class="lbl">Nächster Wettkampf</div><b>${esc(next.name)}</b><div class="small muted">${fmtDate(next.date)}</div></div><div class="big num" style="font-size:1.6rem">${days}<small>${days===1?'Tag':'Tage'}</small></div></a>`:''}
  <div class="card"><div class="lbl" style="margin-bottom:10px">Woche nach Sportart</div>${by.length?`<div class="stack" style="gap:10px">${by.map(([k,m])=>`<div class="row">${sdot(k,1)}<div class="grow"><div class="bar" style="--c:${SP[k].col}"><i style="width:${m/mx*100}%"></i></div></div><b class="small num" style="min-width:56px;text-align:right">${fmtMin(m)}</b></div>`).join('')}</div>`:'<p class="muted small">Noch nichts geloggt – los geht’s!</p>'}</div>
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
  ${all.length?[...groups].map(([k,ws])=>`<div><div class="lbl" style="margin:4px 2px 8px">KW ${isoWeek(pd(k))} · ${fmtMin(sum(ws,'dur'))}</div><div class="stack" style="gap:8px">${ws.map(w=>{const sp=SP[w.sport];return `<button class="item" data-a="editW" data-id="${w.id}">${sdot(w.sport)}<span class="grow"><b>${sp.n}</b> <span class="muted small">· ${fmtDate(w.date)}</span><br><span class="muted small">${fmtMin(w.dur)}${w.dist?` · ${String(w.dist).replace('.',',')} km`:''}${w.rpe?` · RPE ${w.rpe}`:''}${w.source&&w.source!=='manual'?` · <span class="tag">${w.source==='plan'?'Plan':w.source.toUpperCase()}</span>`:''}</span>${w.note?`<br><span class="small">${esc(w.note.slice(0,80))}</span>`:''}</span><span class="muted">${IC('chev',18)}</span></button>`}).join('')}</div></div>`).join('')
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
  const faq=S.faq||C.faq;
  return `<div class="pagehead"><h1>Ask Lena</h1></div><div class="stack">
  <div class="card hero"><div class="row" style="position:relative;z-index:1">${IC('chat',28)}<div><h2>Frag Lena</h2><div class="small muted">Training, Wettkampf, Ernährung, Mindset – Lena antwortet persönlich.</div></div></div></div>
  <div class="card stack" style="gap:10px"><textarea id="q" maxlength="500" placeholder="Deine Frage an Lena …"></textarea>
    <div class="row sp"><span class="tiny muted">Max. 5 Fragen pro Tag${Sync.configured&&!Sync.active?' · zum Absenden bitte anmelden':''}</span><button class="btn primary" data-a="ask">${IC('send',18)}Senden</button></div></div>
  ${inbox.length?`<div><h2 style="margin-bottom:8px">Posteingang (${inbox.length})</h2><div class="stack">${inbox.map(q=>`<div class="card stack" style="gap:8px"><div class="tiny muted">${esc(q.who||'Athlet:in')} · ${new Date(q.created).toLocaleDateString('de-DE')}</div><div class="bubble">${esc(q.text)}</div>
    <textarea id="ans-${q.id}" placeholder="Deine Antwort …"></textarea><label class="row small"><input type="checkbox" id="pub-${q.id}" checked> In den FAQ veröffentlichen (anonym)</label>
    <button class="btn primary" data-a="answer" data-id="${q.id}">Antworten</button></div>`).join('')}</div></div>`:''}
  ${mine.length?`<div><h2 style="margin-bottom:8px">Meine Fragen</h2><div class="stack" style="gap:10px">${mine.map(q=>`<div class="stack" style="gap:6px"><div class="bubble me">${esc(q.text)}</div>${q.answer?`<div class="bubble"><b>Lena:</b> ${esc(q.answer)}</div>`:`<div class="tiny muted" style="text-align:right">${q.r?'Wartet auf Lenas Antwort':Sync.configured?'Wird gesendet, sobald du angemeldet & online bist':'Offline-Modus – wird nicht gesendet'}</div>`}</div>`).join('')}</div></div>`:''}
  <div><h2 style="margin-bottom:8px">Häufige Fragen</h2><div class="stack" style="gap:10px">${faq.map(f=>`<details class="faq"><summary>${esc(f.text)}${IC('chev',18)}</summary><div class="a">${esc(f.answer)}</div></details>`).join('')}</div></div></div>`;
}

const VIEWS={home:vHome,plan:vPlan,log:vLog,races:vRaces,ask:vAsk};
function render(){
  const r=route();
  $('#view').innerHTML=VIEWS[r]();
  $('#nav').innerHTML=ROUTES.map(([k,n,i])=>`<a href="#/${k}" class="${k===r?'on':''}">${IC(i,22)}${n}</a>`).join('');
  $('#gear').innerHTML=IC('gear',20);
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
  const rec={id:F.id||uid(),date,sport:F.sport,dur,dist:['strength','mobility'].includes(F.sport)?null:dist,rpe:Number($('#wr').value),note:$('#wn').value.trim(),source:F.source,plan:F.plan,u:Date.now(),d:1};
  const i=S.workouts.findIndex(x=>x.id===rec.id);if(i>=0)S.workouts[i]=rec;else S.workouts.push(rec);
  save();closeSheet();render();toast('Gespeichert ✓');
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
  const rec={id:id||uid(),name,date,type:F.type,loc:$('#r-loc').value.trim(),goal:t.goal,res:{tot:t.tot,swim:t.swim,t1:t.t1,bike:t.bike,t2:t.t2,run:t.run},place:$('#r-place').value.trim(),note:$('#r-note').value.trim(),u:Date.now(),d:1};
  const i=S.races.findIndex(x=>x.id===rec.id);if(i>=0)S.races[i]=rec;else S.races.push(rec);
  save();closeSheet();render();toast('Wettkampf gespeichert ✓');
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
  save();render();toast(`${ok} importiert${dup?` · ${dup} Duplikat${dup>1?'e':''}`:''}${bad?` · ${bad} fehlgeschlagen`:''}`);
}

/* ---------- Einstellungen ---------- */
function settings(step){
  const sy=Sync,P=S.profile,st={off:'Nicht angemeldet',idle:'Bereit',syncing:'Synchronisiere …',ok:'Synchronisiert',err:'Fehler: '+(sy.err||'')}[sy.status];
  let acct;
  if(!sy.configured)acct=`<p class="small muted">Offline-Modus: Deine Daten bleiben auf diesem Gerät. Sichere sie regelmäßig über den Export.</p>`;
  else if(sy.active)acct=`<div class="small">Angemeldet als <b>${esc(sy.user.email||'')}</b>${sy.admin?' <span class="tag pb">Lena · Admin</span>':''}<br><span class="muted">${esc(st)}</span></div>
    <div class="row wrap"><button class="btn sm" data-a="syncNow">Jetzt synchronisieren</button><button class="btn sm ghost" data-a="signout">Abmelden</button></div>`;
  else if(step==='code')acct=`<p class="small muted">Wir haben dir einen Code an <b>${esc(F.email)}</b> geschickt.</p><div class="field"><label for="s-code">6-stelliger Code</label><input type="text" id="s-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8"></div><button class="btn primary block" data-a="verify">Bestätigen</button>`;
  else acct=`<p class="small muted">Melde dich an, um dein Training auf allen Geräten zu sichern und Lena Fragen zu stellen. Kein Passwort nötig.</p><div class="field"><label for="s-mail">E-Mail</label><input type="email" id="s-mail" autocomplete="email" placeholder="du@mail.de"></div><button class="btn primary block" data-a="sendCode">Code senden</button>`;
  sheet(`<div class="stack"><div class="row sp"><h2>Einstellungen</h2><button class="iconbtn" data-a="closeSheet" aria-label="Schließen">${IC('x',20)}</button></div>
  <div class="card stack" style="gap:10px;box-shadow:none;background:var(--card2)"><div class="lbl">Profil</div>
    <div class="field"><label for="s-name">Vorname</label><input type="text" id="s-name" maxlength="40" value="${esc(P.name)}"></div>
    <div class="field"><label for="s-goal">Ziel</label><select id="s-goal">${Object.entries(C.goals).map(([k,v])=>`<option value="${k}" ${k===P.goal?'selected':''}>${esc(v.n)} – ${esc(v.sub)}</option>`).join('')}</select></div>
    <button class="btn sm" data-a="saveProfile">Profil speichern</button></div>
  <div class="card stack" style="gap:10px;box-shadow:none;background:var(--card2)"><div class="lbl">Konto &amp; Sync</div>${acct}</div>
  <div class="card stack" style="gap:8px;box-shadow:none;background:var(--card2)"><div class="row"><span class="sdot sm" style="--c:#25b6e8">${IC('watch',18)}</span><div class="lbl">Garmin (optional)</div></div>
    ${CFG.garmin?`<p class="small muted">Verbinde dein Garmin-Konto, damit Aktivitäten automatisch im Log landen.</p><button class="btn sm" data-a="garmin">Mit Garmin verbinden</button>`:`<p class="small muted">Direkte Garmin-Anbindung folgt. Bis dahin: In Garmin Connect eine Aktivität öffnen → ⋯ → <i>Exportieren als GPX/TCX</i> und im Tab „Training“ über „GPX/TCX“ importieren.</p>`}</div>
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
  session:t=>openSession(t.dataset.id,t.dataset.date),
  logPlan:t=>{const s=C.sessions[t.dataset.id];openWorkout(null,{sport:s.sp,dur:s.min,plan:t.dataset.id,source:'plan',date:t.dataset.date&&t.dataset.date<=today()?t.dataset.date:today()})},
  goal:t=>{S.profile.goal=t.dataset.id;S.profileTouched=1;save();Sync.active&&Sync.saveProfile(S.profile);render()},
  pmode:t=>{S.ui.pm=t.dataset.id;save(true);render()},pfilter:t=>{S.ui.pf=t.dataset.id;save(true);render()},lfilter:t=>{S.ui.lf=t.dataset.id;save(true);render()},
  newW:()=>openWorkout(),editW:t=>openWorkout(t.dataset.id),
  wsport:t=>{F.sport=t.dataset.id;document.querySelectorAll('#wsp .chip').forEach(c=>c.classList.toggle('on',c===t));$('#wdistf').hidden=['strength','mobility'].includes(F.sport)},
  saveW,delW:t=>{if(confirm('Training wirklich löschen?')){removeRec(S.workouts,t.dataset.id);save();closeSheet();render()}},
  newR:()=>openRace(),editR:t=>openRace(t.dataset.id),
  rtype:t=>{F.type=t.dataset.id;document.querySelectorAll('#rtype .chip').forEach(c=>c.classList.toggle('on',c===t));$('#rtd').textContent=C.raceTypes[F.type].d},
  saveR:t=>saveR(t.dataset.id||null),delR:t=>{if(confirm('Wettkampf wirklich löschen?')){removeRec(S.races,t.dataset.id);save();closeSheet();render()}},
  ask:()=>{
    const v=$('#q').value.trim();if(v.length<3)return toast('Bitte eine Frage eingeben');
    S.questions.push({id:uid(),text:v,created:Date.now(),answer:null,pub:false,u:Date.now(),d:1});save();render();
    toast(Sync.active?'Frage gesendet ✓':Sync.configured?'Gespeichert – wird nach der Anmeldung gesendet':'Gespeichert (Offline-Modus)');
  },
  answer:t=>{const q=S.questions.find(x=>x.id===t.dataset.id),v=$('#ans-'+q.id).value.trim();if(!v)return toast('Bitte eine Antwort eingeben');
    q.answer=v;q.at=Date.now();q.pub=$('#pub-'+q.id).checked;q.d=1;save();render();toast('Antwort gespeichert ✓')},
  saveProfile:()=>{S.profile.name=$('#s-name').value.trim();S.profile.goal=$('#s-goal').value;S.profileTouched=1;save();Sync.active&&Sync.saveProfile(S.profile).catch(()=>{});closeSheet();render();toast('Profil gespeichert ✓')},
  sendCode:async t=>{const e=$('#s-mail').value.trim();if(!/^\S+@\S+\.\S+$/.test(e))return toast('Bitte gültige E-Mail eingeben');t.disabled=true;
    try{await Sync.sendCode(e);F.email=e;settings('code')}catch(x){toast('Fehler: '+x.message);t.disabled=false}},
  verify:async t=>{const c=$('#s-code').value.trim();if(!c)return;t.disabled=true;try{await Sync.verify(F.email,c);toast('Angemeldet ✓');setTimeout(()=>settings(),300)}catch(x){toast('Code ungültig oder abgelaufen');t.disabled=false}},
  syncNow:async()=>{await Sync.run();render();settings();toast(Sync.status==='ok'?'Synchronisiert ✓':'Sync-Fehler')},
  signout:async()=>{await Sync.signOut();settings()},
  delAccount:async()=>{if(!confirm('Konto und ALLE Daten unwiderruflich löschen?'))return;try{await Sync.deleteAccount();S=defaults();save(true);closeSheet();render();toast('Konto gelöscht')}catch(e){toast('Fehler: '+e.message)}},
  wipe:()=>{if(confirm('Alle lokalen Daten löschen? Das kann nicht rückgängig gemacht werden.')){S=defaults();save(true);closeSheet();render()}},
  exportJson:()=>download(`trilab-backup-${today()}.json`,'application/json',JSON.stringify({workouts:W(),races:R(),profile:S.profile},null,1)),
  exportCsv:()=>{const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;download(`trilab-log-${today()}.csv`,'text/csv',['Datum,Sport,Minuten,km,RPE,Notiz,Quelle',...W().sort((a,b)=>a.date.localeCompare(b.date)).map(w=>[w.date,SP[w.sport]?.n,w.dur,w.dist??'',w.rpe??'',q(w.note),w.source].join(','))].join('\n'))},
  garmin:()=>toast('Garmin-Anbindung: siehe README')
};
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t&&A[t.dataset.a])A[t.dataset.a](t,e)});

/* ---------- Start ---------- */
render();
Sync.init({get:()=>S,save,changed:render});
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
