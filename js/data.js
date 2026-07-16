(function () {
  const today = new Date();
  const dateOffset = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const javaTopics = ['变量','if/else','逻辑运算','for循环','数组','方法','类和对象','构造方法','this','方法重载','private封装','getter/setter','static','List','继承','多态','接口','异常','集合','JUnit','Maven','Spring Boot'];
  const ideaNames = ['DWK Shop电商训练场','测试能力展示网站','AI辅助测试工具','Bug统计分析平台','AI智能记账网站','测试模板与工具变现','跨境电商尝试','个人生活控制台'];

  window.DWK_DATA = {
    STORAGE_KEY: 'dwk-life-os-v1',
    VERSION: 1,
    enums: {
      javaStatus: ['未开始','学习中','已完成','需要复习'],
      todoStatus: ['今天必须完成','有空再做','明天处理','已完成'],
      priorities: ['高','中','低'],
      ideaStages: ['想法','调研中','进行中','暂停','已完成'],
      expenseCategories: ['餐饮','交通','住房','购物','医疗','学习','娱乐','人情','其他'],
      incomeCategories: ['工资','副业','退款','奖金','其他']
    },
    createDefaultData() {
      return {
        version: 1,
        settings: { owner: '丁文凯', leaveDate: dateOffset(90), monthlyMinCost: 3500 },
        accounts: [
          { id: 'acc_icbc', name: '工商银行', balance: 24000, available: true, refundable: false },
          { id: 'acc_psbc', name: '邮储银行', balance: 22400, available: true, refundable: false },
          { id: 'acc_cash', name: '现金', balance: 2000, available: true, refundable: false },
          { id: 'acc_deposit', name: '可退押金', balance: 1300, available: false, refundable: true }
        ],
        transactions: [
          { id: 'tx1', date: dateOffset(-6), type: '支出', amount: 68, category: '餐饮', accountId: 'acc_cash', note: '周末聚餐' },
          { id: 'tx2', date: dateOffset(-4), type: '支出', amount: 120, category: '交通', accountId: 'acc_icbc', note: '摩托车加油' },
          { id: 'tx3', date: dateOffset(-2), type: '收入', amount: 800, category: '副业', accountId: 'acc_psbc', note: '测试咨询' },
          { id: 'tx4', date: dateOffset(-1), type: '支出', amount: 45.5, category: '餐饮', accountId: 'acc_cash', note: '日常餐饮' }
        ],
        health: [
          { id:'h1', date:dateOffset(-6), morningWeight:92.8, eveningWeight:93.4, breakfast:'鸡蛋、牛奶', lunch:'米饭、青菜', dinner:'鸡胸肉沙拉', sleep:7, cpap:6.5, condition:'良好', note:'晚饭后散步' },
          { id:'h2', date:dateOffset(-5), morningWeight:92.5, eveningWeight:93.1, breakfast:'燕麦', lunch:'面条', dinner:'家常菜', sleep:6.5, cpap:6, condition:'一般', note:'' },
          { id:'h3', date:dateOffset(-3), morningWeight:92.2, eveningWeight:92.8, breakfast:'鸡蛋', lunch:'米饭套餐', dinner:'少量主食', sleep:7.5, cpap:7, condition:'良好', note:'完成力量训练' },
          { id:'h4', date:dateOffset(-1), morningWeight:91.9, eveningWeight:92.5, breakfast:'全麦面包', lunch:'牛肉饭', dinner:'蔬菜汤', sleep:7, cpap:6.8, condition:'良好', note:'体重稳步下降' }
        ],
        motor: {
          currentMileage: 12680,
          insuranceExpiry: dateOffset(180),
          notes: '每周检查胎压与链条状态',
          fuelLogs: [
            { id:'f1', date:dateOffset(-35), amount:95, liters:12.1, mileage:420 },
            { id:'f2', date:dateOffset(-18), amount:98, liters:12.4, mileage:438 },
            { id:'f3', date:dateOffset(-3), amount:92, liters:11.7, mileage:410 }
          ],
          maintenanceLogs: [
            { id:'m1', date:dateOffset(-60), mileage:12000, item:'更换机油、检查刹车', nextMileage:15000, note:'使用全合成机油' }
          ]
        },
        java: javaTopics.map((name, i) => ({ id:'j'+(i+1), name, status: i < 6 ? '已完成' : i === 6 ? '学习中' : i === 7 ? '需要复习' : '未开始' })),
        ideas: ideaNames.map((name, i) => ({ id:'i'+(i+1), name, category: i < 4 ? '测试 / 技术' : i < 6 ? 'AI / 工具' : '商业尝试', stage: i === 7 ? '进行中' : i < 2 ? '调研中' : '想法', priority: i === 7 || i === 0 ? '高' : i < 5 ? '中' : '低', cost: i === 6 ? 5000 : i === 7 ? 0 : 500, nextAction: i === 7 ? '完善第一版并持续记录' : '整理需求并验证可行性', note: '' })),
        todos: [
          { id:'t1', title:'记录今日体重与饮食', status:'今天必须完成', dueDate:dateOffset(0), note:'' },
          { id:'t2', title:'完成 Java 类和对象练习', status:'今天必须完成', dueDate:dateOffset(0), note:'至少写 2 个小例子' },
          { id:'t3', title:'检查摩托车胎压', status:'有空再做', dueDate:'', note:'' },
          { id:'t4', title:'整理个人作品集结构', status:'明天处理', dueDate:dateOffset(1), note:'' },
          { id:'t5', title:'初始化 Life OS 项目', status:'已完成', dueDate:dateOffset(-1), note:'' }
        ]
      };
    }
  };
})();
