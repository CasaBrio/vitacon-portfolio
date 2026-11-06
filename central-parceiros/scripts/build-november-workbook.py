#!/usr/bin/env python3
"""Gera dist/materiais/tabeloes-black-november-2026.xlsx a partir de data/tabelao-black-november.json.

Uso (a partir de central-parceiros/): python3 scripts/build-november-workbook.py
Abas: Resumo, Estoque (Tabelão 06/11) e HIS-HMP (Tabelão 04/11), com filtros e cabeçalho fixo.
"""
import json
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.utils import get_column_letter

R = Path(__file__).resolve().parent.parent
rows = json.loads((R / 'data/tabelao-black-november.json').read_text())
est = [r for r in rows if r['action'].startswith('TABELÃO')]
his = [r for r in rows if r['action'] == 'NOVEMBRO ENQUADRADO']
BRL = '"R$" #,##0.00'
HEAD = PatternFill('solid', fgColor='111111')
ACC = '#FF8A3D'

wb = Workbook()
def sheet(ws, title, note, headers, data, fmts, widths, tname):
    ws['A1'] = title; ws['A1'].font = Font(name='Arial', size=16, bold=True, color=ACC[1:])
    ws['A2'] = note; ws['A2'].font = Font(name='Arial', size=10, color='555555')
    ws.append([]); ws.append(headers)
    for d in data: ws.append(d)
    last = 4 + len(data); lc = get_column_letter(len(headers))
    for c in ws[4]:
        c.fill = HEAD; c.font = Font(name='Arial', bold=True, color='FFFFFF'); c.alignment = Alignment(wrap_text=True, vertical='center')
    ws.row_dimensions[4].height = 36
    for row in ws.iter_rows(min_row=5, max_row=last):
        for c in row: c.font = Font(name='Arial', size=10)
    for col, f in fmts.items():
        for r in range(5, last + 1): ws[f'{col}{r}'].number_format = f
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    t = Table(displayName=tname, ref=f'A4:{lc}{last}')
    t.tableStyleInfo = TableStyleInfo(name='TableStyleLight1', showRowStripes=True)
    ws.add_table(t); ws.freeze_panes = 'C5'; ws.sheet_view.showGridLines = False

res = wb.active; res.title = 'Resumo'
ws_e = wb.create_sheet('Estoque'); ws_h = wb.create_sheet('HIS-HMP')
sheet(ws_e, 'Tabelão de Estoque · Black November 2026', 'Fonte: TABELÃO DE ESTOQUE BLACK NOVEMBER.pdf, tabela 06/11/2026. Desconto = valor da linha sobre a tabela. Sujeito a disponibilidade e confirmação.',
      ['Empreendimento', 'Unidade', 'Tipo', 'Área privativa (m²)', 'Tabela 06/11 (R$)', 'Preço/m² (R$)', 'Preço/m² Black November (R$)', 'Valor Black November (R$)', 'Desconto', 'Decor', 'Renda', 'Observação'],
      [[r['project'], r['unit'], r['type'], r['area'], r['tablePrice'], r['tablePerM2'], r['discountPerM2'], r['discountPrice'], r['discount'], r['decor'], r['income'], r['note'] or ''] for r in est],
      {'D': '0.00', 'E': BRL, 'F': BRL, 'G': BRL, 'H': BRL, 'I': '0%'}, [30, 11, 14, 12, 17, 15, 17, 19, 10, 8, 8, 60], 'Estoque')
sheet(ws_h, 'Tabelão HIS/HMP · Black November 2026', 'Fonte: TABELÃO HIS.HMP BLACK NOVEMBER.pdf, tabela 04/11/2026. Unidades enquadradas; exige comprovação de renda do comprador.',
      ['Empreendimento', 'Unidade', 'Tipo', 'Área privativa (m²)', 'Tabela 04/11 (R$)', 'Preço/m² (R$)', 'Preço/m² com desconto (R$)', 'Valor com desconto (R$)', 'Desconto', 'Nível de prioridade', 'Comissão (na fonte)', 'Fluxo'],
      [[r['project'], r['unit'], r['type'], r['area'], r['tablePrice'], r['tablePerM2'], r['discountPerM2'], r['discountPrice'], r['discount'], r['priority'], r['commission'], r['paymentFlow']] for r in his],
      {'D': '0.00', 'E': BRL, 'F': BRL, 'G': BRL, 'H': BRL, 'I': '0%'}, [32, 11, 8, 12, 17, 15, 17, 19, 10, 12, 12, 22], 'HISHMP')

names = list(dict.fromkeys(r['project'] for r in rows))
data = []
for n in names:
    a = [r for r in rows if r['project'] == n]
    h = [r for r in a if r['action'] == 'NOVEMBRO ENQUADRADO']
    data.append([n, len(a), len(h), min(r['discountPrice'] for r in a), min(r['discount'] for r in a), max(r['discount'] for r in a),
                 h[0]['priority'] if h else '', h[0]['commission'] if h else ''])
sheet(res, 'Tabelões Black November 2026 · Resumo', 'Menor valor e faixa de desconto por empreendimento. Estoque 06/11/2026 + HIS/HMP 04/11/2026.',
      ['Empreendimento', 'Unidades', 'Das quais HIS/HMP', 'Menor valor (R$)', 'Menor desconto', 'Maior desconto', 'Nível HIS/HMP', 'Comissão HIS/HMP'],
      data, {'D': BRL, 'E': '0%', 'F': '0%'}, [32, 11, 12, 18, 12, 12, 13, 14], 'Resumo')
n = 5 + len(data)
res[f'A{n}'] = 'Total de unidades'; res[f'B{n}'] = f'=SUM(B5:B{n-1})'; res[f'C{n}'] = f'=SUM(C5:C{n-1})'
for c in ('A', 'B', 'C'): res[f'{c}{n}'].font = Font(name='Arial', bold=True)
out = R / 'dist/materiais/tabeloes-black-november-2026.xlsx'
wb.save(out); print(out, len(est), len(his))
