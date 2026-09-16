/* DULEO + Supabase - sincronização online do armazenamento */
(()=>{
  const SUPABASE_URL='https://mmrxwrfydjizichpcagt.supabase.co';
  const SUPABASE_KEY='sb_publishable_b4sZCHa72u1TDIMXkiz8rQ_YkLLsbdb';
  const STORE_KEYS=['duleo_i3','duleo_f3','duleo_u3','duleo_m3','duleo_s3','duleo_a3','duleo_t3'];
  const TABLE='duleo_store';
  const headers={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'};
  const local={};
  STORE_KEYS.forEach(k=>local[k]=localStorage.getItem(k));
  const setLocal=(k,v)=>{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)};
  const getRemote=async()=>{const r=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=key,value`,{headers});if(!r.ok)throw new Error('Supabase '+r.status);return r.json()};
  const saveRemote=async(rows)=>{if(!rows.length)return;const r=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`,{method:'POST',headers:{...headers,'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(rows)});if(!r.ok)throw new Error('Supabase '+r.status)};
  window.DULEOSupabase={url:SUPABASE_URL,ready:false,async sync(){try{const rows=await getRemote();if(rows.length){rows.forEach(x=>setLocal(x.key,JSON.stringify(x.value)));if(!sessionStorage.getItem('duleo_remote_loaded')){sessionStorage.setItem('duleo_remote_loaded','1');location.reload();return}}else{await saveRemote(STORE_KEYS.filter(k=>local[k]!==null).map(k=>({key:k,value:JSON.parse(local[k])}))) }window.DULEOSupabase.ready=true;document.dispatchEvent(new CustomEvent('duleo:supabase-ready'))}catch(e){console.warn('DULEO Supabase:',e.message);window.DULEOSupabase.ready=false}}};
  const originalSet=localStorage.setItem.bind(localStorage);
  localStorage.setItem=(k,v)=>{originalSet(k,v);if(STORE_KEYS.includes(k)&&window.DULEOSupabase.ready){saveRemote([{key:k,value:JSON.parse(v)}]).catch(console.warn)}};
  window.addEventListener('beforeunload',()=>{});
  window.DULEOSupabase.sync();
})();
