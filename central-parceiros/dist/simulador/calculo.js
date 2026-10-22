'use strict';
function calcularRentabilidade(p, ocupacao = p.ocupacao) {
  const aporte = p.imovel * p.entrada / 100 + p.decoracao + p.aquisicao;
  const patrimonio = p.imovel + p.decoracao;
  const receita = p.diaria * 30 * ocupacao / 100;
  const administracao = receita * 0.15;
  const despesas = p.condominio + p.iptu + p.internet + p.energia + p.outros + administracao;
  const operacional = receita - despesas;
  const saldo = operacional - p.parcela;
  return { aporte, patrimonio, financiado: p.imovel * (1-p.entrada/100), receita, administracao, despesas, operacional, saldo,
    retornoAporte: aporte > 0 ? operacional / aporte : null,
    retornoPatrimonio: patrimonio > 0 ? operacional / patrimonio : null,
    retornoCaixa: aporte > 0 ? saldo / aporte : null,
    equilibrio: p.diaria > 0 ? (despesas-administracao+p.parcela)/(p.diaria*30*0.85)*100 : null };
}
if (typeof module !== 'undefined') module.exports = { calcularRentabilidade };
