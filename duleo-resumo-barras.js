/* DULEO — gráfico de barras do Resumo Operacional */
(function(){
  'use strict';
  const KEY='duleo_indicadores';
  const $=s=>document.querySelector(s);
  function num(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').trim().replace(/%/g,'').replace(/\./g,'').replace(',','.');
    const n=parseFloat(s); return Number.isFinite(n)?n:0;
  }
  function dados(){
    let arr=[]; try{arr=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){}
    const cats=[
      ['carregamentos','Carregamentos'],
      ['separacao','Separação'],
      ['conformidade','Conformidade'],
      ['conferencia','Conferência']
    ];
    return cats.map(([id,nome])=>{
      const itens=arr.filter(x=>String(x?.categoria||'').toLowerCase()===id);
      const vals=itens.map(x=>num(x?.resultado)).filter(v=>v>=0);
      const media=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0;
      return {id,nome,media,total:itens.length};
    });
  }
  function render(){
    const painel=$('.pro-executive'); if(!painel)return;
    let box=$('#proResumoBarras');
    if(!box){
      box=document.createElement('div');
      box.id='proResumoBarras';
      box.className='pro-resumo-barras';
      box.innerHTML='<div class="pro-resumo-barras-head"><div><span class="eyebrow">DESEMPENHO</span><h4>Indicadores por categoria</h4><p>Média dos resultados dos indicadores cadastrados.</p></div><span class="pro-chart-badge">% MÉDIA</span></div><div class="pro-bars" id="proBars"></div>';
      const health=panelHealth(painel);
      painel.insertBefore(box,health||null);
    }
    const bars=$('#proBars'); if(!bars)return;
    const ds=dados();
    bars.innerHTML=ds.map(d=>{
      const w=Math.max(0,Math.min(100,d.media));
      return '<div class="pro-bar-row"><div class="pro-bar-label"><strong>'+d.nome+'</strong><span>'+d.media+'%</span></div><div class="pro-bar-track"><i style="width:'+w+'%"></i></div><small>'+d.total+' indicador'+(d.total===1?'':'es')+'</small></div>';
    }).join('');
  }
  function panelHealth(painel){return painel.querySelector('.pro-health-graphic')||painel.querySelector('.pro-health')||null;}
  function start(){render();setInterval(render,3000);window.addEventListener('storage',render);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,700));else setTimeout(start,700);
})();
