/* Offline-Hülle: App-Dateien werden gecacht (stale-while-revalidate), API-Aufrufe nie. */
const V='trilab-v1',SHELL=['./','index.html','styles.css','app.js','sync.js','content.js','icons.js','config.js','manifest.webmanifest','icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(caches.open(V).then(async c=>{const hit=await c.match(r);
    const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}).catch(()=>hit);
    return hit||net}));
});
