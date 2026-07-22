(function(){
  const STORAGE_KEY='dwk-life-vault-v1',ITERATIONS=250000,AUTO_LOCK_MS=10*60*1000;
  let key=null,entries=null,lockTimer=null;
  const bytesToBase64=bytes=>{let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value)};
  const base64ToBytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  const touch=()=>{clearTimeout(lockTimer);if(key)lockTimer=setTimeout(()=>Vault.lock(),AUTO_LOCK_MS)};
  async function deriveKey(password,salt,iterations=ITERATIONS){
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function persist(){
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)),iv=crypto.getRandomValues(new Uint8Array(12));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(entries)));
    localStorage.setItem(STORAGE_KEY,JSON.stringify({...saved,cipher:{iv:bytesToBase64(iv),data:bytesToBase64(new Uint8Array(encrypted))}}));touch();
  }
  const Vault={
    STORAGE_KEY,
    isSupported:()=>Boolean(window.crypto?.subtle),
    status(){if(!this.isSupported())return'unsupported';if(key)return'unlocked';return localStorage.getItem(STORAGE_KEY)?'locked':'new'},
    async setup(password){
      if(!this.isSupported())throw new Error('当前环境不支持安全加密');
      if(password.length<8)throw new Error('主密码至少需要 8 位');
      const salt=crypto.getRandomValues(new Uint8Array(16));key=await deriveKey(password,salt);entries=[];
      localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,kdf:{salt:bytesToBase64(salt),iterations:ITERATIONS},cipher:null}));
      await persist();window.dispatchEvent(new CustomEvent('dwk:vault-change'));
    },
    async unlock(password){
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!saved)throw new Error('密码库尚未创建');
      try{const candidate=await deriveKey(password,base64ToBytes(saved.kdf.salt),saved.kdf.iterations);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(saved.cipher.iv)},candidate,base64ToBytes(saved.cipher.data));key=candidate;entries=JSON.parse(new TextDecoder().decode(plain));touch();window.dispatchEvent(new CustomEvent('dwk:vault-change'))}catch{key=null;entries=null;throw new Error('主密码不正确')}
    },
    lock(){key=null;entries=null;clearTimeout(lockTimer);lockTimer=null;window.dispatchEvent(new CustomEvent('dwk:vault-change'))},
    getEntries(){if(!key)throw new Error('密码库未解锁');touch();return entries.map(x=>({...x}))},
    get(id){if(!key)throw new Error('密码库未解锁');touch();const item=entries.find(x=>x.id===id);return item?{...item}:null},
    async upsert(item){if(!key)throw new Error('密码库未解锁');const existing=entries.find(x=>x.id===item.id);if(existing)Object.assign(existing,item,{updatedAt:new Date().toISOString()});else entries.push({...item,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});await persist()},
    async remove(id){if(!key)throw new Error('密码库未解锁');entries=entries.filter(x=>x.id!==id);await persist()},
    exportEncrypted(){const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):null},
    importEncrypted(value){if(value)localStorage.setItem(STORAGE_KEY,JSON.stringify(value));this.lock()}
  };
  window.DWK_VAULT=Vault;
})();
