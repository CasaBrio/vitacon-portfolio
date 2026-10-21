'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const config = window.CENTRAL_CONFIG;
  const client = window.supabase.createClient(config.url, config.key, {auth:{storageKey:'central-admin-session',storage:sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const format = n => Number(n || 0).toLocaleString('pt-BR');
  const message = (id,text,error=false) => { $(id).textContent=text; $(id).classList.toggle('error',error); };
  let requestId=0,loading=false;
  function loginScreen(){requestId++;$('dashboard').hidden=true;$('report').hidden=true;$('loginPanel').hidden=false;$('password').value='';$('account').textContent='';}
  function list(id,rows){const root=$(id);root.replaceChildren();if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='Ainda não há registros neste período.';root.append(p);return;}for(const row of rows){const line=document.createElement('div');line.className='rank-row';const name=document.createElement('span'),total=document.createElement('strong');name.textContent=row.name;total.textContent=format(row.total);line.append(name,total);root.append(line);}}
  function draw(data){
    for(const id of ['visits','visitors','whatsapp','requests'])$(id).textContent=format(data[id]);
    for(const id of ['projects','materials','actions','devices','sources'])list(id,data[id] || []);
    const chart=$('chart');chart.replaceChildren();const daily=data.daily || [],max=Math.max(1,...daily.map(d=>Number(d.visits)));
    chart.setAttribute('aria-label','Visitas por dia: '+daily.map(d=>d.day+': '+d.visits).join('; '));
    const table=document.createElement('table');const head=document.createElement('tr');for(const text of ['Data','Visitas']){const th=document.createElement('th');th.scope='col';th.textContent=text;head.append(th);}table.append(head);
    for(const [i,d] of daily.entries()){
      const label=d.day.slice(8,10)+'/'+d.day.slice(5,7),group=document.createElement('div'),bar=document.createElement('div'),span=document.createElement('span');group.className='bar-group';bar.className='bar';bar.style.height=(Number(d.visits)/max*140)+'px';group.title=label+': '+format(d.visits)+' visitas';span.textContent=daily.length<=7||i===0||i===daily.length-1||i%Math.ceil(daily.length/7)===0?label:'';group.append(bar,span);chart.append(group);
      const row=document.createElement('tr');for(const text of [label,format(d.visits)]){const td=document.createElement('td');td.textContent=text;row.append(td);}table.append(row);
    }
    $('dailyTable').replaceChildren(table);$('updated').textContent='Atualizado às '+new Date(data.updatedAt).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});$('report').hidden=false;
  }
  async function loadReport(){
    const current=++requestId;$('refresh').disabled=true;message('reportMessage','Carregando dados…');
    try{
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user){loginScreen();return;}
      const {data,error}=await client.rpc('central_dashboard',{p_days:Number($('period').value)});
      if(current!==requestId)return;
      if(error){if(error.code==='42501'){await client.auth.signOut({scope:'local'});loginScreen();message('loginMessage','Esta conta não tem acesso ao painel administrativo.',true);return;}throw error;}
      $('account').textContent='Acesso exclusivo de '+user.email;$('loginPanel').hidden=true;$('dashboard').hidden=false;draw(data);message('reportMessage','');
    }catch(_){if(current===requestId)message('reportMessage','Não foi possível carregar os dados. Tente atualizar novamente.',true);}
    finally{$('refresh').disabled=false;}
  }
  $('loginForm').addEventListener('submit',async event=>{
    event.preventDefault();if(loading)return;loading=true;$('loginButton').disabled=true;message('loginMessage','Verificando acesso…');
    try{const {error}=await client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error){message('loginMessage','Não foi possível entrar. Confira o e-mail e a senha cadastrados.',true);return;}message('loginMessage','');$('dashboard').hidden=false;await loadReport();}
    catch(_){message('loginMessage','Não foi possível conectar. Tente novamente.',true);}
    finally{loading=false;$('loginButton').disabled=false;}
  });
  $('logout').addEventListener('click',async()=>{await client.auth.signOut({scope:'local'});loginScreen();message('loginMessage','Você saiu da conta.');});
  $('period').addEventListener('change',loadReport);$('refresh').addEventListener('click',loadReport);
  client.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')loginScreen();});
  client.auth.getSession().then(({data:{session}})=>{if(session){$('dashboard').hidden=false;loadReport();}});
})();
