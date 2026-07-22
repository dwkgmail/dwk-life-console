(function () {
  const now = new Date();
  const dateOffset = days => { const d=new Date(now); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
  const topics=['变量','if/else','逻辑运算','for 循环','数组','方法','类和对象','构造方法','this','方法重载','private 封装','getter/setter','static','List','继承','多态','接口','异常','集合','JUnit','Maven','Spring Boot'];
  const ideaNames=['DWK Shop 电商训练场','测试能力展示网站','AI 辅助测试工具','Bug 统计分析平台','AI 智能记账网站','测试模板与工具变现','跨境电商尝试','个人生活控制台'];
  const scoreDefaults={interest:3,difficulty:3,estimatedCost:3,monetization:3,abilityMatch:3,nextClarity:3};
  window.DWK_DATA={
    APP:'DWK Life OS', SCHEMA_VERSION:2, V1_KEY:'dwk-life-os-v1', CONFIG_KEY:'dwk-life-os-config-v2', DB_NAME:'dwk-life-os-v2', DB_VERSION:1,
    enums:{
      javaStatus:['未开始','学习中','已完成','需要复习'], priorities:['高','中','低'],
      ideaStages:['想法','调研中','准备开始','进行中','暂停','完成','放弃'],
      expenseCategories:['餐饮','交通','住房','购物','医疗','学习','娱乐','人情','摩托车','其他'], incomeCategories:['工资','副业','退款','奖金','其他'],
      todoModules:['通用','健康','财务','摩托车','Java学习','点子'], moods:['很好','良好','一般','低落','焦虑']
    },
    collections:['accounts','transactions','health','fuelLogs','maintenanceLogs','rides','faults','repairs','javaTopics','javaLogs','ideas','todos','weeklyReviews','fixedExpenses','incomePlans','categoryBudgets'],
    createDefaultData(withDemo=true){
      const base={schemaVersion:2,createdAt:new Date().toISOString(),settings:{owner:'丁文凯',leaveDate:dateOffset(90),monthlyMinCost:3500,monthlyNormalCost:5000,monthlyBudget:6000,rent:0,mortgage:0,transportCost:300,motorCost:300,expectedIncome:0,largeExpenseThreshold:1000},motor:{currentMileage:12680,insuranceExpiry:dateOffset(180),inspectionExpiry:dateOffset(300),notes:'每周检查胎压与链条状态'},accounts:[],transactions:[],health:[],fuelLogs:[],maintenanceLogs:[],rides:[],faults:[],repairs:[],javaTopics:topics.map((name,i)=>({id:'j'+(i+1),name,status:i<6?'已完成':i===6?'学习中':i===7?'需要复习':'未开始'})),javaLogs:[],ideas:[],todos:[],weeklyReviews:[],fixedExpenses:[],incomePlans:[],categoryBudgets:[]};
      base.accounts=[
        {id:'acc_icbc',name:'工商银行',balance:withDemo?24000:0,available:true,refundable:false,receivable:false},
        {id:'acc_psbc',name:'邮储银行',balance:withDemo?22400:0,available:true,refundable:false,receivable:false},
        {id:'acc_cash',name:'现金',balance:withDemo?2000:0,available:true,refundable:false,receivable:false},
        {id:'acc_deposit',name:'可退押金',balance:withDemo?1300:0,available:false,refundable:true,receivable:false}
      ];
      if(!withDemo)return base;
      base.transactions=[{id:'tx1',date:dateOffset(-6),type:'支出',amount:68,category:'餐饮',accountId:'acc_cash',note:'周末聚餐',large:false},{id:'tx2',date:dateOffset(-4),type:'支出',amount:120,category:'摩托车',accountId:'acc_icbc',note:'摩托车加油',large:false},{id:'tx3',date:dateOffset(-2),type:'收入',amount:800,category:'副业',accountId:'acc_psbc',note:'测试咨询',large:false}];
      base.health=[-6,-5,-3,-1].map((n,i)=>({id:'h'+(i+1),date:dateOffset(n),morningWeight:[92.8,92.5,92.2,91.9][i],eveningWeight:[93.4,93.1,92.8,92.5][i],breakfast:'',lunch:'',dinner:'',sleep:[7,6.5,7.5,7][i],cpap:[6.5,6,7,6.8][i],condition:i===1?'一般':'良好',water:1800,steps:6000,exerciseMinutes:30,mood:'良好',cpapUsed:true,goalCompleted:i!==1,note:''}));
      base.fuelLogs=[{id:'f1',date:dateOffset(-35),amount:95,liters:12.1,mileage:420,station:'',fuelType:'92#',unitPrice:7.85},{id:'f2',date:dateOffset(-18),amount:98,liters:12.4,mileage:438,station:'',fuelType:'92#',unitPrice:7.9},{id:'f3',date:dateOffset(-3),amount:92,liters:11.7,mileage:410,station:'',fuelType:'92#',unitPrice:7.86}];
      base.maintenanceLogs=[{id:'m1',date:dateOffset(-60),mileage:12000,item:'更换机油、检查刹车',nextMileage:15000,note:'使用全合成机油'}];
      base.ideas=ideaNames.map((name,i)=>({id:'i'+(i+1),name,category:i<4?'测试 / 技术':i<6?'AI / 工具':'商业尝试',stage:i===7?'进行中':i<2?'调研中':'想法',priority:i===7||i===0?'高':i<5?'中':'低',nextAction:i===7?'完善第二版并持续记录':'整理需求并验证可行性',note:'',createdAt:dateOffset(-i),...scoreDefaults}));
      base.todos=[{id:'t1',title:'记录今日体重与饮食',status:'未完成',dueDate:dateOffset(0),priority:'高',module:'健康',estimatedMinutes:10,actualMinutes:0,repeat:'每天',completedAt:'',delayReason:'',note:''},{id:'t2',title:'完成 Java 类和对象练习',status:'未完成',dueDate:dateOffset(0),priority:'高',module:'Java学习',estimatedMinutes:45,actualMinutes:0,repeat:'无',completedAt:'',delayReason:'',note:''}];
      return base;
    }
  };
})();
