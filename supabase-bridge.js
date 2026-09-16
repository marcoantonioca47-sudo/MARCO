/* DULEO — ponte Supabase Auth + dados isolados por filial */
(()=>{
const URL='https://mmrxwrfydjizichpcagt.supabase.co',KEY='sb_publishable_b4sZCHa72u1TDIMXkiz8rQ_YkLLsbdb';
const DATA=['duleo_i3','duleo_m3','duleo_a3','duleo_t3'];
const localJson=k=>{try{return JSON.parse(localStorage.getItem(k))||[]}catch{return[]}};
let ready=false,booting=false,writing=false,queue=Promise.resolve();
const branchIds=()=>{try{return JSON.parse(localStorage.getItem('duleo_auth_user')||'{}').filiais||[]}catch{return[]}};
const client=()=>window.DULEOAuth;
async function waitAuth(){if(client())return true;return new Promise(resolve=>{const t=setInterval(()=>{if(client()){clearInterval(t);resolve(true)}},50);setTimeout(()=>{clearInterval(t);resolve(!!client())},10000)})}
async function fetchRemote(){
 const c=client();if(!c)throw Error('Supabase Auth não inicializado');
 const {data:sessionData}=await c.auth.getSession();const uid=sessionData?.session?.user?.id;if(!uid)throw Error('Sessão não autenticada');
 const {data:bs,error:be}=await c.from('duleo_branches').select('id,nome,ativo').eq('ativo',true).order('nome');if(be)throw be;
 const {data:membership,error:me}=await c.from('duleo_user_branches').select('filial_id').eq('user_id',uid);if(me)throw me;
 const profile=JSON.parse(localStorage.getItem('duleo_auth_user')||'{}');
 const ids=profile.tipo==='autor'?(bs||[]).map(x=>x.id):(membership||[]).map(x=>x.filial_id);
 const allowed=(bs||[]).filter(x=>ids.includes(x.id));
 localStorage.setItem('duleo_f3',JSON.stringify(allowed.map(x=>({id:x.id,nome:x.nome}))));
 localStorage.setItem('duleo_u3',JSON.stringify([{id:uid,nome:profile.nome||sessionData.session.user.email,tipo:profile.tipo||'usuario',filiais:ids}]));
 const {data:rows,error}=await c.from('duleo_data').select('filial_id,data_key,value,updated_at');if(error)throw error;
 const merged={i:[],m:[],a:[],t:[]};
 (rows||[]).forEach(r=>{if(!ids.includes(r.filial_id))return;const v=Array.isArray(r.value)?r.value:[];if(r.data_key==='i'||r.data_key==='m'||r.data_key==='a'||r.data_key==='t')merged[r.data_key].push(...v)});
 for(const [k,arr] of Object.entries(merged)){if(arr.length)localStorage.setItem({i:'duleo_i3',m:'duleo_m3',a:'duleo_a3',t:'duleo_t3'}[k],JSON.stringify(arr))}
 return {ids,rows:rows||[]};
}
async function seedIfEmpty(ids){
 const c=client();if(!c||!ids.length)return;
 const {data:rows}=await c.from('duleo_data').select('filial_id,data_key').in('filial_id',ids);
 if(rows?.length)return;
 const map={duleo_i3:'i',duleo_m3:'m',duleo_a3:'a',duleo_t3:'t'};const all={};
 for(const k of DATA)all[k]=localJson(k);
 const payload=[];
 ids.forEach(fid=>DATA.forEach(k=>{const vals=all[k].filter(x=>!x.filialId||x.filialId===fid);if(vals.length)payload.push({filial_id:fid,data_key:map[k],value:vals,updated_at:new Date().toISOString()})}));
 if(payload.length){const {error}=await c.from('duleo_data').upsert(payload,{onConflict:'filial_id,data_key'});if(error)console.warn('DULEO seed:',error.message)}
}
async function sync(){if(booting)return;booting=true;try{await waitAuth();const s=await client().auth.getSession();if(!s.data.session){ready=false;window.DULEOSupabase.ready=false;return}const info=await fetchRemote();await seedIfEmpty(info.ids);ready=true;window.DULEOSupabase.ready=true;document.dispatchEvent(new CustomEvent('duleo:supabase-ready'))}catch(e){ready=false;window.DULEOSupabase.ready=false;console.warn('DULEO Supabase:',e.message);document.dispatchEvent(new CustomEvent('duleo:supabase-error',{detail:{message:e.message}}))}finally{booting=false}}
async function persist(k,v){const c=client();if(!c||!ready||writing)return;const map={duleo_i3:'i',duleo_m3:'m',duleo_a3:'a',duleo_t3:'t'},dk=map[k];if(!dk)return;const ids=branchIds();const arr=(()=>{try{return JSON.parse(v)||[]}catch{return[]}})();const rows=ids.map(fid=>({filial_id:fid,data_key:dk,value:arr.filter(x=>!x.filialId||x.filialId===fid),updated_at:new Date().toISOString()}));if(!rows.length)return;writing=true;try{queue=queue.then(()=>c.from('duleo_data').upsert(rows,{onConflict:'filial_id,data_key'})).then(r=>{if(r.error)console.warn('DULEO Supabase:',r.error.message)}).catch(e=>console.warn('DULEO Supabase:',e.message))}finally{writing=false}}
const originalSet=localStorage.setItem.bind(localStorage);localStorage.setItem=(k,v)=>{originalSet(k,v);if(DATA.includes(k)&&ready)persist(k,v)};
window.DULEOSupabase={url:URL,table:'duleo_data',ready:false,sync};
document.addEventListener('duleo-auth-ready',sync);document.addEventListener('duleo-auth-change',e=>{if(e.detail?.event==='SIGNED_IN'||e.detail?.event==='TOKEN_REFRESHED')sync();if(e.detail?.event==='SIGNED_OUT'){ready=false;window.DULEOSupabase.ready=false}});window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>document.visibilityState==='visible'&&sync());
function asset(type,url,attr){if(document.querySelector(`[data-${attr}]`))return;const x=document.createElement(type);x.setAttribute('data-'+attr,'1');if(type==='script')x.src=url;else{x.rel='stylesheet';x.href=url}document.head.appendChild(x)}
asset('link','duleo-enhancements.css?v=2.1.0','duleo-enhancements');asset('script','duleo-enhancements.js?v=2.1.0','duleo-enhancements-script');asset('script','duleo-auth.js?v=1.1.0','duleo-auth-script');
})();
