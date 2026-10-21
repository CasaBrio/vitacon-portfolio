"""Import the reviewed workbook into the private partner portal without changing its cells."""
import collections, hashlib, json, re, shutil, sys, unicodedata
from pathlib import Path
import openpyxl
ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]); month=sys.argv[2] if len(sys.argv)>2 else 'Setembro/2026'
workbook=openpyxl.load_workbook(source,data_only=True,read_only=True)
rows=list(workbook['Estoque'].values)
fields=['project','unit','type','action','area','tablePerM2','tablePrice','discountPerM2','discountPrice','discount','decor','income','districtSource','stageSource','commercialType','note','priority','commission','paymentFlow','auxKey','auxValue']
records=[]
for lineno,row in enumerate(rows[1:],2):
 if row[0] and row[1]:
  record=dict(zip(fields,row));record['sourceRow']=lineno;record['id']='linha-'+str(lineno)
  for key in ('area','tablePrice','discountPrice','discount'):
   if not isinstance(record.get(key),(int,float)):raise ValueError(f'Missing numeric {key} in row {lineno}')
  records.append(record)
counts=collections.Counter((r['project'],r['unit']) for r in records)
for record in records:record['duplicate']=counts[(record['project'],record['unit'])]>1
# Public client catalog supplies project presentations only, never overwrites workbook prices or stages.
catalog_path=Path('/workspace/sites/vitacon-clientes/dist/index.html')
catalog=json.loads(re.search(r'const DISPONIVEIS = (\[.*?\]);',catalog_path.read_text(),re.S).group(1)) if catalog_path.exists() else []
def norm(x):return unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower().strip()
byname={norm(r['nome']):r for r in catalog}
aliases={'h bela cintra':'vitacon-housi-bela-cintra','alameda jau':'vitacon-jau'}
projects=[]
for name in sorted(set(r['project'] for r in records)):
 public=byname.get(norm(name))
 if not public and norm(name) in aliases:public=next((x for x in catalog if x['slug']==aliases[norm(name)]),None)
 projects.append({'name':name,'slug':public['slug'] if public else None,'publicDistrict':public.get('bairro') if public else None})
payload={'month':month,'filename':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sheet':'Estoque', 'sourceURL':'https://vitaconpartners.com.br/central-parceiro', 'records':records,'projects':projects,'metrics':{'records':len(records),'uniqueUnits':len(counts),'projects':len(projects),'septemberRecords':sum('SETEMBRO' in r['action'] for r in records),'conflictingUnits':sum(n>1 for n in counts.values())}}
(ROOT/'dist/estoque.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2))
(ROOT/'data').mkdir(exist_ok=True);shutil.copyfile(source,ROOT/'data/estoque-origem.xlsx')
(ROOT/'dist/materiais').mkdir(exist_ok=True);shutil.copyfile(source,ROOT/'dist/materiais/estoque-setembro-2026.xlsx')
print(json.dumps(payload['metrics']))
