(function(){
  const D=window.DWK_DATA,Api=window.DWK_API,clone=x=>JSON.parse(JSON.stringify(x)),collections=D.collections;
  const Store={
    data:null,lastError:null,serverBackups:[],appleHealth:{loadedAt:null,count:0,error:null},
    config(){const defaults=['latestWeight','avg7Weight','change30Weight','availableFunds','budgetRate','supportMonths','mileage','maintenance','javaWeek','javaProgress','leaveCountdown','todayTodos','topIdeas','state7'];try{const saved=JSON.parse(localStorage.getItem(D.CONFIG_KEY)||'{}'),order=[...(saved.dashboardOrder||defaults)];defaults.forEach(k=>{if(!order.includes(k))order.push(k)});return{theme:'dark',hiddenCards:[],...saved,dashboardOrder:order}}catch{return{theme:'dark',dashboardOrder:defaults,hiddenCards:[]}}},
    saveConfig(patch){const next={...this.config(),...patch};localStorage.setItem(D.CONFIG_KEY,JSON.stringify(next));return next},
    normalizeServer(data){const out=D.createDefaultData(false);collections.forEach(k=>out[k]=Array.isArray(data[k])?data[k]:[]);out.settings={...out.settings,...(data.settings||{})};out.motor={...out.motor,...(data.motor||{})};out.schemaVersion=2;return out},
    normalizeV1(v1){const out=D.createDefaultData(false),motor=v1.motor||{};out.settings={...out.settings,...(v1.settings||{})};out.accounts=v1.accounts||out.accounts;out.transactions=v1.transactions||[];out.health=(v1.health||[]).map(x=>({...x,water:+x.water||0,steps:+x.steps||0,exerciseMinutes:+x.exerciseMinutes||0,mood:x.mood||x.condition||'一般',cpapUsed:x.cpapUsed??Number(x.cpap)>0,goalCompleted:Boolean(x.goalCompleted)}));out.motor={...out.motor,...motor};out.fuelLogs=motor.fuelLogs||v1.fuelLogs||[];out.maintenanceLogs=motor.maintenanceLogs||v1.maintenanceLogs||[];out.rides=v1.rides||[];out.faults=v1.faults||[];out.repairs=v1.repairs||[];out.javaTopics=v1.javaTopics||v1.java||out.javaTopics;out.javaLogs=v1.javaLogs||[];out.ideas=v1.ideas||[];out.todos=v1.todos||[];['weeklyReviews','fixedExpenses','incomePlans','categoryBudgets'].forEach(k=>out[k]=v1[k]||[]);return out},
    async init(){try{let server=await Api.get('/data');if(!server.initialized){await Api.put('/data',D.createDefaultData(false));server=await Api.get('/data')}this.data=this.normalizeServer(server);await this.refreshAppleHealth().catch(()=>[]);this.serverBackups=await Api.get('/backups');window.dispatchEvent(new CustomEvent('dwk:ready'));return this.data}catch(err){this.lastError=err;throw new Error('服务器数据初始化失败：'+err.message)}},
    async loadAll(){const server=await Api.get('/data');this.data=this.normalizeServer(server);await this.refreshAppleHealth().catch(()=>[]);return this.data},get(){return this.data},
    async refreshAppleHealth(){
      try{
        const rows=await Api.get('/health/weight/daily');
        const byDate=new Map(this.data.health.map(x=>[x.date,x]));
        rows.forEach(row=>{
          let target=byDate.get(row.date);
          if(!target){target={id:'apple-health-'+row.healthKitUuid,date:row.date};this.data.health.push(target);byDate.set(row.date,target)}
          target.morningWeight=Number(row.valueKg);
          target.appleHealth={healthKitUuid:row.healthKitUuid,measuredAt:row.measuredAt,sourceName:row.sourceName};
        });
        this.appleHealth={loadedAt:new Date().toISOString(),count:rows.length,error:null};
        return rows;
      }catch(err){this.appleHealth={...this.appleHealth,error:err.message};throw new Error('Apple Health 体重加载失败：'+err.message)}
    },
    async replaceAll(data){const server=await Api.put('/data',data.schemaVersion===2?data:this.normalizeV1(data));this.data=this.normalizeServer(server);return this.data},
    async update(mutator){const draft=clone(this.data);await mutator(draft);await this.replaceAll(draft);window.dispatchEvent(new CustomEvent('dwk:data-saved'));return this.data},
    v1Backups(){try{return JSON.parse(localStorage.getItem('dwk-life-os-v1-backups')||'[]')}catch{return[]}},
    backups(){return this.serverBackups||[]},
    async backup(reason='手动备份'){const result=await Api.post('/backups',{reason});this.serverBackups=await Api.get('/backups');return result},
    exportObject(moduleName){const data=moduleName?{[moduleName]:clone(this.data[moduleName])}:clone(this.data);return{app:D.APP,schemaVersion:2,exportedAt:new Date().toISOString(),scope:moduleName||'完整',data,vault:moduleName?undefined:window.DWK_VAULT?.exportEncrypted()||null}},
    exportJSON(moduleName){return JSON.stringify(this.exportObject(moduleName),null,2)},
    validateImport(text){let parsed;try{parsed=typeof text==='string'?JSON.parse(text):text}catch{throw new Error('文件不是有效的 JSON 格式')}const version=Number(parsed.schemaVersion||parsed.version||parsed.data?.schemaVersion||parsed.data?.version||1),data=parsed.data||parsed;if(![1,2].includes(version))throw new Error('不支持的数据版本：'+version);if(!data||typeof data!=='object')throw new Error('数据结构为空');if(version===2&&(!parsed.scope||parsed.scope==='完整')){const required=['settings','accounts','transactions','health','motor','javaTopics','ideas','todos'];if(required.some(k=>!(k in data)))throw new Error('第二版完整备份缺少必要模块')}return{parsed,version,data,scope:parsed.scope||'完整',counts:Object.fromEntries(Object.entries(data).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length]))}},
    async importJSON(text,mode='replace'){const check=this.validateImport(text);let payload=check.parsed;if(check.version===1)payload={app:D.APP,schemaVersion:2,scope:'完整',data:this.normalizeV1(check.data)};const result=await Api.post('/migrations/v2-json?mode='+encodeURIComponent(mode),payload);this.data=this.normalizeServer(result);this.serverBackups=await Api.get('/backups');if(check.parsed.vault)window.DWK_VAULT?.importEncrypted(check.parsed.vault);return this.data},
    async restoreBackup(id){const result=await Api.post('/backups/'+id+'/restore');this.data=this.normalizeServer(result);this.serverBackups=await Api.get('/backups');return this.data},
    async restoreV1Backup(id){const raw=localStorage.getItem(id);if(!raw)throw new Error('找不到第一版备份');return this.importJSON(raw,'replace')},
    download(name,content,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  };
  window.DWK_STORE=Store;
})();
