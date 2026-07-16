import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const values=new Map();
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
globalThis.CustomEvent=class{constructor(type){this.type=type}};
globalThis.window={crypto:globalThis.crypto,dispatchEvent(){}};
vm.runInThisContext(await readFile(new URL('../js/vault.js',import.meta.url),'utf8'));

test('密码库加密保存并校验主密码',async()=>{
  const vault=window.DWK_VAULT;
  await vault.setup('TestMaster!2026');
  await vault.upsert({id:'pw1',site:'示例网站',username:'test-user@example.com',password:'ExamplePass!234'});
  const raw=localStorage.getItem(vault.STORAGE_KEY);
  assert.ok(raw.includes('cipher'));
  assert.equal(raw.includes('test-user@example.com'),false);
  assert.equal(raw.includes('ExamplePass!234'),false);
  vault.lock();
  await assert.rejects(vault.unlock('WrongPassword'),/主密码不正确/);
  await vault.unlock('TestMaster!2026');
  assert.equal(vault.getEntries()[0].password,'ExamplePass!234');
  vault.lock();
});
