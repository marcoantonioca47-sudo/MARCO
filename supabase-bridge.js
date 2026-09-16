/* DULEO + Supabase - sincronização online */
(()=>{
  const SUPABASE_URL='https://mmrxwrfydjizichpcagt.supabase.co';
  const SUPABASE_KEY='sb_publishable_b4sZCHa72u1TDIMXkiz8rQ_YkLLsbdb';
  const STORE_KEYS=['duleo_i3','duleo_f3','duleo_u3','duleo_m3','duleo_a3','duleo_t3'];
  const SESSION_KEY='duleo_s3';
  const TABLE='duleo_store';
  const headers={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'};
  const local={};
  STORE_KEYS.forEach(k=>local[k]=localStorage.getItem(k));
  const setLocal=(k,v)=>{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)};
  const getRemote=async()=>{
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=key,value`,{headers,cache:'no-store'});
    if(!r.ok)throw new Error('Supabase '+r.status);
    return r.json();
  };
  const saveRemote=async(rows)=>{
    if(!rows.length)return;
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`,{
      method:'POST',headers:{...headers,'Prefer':'resolution=merge-duplicates'},body:JSON.stringify(rows)
    });
    if(!r.ok)throw new Error('Supabase '+r.status);
  };
  const snapshot=()=>STORE_KEYS.map(k=>({key:k,value:JSON.parse(localStorage.getItem(k)||'null')})).filter(x=>x.value!==null);
  let applyingRemote=false;
  let ready=false;
  const pull=async()=>{
    const rows=await getRemote();
    if(!rows.length){
      await saveRemote(snapshot());
      return false;
    }
    let changed=false;
    rows.forEach(x=>{
      if(!STORE_KEYS.includes(x.key))return;
      const next=JSON.stringify(x.value);
      if(localStorage.getItem(x.key)!==next){
        applyingRemote=true;
        setLocal(x.key,next);
        applyingRemote=false;
        changed=true;
      }
    });
    return changed;
  };
  const sync=async()=>{
    try{
      const changed=await pull();
      ready=true;
      window.DULEOSupabase.ready=true;
      document.dispatchEvent(new CustomEvent('duleo:supabase-ready',{detail:{changed}}));
      if(changed && !sessionStorage.getItem('duleo_remote_loaded')){
        sessionStorage.setItem('duleo_remote_loaded','1');
        location.reload();
      }
    }catch(e){
      ready=false;
      window.DULEOSupabase.ready=false;
      console.warn('DULEO Supabase:',e.message);
      document.dispatchEvent(new CustomEvent('duleo:supabase-error',{detail:{message:e.message}}));
    }
  };
  window.DULEOSupabase={url:SUPABASE_URL,ready:false,sync,pull,sessionKey:SESSION_KEY};
  const originalSet=localStorage.setItem.bind(localStorage);
  localStorage.setItem=(k,v)=>{
    originalSet(k,v);
    if(STORE_KEYS.includes(k)&&ready&&!applyingRemote){
      saveRemote([{key:k,value:JSON.parse(v)}]).catch(e=>console.warn('DULEO Supabase:',e.message));
    }
  };
  window.addEventListener('online',sync);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync()});
  sync();
})();
