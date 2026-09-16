/* DULEO Auth — login por nome de usuário criado dentro do próprio site. */
(()=>{
const K={u:'duleo_u3',s:'duleo_s3'};
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
// O login principal é feito pela lista de usuários administrada dentro do DULEO.
// Não interceptamos o formulário: o script principal valida usuário, senha e filial.
window.DULEOAuth=null;
window.DULEOAuthAccess=null;
window.DULEOAuthSetup=async(nome,senha,tipo='usuario',filiais=[])=>{
 const U=get(K.u,[]), n=String(nome||'').trim();
 if(!n||!senha)throw new Error('Informe usuário e senha.');
 if(U.some(u=>String(u.nome).toLowerCase()===n.toLowerCase()))throw new Error('Nome de usuário já existe.');
 const u={id:Date.now().toString(36)+Math.random().toString(36).slice(2),nome:n,senha:String(senha),tipo,filiais:Array.isArray(filiais)?filiais:[]};
 U.push(u);localStorage.setItem(K.u,JSON.stringify(U));return u;
};
window.DULEOAuthSignOut=async()=>{localStorage.removeItem(K.s);location.reload()};
document.dispatchEvent(new CustomEvent('duleo-auth-ready'));
})();
