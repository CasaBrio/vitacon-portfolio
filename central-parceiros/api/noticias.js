'use strict';
// Notícias do mercado (Google Notícias, RSS) e indicadores do Banco Central, em um único JSON.
// Cache na borda da Vercel por 30 minutos; se uma fonte falhar, as outras continuam.

const TEMAS = {
  imobiliario: {nome: 'Mercado imobiliário', q: '"mercado imobiliário" OR "lançamentos imobiliários" OR incorporadoras when:7d'},
  credito: {nome: 'Crédito e financiamento', q: '"financiamento imobiliário" OR "crédito imobiliário" OR "Minha Casa Minha Vida" when:7d'},
  economia: {nome: 'Juros e economia', q: 'Selic OR Copom OR IPCA OR "taxa de juros" when:3d'},
  investimento: {nome: 'Investir em imóveis', q: '"investimento em imóveis" OR "aluguel de curta temporada" OR "renda com aluguel" OR studios when:14d'},
  vitacon: {nome: 'Vitacon e Housi', q: 'Vitacon OR Housi when:60d'}
};
const SERIES = {selic: 432, ipca12m: 13522};
// Fontes e assuntos de fora do Brasil que o Google às vezes mistura nos resultados em português.
const FORA = /jornal do brasil em portugal|vietnam|\.vn\b|hanói|portugal|lisboa|porto\b|angola|moçambique|sapo\.pt|\bVND\b/i;

const decode = s => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').trim();
const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1]) : ''; };

async function tema(key) {
  const url = 'https://news.google.com/rss/search?hl=pt-BR&gl=BR&ceid=BR:pt-419&q=' + encodeURIComponent(TEMAS[key].q + ' -Portugal -Lisboa -Angola -Moçambique -Vietnã -Hanói');
  const r = await fetch(url, {headers: {'user-agent': 'Mozilla/5.0 (compatible; VitaconParceiros/1.0)'}, signal: AbortSignal.timeout(6000)});
  if (!r.ok) throw new Error('rss ' + r.status);
  const xml = await r.text();
  const seen = new Set();
  return xml.split('<item>').slice(1).map(it => {
    const fonte = tag(it, 'source');
    let titulo = tag(it, 'title');
    while (fonte && titulo.endsWith(' - ' + fonte)) titulo = titulo.slice(0, -(fonte.length + 3)).trim();
    return {titulo, link: tag(it, 'link'), fonte, data: new Date(tag(it, 'pubDate')).toISOString()};
  }).filter(n => n.titulo.length >= 30 && n.titulo !== n.fonte && !FORA.test(n.titulo + ' ' + n.fonte) && /^https:\/\//.test(n.link) && !seen.has(n.titulo) && seen.add(n.titulo))
    .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 12);
}

async function serie(cod) {
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados/ultimos/1?formato=json`, {signal: AbortSignal.timeout(6000)});
  if (!r.ok) throw new Error('bcb ' + r.status);
  const [d] = await r.json();
  return {valor: Number(String(d.valor).replace(',', '.')), data: d.data};
}

module.exports = async (req, res) => {
  const keys = Object.keys(TEMAS);
  const [noticias, indicadores] = await Promise.all([
    Promise.allSettled(keys.map(tema)),
    Promise.allSettled(Object.values(SERIES).map(serie))
  ]);
  const out = {atualizado: new Date().toISOString(), temas: {}, indicadores: {}};
  keys.forEach((k, i) => { out.temas[k] = {nome: TEMAS[k].nome, itens: noticias[i].status === 'fulfilled' ? noticias[i].value : []}; });
  Object.keys(SERIES).forEach((k, i) => { if (indicadores[i].status === 'fulfilled') out.indicadores[k] = indicadores[i].value; });
  const ok = noticias.some(n => n.status === 'fulfilled');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', ok ? 'public, s-maxage=1800, stale-while-revalidate=86400' : 'public, s-maxage=60');
  res.status(ok ? 200 : 502).send(JSON.stringify(out));
};
