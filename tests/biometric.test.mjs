import {test} from 'node:test';
import assert from 'node:assert/strict';
import {derive,seal} from '../dist/crypto.js';
import {createPasskey,wrapVaultKey,openWithPasskey,validRecord} from '../dist/biometric.js';
const origin='https://vault.example',hostname='vault.example';
Object.defineProperty(globalThis,'location',{value:{origin,hostname},configurable:true});
const secret=crypto.getRandomValues(new Uint8Array(32)),id=crypto.getRandomValues(new Uint8Array(32));
let uv=true,prf=true;
Object.defineProperty(globalThis,'navigator',{value:{credentials:{
 async create({publicKey:p}){assert.equal(p.authenticatorSelection.userVerification,'required');assert.equal(p.authenticatorSelection.authenticatorAttachment,'platform');return {type:'public-key',rawId:id,getClientExtensionResults:()=>({prf:{enabled:true}})}},
 async get({publicKey:p}){assert.equal(p.userVerification,'required');assert.equal(p.rpId,hostname);const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(hostname))));auth[32]=uv?5:1;return {rawId:id,response:{authenticatorData:auth,clientDataJSON:new TextEncoder().encode(JSON.stringify({type:'webauthn.get',origin,challenge:Buffer.from(p.challenge).toString('base64url')}))},getClientExtensionResults:()=>prf?{prf:{results:{first:secret}}}:{}}}
}},configurable:true});
test('chave biométrica abre cofre e rejeita adulteração, origem diferente e ausência de verificação/PRF',async()=>{const password='senha-mestra-de-teste',salt=crypto.getRandomValues(new Uint8Array(16));const vault=await seal([],await derive(password,salt),salt);const pending=await createPasskey(vault);const record=await wrapVaultKey(pending,password);assert.ok(validRecord(record,vault));assert.ok(!JSON.stringify(record).includes(password));assert.deepEqual((await openWithPasskey(record,vault)).items,[]);assert.equal((await openWithPasskey(record,vault)).key.extractable,false);assert.ok(!validRecord({...record,origin:'https://other.example'},vault));const altered=Buffer.from(record.wrappedKey,'base64');altered[0]^=1;await assert.rejects(openWithPasskey({...record,wrappedKey:altered.toString('base64')},vault));uv=false;await assert.rejects(openWithPasskey(record,vault));uv=true;prf=false;await assert.rejects(openWithPasskey(record,vault));prf=true});
