/* DULEO Auth — login online com Supabase Auth + perfil + filiais. */
(()=>{
const URL='https://mmrxwrfydjizichpcagt.supabase.co',KEY='sb_publishable_b4sZCHa72u1TDIMXkiz8rQ_YkLLsbdb';
let client=null;
const load=()=>new Promise((resolve,reject)=>{if(window.supabase?.createClient)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
const msg=t=>{const x=document.querySelector('#mensagemLogin');if(x)x.textContent=t};
async function loadAccess(user){
  const [{data:profile,error:pe},{data:branches,error:be}]=await Promise.all([
    client.from('duleo_profiles').select('id,nome,tipo').eq('id',user.id).maybeSingle(),
    client.from('duleo_user_branches').select('filial_id').eq('user_id',user.id)
  ]);
  if(pe)throw pe;if(be)throw be;
  if(!profile){throw new Error('Esta conta ainda não possui um perfil DULEO. Cadastre o perfil no Supabase.');}
  const ids=(branches||[]).map(x=>x.filial_id);
  localStorage.setItem('duleo_auth_user',JSON.stringify({id:user.id,email:user.email,nome:profile.nome,tipo:profile.tipo,filiais:ids}));
  return {profile,ids};
}
async function start(){
  try{
    await load();
    client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    window.DULEOAuth=client;
    window.DULEOAuthAccess=loadAccess;
    const form=document.querySelector('#formLogin');
    const input=document.querySelector('#loginUsuario');
    if(form&&input)wire(form,input);
    const {data:{session}}=await client.auth.getSession();
    if(session){
      try{
        const access=await loadAccess(session.user);
        const current=JSON.parse(localStorage.getItem('duleo_s3')||'null');
        const allowed=access.ids;
        const filial=current?.filial&&allowed.includes(current.filial)?current.filial:(allowed[0]||'todas');
        localStorage.setItem('duleo_s3',JSON.stringify({uid:session.user.id,filial}));
      }catch(e){console.warn('DULEO perfil:',e.message)}
    }
    document.dispatchEvent(new CustomEvent('duleo-auth-ready'));
    client.auth.onAuthStateChange((event,s)=>{
      if(event==='SIGNED_OUT'){localStorage.removeItem('duleo_s3');localStorage.removeItem('duleo_auth_user');}
      document.dispatchEvent(new CustomEvent('duleo-auth-change',{detail:{event,session:s}}));
    });
  }catch(e){console.warn('DULEO Auth:',e.message);msg('Autenticação online indisponível.');}
}
function wire(form,input){
  const label=input.closest('label');
  if(label)label.firstChild.textContent='E-mail';
  input.type='email';input.placeholder='seu@email.com';
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=input.value.trim().toLowerCase(),pass=document.querySelector('#loginSenha')?.value||'';
    if(!email||!pass){msg('Informe e-mail e senha.');return}
    msg('Autenticando online...');
    const {data,error}=await client.auth.signInWithPassword({email,password:pass});
    if(error){msg('E-mail ou senha inválidos.');return}
    try{
      const access=await loadAccess(data.user);
      if(!access.ids.length){await client.auth.signOut();msg('Sua conta não possui nenhuma filial autorizada.');return}
      const select=document.querySelector('#loginFilial');
      const localF=(()=>{try{return JSON.parse(localStorage.getItem('duleo_f3'))||[]}catch{return[]}})();
      const allowed=access.ids;
      const options=allowed.map(id=>{const f=localF.find(x=>x.id===id);return `<option value="${String(id).replace(/"/g,'&quot;')}">${String(f?.nome||id).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}</option>`}).join('');
      if(select)select.innerHTML=options;
      const filial=select?.value||allowed[0];
      localStorage.setItem('duleo_s3',JSON.stringify({uid:data.user.id,filial}));
      location.reload();
    }catch(err){await client.auth.signOut();msg(err.message||'Conta sem permissão no DULEO.');}
  });
}
window.DULEOAuthSetup=async(email,password,nome)=>{await load();if(!client)client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const r=await client.auth.signUp({email,password,options:{data:{nome:nome||email.split('@')[0].toUpperCase()}}});if(r.error)throw r.error;return r.data};
window.DULEOAuthSignOut=async()=>{try{if(client)await client.auth.signOut()}finally{localStorage.removeItem('duleo_s3');localStorage.removeItem('duleo_auth_user');location.reload()}};
start();
})();
