# Central de Parceiros Vitacon — Luigi

Versão estática com catálogo, filtros, Tabelão de Estoque e Tabelão HIS/HMP da Black November (novembro/2026), destaques de descontos e materiais em PDF/Excel.

## Publicar na Vercel

- Repositório: CasaBrio/vitacon-portfolio
- Branch: main
- Root Directory: central-parceiros
- Framework Preset: Other
- Build Command: vazio
- Install Command: vazio
- Output Directory: dist
- Nome sugerido: parceirosvitacon (alternativa: parceriavitacon)

A pasta dist contém os arquivos servidos. Scripts e data preservam os importadores e dados para atualizações futuras. Não há etapa de build para servir esta versão.

## Escopo da migração

Esta pasta corresponde à Central do Luigi. As apresentações dos 57 projetos, seus PDFs individuais e o mapa continuam compartilhados pelo portfólio já publicado em https://luigi.sperandeoluis.chatgpt.site. Os botões de retorno dessas apresentações ainda levam à Central publicada em Sites. A migração desses destinos pode ser feita após a definição do novo endereço. Os PDFs e planilhas da Central estão incluídos neste repositório.

## Verificar

```sh
node scripts/check-discount-highlights.cjs dist
node scripts/check-tabelao.cjs dist
```

Base atual: Black November, 337 registros (258 do Tabelão de Estoque de 06/11 e 79 do Tabelão HIS/HMP de 04/11). As condições de outubro saíram da base; as referências de agosto e setembro continuam como histórico. Preços, disponibilidade e condições dependem de confirmação.

Atualizar a base de um novo mês:

```sh
python3 scripts/import-november.py          # lê os PDFs em dist/materiais e gera dist/estoque.json
python3 scripts/build-november-workbook.py  # gera dist/materiais/tabeloes-black-november-2026.xlsx
```

O desconto gravado é o que o valor de cada linha aplica sobre a tabela. Se a coluna de percentual do PDF divergir, a unidade recebe uma observação.

## Vitrine (/vitrine)

- Lista oficial do mês: `dist/vitrine/oportunidades.json`, gerada a partir do catálogo de oportunidades em PDF.
- PDF para download: `dist/materiais/catalogo-oportunidades-<mes>-<ano>.pdf` (o caminho fica no campo `pdf` do JSON).
- Apresentação e book de cada empreendimento vêm de `catalogo-projetos.js` e `materiais-publicos.js` (campo `catalogo` liga o item ao nome do catálogo).
- Downloads do mês: campo `tabelas` (título, subtítulo e arquivo) e materiais da campanha no campo `materiais`.
- Para um novo mês: trocar o PDF, regenerar `oportunidades.json` (nome, bairro, endereço, status, metragens, valor a partir de, desconto, links de mapa, pasta e tabela) e publicar.

## Endereços

- parceirosvitacon.com.br → vitrine (página inicial do domínio próprio)
- parceirosvitacon.vercel.app → Central (página inicial, como antes)
- /central → Central em qualquer endereço (arquivo dist/central.html)
- /v e /vitrine/ → vitrine em qualquer endereço

## Área do parceiro e página do cliente

- /parceiro/ → login do corretor (e-mail e senha), troca da senha provisória, criação e acompanhamento das páginas.
- /parceiro/?cadastro → autocadastro do corretor (nome, e-mail, WhatsApp, imobiliária, CRECI, se já está no Vitacon Partners e a própria senha). Entra na hora; no painel o cadastro aparece "A conferir" até o Luigi cruzar com o Vitacon Partners. Banco: `parceiros-autocadastro.sql`.
- /c/<código> → página pública que o cliente recebe (sem comissão nem materiais internos), com o nome e o WhatsApp do corretor.
- /admin/parceiros/ → o Luigi vê os cadastros novos (aba "A conferir"), marca como conferido, exporta a lista em CSV (abre no Excel), cria acessos manualmente, ativa ou desativa parceiros e vê as páginas enviadas e as aberturas.
- Banco: rodar `parceiros-schema.sql` uma vez no Supabase (SQL Editor).
- Supabase > Authentication: o cadastro por e-mail precisa ficar habilitado. O e-mail do parceiro é confirmado pelo painel (admin_ativar_login) e as novas senhas provisórias saem pelo painel (admin_nova_senha), sem depender de envio de e-mail.
