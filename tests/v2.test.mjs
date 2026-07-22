import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { indexedDB } from 'fake-indexeddb';

const dataCode=await readFile(new URL('../v2/js/data.js',import.meta.url),'utf8');
const utilsCode=await readFile(new URL('../v2/js/utils.js',import.meta.url),'utf8');
const storageCode=await readFile(new URL('../v2/js/storage.js',import.meta.url),'utf8');

class MemoryStorage {
  constructor(){this.values=new Map()}
  getItem(k){return this.values.get(k)??null}
  setItem(k,v){this.values.set(k,String(v))}
  removeItem(k){this.values.delete(k)}
}
let contextId=0;
function context(){
  const localStorage=new MemoryStorage();
  const window={localStorage,indexedDB,dispatchEvent(){},DWK_VAULT:{exportEncrypted(){return null}}};
  Object.assign(window,{window,console,structuredClone,CustomEvent:class{constructor(type){this.type=type}},setTimeout,clearTimeout,Date,Intl,Blob,URL});
  vm.runInNewContext(dataCode,window);window.DWK_DATA.DB_NAME=`dwk-life-os-v2-test-${++contextId}`;vm.runInNewContext(utilsCode,window);vm.runInNewContext(storageCode,window);
  return window;
}
async function resetDB(){await new Promise(resolve=>{const r=indexedDB.deleteDatabase('dwk-life-os-v2');r.onsuccess=r.onerror=r.onblocked=resolve})}

test('V1 数据迁移前备份且原键保留',async()=>{
  await resetDB();const w=context(),v1={version:1,settings:{monthlyMinCost:3000},accounts:[{id:'cash',name:'现金',balance:1000,available:true}],transactions:[],health:[{id:'h',date:'2026-07-15',morningWeight:80}],motor:{currentMileage:100,fuelLogs:[],maintenanceLogs:[]},java:[{id:'j',name:'变量',status:'已完成'}],ideas:[{id:'i',name:'点子',stage:'想法',nextAction:'写需求'}],todos:[]};
  const raw=JSON.stringify(v1);w.localStorage.setItem(w.DWK_DATA.V1_KEY,raw);const data=await w.DWK_STORE.init();
  assert.equal(data.schemaVersion,2);assert.equal(data.health[0].morningWeight,80);assert.equal(w.localStorage.getItem(w.DWK_DATA.V1_KEY),raw);assert.equal(w.DWK_STORE.v1Backups().length,1);assert.ok(w.localStorage.getItem(w.DWK_STORE.v1Backups()[0].id));
});

test('迁移失败不删除 V1 原数据',async()=>{
  await resetDB();const w=context(),raw='{broken json';w.localStorage.setItem(w.DWK_DATA.V1_KEY,raw);await assert.rejects(w.DWK_STORE.init(),/迁移失败/);assert.equal(w.localStorage.getItem(w.DWK_DATA.V1_KEY),raw);assert.equal(w.DWK_STORE.v1Backups().length,1);
});

test('IndexedDB 更新后重新读取仍保留',async()=>{
  await resetDB();const w=context();await w.DWK_STORE.init();await w.DWK_STORE.update(d=>d.health.push({id:'persist',date:w.DWK_UTILS.today(),morningWeight:77}));const loaded=await w.DWK_STORE.loadAll();assert.equal(loaded.health.find(x=>x.id==='persist').morningWeight,77);
});

test('财务口径分离押金和应收款',()=>{
  const w=context(),d=w.DWK_DATA.createDefaultData(false);d.accounts=[{balance:100,available:true},{balance:50,available:false,refundable:true},{balance:999,available:true,receivable:true}];const s=w.DWK_UTILS.financeStats(d);assert.equal(s.available,100);assert.equal(s.deposit,50);
});

test('现金流三种情景按成本系数递减',()=>{
  const w=context(),d=w.DWK_DATA.createDefaultData(false);d.accounts[0].balance=12000;d.settings.monthlyNormalCost=1000;d.settings.monthlyMinCost=1000;d.settings.transportCost=0;d.settings.motorCost=0;const optimistic=w.DWK_UTILS.cashFlow(d,'乐观'),normal=w.DWK_UTILS.cashFlow(d,'正常'),conservative=w.DWK_UTILS.cashFlow(d,'保守');assert.ok(optimistic.months>normal.months);assert.ok(normal.months>conservative.months);
});

test('摩托车油耗、每公里成本与最近三次计算正确',()=>{
  const w=context(),d=w.DWK_DATA.createDefaultData(false);d.fuelLogs=[1,2,3,4].map((n,i)=>({id:String(n),date:`2026-07-1${i}`,liters:5,mileage:100,amount:40}));const s=w.DWK_UTILS.motorStats(d);assert.equal(s.avgFuel,5);assert.equal(s.avgFuel3,5);assert.equal(s.costKm,.4);
});

test('Java 学习统计和点子评分正确',()=>{
  const w=context(),d=w.DWK_DATA.createDefaultData(false),today=w.DWK_UTILS.today();d.javaLogs=[{date:today,durationMinutes:75}];assert.equal(w.DWK_UTILS.javaStats(d).today,75);assert.equal(w.DWK_UTILS.ideaScore({interest:3,difficulty:3,estimatedCost:3,monetization:3,abilityMatch:3,nextClarity:3}),60);
});

test('待办逾期和周复盘汇总正确',()=>{
  const w=context(),U=w.DWK_UTILS,d=w.DWK_DATA.createDefaultData(false),today=U.today(),start=U.startOfWeek();d.todos=[{id:'late',status:'未完成',dueDate:U.dateOffset(-1),delayReason:'资源不足'},{id:'done',status:'已完成',dueDate:today,completedAt:today+'T12:00'}];d.transactions=[{date:start,type:'支出',amount:100,category:'餐饮'}];d.rides=[{date:start,distance:20}];assert.equal(U.isOverdue(d.todos[0]),true);const s=U.weeklySummary(d,start,U.dateOffset(6,start));assert.equal(s.expense,100);assert.equal(s.completedTodos,1);assert.equal(s.rideKm,20);
});

test('导入校验版本，合并时同 ID 去重',async()=>{
  await resetDB();const w=context();await w.DWK_STORE.init();const payload=w.DWK_STORE.exportObject();payload.data.health=[{id:'same',date:'2026-01-01',morningWeight:70},{id:'same',date:'2026-01-02',morningWeight:71}];await w.DWK_STORE.importJSON(JSON.stringify(payload),'merge');assert.equal(w.DWK_STORE.get().health.filter(x=>x.id==='same').length,1);assert.throws(()=>w.DWK_STORE.validateImport('{"schemaVersion":99,"data":{}}'),/不支持/);
});

test('PWA、Markdown 导出与移动端防横向滚动配置存在',async()=>{
  const [manifest,sw,app,css]=await Promise.all(['../v2/manifest.json','../v2/sw.js','../v2/js/app.js','../v2/css/style.css'].map(x=>readFile(new URL(x,import.meta.url),'utf8')));const m=JSON.parse(manifest);assert.equal(m.display,'standalone');assert.match(sw,/skipWaiting/);assert.match(sw,/caches\.delete/);assert.match(app,/text\/markdown/);assert.match(css,/overflow-x:hidden/);
});
