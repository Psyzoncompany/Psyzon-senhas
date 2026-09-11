import {derive,openWithKey,validateEnvelope} from './crypto.js';
export const BIO_STORE='cofre-local:biometric:v1';
const encoder=new TextEncoder();
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const to64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const from64=s=>{if(typeof s!=='string'||s.length>4096)throw Error('Configuração biométrica inválida.');return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
export async function available(){try{return !!(isSecureContext&&globalThis.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())}catch{return false}}
export function validRecord(record,vault){try{return record?.version===1&&record.origin===location.origin&&record.vaultSalt===vault.salt&&from64(record.credentialId).length>0&&from64(record.prfInput).length===32&&from64(record.kdfSalt).length===32&&from64(record.iv).length===12&&from64(record.wrappedKey).length===48}catch{return false}}
export async function createPasskey(vault,signal){
 validateEnvelope(vault);
 const credential=await navigator.credentials.create({signal,publicKey:{challenge:random(32),rp:{name:'Cofre Local',id:location.hostname},user:{id:random(32),name:'cofre-'+new Date().toISOString().slice(0,10),displayName:'Meu Cofre Local'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'required',userVerification:'required'},attestation:'none',timeout:60000,extensions:{prf:{}}}});
 if(!credential||credential.type!=='public-key'||!credential.getClientExtensionResults().prf?.enabled)throw Error('Esta chave de acesso não oferece a criptografia necessária. Use a senha mestra.');
 return {version:1,origin:location.origin,vaultSalt:vault.salt,credentialId:to64(credential.rawId),prfInput:to64(random(32)),kdfSalt:to64(random(32))};
}
async function secretKey(record,signal){
 const challenge=random(32);
 const credential=await navigator.credentials.get({signal,publicKey:{challenge,rpId:location.hostname,allowCredentials:[{type:'public-key',id:from64(record.credentialId),transports:['internal']}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:from64(record.prfInput)}}}}});
 if(!credential||to64(credential.rawId)!==record.credentialId)throw Error('Chave de acesso diferente da cadastrada.');
 const auth=new Uint8Array(credential.response.authenticatorData);
 const client=JSON.parse(new TextDecoder().decode(credential.response.clientDataJSON));
 const expected=to64(challenge).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 if(auth.length<37||(auth[32]&5)!==5||client.type!=='webauthn.get'||client.challenge!==expected||client.origin!==location.origin||client.crossOrigin)throw Error('A verificação do aparelho não foi confirmada.');
 const rpHash=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(location.hostname)));
 if(!rpHash.every((b,i)=>b===auth[i]))throw Error('Endereço do cofre inválido.');
 const prf=credential.getClientExtensionResults().prf?.results?.first;
 if(!prf||prf.byteLength!==32)throw Error('O navegador não liberou a chave de criptografia. Use a senha mestra.');
 const material=await crypto.subtle.importKey('raw',prf,'HKDF',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:from64(record.kdfSalt),info:encoder.encode('cofre-local/passkey-wrap/v1')},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
const aad=r=>encoder.encode(JSON.stringify([r.version,r.origin,r.vaultSalt,r.credentialId]));
export async function wrapVaultKey(record,password,signal){
 const wrappingKey=await secretKey(record,signal);
 const vaultKey=await derive(password,from64(record.vaultSalt),true);
 const raw=new Uint8Array(await crypto.subtle.exportKey('raw',vaultKey));
 const iv=random(12);
 try{const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(record)},wrappingKey,raw);return {...record,iv:to64(iv),wrappedKey:to64(encrypted)}}finally{raw.fill(0)}
}
export async function openWithPasskey(record,vault,signal){
 if(!validRecord(record,vault))throw Error('Ative o Face ID novamente usando a senha mestra.');
 const wrappingKey=await secretKey(record,signal);
 const raw=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(record.iv),additionalData:aad(record)},wrappingKey,from64(record.wrappedKey)));
 try{const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);return await openWithKey(vault,key)}finally{raw.fill(0)}
}
export function errorMessage(err){if(err?.name==='NotAllowedError'||err?.name==='AbortError')return 'Verificação cancelada ou indisponível. Tente novamente ou use a senha mestra.';if(err?.name==='SecurityError')return 'Abra o endereço definitivo do cofre diretamente no Safari e tente novamente.';if(err?.name==='OperationError')return 'Não foi possível abrir este cofre com a chave de acesso. Use a senha mestra.';return err?.message||'Não foi possível usar a biometria.'}
