from pathlib import Path
import re,json,collections,shutil
from decimal import Decimal
r=Path('/workspace/sites/vitacon-parceiros');raw=[]
import subprocess
text=subprocess.check_output(['pdftotext','-layout',str(r/'dist/materiais/campanha-his-hmp-outubro.pdf'),'-'],text=True)
for page,t in enumerate(text.split('\f'),1):
 for line in t.splitlines():
  if 'OUTUBRO ENQUADRADO' in line:
   a=re.split(r'\s{2,}',line.strip());assert len(a)==13;raw.append(a+[page])
old=json.loads((r/'data/estoque-setembro.json').read_text());(r/'data/estoque-setembro.json').write_text(json.dumps(old,ensure_ascii=False,indent=2))
def number(s):return float(s.replace('.','').replace(',','.'))
new=[]
for i,a in enumerate(raw,1):
 name,unit,kind,action,area,price,pm,dm,dp,disc,level,comm,flow,page=a
 rec={k:None for k in old['records'][0]};rec.update(project=name,unit=unit,type=kind,action=action,area=number(area),tablePrice=number(price),tablePerM2=number(pm),discountPerM2=number(dm),discountPrice=number(dp),discount=int(disc.rstrip('%'))/100,priority=level,commission=comm,paymentFlow=flow,id='outubro-'+str(i),sourceRow=i,sourcePage=page,sourceMonth='Outubro/2026',sourceFilename='Campanha HIS_HMP_Outubro.pdf',historical=False,duplicate=False)
 assert abs(rec['discountPrice']-rec['tablePrice']*(1-rec['discount']))<.011,(i,rec)
 assert abs(rec['tablePrice']/rec['area']-rec['tablePerM2'])<.011,i
 rec['districtSource']=next((p['publicDistrict'] for p in old['projects'] if p['name']==name),None)
 if name=='VITACON VENANCIO AIRES':rec['districtSource']='Perdizes'
 new.append(rec)
assert len(new)==79 and len({(x['project'],x['unit']) for x in new})==79
for x in old['records']:x.update(historical=True,sourceMonth='Setembro/2026',sourceFilename=old['filename'])
payload={**old,'month':'Outubro/2026','filename':'Campanha HIS_HMP_Outubro.pdf','sheet':None,'currentAction':'OUTUBRO ENQUADRADO','records':new+old['records'],'metrics':{'records':79,'uniqueUnits':79,'projects':8,'campaignRecords':79,'historicalRecords':len(old['records'])}}
(r/'dist/estoque.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2));(r/'data/campanha-outubro.json').write_text(json.dumps(new,ensure_ascii=False,indent=2))

print('79 unidades conferidas; histórico preservado:',len(old['records']))
