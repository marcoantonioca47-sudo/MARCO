/* DULEO Auth — login por nome de usuário + senha com Supabase Auth. */
(()=>{
const URL='https://mmrxwrfydjizichpcagt.supabase.co',KEY='sb_publishable_b4sZCHa72u1TDIMXkiz8rQ_YkLLsbdb';let client=null;
const load=()=>new Promise((resolve,reject)=>{if(window.supabase?.createClient)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
const msg=t=>{const x=document.querySelector('#mensagemLogin');if(x)x.textContent=t};
async function loadAccess(user){
 const [{data:profile,error:pe},{data:branches,error:be}]=await Promise.all([
  client.from('duleo_profiles').select('id,nome,usuario,tipo').eq('id',user.id).maybeSingle(),
  client.from('duleo_user_branches').select('filial_id').eq('user_id',user.id)
 ]);
 if(pe)throw pe;if(be)throw be;if(!profile)throw new Error('Esta conta ainda não possui um perfil DULEO.');
 const ids=(branches||[]).map(x=>x.filial_id);
 localStorage.setItem('duleo_auth_user',JSON.stringify({id:user.id,email:user.email,nome:profile.nome,usuario:profile.usuario||profile.nome,tipo:profile.tipo,filiais:ids}));
 return {profile,ids};
}
async function start(){try{
 await load();client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.DULEOAuth=client;window.DULEOAuthAccess=loadAccess;
 const form=document.querySelector('#formLogin'),input=document.querySelector('#loginUsuario');if(form&&input)wire(form,input);
 const {data:{session}}=await client.auth.getSession();
 if(session){try{const access=await loadAccess(session.user);const current=JSON.parse(localStorage.getItem('duleo_s3')||'null');const filial=current?.filial&&(access.profile.tipo==='autor'||access.ids.includes(current.filial))?current.filial:(access.ids[0]||'todas');localStorage.setItem('duleo_s3',JSON.stringify({uid:session.user.id,filial}));}catch(e){console.warn('DULEO perfil:',e.message)}}
 document.dispatchEvent(new CustomEvent('duleo-auth-ready'));
 client.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'){localStorage.removeItem('duleo_s3');localStorage.removeItem('duleo_auth_user')}document.dispatchEvent(new CustomEvent('duleo-auth-change',{detail:{event,session:s}}))});
 }catch(e){console.warn('DULEO Auth:',e.message);msg('Autenticação online indisponível.')}}
async function resolveUsername(usuario){
 const {data,error}=await client.rpc('duleo_login_email',{p_usuario:usuario});
 if(error)throw new Error('O login por usuário ainda não foi ativado no Supabase. Execute a atualização SQL do DULEO.');
 const email=Array.isArray(data)?data[0]?.email:data?.email;
 if(!email)throw new Error('Usuário não encontrado.');
 return email;
}
function wire(form,input){
 const label=input.closest('label');if(label)label.firstChild.textContent='Nome de usuário';input.type='text';input.placeholder='Digite seu usuário';
 form.addEventListener('submit',async e=>{e.preventDefault();
  const usuario=input.value.trim(),pass=document.querySelector('#loginSenha')?.value||'';if(!usuario||!pass){msg('Informe usuário e senha.');return}msg('Autenticando...');
  try{
   const email=await resolveUsername(usuario);
   const {data,error}=await client.auth.signInWithPassword({email,password:pass});if(error)throw new Error('Usuário ou senha inválidos.');
   const access=await loadAccess(data.user);if(!access.ids.length&&access.profile.tipo!=='autor'){await client.auth.signOut();msg('Seu usuário não possui nenhuma filial autorizada.');return}
   const select=document.querySelector('#loginFilial'),localF=(()=>{try{return JSON.parse(localStorage.getItem('duleo_f3'))||[]}catch{return[]}})();
   let allowed=access.ids;
   if(access.profile.tipo==='autor'){
    const {data:bs,error:be}=await client.from('duleo_branches').select('id,nome,ativo').eq('ativo',true).order('nome');if(be)throw be;
    allowed=(bs||[]).map(x=>x.id);localStorage.setItem('duleo_f3',JSON.stringify((bs||[]).map(x=>({id:x.id,nome:x.nome}))));
   }
   if(select){select.innerHTML=allowed.map(id=>{const f=localF.find(x=>x.id===id);return `<option value="${String(id).replace(/"/g,'&quot;')}">${String(f?.nome||id).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}</option>`}).join('')}
   const filial=select?.value||allowed[0]||'todas';localStorage.setItem('duleo_s3',JSON.stringify({uid:data.user.id,filial}));location.reload();
  }catch(err){msg(err.message||'Não foi possível entrar.')}});
}
window.DULEOAuthSetup=async(email,password,nome,usuario)=>{await load();if(!client)client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const r=await client.auth.signUp({email,password,options:{data:{nome:nome||usuario||email.split('@')[0].toUpperCase(),usuario:usuario||nome||email.split('@')[0].toUpperCase()}}});if(r.error)throw r.error;return r.data};
window.DULEOAuthSignOut=async()=>{try{if(client)await client.auth.signOut()}finally{localStorage.removeItem('duleo_s3');localStorage.removeItem('duleo_auth_user');location.reload()}};
start();
})();
