'use strict';
const BANCOS_REFERENCIA = [
 {id:'santander',nome:'Santander',taxa:11.69},
 {id:'itau',nome:'Itaú',taxa:13.85},
 {id:'bb',nome:'Banco do Brasil',taxa:13.99}
];
function calcularFinanciamento({principal,prazo,taxa,tipoTaxa='efetiva',sistema='SAC',mes=1,seguros=0,tarifa=0}) {
 if (![principal,taxa,seguros,tarifa].every(v=>Number.isFinite(v)&&v>=0)||!Number.isInteger(prazo)||prazo<1||prazo>420||!Number.isInteger(mes)||mes<1||mes>prazo||!['SAC','PRICE'].includes(sistema)||!['efetiva','nominal'].includes(tipoTaxa)) throw new Error('Premissas inválidas');
 const i=tipoTaxa==='nominal'?taxa/1200:Math.expm1(Math.log1p(taxa/100)/12);
 const rows=[];let saldo=principal;
 const fixa=i===0?principal/prazo:principal*i/(-Math.expm1(-prazo*Math.log1p(i)));
 for(let k=1;k<=prazo;k++){
  const juros=saldo*i;
  const amortizacao=k===prazo?saldo:Math.min(saldo,sistema==='SAC'?principal/prazo:Math.max(0,fixa-juros));
  const extras=principal>0?seguros+tarifa:0;
  rows.push({mes:k,saldoInicial:saldo,juros,amortizacao,parcela:amortizacao+juros+extras,saldoFinal:Math.max(0,saldo-amortizacao)});
  saldo=Math.max(0,saldo-amortizacao);
 }
 return {taxaMensal:i,primeira:rows[0].parcela,ultima:rows[prazo-1].parcela,selecionada:rows[mes-1].parcela,total:rows.reduce((s,r)=>s+r.parcela,0),juros:rows.reduce((s,r)=>s+r.juros,0),rows};
}
if(typeof module!=='undefined')module.exports={calcularFinanciamento,BANCOS_REFERENCIA};
