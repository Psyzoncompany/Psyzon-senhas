export const ITERATIONS=600000;
const enc=new TextEncoder(),dec=new TextDecoder();
function b64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function bytes(s){if(typeof s!=='string'||s.length>14000000)throw Error('Backup inválido.');return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
export function validateEnvelope(v){if(!v||v.format!=='cofre-local'||v.version!==1||v.iterations!==ITERATIONS||bytes(v.salt).length!==16||bytes(v.iv).length!==12||bytes(v.data).length<16)throw Error('Backup inválido ou incompatível.');return v}
export async function derive(password,salt,extractable=false){const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},extractable,['encrypt','decrypt'])}
export function validateEntries(items){if(!Array.isArray(items)||items.length>10000)throw Error('Conteúdo inválido.');const ids=new Set();for(const e of items){if(!e||typeof e.id!=='string'||ids.has(e.id))throw Error('Registro inválido.');ids.add(e.id);for(const k of ['title','username','password','url','category','notes'])if(typeof e[k]!=='string'||e[k].length>5000)throw Error('Registro inválido.');}return items}
export async function seal(items,key,salt){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(items)));return {format:'cofre-local',version:1,iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(data))}}
export async function open(v,password){validateEnvelope(v);const salt=bytes(v.salt),key=await derive(password,salt);const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(v.iv)},key,bytes(v.data));return {items:validateEntries(JSON.parse(dec.decode(clear))),key,salt}}

export async function openWithKey(v,key){validateEnvelope(v);const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(v.iv)},key,bytes(v.data));try{return {items:validateEntries(JSON.parse(dec.decode(clear))),key,salt:bytes(v.salt)}}finally{new Uint8Array(clear).fill(0)}}
