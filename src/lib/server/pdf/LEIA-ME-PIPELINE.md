# SciLedger — Pipeline do PDF do artigo

Como um `paper` do MongoDB vira um PDF com a identidade da plataforma.

```
GET /api/papers/:id/pdf?template=v3-1col
        │
        ▼
  Papers.findOne()                    src/routes/api/papers/[id]/pdf/+server.ts
        │
        ▼
  resolveArticleTokens(paper, origin) src/lib/server/pdf/resolveArticleData.ts
        ├── resolveAuthors()          snapshot authorAffiliations + perfis do banco
        ├── resolveHubName()          hubId (UUID) ➜ título do Hub
        ├── normalizeArticleHtml()    <h1> cru ➜ <h2 class="sec">, capitular, figuras
        ├── inlineArticleImages()     /api/images/<id> ➜ data: URI lido do GridFS
        ├── resolveCitations()        citations[] (UUIDs) ➜ referências formatadas
        ├── computeEditorialDigest()  SHA-256 do registro editorial
        └── qrSvgDataUri()            QR do endereço de verificação
        │
        ▼
  buildArticleTokens()                src/lib/server/pdf/articleViewModel.ts
        │  (28+ tokens, iguais para os 4 templates)
        ▼
  fillTemplate()  ➜  Playwright
                       ├── enhanceReferencesInPage()  [3] ➜ #ref-3, no DOM montado
                       ├── page.pdf()
                       └── fixPdfDestinations()       corrige o y dos destinos
                             ➜  Buffer PDF
```

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `qr.ts` | Gerador de QR sem dependências (ISO/IEC 18004, modo byte, v1–v10, ECC L/M/Q/H). Saída em SVG. |
| `autolink.ts` | Transforma URL, DOI e e-mail escritos como texto em `<a href>` — sem isso o Chromium não cria a anotação de link no PDF. |
| `enhanceReferencesInPage.ts` | Referências cruzadas, rodando **dentro do Chromium** com a mesma lógica da web: `[3]` ➜ salto para a referência 3, e `↩` de volta. |
| `crossReference.ts` | Só o número impresso de cada referência (`[3] Smith…` ➜ `<li value="3">`). |
| `fixPdfDestinations.ts` | Corrige as coordenadas dos destinos: o Chromium as grava ignorando a margem superior da página. |
| `normalizeArticleHtml.ts` | Traduz o HTML do mammoth/DTH para as classes que os templates estilizam. |
| `inlineArticleImages.ts` | Lê as imagens do GridFS e as embute como `data:` URI. |
| `articleViewModel.ts` | Camada **pura** paper ➜ tokens. Não toca no banco. |
| `resolveArticleData.ts` | Camada **de banco**. Faz as buscas e chama a camada pura. |
| `renderArticlePdf.ts` | Registro das 4 variantes, margens por variante e a chamada do Playwright. |
| `article-template*.tpl.html` | Os 4 templates. Conhecem apenas `{{TOKENS}}`. |

## Como testar

Na página de um artigo **publicado** (`/publish/published/<slug>`) existe a barra
**Download PDF · Preview · [seletor de template]**.

Direto pela URL:

| URL | O que faz |
| --- | --- |
| `/api/papers/<id>/pdf` | Baixa o PDF (template `v3-1col`) |
| `/api/papers/<id>/pdf?inline=1` | Abre no navegador em vez de baixar |
| `/api/papers/<id>/pdf?template=v2-2col` | Escolhe a variante (`v1`, `v2-1col`, `v2-2col`, `v3-1col`) |
| `/api/papers/<id>/pdf?debug=html` | Devolve o HTML preenchido — inspecione com o DevTools |
| `/api/papers/<id>/pdf?debug=json` | Só o diagnóstico da extração |
| `/api/papers/<id>/pdf?draft=1` | Permite exportar um manuscrito ainda não publicado |

O diagnóstico responde "por que faltou X":

```json
{
  "authors": 3,          // 0 aqui = nem snapshot nem perfil foram encontrados
  "affiliations": 3,
  "sections": 4,         // 0 = o corpo não tem <h1>/<h2>
  "figures": 1,
  "imagesInlined": 1,
  "imagesMissing": [],   // ids que não estão no GridFS
  "references": 4,
  "citationLinks": 6,          // marcadores [N] do texto que viraram link
  "referencesAnchored": 4,     // entradas encontradas e ancoradas
  "citationsWithoutEntry": [], // citou [9] mas não existe referência 9
  "referencesSource": "both"   // body | citations | both | none
}
```

## O contrato de tokens

Trocar o schema do banco significa mexer **só** em `articleViewModel.ts` e
`resolveArticleData.ts`. Os templates seguem funcionando.

`TITLE` · `SUBTITLE` · `KICKER` · `ARTICLE_TYPE` · `AUTHORS` · `AFFILIATIONS` ·
`ABSTRACT` · `KEYWORDS` · `DOI` · `ARTICLE_ID` · `VOLUME` · `PAGES` ·
`DATE_RECEIVED` · `DATE_REVISED` · `DATE_ACCEPTED` · `DATE_PUBLISHED` ·
`REVIEW_MODEL` · `REVIEW_ROUNDS` · `REVIEW_REPORTS` · `LICENSE` · `YEAR` ·
`BODY` · `SIDENOTES` · `REFERENCES` · `CITATION` · `CONTRIBUTIONS` · `FUNDING` ·
`DATA_AVAILABILITY` · `CONFLICTS` · `VERIFY_URL` · `VERIFY_LINK` · `VERIFY_QR` ·
`VERIFY_DIGEST` · `VERIFY_EVENTS` · `RUNNING_TITLE` · `COVER_IMAGE` · `DOI_LINK`

Pares texto/link: `DOI` e `VERIFY_URL` são texto puro — vão para o rodapé, onde o
Chromium não aceita âncora. `DOI_LINK` e `VERIFY_LINK` são as versões clicáveis,
para o corpo do documento.

Token que o template não usa é ignorado; token que o template usa e não existe
vira string vazia — nunca sobra `{{ALGO}}` visível no PDF.

## Hyperlinks

O Chromium só grava uma anotação de link no PDF onde existe `<a href>` no HTML.
Referências vindas do DOCX chegam como texto corrido — o endereço aparece, mas
não clica. `autolink.ts` roda sobre corpo, resumo, referências, citação e
disponibilidade de dados e reconhece:

| Escrito assim | Vira |
| --- | --- |
| `https://doi.org/10.1038/s41562-021-01057-0.` | link (o ponto final fica de fora) |
| `doi:10.1126/science.abc1234` | `https://doi.org/10.1126/science.abc1234` |
| `10.1371/journal.pone.0229123` | `https://doi.org/10.1371/journal.pone.0229123` |
| `www.sciledger.org` | `https://www.sciledger.org` |
| `l.cabral@ufrn.br` | `mailto:` |

O rótulo mantém o que o autor escreveu; só o `href` é normalizado. Nunca linka
dentro de uma tag nem dentro de um `<a>` que já existe — âncora aninhada é HTML
inválido e o Chromium descarta as duas.

Para conferir num PDF gerado:

```py
from pypdf import PdfReader
r = PdfReader('artigo.pdf')
for p in r.pages:
    for a in (p.get('/Annots') or []):
        o = a.get_object()
        if o.get('/Subtype') == '/Link' and o.get('/A'):
            print(o['/A'].get_object().get('/URI'))
```

## Referências cruzadas

Isto **não** é uma reimplementação. É a mesma lógica que a página web executa em
`enhancePaperReferenceLinks` (`$lib/utils/paperHtmlPresentation`), rodando no mesmo
lugar: sobre o DOM já montado, dentro do Chromium, logo antes de imprimir.

A diferença que importa é **como a entrada da referência é encontrada**. A primeira
tentativa aqui foi por expressão regular no servidor, assumindo que a referência 3
era o terceiro item da lista que o pipeline montou. Isso quebra sempre que a seção
"References" não é extraída do corpo — e aí os saltos vão todos para o lugar errado.
A web nunca teve esse problema porque ela **procura no documento**:

1. `document.getElementById('ref-3')`;
2. senão, varre `li, p, div, td, dd, blockquote` atrás de um texto que comece com
   `[3] `, `3. ` ou `3) ` — e marca esse elemento com `id="ref-3"`;
3. senão, cai no terceiro item de `ol.paper-references`.

Os templates marcam o corpo com `class="paper-content"` e a lista com
`class="paper-references"` — os mesmos ganchos da página web.

| No texto | Vira |
| --- | --- |
| `[3]` | `<a class="xref" id="paper-cite-3-1" href="#ref-3">3</a>` |
| `[1,2]` | dois links; a vírgula continua texto |
| `[2–4]` | as pontas viram link; o travessão continua texto |
| `<a href="#ref-3">` vindo do Word | aproveitado, só ganha o `id` |

Grupos (`[1,2]`, `[2–4]`) são acréscimo meu: a web só reconhece `[3]` sozinho.
O resto é igual — mesmos seletores, mesmo `TreeWalker`, mesmos ids, mesmas setinhas.

**Superscrito solto (`³`) não é linkado de propósito**: sem colchete não dá para
distinguir uma citação de um expoente (`x³`), e um falso positivo criaria um salto
para o lugar errado.

Só a lista extraída do próprio artigo recebe `id="ref-N"` no HTML. As entradas
vindas de `paper.citations` ficam sem âncora — a numeração delas não corresponde a
nada no texto, e reivindicar `ref-1` faria os saltos apontarem para a referência
errada.

Testado nos 4 templates em três formatos de artigo: `<h1>References</h1>`,
`<p><strong>REFERENCES</strong></p>` e sem título nenhum (só os itens `[1] …` no
fim do corpo). Nos doze casos: 4 referências ancoradas, 4 destinos distintos,
0 links quebrados.

### O bug de coordenada do Chromium

O Chromium grava cada `id` como destino nomeado em `/Dests`, no catálogo do PDF,
**mas calcula o `y` ignorando a margem superior da página**. O alvo fica
`margem-do-topo` pontos acima do lugar certo. Com a lista de referências no alto da
última página, o leitor tenta rolar para um ponto antes do início do conteúdo, bate
no limite da página e para — todo `[N]` parecia levar "para a última página, sem
sair do lugar".

Medido em cinco margens (0, 8, 12, 20 e 25 mm), o erro é sempre igual à margem
superior, com desvio abaixo de 1 pt — deslocamento, não escala:

```
margem 0 mm  = 0.00 pt   ->  erro 0.00 .. 0.75 pt
margem 8 mm  = 22.68 pt  ->  erro 21.75 .. 22.50 pt
margem 12 mm = 34.02 pt  ->  erro 33.75 .. 34.50 pt
margem 20 mm = 56.69 pt  ->  erro 56.25 .. 57.00 pt
margem 25 mm = 70.87 pt  ->  erro 69.75 .. 70.50 pt
```

`fixPdfDestinations.ts` subtrai a margem de cada destino depois da impressão. A
reescrita é byte a byte e **mantém o tamanho do arquivo**: o `y` só diminui, então
o número novo nunca é mais longo e a sobra vira espaço (branco dentro de um array
é válido em PDF). Nenhum byte muda de posição, a xref continua correta e não
entra biblioteca nova no projeto. Se qualquer premissa falhar, devolve o PDF
original intacto.

Para conferir:

```py
from pypdf import PdfReader
r = PdfReader('artigo.pdf')
dests = dict(r.trailer['/Root']['/Dests'].get_object())
for p in r.pages:
    for a in (p.get('/Annots') or []):
        o = a.get_object()
        if o.get('/Subtype') == '/Link' and o.get('/Dest') is not None:
            name = str(o['/Dest'])
            print(name, 'OK' if name in dests else 'DESTINO QUEBRADO')
```

## O QR e o digest

O QR aponta para `<origem>/verify/<paperId>`. **Essa rota ainda não existe** —
falta criá-la. O que ela precisa fazer:

1. Buscar o paper pelo id.
2. Recalcular `computeEditorialDigest(paper)`.
3. Mostrar o `statusHistory` completo (quem, quando, de qual estado para qual).
4. Comparar o digest recalculado com o que está impresso no PDF.

O digest é o SHA-256 da serialização canônica de `{id, título, DOI, autores,
sequência de transições}`. Mudou qualquer um desses campos depois da publicação,
o número muda por inteiro e a conferência falha. É isso que torna o histórico
*tamper-evident*: o PDF impresso carrega uma prova verificável do processo
editorial, e não a promessa de que ele aconteceu.

## O que ainda falta

- A rota `/verify/<id>` (o QR já aponta para ela).
- `volume` e `pages` não existem no schema — hoje caem em `YEAR` e "Open Access".
- `FUNDING` e `CONFLICTS` são textos fixos; viram tokens reais quando o schema
  ganhar esses campos.
