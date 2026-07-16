(function () {
  const U = {
    uid(prefix='id') { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    today() { return new Date().toISOString().slice(0, 10); },
    formatDate(value, withYear=true) {
      if (!value) return '—';
      const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
      if (Number.isNaN(d.getTime())) return value;
      return new Intl.DateTimeFormat('zh-CN', { year: withYear?'numeric':undefined, month:'2-digit', day:'2-digit' }).format(d);
    },
    formatMoney(value) { return '¥' + Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); },
    number(value, digits=1) { const n=Number(value); return Number.isFinite(n) ? n.toFixed(digits).replace(/\.0+$/,'') : '—'; },
    escape(value='') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); },
    sum(items, key) { return items.reduce((a,x) => a + Number(typeof key==='function'?key(x):x[key] || 0), 0); },
    monthKey(date=new Date()) { return typeof date==='string' ? date.slice(0,7) : date.toISOString().slice(0,7); },
    daysBetween(a,b) { return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000); },
    workdaysUntil(date) {
      let d=new Date(); d.setHours(0,0,0,0); const end=new Date(date+'T00:00:00'); let count=0;
      while(d<end){ d.setDate(d.getDate()+1); if(d.getDay()!==0&&d.getDay()!==6) count++; }
      return Math.max(0,count);
    },
    statusClass(value) { return 'tag-' + ({'已完成':'green','学习中':'blue','未开始':'muted','需要复习':'orange','高':'red','中':'orange','低':'muted','进行中':'blue','调研中':'purple','想法':'muted','暂停':'orange','今天必须完成':'red','有空再做':'blue','明天处理':'orange'}[value] || 'muted'); },
    latestWeight(health) { const rows=[...health].filter(x=>Number(x.morningWeight)||Number(x.eveningWeight)).sort((a,b)=>b.date.localeCompare(a.date)); if(!rows.length)return null; return Number(rows[0].morningWeight)||Number(rows[0].eveningWeight); },
    weightStats(health) {
      const sorted=[...health].filter(x=>Number(x.morningWeight)).sort((a,b)=>a.date.localeCompare(b.date));
      const latest=sorted.at(-1); const previous=sorted.at(-2);
      const last7=sorted.filter(x=>U.daysBetween(x.date,U.today())<=6 && U.daysBetween(x.date,U.today())>=0);
      const before30=[...sorted].reverse().find(x=>U.daysBetween(x.date,U.today())>=29);
      return { latest:latest?Number(latest.morningWeight):null, change:latest&&previous?Number(latest.morningWeight)-Number(previous.morningWeight):null, avg7:last7.length?U.sum(last7,'morningWeight')/last7.length:null, change30:latest&&before30?Number(latest.morningWeight)-Number(before30.morningWeight):null };
    },
    financeStats(data) {
      const available=U.sum(data.accounts.filter(a=>a.available),'balance');
      const deposit=U.sum(data.accounts.filter(a=>a.refundable),'balance');
      const month=data.transactions.filter(t=>t.date.startsWith(U.monthKey()));
      const income=U.sum(month.filter(t=>t.type==='收入'),'amount');
      const expense=U.sum(month.filter(t=>t.type==='支出'),'amount');
      return {available,deposit,income,expense,supportMonths:data.settings.monthlyMinCost>0?available/data.settings.monthlyMinCost:0};
    }
  };
  window.DWK_UTILS=U;
})();
