'use strict';
(()=>{
 const form=document.getElementById('premissas');
 const money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const pct=n=>n===null?'Não calculável':(100*n).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
 const row=(label,value)=>`<div class="row"><span>${label}</span><strong>${value}</strong></div>`;
 if(new URLSearchParams(location.search).get('embed')==='1')document.body.classList.add('embedded');
 function render(){
  const automatico=form.elements.modo.value==='auto';
  form.elements.parcela.readOnly=automatico;
  const prazo=Number(form.elements.prazo.value);
  if(Number.isInteger(prazo)&&prazo>=1&&prazo<=420){form.elements.mes.max=prazo;if(Number(form.elements.mes.value)>prazo)form.elements.mes.value=prazo;}

  const valid=form.checkValidity();document.getElementById('erro').hidden=valid;
  if(!valid){document.getElementById('resultado').textContent='Aguardando premissas válidas.';document.getElementById('cenarios').replaceChildren();document.getElementById('financiamentoResultado').replaceChildren();document.getElementById('bancosComparativo').replaceChildren();return;}
  const p=Object.fromEntries([...form.querySelectorAll('input')].map(el=>[el.name,Number(el.value)]));
  const parametros={principal:p.imovel*(1-p.entrada/100),prazo:p.prazo,taxa:p.taxa,tipoTaxa:form.elements.tipoTaxa.value,sistema:form.elements.sistema.value,mes:p.mes,seguros:p.seguros,tarifa:p.tarifa};
  const f=calcularFinanciamento(parametros);
  if(automatico){p.parcela=Math.round(f.selecionada*100)/100;form.elements.parcela.value=p.parcela.toFixed(2);}
  document.getElementById('parcelaInfo').textContent=automatico?'Parcela calculada automaticamente para o mês '+p.mes+'. Alterar imóvel, entrada, prazo ou juros recalcula o valor. Sem correção futura do saldo.':'Modo manual: valor digitado ou transcrito da foto. Não é recalculado ao alterar o imóvel.';
  document.getElementById('financiamentoResultado').innerHTML='<h3>Financiamento · '+parametros.sistema+' · '+p.prazo+' meses</h3>'+row('Juros mensais equivalentes',pct(f.taxaMensal))+row('Primeira parcela estimada',money(f.primeira))+row('Última parcela estimada',money(f.ultima))+row('Juros totais · sem indexação',money(f.juros))+row('Soma das parcelas · com custos informados',money(f.total))+'<p class="hint">'+(automatico?'A rentabilidade usa a parcela calculada do mês selecionado.':'A rentabilidade usa a parcela manual; o quadro de financiamento é uma comparação independente.')+' Seguros e tarifas '+(p.seguros+p.tarifa===0?'não incluídos (campos zerados)':'incluídos conforme valores informados, constantes em todos os meses')+'. Sem TR ou outro reajuste futuro. Não é CET.</p>'+(p.renda>0?row('Parcela usada / renda familiar',pct(p.parcela/p.renda))+'<p class="hint">Indicador de orçamento, sem aprovação ou análise de crédito.</p>':'');
  document.getElementById('bancosComparativo').innerHTML=BANCOS_REFERENCIA.map(b=>{const c=calcularFinanciamento({...parametros,taxa:b.taxa,tipoTaxa:'efetiva'});return '<tr><td>'+b.nome+'<br>'+b.taxa.toLocaleString('pt-BR')+'%</td><td>'+money(c.primeira)+'</td><td>'+money(c.ultima)+'</td></tr>';}).join('');
  const r=calcularRentabilidade(p);
  document.getElementById('resultado').innerHTML=
   row('Aporte: entrada + decoração + aquisição',money(r.aporte))+row('Saldo a financiar',money(r.financiado))+
   row('Imóvel + decoração (base patrimonial)',money(r.patrimonio))+row('Diárias ocupadas em 30 dias',(p.ocupacao*0.3).toLocaleString('pt-BR',{maximumFractionDigits:1}))+
   row('Receita bruta mensal',money(r.receita))+row('Administração Housi · 15%',money(r.administracao))+row('Total de despesas mensais',money(r.despesas))+
   row('Resultado antes do financiamento',money(r.operacional))+row(automatico?'Parcela calculada · mês '+p.mes:'Parcela manual',money(p.parcela))+
   `<div class="big"><span>Saldo mensal após a parcela</span><strong class="${r.saldo<0?'negative':'positive'}">${money(r.saldo)}</strong></div>`+
   `<p class="detail">${r.saldo<0?'Neste cenário, a receita não cobre todas as despesas e a parcela.':'Saldo estimado conforme as despesas e a parcela informadas.'}</p>`+
   row('Retorno mensal sobre aporte · antes da parcela',pct(r.retornoAporte))+row('Retorno mensal sobre imóvel + decoração · antes da parcela',pct(r.retornoPatrimonio))+
   row('Saldo mensal / aporte · após a parcela',pct(r.retornoCaixa))+row('Saldo anual · cenário mensal × 12',money(r.saldo*12))+
   row('Ocupação para cobrir despesas e parcela',r.equilibrio===null?'Não calculável':r.equilibrio.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'+(r.equilibrio>100?' · acima de 100%':''));
  const rates=[...new Set([40,50,60,70,80,90,100,p.ocupacao])].sort((a,b)=>a-b);
  document.getElementById('cenarios').innerHTML=rates.map(o=>{const c=calcularRentabilidade(p,o);return `<tr class="${o===p.ocupacao?'selected':''}"><td>${o.toLocaleString('pt-BR')}%</td><td>${money(c.receita)}</td><td class="${c.saldo<0?'negative':'positive'}">${money(c.saldo)}</td></tr>`;}).join('');
 }
 form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('input',event=>{if(event.target.name==='taxa'||event.target.name==='tipoTaxa')form.elements.banco.value='custom';render();});
 form.elements.banco.addEventListener('change',()=>{const banco=BANCOS_REFERENCIA.find(b=>b.id===form.elements.banco.value);if(banco){form.elements.taxa.value=banco.taxa;form.elements.tipoTaxa.value='efetiva';}render();});
 document.querySelectorAll('[data-parcela]').forEach(b=>b.addEventListener('click',()=>{form.elements.modo.value='manual';form.elements.parcela.value=b.dataset.parcela;render();}));
 document.getElementById('restaurar').addEventListener('click',()=>{form.reset();render();document.getElementById('status').textContent='Exemplo de locação restaurado; financiamento automático com referência Santander.';});
 document.getElementById('imprimir').addEventListener('click',()=>{if(form.reportValidity())window.print();});
 document.getElementById('compartilhar').addEventListener('click',async()=>{const url=location.origin+'/simulador/';try{await navigator.clipboard.writeText(url);document.getElementById('status').textContent='Link copiado. Ele abre o exemplo inicial, sem os valores alterados nesta tela.';}catch{document.getElementById('status').textContent='Copie este link: '+url;}});
 // No client data or simulation values are transmitted or persisted.
 render();
})();
if(window.parent!==window){new ResizeObserver(()=>window.parent.postMessage({type:'vitacon-simulator-height',height:document.documentElement.scrollHeight},location.origin)).observe(document.body);}
