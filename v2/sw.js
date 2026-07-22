const CACHE='dwk-life-os-v2.0.1';
const ASSETS=['./','./index.html','./css/style.css','./vendor/chart.umd.js','./js/data.js','./js/utils.js','./js/storage.js','./js/vault.js','./js/ui.js','./js/app.js','./manifest.json','./icons/icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(x=>x||caches.match('./index.html'))))});
