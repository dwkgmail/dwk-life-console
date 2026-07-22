import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('3.0 前端使用登录和 REST API',async()=>{
  const [html,api,store]=await Promise.all(['../index.html','../js/api.js','../js/storage.js'].map(x=>readFile(new URL(x,import.meta.url),'utf8')));
  assert.match(html,/loginForm/);assert.match(html,/js\/api\.js/);assert.match(api,/Authorization/);assert.match(api,/\/api/);assert.match(store,/Api\.get\('\/data'\)/);assert.match(store,/migrations\/v2-json/);
});
test('3.0 保留移动适配、图表和 V2 快照',async()=>{
  const [css,ui,v2]=await Promise.all(['../css/style.css','../js/ui.js','../v2/js/storage.js'].map(x=>readFile(new URL(x,import.meta.url),'utf8')));
  assert.match(css,/@media\(max-width:760px\)/);assert.match(ui,/new Chart/);assert.match(v2,/indexedDB/);
});
test('Service Worker 不缓存 REST 响应',async()=>{const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');assert.match(sw,/pathname\.startsWith\('\/api\/'\)/)});
test('高频记录、今日行动和复盘转待办闭环已接通',async()=>{const [html,loops]=await Promise.all(['../index.html','../js/action-loops.js'].map(x=>readFile(new URL(x,import.meta.url),'utf8')));assert.match(html,/action-loops\.js/);assert.match(loops,/openQuick/);assert.match(loops,/metaKey/);assert.match(loops,/action-center/);assert.match(loops,/loop-review-tasks/);assert.match(loops,/由周复盘生成/)});
test('Apple Health 网页接入和 iOS 真工程存在',async()=>{
  const [store,ui,pbx,health]=await Promise.all([
    '../js/storage.js','../js/ui.js','../ios-app/DWKLifeHealth.xcodeproj/project.pbxproj','../ios-app/DWKLifeHealth/HealthKitManager.swift'
  ].map(x=>readFile(new URL(x,import.meta.url),'utf8')));
  assert.match(store,/health\/weight\/daily/);assert.match(ui,/刷新 Apple Health/);
  assert.match(pbx,/com\.apple\.HealthKit/);assert.match(health,/HKSampleQuery/);assert.match(health,/bodyMass/);
});
