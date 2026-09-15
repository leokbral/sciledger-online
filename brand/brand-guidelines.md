# SciLedger — guia de identidade visual

Versão 1.0 · 11 de setembro de 2026 · Assets preparados; aplicação ao produto em etapa posterior.

![Identidade SciLedger](previews/sciledger-brand-board.png)

## Conceito

SciLedger é uma plataforma de publicação científica e revisão por pares. A identidade traduz o conhecimento científico com autoria, revisão e histórico: uma contribuição pode ser examinada, discutida e situada em um processo editorial compartilhado.

**Registro entre pares** é a interpretação de design escolhida a partir desses fluxos. Não é uma nova missão institucional nem uma promessa de que todo conteúdo publicado seja verdadeiro. A fundamentação está na [auditoria do projeto](audit-and-concepts.md).

## Símbolo e significado

Duas formas abertas, equivalentes e giradas em 180° compõem um S abstrato. Sua equivalência representa a contribuição de diferentes participantes; não fixa uma quantidade de autores ou revisores. O intervalo entre elas mantém cada contribuição distinguível. As hastes horizontais evocam entradas de um registro e o ritmo da leitura. A continuidade percebida entre as duas formas reúne essas contribuições em uma identidade.

As curvas tornam a geometria acessível; os terminais retos dão precisão. O desenho não depende de cor dupla, efeitos de luz ou um emblema de certificação. Não contém uma corrente: as duas formas permanecem abertas e separadas.

A relação com colaboração e rastreabilidade é uma interpretação visual. O símbolo não substitui estados como “publicado”, “aprovado”, “ORCID conectado” ou “pagamento confirmado”.

## Cores

| Papel | HEX | RGB | Uso |
| --- | --- | --- | --- |
| Primary | `#2563EB` | 37, 99, 235 | Símbolo principal e fundo do favicon |
| Secondary | `#0EA5E9` | 14, 165, 233 | Apoio em materiais da marca |
| Accent | `#6366F1` | 99, 102, 241 | Destaques ocasionais em materiais |
| Dark | `#111827` | 17, 24, 39 | Wordmark e fundos escuros |
| Light | `#F9FAFB` | 249, 250, 251 | Superfícies claras |
| Reverse blue | `#60A5FA` | 96, 165, 250 | Símbolo sobre Dark |
| Monochrome black | `#000000` | 0, 0, 0 | Reprodução em uma tinta |
| Monochrome white | `#FFFFFF` | 255, 255, 255 | Reprodução reversa em uma tinta |

Esses valores sRGB consolidam a família de cores existente. Primary, Secondary, Accent e Reverse blue retomam valores explícitos do tema legado `src/sciLedger.ts`; o tema ativo `src/sciLedger.css` usa OKLCH com a mesma organização azul/ciano/índigo. Os valores acima são decisões de padronização da marca, não conversões exatas do OKLCH atual. Nenhum token da aplicação foi alterado.

A assinatura principal usa somente Primary e Dark. Secondary e Accent não devem colorir letras separadamente. Verde, amarelo e vermelho da interface continuam sendo cores de estado, sem função no símbolo.

## Tipografia

**Inter SemiBold, peso 600, optical size 32**, para o wordmark. O nome é sempre **SciLedger**, sem espaço, com S e L maiúsculos. Peso e cor são iguais na palavra inteira. A assinatura horizontal usa corpo de construção 56 e ajuste de espaçamento de −0,6 unidade entre glifos, preservando o kerning da fonte.

A referência Inter já existe no tema TypeScript legado; o CSS ativo usa `system-ui`. A escolha estabelece uma tipografia estável para a marca. Para materiais futuros: Inter Regular 400 no texto, Medium 500 em apoios e SemiBold 600 em títulos. Para texto de apoio sem Inter, usar `system-ui`, Segoe UI ou Arial. Não reconstruir o wordmark com essas alternativas: usar o asset em curvas.

Todos os SVGs finais têm letras em paths e funcionam sem instalar fontes. O arquivo original InterVariable e a licença OFL estão em [fonts/](fonts/). Inter foi desenhada para usos que incluem interfaces, materiais de comunicação e sinalização; consultar a [fonte oficial](https://rsms.me/inter/) e a [licença original](https://github.com/rsms/inter/blob/master/LICENSE.txt).

## Versões e escolha do arquivo

| Necessidade | Arquivo SVG | Orientação |
| --- | --- | --- |
| Assinatura principal | [sciledger-logo.svg](logo/sciledger-logo.svg) | Símbolo azul e nome Dark |
| Fundo claro | [sciledger-logo-light.svg](logo/sciledger-logo-light.svg) | Idêntica à principal; alias explícito de contexto |
| Fundo escuro | [sciledger-logo-dark.svg](logo/sciledger-logo-dark.svg) | Símbolo azul claro e nome branco |
| Uma tinta preta | [sciledger-logo-monochrome.svg](logo/sciledger-logo-monochrome.svg) | Todos os elementos pretos |
| Uma tinta branca | [sciledger-logo-white.svg](logo/sciledger-logo-white.svg) | Todos os elementos brancos |
| Símbolo isolado | [sciledger-symbol.svg](logo/sciledger-symbol.svg) | Variantes dark, monochrome e white também disponíveis |
| Somente nome | [sciledger-wordmark.svg](logo/sciledger-wordmark.svg) | Variante white disponível |
| Composição compacta | [sciledger-compact.svg](logo/sciledger-compact.svg) | Símbolo acima do nome; variante dark disponível |
| Favicon | [sciledger-favicon.svg](logo/sciledger-favicon.svg) | Branco sobre quadrado azul, abertura interna ampliada |

Os sufixos `-light` e `-dark` indicam **o fundo de aplicação**, não a cor do arquivo. Os assets têm fundo transparente, exceto o campo azul intencional do favicon. As pranchas de apresentação incluem fundos para mostrar uso.

Os PNGs correspondentes estão em [png/](png/). Assinaturas: 2400 px de largura; wordmarks: 2000 px; símbolos: 1024 × 1024 px; compactas: 1200 × 950 px. O favicon tem exportações de 16, 24, 32, 48, 64 e 512 px. Dimensões exatas constam em [source/validation.json](source/validation.json).

## Construção e área de proteção

O símbolo usa grade de 96 unidades, com área de tinta entre 4 e 92 nos dois eixos. A haste principal mede 18 unidades, o raio externo 24 e o interno 6. A abertura entre os terminais centrais mede 8 unidades. As duas formas usam o mesmo path, com rotação de 180°.

Definir **x = metade da haste = 9 unidades**. Manter ao menos x livre entre a área de tinta e textos, ícones, bordas ou imagens em todos os lados. Nas assinaturas, aplicar a mesma proporção considerando a escala do símbolo. O símbolo isolado inclui 12 unidades de margem externa até a área de tinta; preservar o viewBox. Para wordmark sem símbolo, usar como proteção metade da altura da letra “i”, sem o ponto.

O espaçamento entre símbolo e nome faz parte do master. Não aproximar ou separar os elementos. O favicon tem uma zona própria de acomodação e é a exceção prevista para espaços mínimos.

## Tamanhos mínimos

| Versão | Digital, tamanho do arquivo aplicado | Impressão, ponto de partida |
| --- | --- | --- |
| Horizontal | 160 px de largura; 190 px recomendado em navbar | 30 mm de largura |
| Wordmark | 110 px de largura | 22 mm de largura |
| Compacta | 140 px de largura | 26 mm de largura |
| Símbolo | 24 × 24 px; preferir 32 px | 6 × 6 mm |
| Favicon específico | 16 × 16 px | Não usar como master de impressão |

As medidas digitais foram avaliadas em renderização Chromium a 1×. O favicon tem haste de 16 unidades e abertura interna horizontal de 16, em vez das 12 do master; isso preserva a leitura pequena. Usar os PNGs no tamanho nativo quando necessário e evitar posições em frações de pixel. Os mínimos de impressão são orientações iniciais; o resultado depende do processo e do suporte. Não foi feita prova física.

## Fundos e aplicações

Em branco ou Light, usar a principal. Em Dark, usar `-dark` ou `-white`. Sobre Primary, usar `-white`. Em fotografias ou fundos ocupados, reservar um campo sólido com a área de proteção. Não colocar a marca diretamente sobre regiões de contraste irregular.

Para navbar e dashboard, preferir a assinatura horizontal. Para login, a compacta ou o símbolo acompanhado pelo contexto textual SciLedger. Para Paper, PDFs, apresentações e documentos, preferir SVG em curvas; usar PNG quando o programa não aceitar SVG. Para e-mail, usar PNG nas dimensões de exibição apropriadas. Em redes sociais, o símbolo e o favicon podem identificar avatares, preservando margem dentro do recorte circular.

O símbolo isolado identifica a plataforma quando o nome já estiver disponível no contexto. Em primeiro contato ou materiais institucionais, usar a assinatura com nome. Não substituir o logo de um Hub pelo símbolo SciLedger: são identificações diferentes.

## Usos corretos e incorretos

- Preservar proporção, orientação, canais internos, espaçamento e escrita do nome.
- Usar os arquivos fornecidos e a versão apropriada para o fundo.
- Usar preto integral ou branco integral quando houver restrição de reprodução.
- Não esticar, inclinar, espelhar, girar ou transformar o símbolo em um contorno.
- Não aplicar brilho, sombra, degradê, textura, volume ou animação que desmonte a assinatura.
- Não fechar o intervalo entre as formas nem acrescentar pontos, órbitas ou elos.
- Não dividir “Sci” e “Ledger” em cores, pesos ou linhas diferentes.
- Não adicionar selos, checks, slogans ou marcas de terceiros dentro da assinatura.

## Escopo e manutenção

Os arquivos nesta pasta são a referência final desta entrega. A prancha de ImageGen documenta exploração; seus desenhos, cores e miniaturas não são masters. O redesenho vetorial resolveu as diferenças entre miniaturas e símbolos, removeu efeitos e unificou a geometria.

O script [source/build-brand.mjs](source/build-brand.mjs) reproduz os SVGs e PNGs sem iniciar a aplicação. Usa `fontkit` e `playwright` já presentes no repositório, além da fonte incluída. Executar a partir da raiz com `node brand/source/build-brand.mjs`. A tarefa não alterou dependências nem substituiu assets em `static/`.

Ver [README.md](README.md) para o inventário completo e [scope-check.md](scope-check.md) para o escopo verificado.
