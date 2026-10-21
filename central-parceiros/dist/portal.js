'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const money = value => typeof value === 'number' ? value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : 'Não informado';
  const num = value => typeof value === 'number' ? value.toLocaleString('pt-BR',{maximumFractionDigits:2}) : 'Não informado';
  const pct = value => typeof value === 'number' ? (value*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%' : 'Não informado';
  const node = (tag, text, cls) => {const n=document.createElement(tag); if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  let base = null, filtered = [], inferred = {district:'',ready:false,text:'',unit:''};
  const controls=['projectFilter','typeFilter','actionFilter','priorityFilter','budgetFilter','sortFilter'];
  function showView(view){
    window.centralAnalytics?.track('Secao aberta', { secao: {stock:'Unidades e condições',projects:'Empreendimentos',sources:'Materiais e fontes'}[view] || view });
    for(const key of ['stock','projects','sources']) $('view-'+key).hidden=key!==view;
    document.querySelectorAll('[data-view]').forEach(button=>{button.classList.toggle('active',button.dataset.view===view); if(button.dataset.view===view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
  function clearFilters(){controls.forEach(id=>$(id).value=id==='sortFilter'?'project':id==='actionFilter'?base.currentAction:'');inferred={district:'',ready:false,text:'',unit:''};$('query').value='';$('queryStatus').textContent='A busca reconhece empreendimento, bairro, HIS/HMP, fase pronta e limite de valor.';render();}
  $('resetFilters').addEventListener('click',clearFilters);
  controls.forEach(id=>$(id).addEventListener('input',render));
  function appendDriveMaterials(actions, project){
    if(project?.launchUrl) actions.append(link('Materiais de lançamento',project.launchUrl));
    const book=project?.slug && window.MATERIAL_PUBLICO?.[project.slug];
    if(book) actions.append(link('Ver book no Drive',book));
    actions.append(link('Materiais no Drive','https://drive.google.com/drive/folders/1mW1RhbsVsEnTSjr0HLRZUS24s8Pnh1AQ'));
  }
  function publicProject(name){return base.projects.find(p=>p.name===name);}
  function cell(value,cls){return node('td',value,cls);}
  function span(text,cls){return node('span',text,cls);}
  function render(){
    if(!base)return;
    const project=$('projectFilter').value,type=$('typeFilter').value,action=$('actionFilter').value,budget=Number($('budgetFilter').value)||null;
    filtered=base.records.filter(r=> (!project||r.project===project)&&(!type||r.type===type)&&(!action||(action==='OUTUBRO ATUAL'?!r.historical:r.action===action))&&(!$('priorityFilter').value||r.priority===$('priorityFilter').value)&&(!budget||r.discountPrice<=budget)&&(!inferred.district||norm(r.districtSource||publicProject(r.project)?.publicDistrict)===norm(inferred.district))&&(!inferred.ready||norm(r.stageSource)==='pronto')&&(!inferred.unit||norm(r.unit).replace(/[^a-z0-9]/g,'')===inferred.unit)&&(!inferred.text||norm([r.project,r.unit,r.type,r.districtSource,publicProject(r.project)?.publicDistrict,r.commercialType].join(' ')).includes(inferred.text)));
    const sorting=$('sortFilter').value;
    filtered.sort((a,b)=>sorting==='price'?a.discountPrice-b.discountPrice:sorting==='discount'?b.discount-a.discount:sorting==='area'?b.area-a.area:a.project.localeCompare(b.project,'pt-BR')||a.unit.localeCompare(b.unit,'pt-BR')||a.sourceRow-b.sourceRow);
    const distinct=new Set(filtered.map(r=>r.project+'|'+r.unit)).size;
    $('resultCount').textContent=filtered.length+' registros · '+distinct+' unidades distintas';
    $('unitRows').replaceChildren();$('empty').hidden=!!filtered.length;
    for(const r of filtered){
      const tr=node('tr');
      const projectCell=cell();projectCell.append(span(r.project,'project-name'),span(r.unit,'unit-name'));if(r.duplicate)projectCell.append(span('Condição em revisão','badge review'));
      const typeCell=cell();typeCell.append(span(r.type,'badge'),span(num(r.area)+' m²','subtext'));
      const campaign=cell();campaign.append(span(r.action==='TABELÃO OUTUBRO 16/10'?'Tabelão · 16/10':r.action==='OUTUBRO ENQUADRADO'?'Outubro HIS/HMP':r.action==='SETEMBRO ENQUADRADO'?'Setembro HIS/HMP':r.action==='AGOSTO EXTRA'?'Agosto extra':'Agosto','badge'+(!r.historical?' september':'')));if(r.historical)campaign.append(span('Referência anterior','subtext'));
      const bonus=cell();bonus.append(span(r.priority||'Não informado',r.priority?'badge september':'subtext'));if(r.commission)bonus.append(span('Comissão: '+r.commission,'subtext'));
      const details=cell();const button=node('button','Ver condição','detail-button');button.addEventListener('click',()=>openUnit(r));details.append(button);
      tr.append(projectCell,typeCell,campaign,cell(money(r.tablePrice),'money'),cell(money(r.discountPrice),'money deal'),cell(pct(r.discount),'percent'),bonus,details);$('unitRows').append(tr);
    }
  }
  $('queryForm').addEventListener('submit',event=>{
    event.preventDefault();if(!base)return;
    const text=$('query').value.trim(),clean=norm(text);controls.forEach(id=>$(id).value=id==='sortFilter'?'project':id==='actionFilter'?base.currentAction:'');inferred={district:'',ready:false,text:'',unit:''};
    const unit=clean.match(/\b([a-z]-?\d{3,5})\b/);if(unit)inferred.unit=unit[1].replace(/[^a-z0-9]/g,'');
    const found=base.projects.find(p=>clean.includes(norm(p.name)))||base.projects.find(p=>{const short=norm(p.name).replace(/^vitacon\s+|^on\s+|^h\s+/,'');return short.length>=5&&clean.includes(short);});
    if(found)$('projectFilter').value=found.name;
    const types=[...new Set(base.records.map(r=>r.type))].sort((a,b)=>b.length-a.length);
    const typed=types.find(t=>new RegExp('(?:^|\\s)'+norm(t).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:\\s|$)').test(clean));
    if(typed)$('typeFilter').value=typed;
    const price=clean.match(/(?:ate|maximo(?: de)?|r\$)\s*([\d.,]+)\s*(milhao|milhoes|mil)?/);
    if(price){let raw=price[1];if(price[2])raw=raw.replace(',','.');else raw=raw.replace(/\./g,'').replace(',','.');const val=Number(raw)*(price[2]?.startsWith('milh')?1000000:price[2]==='mil'?1000:1);if(Number.isFinite(val)&&val>0)$('budgetFilter').value=val;}
    if(/tabelao/.test(clean))$('actionFilter').value='TABELÃO OUTUBRO 16/10';else if(/his|hmp/.test(clean))$('actionFilter').value='OUTUBRO ENQUADRADO';else if(/setembro/.test(clean))$('actionFilter').value='SETEMBRO ENQUADRADO';else if(/outubro|campanha/.test(clean))$('actionFilter').value=base.currentAction;
    if(/\bpront[oa]s?\b/.test(clean))inferred.ready=true;
    if(!found){const districts=[...new Set(base.projects.map(p=>p.publicDistrict).filter(Boolean))];const district=districts.find(d=>clean.includes(norm(d)));if(district)inferred.district=district;}
    const hasCriteria=found||typed||price||inferred.district||inferred.ready||inferred.unit||$('actionFilter').value;
    if(!hasCriteria)inferred.text=clean;
    const labels=[found?.name,unit?.[1].toUpperCase(),typed,inferred.district,$('budgetFilter').value&&'até '+money(Number($('budgetFilter').value)),$('actionFilter').value&&$('actionFilter').value.toLowerCase(),inferred.ready&&'PRONTO informado na planilha',!hasCriteria&&text].filter(Boolean);
    $('queryStatus').textContent=labels.length?'Critérios: '+labels.join(' · ')+'.':'Digite um empreendimento, tipo ou limite de valor.';
    render();
  });
  function field(grid,label,value,full=false){const box=node('div',null,full?'full':'');box.append(node('dt',label),node('dd',value||'Não informado'));grid.append(box);}
  function link(text,href,primary=false){const a=node('a',text,'button'+(primary?' primary':''));a.href=href;a.target='_blank';a.rel='noopener';return a;}
  function openUnit(r){
    window.centralAnalytics?.track('Condicao consultada', { empreendimento: r.project });
    const root=$('unitDetails');root.replaceChildren();root.append(node('h2',r.project));root.firstChild.id='unitTitle';root.append(node('p',r.unit+' · '+r.type+' · '+num(r.area)+' m²','unit-subtitle'));
    if(r.historical)root.append(node('p','Referência anterior. Esta condição não integra as tabelas atuais de outubro; confirme a vigência com Luigi.','notice'));
    if(r.duplicate)root.append(node('p','Esta unidade aparece em mais de uma condição na base. Confirme o tipo e os valores vigentes com Luigi.','notice'));
    const grid=node('dl',null,'detail-grid');
    field(grid,'Valor de tabela',money(r.tablePrice));field(grid,'Valor com desconto',money(r.discountPrice));field(grid,'Desconto informado',pct(r.discount));field(grid,'Redução em reais',money(r.tablePrice-r.discountPrice));field(grid,'Preço por m² da tabela',money(r.tablePerM2));field(grid,'Preço por m² com desconto',money(r.discountPerM2));field(grid,'Tabela / campanha',r.action);if(r.sourceAction)field(grid,'Ação transcrita da fonte',r.sourceAction);field(grid,'Tipo comercial na fonte',r.commercialType);field(grid,'Bairro',r.districtSource);field(grid,'Estágio / prazo na planilha',r.stageSource);field(grid,'Decor na fonte',r.decor);field(grid,'Renda na fonte',r.income);field(grid,'Prioridade da campanha',r.priority);field(grid,'Comissão (texto da fonte)',r.commission);field(grid,'Fluxo de pagamento',r.paymentFlow,true);root.append(grid);
    root.append(node('p','Fonte: '+r.sourceFilename+' · '+r.sourceMonth+(r.sourcePage?' · página '+r.sourcePage:' · aba Estoque')+' · registro '+r.sourceRow+'. Valores e disponibilidade sujeitos a confirmação. Comissão é transcrita da planilha; confirme a regra aplicável. Datas da planilha não foram substituídas pelos prazos do portfólio.','dialog-note'));
    const actions=node('div',null,'card-actions');const msg='Olá Luigi, sou parceiro e quero confirmar a condição vigente de '+r.project+', unidade '+r.unit+' ('+r.type+'), referência '+r.sourceMonth+' / '+r.action+'. Valor com desconto registrado: '+money(r.discountPrice)+'.';actions.append(link('Confirmar condição com Luigi','https://wa.me/5511998885850?text='+encodeURIComponent(msg),true));const project=publicProject(r.project);if(project?.slug)actions.append(link('Apresentação para clientes','https://luigi.sperandeoluis.chatgpt.site/empreendimentos/'+project.slug+'/?origem=parceiros'));appendDriveMaterials(actions,project);root.append(actions);$('unitDialog').showModal();
  }
  $('closeDialog').addEventListener('click',()=>$('unitDialog').close());$('unitDialog').addEventListener('click',event=>{if(event.target===$('unitDialog'))$('unitDialog').close();});
  const projectControls=['projectSearch','projectDistrict','projectType','projectBudget','projectRegion','projectPhase','projectStock'];
  projectControls.forEach(id=>$(id).addEventListener('input',projectCards));
  $('resetProjects').addEventListener('click',()=>{projectControls.forEach(id=>$(id).value='');projectCards();});
  function projectCards(){
    if(!base)return;
    const query=norm($('projectSearch').value.trim()),district=$('projectDistrict').value,type=$('projectType').value,budget=Number($('projectBudget').value)||null;
    $('projectGrid').replaceChildren();let count=0;
    for(const p of window.CATALOGO_PROJETOS){
      const matches=base.records.filter(r=>!r.historical&&r.project===p.name&&(!district||(r.districtSource||p.publicDistrict||'Bairro a confirmar')===district)&&(!type||r.type===type)&&(!budget||r.discountPrice<=budget));
      const hasStock=base.records.some(r=>!r.historical&&r.project===p.name);
      if(query&&!norm(p.name).includes(query)||district&&p.publicDistrict!==district&&!matches.length||type&&!matches.length||budget&&!matches.length||$('projectRegion').value&&p.region!==$('projectRegion').value||$('projectPhase').value&&p.phase!==$('projectPhase').value||$('projectStock').value==='yes'&&!hasStock||$('projectStock').value==='no'&&hasStock)continue;
      count++;
      const rows=base.records.filter(r=>!r.historical&&r.project===p.name),unique=new Set(rows.map(r=>r.unit)).size,min=Math.min(...rows.map(r=>r.discountPrice));
      const card=node('article',null,'project-card');card.append(node('span',p.publicDistrict||'Bairro a confirmar','tag'),node('h2',p.name),node('p',[p.region,p.phase,p.area].filter(Boolean).join(' · ')),node('p',rows.length?unique+' unidades distintas · '+rows.length+' registros':'Sem unidades na campanha de outubro','tag'),node('p',rows.length?'Menor valor registrado':'Condições sob consulta','subtext'),node('strong',rows.length?money(min):'Consulte Luigi','price'),node('p',rows.length?'Condições da base '+base.month+'. Confirme vigência e disponibilidade.':'A apresentação está disponível. Consulte preços e disponibilidade com Luigi.'));
      if(p.featuredLaunch)card.append(node('span','LANÇAMENTO EM DESTAQUE','launch-badge'));
      const actions=node('div',null,'card-actions');if(p.featuredLaunch)actions.append(link('Solicite tabelas e espelhos','https://wa.me/5511998885850?text='+encodeURIComponent('Olá Luigi, sou parceiro e gostaria de solicitar as tabelas e os espelhos de vendas atualizados do '+p.name+'.'),true));const button=node('button','Ver unidades','button primary');button.addEventListener('click',()=>{clearFilters();$('actionFilter').value='OUTUBRO ATUAL';$('projectFilter').value=p.name;render();showView('stock');});if(rows.length)actions.append(button);if(p.slug)actions.append(link('Explorar projeto','https://luigi.sperandeoluis.chatgpt.site/empreendimentos/'+p.slug+'/?origem=parceiros'));else actions.append(link('Consultar materiais','https://wa.me/5511998885850?text='+encodeURIComponent('Olá Luigi, quero os materiais de '+p.name+'.')));appendDriveMaterials(actions,p);card.append(actions);$('projectGrid').append(card);
    }
    $('projectCount').textContent=count+' de '+window.CATALOGO_PROJETOS.length+' empreendimentos';$('projectsEmpty').hidden=count!==0;
  }
  function renderStockHighlights(){
    const root=$('stockHighlights');root.replaceChildren();
    const rows=base.records.filter(r=>r.action==='TABELÃO OUTUBRO 16/10');
    const groups=[...new Set(rows.map(r=>r.project))].map(name=>({name,rows:rows.filter(r=>r.project===name)})).map(g=>({...g,max:Math.max(...g.rows.map(r=>r.discount))})).sort((a,b)=>b.max-a.max||a.name.localeCompare(b.name,'pt-BR')).slice(0,3);
    for(const group of groups){
      const selected=group.rows.filter(r=>r.discount===group.max).sort((a,b)=>a.discountPrice-b.discountPrice);
      const best=selected[0],card=node('article',null,'project-card discount-highlight');
      card.append(node('span','ATÉ '+pct(group.max)+' DE DESCONTO','discount-hero'),node('h3',group.name),node('p',selected.length+' unidades com '+pct(group.max)+' de desconto'),node('strong','A partir de '+money(best.discountPrice),'price'),node('p',best.unit+' · '+best.type+' · '+num(best.area)+' m²'),node('p','Tabela: '+money(best.tablePrice)+' · redução: '+money(best.tablePrice-best.discountPrice),'subtext'));
      const actions=node('div',null,'card-actions'),detail=node('button','Ver esta condição','button primary'),all=node('button','Ver unidades do empreendimento','button');
      detail.addEventListener('click',()=>openUnit(best));
      all.addEventListener('click',()=>{clearFilters();$('actionFilter').value='TABELÃO OUTUBRO 16/10';$('projectFilter').value=group.name;$('sortFilter').value='discount';render();$('resultCount').scrollIntoView({behavior:'smooth',block:'center'});});
      actions.append(detail,all);card.append(actions);root.append(card);
    }
  }
  $('sortBestDiscounts').addEventListener('click',()=>{clearFilters();$('actionFilter').value='TABELÃO OUTUBRO 16/10';$('sortFilter').value='discount';render();$('resultCount').scrollIntoView({behavior:'smooth',block:'center'});});
  function renderHighlights(){
    const root=$('octHighlights');root.replaceChildren();
    for(const name of ['VITACON PERDIZES','VITACON VENANCIO AIRES','ALAMEDA JAÚ']){
      const rows=base.records.filter(r=>r.action==='OUTUBRO ENQUADRADO'&&r.project===name);
      const min=Math.min(...rows.map(r=>r.discountPrice));
      const card=node('article',null,'project-card');card.append(node('span',name==='VITACON PERDIZES'?'FOCO DE OUTUBRO':name==='VITACON VENANCIO AIRES'?'PERDIZES · NÍVEL 1':'10% DE DESCONTO','tag'),node('h3',name),node('p',rows.length+' unidades selecionadas'),node('strong','A partir de '+money(min),'price'));
      const best=rows.slice().sort((a,b)=>a.discountPrice-b.discountPrice)[0];card.append(node('p',best.unit+' · '+best.type+' · '+num(best.area)+' m² · '+pct(best.discount)+' de desconto'));
      const button=node('button','Ver unidades da campanha','button primary');button.addEventListener('click',()=>{clearFilters();$('actionFilter').value='OUTUBRO ENQUADRADO';$('projectFilter').value=name;render();});card.append(button);root.append(card);
    }
  }
  async function start(){
    try{const response=await fetch('/estoque.json',{cache:'no-store'});if(!response.ok)throw new Error('Base indisponível');base=await response.json();$('period').textContent=base.month;$('periodSide').textContent=base.month;$('metricRecords').textContent=base.metrics.records;$('metricUnique').textContent=base.metrics.uniqueUnits+' unidades distintas';$('metricProjects').textContent=base.metrics.projects;$('metricCampaign').textContent=base.metrics.campaignRecords;
      $('actionFilter').add(new Option('Outubro · todas as condições atuais','OUTUBRO ATUAL'));
      for(const [id,key] of [['projectFilter','project'],['typeFilter','type'],['actionFilter','action'],['priorityFilter','priority']]){for(const value of [...new Set(base.records.map(r=>r[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')))$(id).add(new Option(value+(id==='actionFilter'&&base.records.filter(r=>r.action===value).every(r=>r.historical)?' (histórico)':''),value));}
      const districts=[...new Set(window.CATALOGO_PROJETOS.map(p=>p.publicDistrict||'Bairro a confirmar'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
      districts.forEach(v=>$('projectDistrict').add(new Option(v,v)));
      [...new Set(base.records.map(r=>r.type))].sort().forEach(v=>$('projectType').add(new Option(v,v)));
      for(const [id,key] of [['projectRegion','region'],['projectPhase','phase']]) [...new Set(window.CATALOGO_PROJETOS.map(p=>p[key]).filter(Boolean))].sort().forEach(v=>$(id).add(new Option(v,v)));
      $('actionFilter').value=base.currentAction;render();projectCards();renderHighlights();renderStockHighlights();
    }catch(e){$('error').hidden=false;$('resultCount').textContent='Falha ao carregar';console.error(e);}
  }
  start();
})();

