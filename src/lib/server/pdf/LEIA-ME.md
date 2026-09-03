# SciLedger — Template de PDF do artigo publicado

Modelo A4, **coluna única**, print-first, com a identidade da plataforma em **todas as páginas**.
Segue convenções acadêmicas (MDPI/Nature/Frontiers) e usa a paleta do tema `sciLedger.ts`.

## Arquivos
- `article-template.html` — o template (exemplo preenchido, pronto para virar template de string/Svelte).
- `sciledger-article-sample.pdf` — amostra renderizada (3 páginas).
- `render-cdp.mjs` — script de referência da renderização.

## Identidade aplicada
| Elemento | Valor (do seu tema) |
|---|---|
| Texto / marca | `#172554` (`--theme-font-color-base`) |
| Destaque | `#1D4ED8` (primary-700) / `#3B82F6` (primary-500) |
| Painel do abstract | `#EFF6FF` (primary-50) |
| Títulos / UI | Inter · Corpo: serifada (leitura em papel) |

## Blocos do template → campos do `Paper`
| Bloco | Campo |
|---|---|
| Masthead (marca + Open Access + tipo) | fixo / `paper.type` |
| DOI | `paper.doi` |
| Faixa de metadados | `statusHistory` → received/revised/accepted/published |
| Volume / Article ID | metadados de publicação |
| Peer review | rodadas + nº de reports |
| Título / subtítulo | `paper.title` |
| Autores + superscritos | `mainAuthor`, `coAuthors`, `correspondingAuthor` |
| Afiliações | afiliações dos autores |
| Abstract | `paper.abstract` |
| Keywords | `paper.keywords` |
| How to cite | gerado a partir dos metadados |
| Corpo (seções, figuras, tabelas) | conteúdo extraído do DOCX (`mammoth`) |
| Back matter | contribuições, funding, disponibilidade de dados, conflitos |
| Referências | lista de referências |
| **Verified editorial record** | **diferencial SciLedger** — QR + digest + rodadas + decisão |
| Rodapé pág. 1 | licença CC BY + `sciledger.org` |

## Como renderizar (Playwright — já está no seu `package.json`)
```js
await page.pdf({
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: HEADER,   // ver render-cdp.mjs
  footerTemplate: FOOTER,   // traz "page X of Y"
  margin: { top:'20mm', bottom:'18mm', left:'17mm', right:'17mm' }
});
```
> O cabeçalho/rodapé corridos **precisam** vir do `headerTemplate`/`footerTemplate`:
> o Chromium não suporta `counter(page)` em CSS, então a numeração só existe por ali.

## Pontos de customização
1. **Hub journals (co-branding).** No masthead, troque o bloco da marca por
   `Logo do Hub` + linha `Published on SciLedger` — o artigo passa a ter a identidade do
   periódico com a plataforma como infraestrutura. Standalone mantém SciLedger como marca principal.
2. **Badges.** `Open Access` e `Research Article` são classes (`.badge-oa`, `.badge-type`) —
   troque por Review, Editorial, Preprint etc.
3. **Figuras.** `figure .ph` é o placeholder tracejado; substitua por `<img>`.
4. **Painel de verificação.** É o elemento que diferencia a SciLedger de PDFs genéricos:
   liga o PDF impresso ao registro auditável on-line. O QR aponta para `/verify/<id>`.
5. **Fontes.** Se o servidor de PDF não tiver rede, baixe Inter/Source Serif localmente —
   os fallbacks (Helvetica/Georgia) já estão configurados.

---

# v2 — Modelos "marcantes" (uma e duas colunas)

Dois novos modelos, mesma identidade, visual bem mais moderno. **Os anteriores continuam disponíveis.**

| Arquivo | Layout | Amostra |
|---|---|---|
| `article-template.html` | v1 · clássico, 1 coluna | `sciledger-article-sample.pdf` |
| `article-template-v2-1col.html` | **v2 · 1 coluna** (editorial) | `sciledger-v2-1col.pdf` |
| `article-template-v2-2col.html` | **v2 · 2 colunas** (denso) | `sciledger-v2-2col.pdf` |

## O que mudou no v2
- **Faixa navy full-bleed** no topo da página 1 (marca em branco + selos + DOI) com fita em degradê azul — a assinatura visual.
- **Título em serifa de alto contraste** (Source Serif 4 Bold, 26pt) — elegante e marcante; toda a "mobília" (labels, metadados, seções) em Inter.
- **Chips numerados** nas seções (`01`, `02`…) em azul.
- **Pull quote** grande com barra azul.
- **Tabelas** com cabeçalho navy e zebra.
- **Cartão de verificação escuro** com QR em tile branco — fecha o artigo com muito impacto.
- **Faixa de encerramento** azul-clara com licença + domínio.
- **Rodapé com a marca em todas as páginas** (autores · DOI · CC BY | SciLedger · página).

### Diferenças entre as duas
- **1 coluna:** trilho lateral de metadados (44mm) ao lado do abstract — leitura arejada, ótimo para artigos com figuras grandes.
- **2 colunas:** bloco de título e abstract em largura total, depois corpo em 2 colunas (8,9pt, fio separador). Mais denso, ~35% menos páginas. Use `class="span-all"` numa `<figure>`/tabela para ocupar as duas colunas.

## Renderização do v2
```bash
node render2.mjs article-template-v2-1col.html saida.pdf
```
Margens: **top 12mm · bottom 14,5mm · left/right 0** — as laterais precisam ser **0** para a faixa
full-bleed funcionar (`.bleed` compensa com `margin:0 -18mm; padding:0 18mm`).
O cabeçalho corrido foi removido de propósito: a faixa navy já é a identidade na página 1,
e o rodapé carrega a marca nas demais. A numeração continua vindo do `footerTemplate`.

---

# v3 — Edição refinada (1 coluna) · `article-template-v3-1col.html`

A versão mais elegante da família. Amostra: `sciledger-v3-1col.pdf`.

## O que a torna diferente
- **Hero de capa:** o título vive *dentro* do campo navy, em serifa branca de 29pt, com kicker
  letterspaced, textura de pontos sutil e fita em degradê. Tratamento de revista premium.
- **Coluna de notas laterais (estilo Tufte):** medida de texto de ~110mm + coluna de 46mm para
  `<aside class="sn">`. Figuras, tabelas e pull quotes **avançam** sobre essa coluna e ganham largura total.
- **Capitular** (`<p class="lead">`) na abertura, em azul.
- **Réguas de seção em largura total** com o número em azul letterspaced (`01`, `02`…).
- **Faixa de metadados** com hairlines verticais e algarismos tabulares.
- **Abstract com rótulo lateral** e medida mais estreita — respiro editorial.
- **Cartão de verificação** escuro com a mesma textura do hero, fechando o documento.
- Numerais *oldstyle* no corpo, *tabulares* em tabelas e datas.

## Como usar
```bash
node render2.mjs article-template-v3-1col.html saida.pdf
```
Mesmas margens do v2 (**laterais 0** para o full-bleed). Notas laterais: coloque o
`<aside class="sn">` **antes** do parágrafo que ela anota, para flutuar ao lado dele.

## Qual escolher
| | Quando usar |
|---|---|
| **v3 · 1 coluna** | Publicação principal — mais bonita e memorável; ideal para artigos com notas e figuras |
| v2 · 2 colunas | Quando densidade importa (economiza ~35% de páginas) |
| v2 · 1 coluna | Alternativa mais sóbria, com trilho de metadados |
| v1 | Estilo clássico tipo MDPI |
