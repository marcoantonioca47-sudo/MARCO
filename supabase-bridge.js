/* DULEO + Supabase - sincronização online robusta */
(()=>{
  const SUPABASE_URL='https://mmrxwrfydjizichpcagt.supabase.co';
  const SUPABASE_KEY='sb_publishable_b4sZCHa72u1TDIMXkiz8rQ_YkLLsbdb';
  const STORE_KEYS=['duleo_i3','duleo_f3','duleo_u3','duleo_m3','duleo_a3','duleo_t3'];
  const SESSION_KEY='duleo_s3';
  const TABLE='duleo_store';
  const headers={apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'};
  let ready=false;
  let applyingRemote=false;
  let syncRunning=false;
  let syncQueued=false;
  let writeChain=Promise.resolve();

  const json=v=>{try{return JSON.parse(v)}catch{return null}};
  const isStoreKey=k=>STORE_KEYS.includes(k);
  const setLocal=(k,v)=>{
    applyingRemote=true;
    if(v===null)localStorage.removeItem(k); else localStorage.setItem(k,v);
    applyingRemote=false;
  };
  const getRemote=async()=>{
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=key,value,updated_at`,{headers,cache:'no-store'});
    if(!r.ok)throw new Error(`Supabase ${r.status}`);
    return r.json();
  };
  const upsert=async(rows)=>{
    if(!rows.length)return;
    const r=await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`,{
      method:'POST',
      headers:{...headers,Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(rows)
    });
    if(!r.ok){
      const text=await r.text().catch(()=> '');
      throw new Error(`Supabase ${r.status}${text?' - '+text.slice(0,180):''}`);
    }
  };
  const localRows=()=>STORE_KEYS.map(key=>({key,value:json(localStorage.getItem(key))})).filter(x=>x.value!==null);

  async function syncNow(){
    if(syncRunning){syncQueued=true;return;}
    syncRunning=true;
    try{
      const remote=await getRemote();
      const remoteMap=new Map(remote.filter(x=>isStoreKey(x.key)).map(x=>[x.key,x]));
      const missing=[];

      // O banco é a fonte de verdade para chaves que já existem remotamente.
      // Chaves que ainda não existem no banco são enviadas sem apagar dados locais.
      for(const key of STORE_KEYS){
        const row=remoteMap.get(key);
        if(row){
          const next=JSON.stringify(row.value);
          if(localStorage.getItem(key)!==next)setLocal(key,next);
        }else{
          const value=json(localStorage.getItem(key));
          if(value!==null)missing.push({key,value});
        }
      }
      if(missing.length)await upsert(missing);

      ready=true;
      window.DULEOSupabase.ready=true;
      document.dispatchEvent(new CustomEvent('duleo:supabase-ready'));
    }catch(e){
      ready=false;
      window.DULEOSupabase.ready=false;
      console.warn('DULEO Supabase:',e.message);
      document.dispatchEvent(new CustomEvent('duleo:supabase-error',{detail:{message:e.message}}));
    }finally{
      syncRunning=false;
      if(syncQueued){syncQueued=false;syncNow();}
    }
  }

  // Cada alteração local é enviada em sequência para evitar condições de corrida.
  const originalSet=localStorage.setItem.bind(localStorage);
  localStorage.setItem=(key,value)=>{
    originalSet(key,value);
    if(isStoreKey(key)&&ready&&!applyingRemote){
      const parsed=json(value);
      if(parsed===null)return;
      writeChain=writeChain.then(()=>upsert([{key,value:parsed}])).catch(e=>{
        console.warn('DULEO Supabase:',e.message);
        document.dispatchEvent(new CustomEvent('duleo:supabase-error',{detail:{message:e.message}}));
      });
    }
  };

  // A sessão de login continua somente no aparelho; dados do aplicativo ficam online.
  window.DULEOSupabase={
    url:SUPABASE_URL,
    table:TABLE,
    ready:false,
    sync:syncNow,
    sessionKey:SESSION_KEY
  };

  window.addEventListener('online',()=>syncNow());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')syncNow()});
  syncNow();
})();
