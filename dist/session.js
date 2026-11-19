// CryptoKey is structured-cloned by IndexedDB, never exported or serialized.
const DATABASE='cofre-local-device',TABLE='sessions';
let database,queue=Promise.resolve();
function db(){return database??=new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore(TABLE);request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=null;reject(request.error)}})}
function serial(action){const task=queue.catch(()=>{}).then(action);queue=task;return task}
async function transaction(mode,action){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(TABLE,mode),request=action(tx.objectStore(TABLE));let result;request.onsuccess=()=>{result=request.result};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Armazenamento indisponível.'))})}
export function remember(scope,key,salt,generation=null){if(key.extractable)throw Error('A chave deve permanecer não exportável.');return serial(()=>transaction('readwrite',store=>store.put({key,salt:Array.from(salt),generation},scope)))}
export function recall(scope){return serial(()=>transaction('readonly',store=>store.get(scope)))}
export function forget(scope){return serial(()=>transaction('readwrite',store=>store.delete(scope)))}
