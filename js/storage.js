(function () {
  const { STORAGE_KEY, createDefaultData } = window.DWK_DATA;
  const clone = obj => JSON.parse(JSON.stringify(obj));
  const Store = {
    data: null,
    load() {
      try {
        const raw=localStorage.getItem(STORAGE_KEY);
        this.data=raw?JSON.parse(raw):createDefaultData();
        if(!raw)this.save();
      } catch(err) {
        console.warn('读取本地数据失败，已载入初始数据',err);
        this.data=createDefaultData(); this.save();
      }
      return this.data;
    },
    get() { return this.data || this.load(); },
    save() { localStorage.setItem(STORAGE_KEY,JSON.stringify(this.data)); window.dispatchEvent(new CustomEvent('dwk:data-saved')); },
    update(mutator) { mutator(this.data); this.save(); return this.data; },
    reset() { this.data=createDefaultData(); this.save(); return this.data; },
    exportJSON() {
      const payload={ app:'DWK Life OS', exportedAt:new Date().toISOString(), version:1, data:clone(this.get()) };
      return JSON.stringify(payload,null,2);
    },
    importJSON(text) {
      let parsed;
      try { parsed=JSON.parse(text); } catch { throw new Error('文件不是有效的 JSON 格式'); }
      const data=parsed.data || parsed;
      const required=['settings','accounts','transactions','health','motor','java','ideas','todos'];
      if(!data || typeof data!=='object' || required.some(k=>!(k in data))) throw new Error('这不是有效的 DWK Life OS 数据文件');
      if(!Array.isArray(data.accounts)||!Array.isArray(data.health)||!Array.isArray(data.todos)) throw new Error('数据结构不完整，无法导入');
      this.data=clone(data); this.save(); return this.data;
    }
  };
  window.DWK_STORE=Store;
})();
