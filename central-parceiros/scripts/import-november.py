#!/usr/bin/env python3
"""Importa os tabelões Black November (novembro/2026) para dist/estoque.json.

Uso (a partir de central-parceiros/):
    python3 scripts/import-november.py

Lê os PDFs de dist/materiais/ (Tabelão de Estoque 06/11 e Tabelão HIS/HMP 04/11),
confere cada linha (preço com desconto = tabela x (1 - desconto); preço/m² = tabela / área)
e substitui as condições de outubro. As referências históricas de agosto e setembro continuam.
"""
import json, re, subprocess, hashlib
from pathlib import Path

R = Path(__file__).resolve().parent.parent
EST = R / 'dist/materiais/tabelao-estoque-black-november-2026.pdf'
HIS = R / 'dist/materiais/tabelao-his-hmp-black-november-2026.pdf'
OUT = R / 'dist/estoque.json'
MES = 'Novembro/2026'
ACAO_EST = 'TABELÃO BLACK NOVEMBER 06/11'
ACAO_HIS = 'NOVEMBRO ENQUADRADO'

def num(s): return float(s.replace('.', '').replace(',', '.'))
def text(p): return subprocess.check_output(['pdftotext', '-layout', str(p), '-'], text=True)
N = r'([\d.]+,\d+)'
RE_EST = re.compile(r'^\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+?)\s{2,}(U - \d+|\S+)\s+(NR|RESIDENCIAL|R2V)\s+(NOVEMBRO)\s+'
                    + r'\s+'.join([N] * 5) + r'\s+(\d+%|preço promocional)\s+(Sim|Não)\s+(Sim|Não)')
RE_HIS = re.compile(r'^\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ ]+?)\s{2,}(\S+)\s+(HIS|HMP)\s+(NOVEMBRO ENQUADRADO)\s+'
                    + r'\s+'.join([N] * 5) + r'\s+(\d+)%\s+(NÍVEL \d)\s+(\+\d+%)\s+(30/70 - \d+% DE ATO)')

old = json.loads(OUT.read_text())
template = {k: None for k in old['records'][0]}
district = {p['name']: p.get('publicDistrict') for p in old['projects']}
district['VITACON VENANCIO AIRES'] = 'Perdizes'

new = []
for page, t in enumerate(text(EST).split('\f'), 1):
    for line in t.splitlines():
        m = RE_EST.match(line)
        if not m: continue
        name, unit, kind, src, area, tab, pm2, dpm2, dprice, disc, decor, income = m.groups()
        rec = dict(template)
        promo = 'promo' in disc
        rec.update(project=name.strip(), unit=unit.replace(' ', ''), type=kind, sourceAction=src, action=ACAO_EST,
                   area=num(area), tablePrice=num(tab), tablePerM2=num(pm2), discountPerM2=num(dpm2), discountPrice=num(dprice),
                   discount=round(1 - num(dprice) / num(tab), 4) if promo else round(1 - num(dprice) / num(tab), 2),
                   decor=decor, income=income, note='Preço promocional Black November' if promo else None,
                   sourcePage=page, sourceMonth=MES + ' · tabela 06/11', sourceFilename='TABELÃO DE ESTOQUE BLACK NOVEMBER.pdf',
                   historical=False, duplicate=False)
        # O desconto gravado é o que o preço da linha aplica sobre a tabela. Se a coluna "BLACK NOVEMBER"
        # do PDF mostrar outro percentual, a divergência fica registrada na observação da unidade.
        if not promo and abs(rec['discount'] - int(disc[:-1]) / 100) > 0.005:
            rec['note'] = f'O tabelão indica {disc} na coluna Black November; o valor da linha corresponde a {round(rec["discount"] * 100)}% sobre a tabela. Confirme com Luigi.'
        new.append(rec)
n_est = len(new)
for page, t in enumerate(text(HIS).split('\f'), 1):
    for line in t.splitlines():
        m = RE_HIS.match(line)
        if not m: continue
        name, unit, kind, action, area, tab, pm2, dpm2, dprice, disc, level, comm, flow = m.groups()
        rec = dict(template)
        rec.update(project=name.strip(), unit=unit, type=kind, action=action, area=num(area), tablePrice=num(tab),
                   tablePerM2=num(pm2), discountPerM2=num(dpm2), discountPrice=num(dprice), discount=int(disc) / 100,
                   priority=level, commission=comm, paymentFlow=flow,
                   sourcePage=page, sourceMonth=MES + ' · tabela 04/11', sourceFilename='TABELÃO HIS.HMP BLACK NOVEMBER.pdf',
                   historical=False, duplicate=False)
        new.append(rec)

for i, r in enumerate(new, 1):
    r['id'] = ('tabelao-novembro-' if i <= n_est else 'novembro-his-') + str(i if i <= n_est else i - n_est)
    r['sourceRow'] = i if i <= n_est else i - n_est
    r['districtSource'] = district.get(r['project'])
    assert abs(r['discountPrice'] - r['tablePrice'] * (1 - r['discount'])) <= r['tablePrice'] * 0.006 or (r['note'] or '').startswith('Preço promo'), r
    assert abs(r['discountPerM2'] * r['area'] - r['discountPrice']) < 2, r
    assert abs(r['tablePrice'] / r['area'] - r['tablePerM2']) < 1.5, r
assert n_est == 258 and len(new) - n_est == 79, (n_est, len(new))
assert len({(r['project'], r['unit'], r['action']) for r in new}) == len(new)

hist = [r for r in old['records'] if r['historical']]
assert not any('OUTUBRO' in (r['action'] or '') for r in hist)
payload = {**old,
           'month': MES,
           'filename': 'TABELÃO DE ESTOQUE BLACK NOVEMBER.pdf + TABELÃO HIS.HMP BLACK NOVEMBER.pdf',
           'sha256': hashlib.sha256(EST.read_bytes() + HIS.read_bytes()).hexdigest(),
           'currentAction': 'NOVEMBRO ATUAL',
           'records': new + hist,
           'metrics': {'records': len(new), 'uniqueUnits': len({(r['project'], r['unit']) for r in new}),
                       'projects': len({r['project'] for r in new}), 'campaignRecords': len(new) - n_est,
                       'historicalRecords': len(hist), 'tabelaoRecords': n_est}}
OUT.write_text(json.dumps(payload, ensure_ascii=False))
(R / 'data/tabelao-black-november.json').write_text(json.dumps(new, ensure_ascii=False, indent=2))
print(payload['metrics'])
for r in new:
    if r['note'] and not r['note'].startswith('Preço'): print('divergência:', r['project'], r['unit'], r['note'])
