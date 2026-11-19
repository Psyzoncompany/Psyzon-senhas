import {test} from 'node:test';
import assert from 'node:assert/strict';
import {derive,seal,openWithKey} from '../dist/crypto.js';
import {accountScope,checkCloudWrite,LOCAL_STORE,LOCAL_BIO} from '../dist/account.js';
import {remember,recall,forget} from '../dist/session.js';

// A structured-clone IDB adapter exercises the browser storage contract with real CryptoKeys.
const records=new Map();
globalThis.indexedDB={open(){const request={};queueMicrotask(()=>{request.result={createObjectStore(){},transaction(){const tx={objectStore(){return {put(value,id){return run(()=>records.set(id,structuredClone(value)))},get(id){return run(()=>structuredClone(records.get(id)))},delete(id){return run(()=>records.delete(id))}}}};function run(fn){const request={};queueMicrotask(()=>{request.result=fn();request.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});return request}return tx}};request.onupgradeneeded?.();request.onsuccess?.()});return request}};

test('chave lembrada reabre o cofre, continua não exportável e é isolada por conta',async()=>{
 const a=accountScope('account_A').store,b=accountScope('account_B').store;
 const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive('fixture-password-123',salt);
 const items=[{id:'sample',title:'Fixture',username:'example',password:'test-only',url:'',category:'Pessoal',notes:''}];
 const encrypted=await seal(items,key,salt);await remember(a,key,salt);
 const saved=await recall(a);assert.equal(saved.key.extractable,false);assert.equal(await recall(b),undefined);
 assert.deepEqual((await openWithKey(encrypted,saved.key)).items,items);
 await assert.rejects(crypto.subtle.exportKey('raw',saved.key));
 await remember(a,key,salt,'revocation-generation');assert.equal((await recall(a)).generation,'revocation-generation');
 const saving=remember(a,key,salt),locking=forget(a);await Promise.all([saving,locking]);assert.equal(await recall(a),undefined);
 assert.throws(()=>remember(a,{extractable:true},salt));
});
test('contas, biometria e cofre legado usam espaços separados',()=>{
 assert.deepEqual(accountScope(null),{store:LOCAL_STORE,bio:LOCAL_BIO});
 const a=accountScope('A'),b=accountScope('B');assert.notEqual(a.store,b.store);assert.notEqual(a.bio,b.bio);assert.notEqual(a.store,LOCAL_STORE);
 assert.throws(()=>accountScope('../other'));assert.throws(()=>accountScope('a/b'));
});
test('sincronização impede sobreposição de versões e excesso de dados',()=>{
 assert.equal(checkCloudWrite(null,null,'encrypted-new'),'encrypted-new');
 assert.equal(checkCloudWrite('old','old','new'),'new');
 assert.throws(()=>checkCloudWrite('remote-new','old','local-new'),/outro aparelho/);
 assert.throws(()=>checkCloudWrite('existing',null,'replacement'),/outro aparelho/);
 assert.throws(()=>checkCloudWrite(null,null,'x'.repeat(900001)),/limite/);
});

test('app reabre depois de recarregar, bloqueio manual revoga sessão e opção desligada bloqueia ao sair',async()=>{
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
 globalThis.fetch=async()=>({ok:true,json:async()=>({enabled:false,firebase:null})});
 globalThis.isSecureContext=true;
 const nativeInterval=globalThis.setInterval;globalThis.setInterval=()=>0;
 const nativeTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms)=>{const timer=nativeTimeout(fn,ms);timer.unref();return timer};
 function page(){
  const nodes=new Map(),events=new Map(),windowEvents=new Map();
  function element(tag='div'){return {tag,hidden:false,disabled:false,value:'',checked:true,textContent:'',children:[],listeners:new Map(),classList:{add(){},remove(){}},append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},addEventListener(name,action){this.listeners.set(name,action)},reset(){if(this.id==='gate-form'){nodes.get('master').value='';nodes.get('confirm-master').value='';nodes.get('remember-gate').checked=true}},close(){this.open=false},showModal(){this.open=true},elements:new Proxy({},{get:(target,key)=>target[key]??=(element())})}}
  const document={hidden:false,body:element(),getElementById(id){if(!nodes.has(id)){const node=element();node.id=id;nodes.set(id,node)}return nodes.get(id)},querySelectorAll(){return []},createElement:element,addEventListener:(name,action)=>events.set(name,action)};
  globalThis.document=document;globalThis.window={addEventListener:(name,action)=>windowEvents.set(name,action)};
  document.getElementById('workspace').hidden=true;
  return {document,nodes,events,windowEvents,$:id=>document.getElementById(id)};
 }
 async function boot(n){const p=page();await import(`../dist/app.js?test=${n}`);for(let i=0;i<30;i++)await new Promise(setImmediate);return p}
 async function passwordOpen(p){p.$('master').value='fixture-password-123';p.$('confirm-master').value='fixture-password-123';await p.$('gate-form').listeners.get('submit')({preventDefault(){}});assert.equal(p.$('workspace').hidden,false);assert.equal(p.$('master').value,'')}
 try{
  let p=await boot(1);assert.equal(p.$('gate-submit').disabled,false);await passwordOpen(p);
  assert.ok(await recall(LOCAL_STORE));assert.ok(!memory.get(LOCAL_STORE).includes('fixture-password-123'));
  p.document.hidden=true;p.events.get('visibilitychange')();assert.equal(p.$('workspace').hidden,false);
  p=await boot(2);assert.equal(p.$('workspace').hidden,false,'reload must auto-open');
  p.$('lock').onclick();await recall(LOCAL_STORE);assert.equal(p.$('workspace').hidden,true);assert.equal(await recall(LOCAL_STORE),undefined);
  p=await boot(3);assert.equal(p.$('workspace').hidden,true,'manual lock survives reload');await passwordOpen(p);
  p.$('remember-workspace').checked=false;await p.$('remember-workspace').onchange();assert.equal(await recall(LOCAL_STORE),undefined);
  p.document.hidden=true;p.events.get('visibilitychange')();assert.equal(p.$('workspace').hidden,true);assert.equal(p.$('remember-gate').checked,false);
  p=await boot(4);assert.equal(p.$('workspace').hidden,true,'opt out survives reload');
 }finally{globalThis.setInterval=nativeInterval;globalThis.setTimeout=nativeTimeout}
});
