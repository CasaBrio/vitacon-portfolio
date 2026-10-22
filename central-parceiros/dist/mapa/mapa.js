'use strict';
(()=>{
 const $=id=>document.getElementById(id), data=window.MAPA_PROJETOS;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(text,url)=>{const a=el('a',text,'button');a.href=url;a.target='_blank';a.rel='noopener';return a;};
 const coords=p=>{if(p.coordinateStatus==='checked'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng))return[p.lat,p.lng];if(!$('aproximados').checked)return null;const c=window.MAPA_BAIRROS[p.bairro];if(!c)return null;let h=0;for(const x of p.nome)h=(h*31+x.charCodeAt(0))>>>0;const a=(h%360)*Math.PI/180,d=.0015+(h%100)/100*.0025;return[c[0]+Math.cos(a)*d,c[1]+Math.sin(a)*d];};
 for(const [id,key] of [['regiao','regiao'],['bairro','bairro'],['fase','fase']])for(const v of [...new Set(data.map(p=>p[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))){const o=el('option',v);o.value=v;$(id).append(o);}
 let map=null,layer=null;const markers=new Map();
 if(window.L){map=L.map('mapa').setView([-23.567,-46.665],12);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19}).addTo(map);layer=L.layerGroup().addTo(map);}else $('mapa').append(el('p','Não foi possível carregar o mapa. Consulte as informações na lista.'));
 function details(p,focus=false){
  const box=$('detalhes');box.replaceChildren(el('h2',p.nome));const info=el('dl',null,'info'),official=window.VITACON_OFICIAL?.enrich?.[p.slug]||{};
  const fields=[['Bairro',p.bairro],['Região',p.regiao],['Fase',p.fase],['Endereço',p.endereco||'Endereço a confirmar'],['Metragens',official.areaProjeto||p.metragem||'A confirmar'],['Tipologias',official.tipos||p.unidades||'A confirmar'],['Entrega',window.PRAZOS_ENTREGA?.[p.slug]||'A confirmar'],['Localização no mapa',p.coordinateStatus==='checked'?'Coordenada revisada em 22/10/2026':'Coordenada pendente de confirmação']];
  if(p.valor)fields.push(['Valor de referência',Number(p.valor).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})]);
  for(const [label,value] of fields){const group=el('div');group.append(el('dt',label),el('dd',value));info.append(group);}box.append(info);box.append(el('p',p.locationNote,'note'));
  if(p.diferencial)box.append(el('p',p.diferencial));const amenities=[...new Set([...(p.amenidades||[]),...(official.destaques||[])])];if(amenities.length){box.append(el('h3','Características'));const ul=el('ul');amenities.forEach(a=>ul.append(el('li',a)));box.append(ul);}
  const actions=el('div',null,'actions');if(p.addressSource)actions.append(link('Conferir endereço oficial ↗',p.addressSource));if(p.coordinateSource)actions.append(link('Fonte da coordenada revisada ↗',p.coordinateSource));actions.append(link(p.endereco?'Abrir endereço no Google Maps ↗':'Consultar região no Google Maps ↗','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.endereco||p.nome+', '+p.bairro+', São Paulo')));
  const book=window.MATERIAL_PUBLICO?.[p.slug]||p.materiaisLink;if(book)actions.append(link('Material do empreendimento ↗',book));
  actions.append(link('Consultar com Luigi ↗','https://wa.me/5511998885850?text='+encodeURIComponent('Olá Luigi, gostaria de informações sobre '+p.nome+'.')));box.append(actions);
  document.querySelectorAll('.project').forEach(card=>card.classList.toggle('active',card.dataset.slug===p.slug));window.centralAnalytics?.track('Projeto consultado',{empreendimento:p.nome});if(focus)box.focus({preventScroll:false});
 }
 function render(){
  const term=norm($('busca').value),filtered=data.filter(p=>(!term||norm([p.nome,p.endereco,p.bairro].join(' ')).includes(term))&&(!$('regiao').value||p.regiao===$('regiao').value)&&(!$('bairro').value||p.bairro===$('bairro').value)&&(!$('fase').value||p.fase===$('fase').value));
  $('lista').replaceChildren();layer?.clearLayers();markers.clear();const points=[];let approx=0;
  for(const p of filtered){const c=coords(p);if(c){points.push(c);if(p.coordinateStatus!=='checked')approx++;if(map){const marker=L.circleMarker(c,{radius:9,color:'#7638d5',weight:2,fillColor:p.coordinateStatus==='checked'?'#7638d5':'#fff',fillOpacity:.95}).addTo(layer);const pop=el('div');pop.append(el('strong',p.nome),el('p',p.bairro+' · '+p.fase));card.append(el('p',p.coordinateStatus==='checked'?'Localização revisada':'Localização a confirmar','location-status'));const b=el('button','Ver informações');b.type='button';b.addEventListener('click',()=>details(p,true));pop.append(b);marker.bindPopup(pop);marker.on('click',()=>details(p));markers.set(p.slug,marker);}}
   const card=el('article',null,'project');card.dataset.slug=p.slug;card.append(el('h2',p.nome),el('p',p.bairro+' · '+p.fase));card.append(el('p',p.coordinateStatus==='checked'?'Localização revisada':'Localização a confirmar','location-status'));const b=el('button','Ver informações');b.type='button';b.addEventListener('click',()=>{details(p,true);if(c&&map){map.setView(c,16);markers.get(p.slug)?.openPopup();}});card.append(b);$('lista').append(card);
  }
  if(!filtered.length)$('lista').append(el('p','Nenhum empreendimento encontrado.'));
  $('contagem').textContent=filtered.length+' de '+data.length+' empreendimentos · '+points.length+' pinos exibidos · '+approx+' aproximados · '+filtered.filter(p=>p.coordinateStatus!=='checked').length+' localizações a confirmar';
  if(map&&points.length)map.fitBounds(points,{padding:[30,30],maxZoom:15});
 }
 $('aproximados').addEventListener('change',render);$('filtros').addEventListener('submit',e=>e.preventDefault());$('filtros').addEventListener('input',render);$('filtros').addEventListener('reset',()=>setTimeout(()=>{$('aproximados').checked=false;render();},0));render();
})();
