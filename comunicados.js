/* ============================================================
   COMUNICADOS — Panorama de Oportunidades & Portfólio Vitacon
   ============================================================
   Este arquivo é separado do index.html de propósito: ele é
   pequeno, então o GitHub deixa editar direto no navegador
   (o index.html é grande por causa das fotos, e o GitHub não
   abre pra edição arquivos muito grandes).

   Este arquivo é ÚNICO para toda a equipe — um comunicado
   adicionado aqui aparece para TODOS os links (Luigi, Leila,
   Khalila, Samuel, Andréa, Akany, etc.), automaticamente.

   COMO ADICIONAR UM NOVO COMUNICADO:
   1. Copie um bloco inteiro, do "{" até o "}," (incluindo a
      vírgula no final).
   2. Cole em qualquer posição da lista abaixo — a ordem de
      exibição no site é automática, pela data (mais recente
      primeiro), não pela ordem aqui no arquivo.
   3. Troque os textos de "data", "titulo" e "texto".
   4. "link" e "linkTexto" são opcionais. Se não for usar,
      deixe os dois como "" (aspas vazias).
   5. "imagem" é opcional — use quando tiver uma peça/flyer
      (como os que você manda no grupo do WhatsApp). Faça
      upload da imagem no GitHub (Add file → Upload files,
      junto dos outros arquivos como capa.jpg) e escreva aqui
      o nome exato do arquivo, ex: "fechamento-julho-2026.jpg".
      Se não for usar imagem, deixe "" (aspas vazias).
   6. Role até o fim da página no GitHub e clique em
      "Commit changes". O site atualiza sozinho em ~1 minuto.

   COMO REMOVER UM COMUNICADO:
   Apague o bloco inteiro, do "{" até o "}," correspondente.

   Formato da data: DD/MM/AAAA (sempre com barra).
   ============================================================ */
const LINK_OPORTUNIDADES = "https://docs.google.com/spreadsheets/d/1W8f30uV-wF7aS9JTDJiktridmqpkrSSY/edit?usp=sharing&ouid=111636566725752504338&rtpof=true&sd=true";
const COMUNICADOS = [
  {
    data: "28/07/2026",
    titulo: "Vitacon Perdizes entrou no portfólio disponível",
    texto: "Acabamos de incluir o Vitacon Perdizes na lista de empreendimentos disponíveis, na região do Allianz Parque.",
    imagem: "",
    link: "",
    linkTexto: ""
  },
  {
    data: "20/07/2026",
    titulo: "Panorama atualizado com fotos de fachada",
    texto: "Todas as fichas de empreendimentos disponíveis e de revenda já contam com foto oficial de fachada e link de materiais completos.",
    imagem: "",
    link: "",
    linkTexto: ""
  },
 {
    data: "28/07/2026",
    titulo: "PLANILHA DE ESTOQUE - JULHO/26",
    texto: "SEGUE ABAIXO O LINK PARA O ARQUIVO EM EXCEL - POLÍTICAS DE DESCONTO - ESTOQUE.",
    imagem: "",
    link: "https://docs.google.com/spreadsheets/d/1_KxSM7o8HkyMEEX9ZDCayusk99gSPOQW/edit?usp=sharing&ouid=111636566725752504338&rtpof=true&sd=true",
   linkTexto: "Planilha Estoque"
  },
  {
    data: "03/08/2026",
    titulo: "Vitacon - News",
    texto: "aqui vc encontra as mais recentes novidades sobre a Vitacon",
    imagem: "vitacon_news.png",
    link: "https://empreendimentos.vitacon.com.br/vitacon-news-julho-2026",
    linkTexto: "Vitacon News"
  }];
