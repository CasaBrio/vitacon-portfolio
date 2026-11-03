# Central de Parceiros Vitacon — Luigi

Versão estática com catálogo, filtros, campanhas HIS/HMP e Tabelão de outubro, destaques de descontos e materiais em PDF/Excel.

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

Base atual de outubro: 290 registros (211 Tabelão e 79 HIS/HMP). Condições históricas permanecem identificadas. Preços, disponibilidade e condições dependem de confirmação.

## Vitrine (/vitrine)

- Lista oficial do mês: `dist/vitrine/oportunidades.json`, gerada a partir do catálogo de oportunidades em PDF.
- PDF para download: `dist/materiais/catalogo-oportunidades-<mes>-<ano>.pdf` (o caminho fica no campo `pdf` do JSON).
- Apresentação e book de cada empreendimento vêm de `catalogo-projetos.js` e `materiais-publicos.js` (campo `catalogo` liga o item ao nome do catálogo).
- Para um novo mês: trocar o PDF, regenerar `oportunidades.json` (nome, bairro, endereço, status, metragens, valor a partir de, desconto, links de mapa, pasta e tabela) e publicar.

## Endereços

- parceirosvitacon.com.br → vitrine (página inicial do domínio próprio)
- parceirosvitacon.vercel.app → Central (página inicial, como antes)
- /central → Central em qualquer endereço (arquivo dist/central.html)
- /v e /vitrine/ → vitrine em qualquer endereço
