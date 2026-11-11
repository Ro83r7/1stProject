/* Lena's TriLab – Sync-Schicht (Supabase). Ohne Konfiguration passiert hier nichts (Offline-Modus).
   Prinzip: offline-first. Die App arbeitet immer auf dem lokalen Stand (localStorage).
   Geänderte Datensätze tragen ein Dirty-Flag `d` und werden gebündelt hochgeladen (upsert, last-write-wins).
   Heruntergeladen wird inkrementell über die serverseitige Spalte `synced_at` – so bleibt der Sync auch
   bei vielen Nutzern und langen Historien billig. */
(function(){
const CFG=window.TRILAB_CONFIG||{};
const SDK='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
const iso=ms=>new Date(ms).toISOString();
const ts=s=>s?Date.parse(s):null;

const MAP={
 workouts:{
  to:(w,u)=>({id:w.id,user_id:u,date:w.date,sport:w.sport,dur_min:w.dur,dist_km:w.dist??null,rpe:w.rpe??null,note:w.note||'',source:w.source||'manual',plan_ref:w.plan||null,deleted:!!w.del,updated_at:iso(w.u)}),
  from:r=>({id:r.id,date:r.date,sport:r.sport,dur:r.dur_min,dist:r.dist_km==null?null:Number(r.dist_km),rpe:r.rpe,note:r.note,source:r.source,plan:r.plan_ref,del:r.deleted,u:ts(r.updated_at)})
 },
 races:{
  to:(r,u)=>({id:r.id,user_id:u,name:r.name,date:r.date,type:r.type,location:r.loc||'',goal_s:r.goal??null,tot_s:r.res?.tot??null,swim_s:r.res?.swim??null,t1_s:r.res?.t1??null,bike_s:r.res?.bike??null,t2_s:r.res?.t2??null,run_s:r.res?.run??null,place:r.place||'',note:r.note||'',deleted:!!r.del,updated_at:iso(r.u)}),
  from:r=>({id:r.id,name:r.name,date:r.date,type:r.type,loc:r.location,goal:r.goal_s,res:{tot:r.tot_s,swim:r.swim_s,t1:r.t1_s,bike:r.bike_s,t2:r.t2_s,run:r.run_s},place:r.place,note:r.note,del:r.deleted,u:ts(r.updated_at)})
 }
};

function merge(arr,rows,map){
  const idx=new Map(arr.map(x=>[x.id,x]));
  for(const r of rows){
    const n=map(r),l=idx.get(n.id);
    if(!l){ if(!n.del){arr.push(n);idx.set(n.id,n)} }
    else if(!l.d||n.u>l.u){ Object.assign(l,n); delete l.d; }
  }
}
const loadScript=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('SDK nicht ladbar'));document.head.appendChild(s)});

const Sync={
  configured:!!(CFG.supabaseUrl&&CFG.supabaseKey),
  sb:null,user:null,admin:false,tier:'free',status:'off',busy:false,
  ctx:null,timer:null,
  get active(){return !!this.user},

  async init(ctx){
    this.ctx=ctx;
    if(!this.configured)return;
    try{
      await loadScript(SDK);
      this.sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
      const {data}=await this.sb.auth.getSession();
      this.user=data.session?.user||null;
      this.sb.auth.onAuthStateChange((_e,s)=>{const had=!!this.user;this.user=s?.user||null;if(!!this.user!==had){this.status=this.user?'idle':'off';if(this.user)this.afterLogin().catch(()=>{});ctx.changed()}});
      this.status=this.user?'idle':'off';
      if(this.user)await this.afterLogin();
    }catch(e){this.status='err';this.err=e.message}
    ctx.changed();
  },
  async afterLogin(){await this.loadProfile();await this.run()},
  async loadProfile(){
    const {data}=await this.sb.from('profiles').select('display_name,goal,is_admin,tier').eq('id',this.user.id).maybeSingle();
    if(data){
      this.admin=!!data.is_admin;this.tier=data.tier;
      const S=this.ctx.get();
      if(data.display_name&&!S.profile.name)S.profile.name=data.display_name;
      if(!S.profileTouched&&data.goal)S.profile.goal=data.goal;
      this.ctx.save(true);
    }
  },
  async saveProfile(p){ if(!this.user)return; await this.sb.from('profiles').update({display_name:p.name||null,goal:p.goal}).eq('id',this.user.id) },

  async sendCode(email){const {error}=await this.sb.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error)throw error},
  async verify(email,token){const {error}=await this.sb.auth.verifyOtp({email,token,type:'email'});if(error)throw error},
  async signOut(){await this.sb.auth.signOut();this.admin=false;this.status='off'},
  async deleteAccount(){const {error}=await this.sb.rpc('delete_my_account');if(error)throw error;await this.sb.auth.signOut().catch(()=>{})},

  schedule(){ if(!this.user)return; clearTimeout(this.timer); this.timer=setTimeout(()=>this.run().then(()=>this.ctx.changed()),2500) },

  async faq(){
    if(!this.sb)return null;
    const {data,error}=await this.sb.from('public_faq').select('id,text,answer,lang').order('answered_at',{ascending:false}).limit(60);
    return error?null:data;
  },

  async run(){
    if(!this.user||this.busy)return;
    this.busy=true;this.status='syncing';
    try{
      const S=this.ctx.get(),uid=this.user.id;
      S.sync=S.sync||{cursor:{}};
      for(const k of ['workouts','races']){
        const dirty=S[k].filter(x=>x.d);
        for(let i=0;i<dirty.length;i+=200){
          const chunk=dirty.slice(i,i+200);
          const {error}=await this.sb.from(k).upsert(chunk.map(x=>MAP[k].to(x,uid)),{onConflict:'id'});
          if(error)throw error;
          chunk.forEach(x=>delete x.d);
        }
        let cur=S.sync.cursor[k]||'1970-01-01T00:00:00Z';
        for(;;){
          const {data,error}=await this.sb.from(k).select('*').gte('synced_at',cur).order('synced_at').limit(500);
          if(error)throw error;
          if(!data.length)break;
          merge(S[k],data,MAP[k].from);
          const next=data[data.length-1].synced_at;
          if(data.length<500||next===cur){cur=next;break}
          cur=next;
        }
        S.sync.cursor[k]=cur;
        S[k]=S[k].filter(x=>!(x.del&&!x.d));
      }
      await this.runQuestions(S,uid);
      this.ctx.save(true);
      this.status='ok';this.err=null;
    }catch(e){this.status='err';this.err=e.message||String(e)}
    finally{this.busy=false}
  },

  async runQuestions(S,uid){
    for(const q of S.questions.filter(x=>x.d)){
      if(this.admin&&q.answer!=null&&q.r){
        const {error}=await this.sb.from('questions').update({answer:q.answer,is_public:!!q.pub,answered_at:iso(q.at||Date.now())}).eq('id',q.id);
        if(error)throw error;
      }else if(!q.r){
        const {error}=await this.sb.from('questions').insert({id:q.id,user_id:uid,text:q.text,lang:q.lang||'de'});
        if(error&&!/duplicate/i.test(error.message))throw error;
        q.r=1;
      }
      delete q.d;
    }
    let cur=S.sync.cursor.questions||'1970-01-01T00:00:00Z';
    const {data,error}=await this.sb.from('questions').select('*,profiles(display_name)').gte('synced_at',cur).order('synced_at').limit(300);
    if(error)throw error;
    const idx=new Map(S.questions.map(x=>[x.id,x]));
    for(const r of data){
      const n={id:r.id,text:r.text,created:ts(r.created_at),answer:r.answer,at:ts(r.answered_at),pub:r.is_public,lang:r.lang,uid:r.user_id,who:r.profiles?.display_name||'',r:1,u:ts(r.synced_at)};
      const l=idx.get(n.id);
      if(!l)S.questions.push(n);else if(!l.d)Object.assign(l,n);
    }
    if(data.length)S.sync.cursor.questions=data[data.length-1].synced_at;
  }
};
window.Sync=Sync;
})();
