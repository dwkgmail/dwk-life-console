(function(){
  const Store=window.DWK_STORE,U=window.DWK_UTILS,UI=window.DWK_UI,D=window.DWK_DATA;
  const app=document.getElementById('app'),backdrop=document.getElementById('modalBackdrop'),body=document.getElementById('modalBody'),form=document.getElementById('modalForm'),title=document.getElementById('modalTitle');
  let quickKind=null;
  const esc=U.escape;
  const field=(name,label,type='text',value='',attrs='')=>`<label class="field ${attrs.includes('full')?'full':''}"><span>${label}</span><input class="input" name="${name}" type="${type}" value="${esc(value)}" ${attrs.replace('full','')}></label>`;
  const select=(name,label,items,value)=>`<label class="field"><span>${label}</span><select name="${name}">${items.map(x=>`<option ${x===value?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`;
  const refresh=()=>document.querySelector('.nav-item.active')?.click();
  const toast=message=>{const el=document.createElement('div');el.className='toast';el.textContent=message;document.getElementById('toastContainer').appendChild(el);setTimeout(()=>el.remove(),3000)};

  function quickMarkup(kind){
    const tabs=`<div class="quick-kinds full">${[['health','健康'],['finance','流水'],['learning','学习'],['todo','待办']].map(([k,l])=>`<button type="button" class="quick-kind ${kind===k?'active':''}" data-loop-kind="${k}">${l}</button>`).join('')}</div>`;
    let fields='';
    if(kind==='health')fields=field('date','日期','date',U.today(),'required')+field('morningWeight','晨重（kg）','number','','step="0.1" min="0"')+field('sleep','睡眠（小时）','number','','step="0.1" min="0" max="24"')+field('water','饮水（ml）','number','','min="0"')+field('note','一句备注','text','','full');
    if(kind==='finance')fields=field('date','日期','date',U.today(),'required')+select('type','类型',['支出','收入'],'支出')+field('amount','金额','number','','min="0.01" step="0.01" required')+select('category','分类',D.enums.expenseCategories,'餐饮')+field('note','备注','text','','full');
    if(kind==='learning')fields=field('date','日期','date',U.today(),'required')+field('content','学了什么','text','','required full')+field('durationMinutes','时长（分钟）','number','30','min="1" required');
    if(kind==='todo')fields=field('title','要做什么','text','','required full')+field('dueDate','截止日期','date',U.today(),'required')+select('priority','优先级',D.enums.priorities,'中')+select('module','模块',D.enums.todoModules,'通用');
    return `<div class="form-grid">${tabs}<p class="quick-hint full">只填必要信息，15 秒完成；详细内容稍后可在对应模块补充。</p>${fields}</div>`;
  }

  function openQuick(kind='todo'){
    quickKind=kind;title.textContent='快速记录';body.innerHTML=quickMarkup(kind);backdrop.hidden=false;form.querySelector('input:not([type=date]),select')?.focus();
  }

  async function saveQuick(){
    const o=Object.fromEntries(new FormData(form).entries()),kind=quickKind;
    await Store.update(d=>{
      if(kind==='health')d.health.push({id:U.uid('h'),mood:'良好',condition:'良好',morningWeight:+o.morningWeight||0,sleep:+o.sleep||0,water:+o.water||0,...o});
      if(kind==='finance'){
        o.amount=Number(o.amount);o.accountId=d.accounts.find(a=>a.available&&!a.receivable)?.id||d.accounts[0]?.id;
        const account=d.accounts.find(a=>a.id===o.accountId);if(account&&!account.receivable)account.balance+=(o.type==='收入'?1:-1)*o.amount;
        d.transactions.push({id:U.uid('tx'),large:false,...o});
      }
      if(kind==='learning')d.javaLogs.push({id:U.uid('jl'),startTime:'',endTime:'',independent:false,needReview:false,...o,durationMinutes:Number(o.durationMinutes)});
      if(kind==='todo')d.todos.push({id:U.uid('t'),status:'未完成',estimatedMinutes:0,actualMinutes:0,repeat:'无',completedAt:'',delayReason:'',note:'',...o});
    });
    quickKind=null;backdrop.hidden=true;form.reset();refresh();toast('记录已保存');
  }

  function todayActions(d){
    const out=[],motor=U.motorStats(d),finance=U.financeStats(d),today=U.today();
    d.todos.filter(t=>U.isOverdue(t)||t.status!=='已完成'&&t.dueDate===today).forEach(t=>out.push({level:U.isOverdue(t)?'red':'orange',title:t.title,detail:U.isOverdue(t)?`已逾期 · 原定 ${t.dueDate}`:'今天到期',action:'loop-complete',id:t.id,label:'标记完成'}));
    if(finance.budgetRate!==null&&finance.budgetRate>=80)out.push({level:finance.budgetRate>=100?'red':'orange',title:finance.budgetRate>=100?'本月预算已超支':'本月预算接近上限',detail:`已使用 ${U.number(finance.budgetRate)}%`,action:'loop-go',id:'finance',label:'查看流水'});
    if(motor.maintenanceRemain!==null&&motor.maintenanceRemain<=500)out.push({level:'orange',title:'安排摩托车保养',detail:motor.maintenanceRemain<0?`已超 ${Math.abs(motor.maintenanceRemain)} km`:`还剩 ${motor.maintenanceRemain} km`,action:'loop-go',id:'motor',label:'去处理'});
    const lastH=[...d.health].sort((a,b)=>b.date.localeCompare(a.date))[0],lastJ=[...d.javaLogs].sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(!lastH||U.daysBetween(lastH.date,today)>=3)out.push({level:'orange',title:'补记健康数据',detail:lastH?`已 ${U.daysBetween(lastH.date,today)} 天未记录`:'尚无健康记录',action:'loop-quick',id:'health',label:'立即记录'});
    if(!lastJ||U.daysBetween(lastJ.date,today)>=3)out.push({level:'orange',title:'恢复学习节奏',detail:lastJ?`已 ${U.daysBetween(lastJ.date,today)} 天未学习`:'尚无学习记录',action:'loop-quick',id:'learning',label:'记录学习'});
    if(new Date().getDay()===0&&!d.weeklyReviews.some(x=>x.start===U.startOfWeek()))out.push({level:'blue',title:'完成本周复盘',detail:'汇总本周变化并安排下周',action:'loop-go',id:'review',label:'开始复盘'});
    return out.sort((a,b)=>({red:0,orange:1,blue:2}[a.level]-{red:0,orange:1,blue:2}[b.level]));
  }

  const dashboard=UI.dashboard.bind(UI);
  UI.dashboard=d=>{const actions=todayActions(d),items=actions.slice(0,6).map(x=>`<article class="action-item ${x.level}"><span class="action-signal"></span><div class="grow"><b>${esc(x.title)}</b><small>${esc(x.detail)}</small></div><button class="button small ${x.level==='red'?'danger':'secondary'}" data-action="${x.action}" data-id="${x.id}">${x.label}</button></article>`).join('');return `<div class="section-head action-heading"><div><p class="eyebrow">TODAY · 今日行动</p><h2>${actions.length?`${actions.length} 件事值得现在处理`:'今天没有紧急事项'}</h2><p>${actions.length?'先处理异常，再看数字。每项都可以直接行动。':'记录一点进展，保持生活系统连续运转。'}</p></div><button class="button primary" data-action="loop-quick" data-id="todo">＋ 记一笔</button></div><section class="action-center">${items||'<article class="action-empty"><strong>状态良好</strong><span>没有逾期、超支或断档提醒</span></article>'}</section><p class="eyebrow metrics-eyebrow">OVERVIEW · 状态概览</p>${dashboard(d)}`};

  const review=UI.review.bind(UI);
  UI.review=(d,filters)=>review(d,filters).replace('<button class="button primary">保存周复盘</button>','<div class="review-actions"><button class="button secondary" type="button" data-action="loop-review-tasks">生成下周待办</button><button class="button primary">保存周复盘</button></div><p class="muted">“下周最重要的三件事”每行生成一条高优先级待办。</p>');

  document.body.insertAdjacentHTML('beforeend','<button class="button quick-add" id="quickAddButton" aria-label="快速记录，快捷键 Ctrl 或 Command 加 K"><span>＋</span><span class="quick-add-label">快速记录</span><kbd>⌘K</kbd></button>');
  document.getElementById('quickAddButton').addEventListener('click',()=>openQuick());
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openQuick()}if(e.key==='Escape'&&!backdrop.hidden){quickKind=null;backdrop.hidden=true}});
  body.addEventListener('click',e=>{const tab=e.target.closest('[data-loop-kind]');if(tab)openQuick(tab.dataset.loopKind)});
  form.addEventListener('submit',e=>{if(!quickKind)return;e.preventDefault();e.stopImmediatePropagation();saveQuick().catch(err=>toast(err.message))},true);
  app.addEventListener('click',async e=>{
    const button=e.target.closest('[data-action^="loop-"]');if(!button)return;
    const action=button.dataset.action,id=button.dataset.id;
    if(action==='loop-quick')openQuick(id||'todo');
    if(action==='loop-go')document.querySelector(`.nav-item[data-page="${id}"]`)?.click();
    if(action==='loop-complete'){await Store.update(d=>{const todo=d.todos.find(x=>x.id===id);if(todo){todo.status='已完成';todo.completedAt=new Date().toISOString()}});refresh();toast('待办已完成')}
    if(action==='loop-review-tasks'){
      const text=app.querySelector('#reviewForm textarea[name="topThree"]')?.value||'',items=text.split(/\n|；|;/).map(x=>x.replace(/^\s*(?:[-*•]|\d+[.、)])\s*/,'').trim()).filter(Boolean).slice(0,3);
      if(!items.length){toast('请先填写下周最重要的三件事，每行一件');return}
      const start=app.querySelector('#reviewRange [name="start"]')?.value||U.startOfWeek(),due=U.dateOffset(13,start);
      await Store.update(d=>items.forEach(task=>{if(!d.todos.some(t=>t.title===task&&t.dueDate===due))d.todos.push({id:U.uid('t'),title:task,status:'未完成',dueDate:due,priority:'高',module:'通用',estimatedMinutes:0,actualMinutes:0,repeat:'无',completedAt:'',delayReason:'',note:'由周复盘生成'})}));
      refresh();toast(`已创建 ${items.length} 条下周待办`);
    }
  });
})();
