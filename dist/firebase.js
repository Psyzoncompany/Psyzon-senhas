import {validateEnvelope} from './crypto.js';
import {checkCloudWrite} from './account.js';
let auth,db,sdk,authSdk,loadPromise;
export async function connect(onAccount){
 const response=await fetch('./firebase-config.json',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível verificar o login Google.');
 const config=await response.json();if(!config.enabled||!config.firebase)return false;
 const {apiKey,authDomain,projectId,appId}=config.firebase;
 if(!apiKey||!authDomain||!projectId||!appId)throw Error('A configuração do Firebase está incompleta.');
 const base='https://www.gstatic.com/firebasejs/12.6.0/';
 loadPromise??=Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
 const [appSdk,a,f]=await loadPromise;authSdk=a;sdk=f;
 const app=appSdk.initializeApp(config.firebase);auth=a.getAuth(app);db=f.getFirestore(app);
 await a.setPersistence(auth,a.browserLocalPersistence);
 await new Promise((resolve,reject)=>{let first=true; a.onAuthStateChanged(auth,user=>{Promise.resolve(onAccount(user)).then(()=>{if(first){first=false;resolve()}}).catch(reject)},reject)});
 return true;
}
export async function login(){if(!auth)throw Error('O login Google aguarda a configuração do Firebase.');const provider=new authSdk.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});await authSdk.signInWithPopup(auth,provider)}
export async function logout(){if(auth)await authSdk.signOut(auth)}
function documentFor(uid){if(!auth?.currentUser||auth.currentUser.uid!==uid)throw Error('Entre novamente na sua conta Google.');return sdk.doc(db,'cofreUsers',uid,'vault','main')}
export async function pull(uid){const snapshot=await sdk.getDocFromServer(documentFor(uid));if(!snapshot.exists())return null;const raw=snapshot.data().encrypted;validateEnvelope(JSON.parse(raw));return raw}
export async function push(uid,expected,next){validateEnvelope(JSON.parse(next));const ref=documentFor(uid);await sdk.runTransaction(db,async transaction=>{if(auth.currentUser?.uid!==uid)throw Error('A conta mudou.');const snapshot=await transaction.get(ref);const actual=snapshot.exists()?snapshot.data().encrypted:null;checkCloudWrite(actual,expected,next);transaction.set(ref,{encrypted:next,updatedAt:sdk.serverTimestamp()})})}
export function loginError(error){const messages={'auth/popup-closed-by-user':'Login cancelado. Tente novamente.','auth/popup-blocked':'Permita o pop-up do Google neste site e tente novamente.','auth/unauthorized-domain':'Este endereço precisa ser autorizado no Firebase.','auth/operation-not-allowed':'O provedor Google precisa ser ativado no Firebase.','auth/network-request-failed':'Verifique sua conexão e tente novamente.','permission-denied':'A sincronização foi bloqueada pelas regras do Firebase.','unavailable':'Sem conexão com o Firebase. Tente novamente antes de editar.'};return messages[error?.code]||error?.message||'Não foi possível acessar sua conta.'}
