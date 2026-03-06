# Implementação de Material Suplementar

## Descrição Geral
Foi implementada uma funcionalidade completa para que os usuários possam adicionar links para material suplementar em repositórios públicos (GitHub, Figshare, Zenodo, OSF, Dataverse, etc.) aos seus papers no SciLedger.

## Arquivos Modificados

### 1. Schema e Base de Dados

#### `src/lib/db/schemas/PaperSchema.ts`
- Adicionado novo campo `supplementaryMaterials` ao schema
- Array de objetos com estrutura:
  - `id`: UUID único
  - `title`: Título/descrição do material
  - `url`: URL do repositório
  - `type`: Enum ('github' | 'figshare' | 'zenodo' | 'osf' | 'dataverse' | 'other')
  - `description`: Descrição detalhada (opcional)
  - `createdAt`: Data de adição
  - `updatedAt`: Data da última atualização

### 2. Tipos TypeScript

#### `src/lib/types/Paper.ts`
- Adicionado tipo `supplementaryMaterials` como array opcional no tipo `Paper`
- Mantém compatibilidade com estrutura existente

#### `src/lib/types/PaperPublishStoreData.ts`
- Criado novo tipo `SupplementaryMaterial` com as propriedades do material suplementar
- Estendido `PaperPublishStoreData` para incluir campo `supplementaryMaterials`

### 3. Componentes do Formulário

#### `src/lib/Pages/Paper/PaperPublishPage.svelte`
- Adicionadas variáveis de estado para gerenciar materiais suplementares:
  - `supplementaryMaterials`: array de materiais
  - `newSupplementaryMaterial`: formulário para adicionar novo material
- Implementadas funções:
  - `addSupplementaryMaterial()`: validação e adição de novo material
  - `removeSupplementaryMaterial(index)`: remoção de material
- Adicionada nova seção HTML com:
  - Exibição de materiais já adicionados em cards
  - Formulário para adicionar novo material com campos:
    - Título/Descrição (obrigatório)
    - Tipo de repositório (dropdown com 6 opções)
    - URL (obrigatório, validado)
    - Descrição adicional (opcional)
  - Buttons para adicionar e remover materiais

### 4. Endpoints de Salvamento

#### `src/routes/(app)/publish/new/+server.ts`
- Adicionado suporte a `supplementaryMaterials` na desestruturação de dados
- Implementado salvamento do array de materiais com spread operator

#### `src/routes/(app)/publish/edit/[slug]/+server.ts`
- Adicionado suporte a `supplementaryMaterials` na atualização
- Usa spread operator para incluir apenas se houver materiais

#### `src/routes/(app)/publish/inreview/[slug]/+server.ts`
- Adicionado suporte a `supplementaryMaterials` na submissão para revisão

#### `src/routes/(app)/publish/published/[slug]/+server.ts`
- Adicionado suporte a `supplementaryMaterials` na publicação final

### 5. Componente de Exibição

#### `src/lib/components/SupplementaryMaterials.svelte` (NOVO)
Componente reutilizável para exibir materiais suplementares com:
- **Header estilizado** com ícone de pacote e contagem
- **Lista de materiais** com:
  - Ícone específico para cada tipo de repositório (emoji)
  - Título do material
  - Badge com tipo de repositório
  - URL clicável (link externo)
  - Descrição (se disponível)
  - Data de adição
  - Botão de remover
- **Footer informativo** com dica para usuários
- **Estilização responsiva** com dark mode suportado
- **Animações hover** para melhor UX

### 6. Layouts de Visualização

#### `src/routes/(app)/articles/[slug]/+page.svelte`
- Importado componente `SupplementaryMaterials`
- Adicionada seção de exibição após o conteúdo principal

#### `src/routes/(app)/publish/view/[slug]/+page.svelte`
- Importado componente `SupplementaryMaterials`
- Adicionada seção de exibição após o conteúdo do paper

#### `src/routes/(app)/publish/published/[slug]/+page.svelte`
- Importado componente `SupplementaryMaterials`
- Adicionada seção de exibição após o conteúdo publicado

#### `src/routes/(app)/review/published/[slug]/+page.svelte`
- Importado componente `SupplementaryMaterials`
- Adicionada seção de exibição após o conteúdo revisado

## Funcionalidades

### Para Autores
1. **Adicionar Materiais**: Formulário intuitivo no editor de papers
2. **Validação**: 
   - Título e URL são obrigatórios
   - URL é validada como URL válida
   - Duplicatas são evitadas com mensagem de alerta
3. **Edição**: Possibilidade de remover materiais antes de submeter
4. **Persistência**: Os materiais são salvos no banco de dados junto com o paper

### Para Leitores
1. **Visualização Limpa**: Componente bem formatado com icons e cores
2. **Acesso Fácil**: Links clicáveis que abrem em nova aba
3. **Informações Contextuais**: Descrição e tipo de repositório visíveis
4. **Dark Mode**: Suporte completo a tema escuro

## Tipos de Repositório Suportados

- 🐙 **GitHub**: Para código-fonte e configurações
- 📊 **Figshare**: Para dados e visualizações
- 🎓 **Zenodo**: Para datasets com DOI
- 🔗 **Open Science Framework (OSF)**: Para projetos colaborativos
- 📚 **Dataverse**: Para repositórios de dados
- 📦 **Other**: Para outros tipos de repositórios

## Fluxo de Dados

```
Usuário adiciona material no formulário
         ↓
PaperPublishPage valida e armazena em $store
         ↓
savePaper() envia para endpoint apropriado
         ↓
+server.ts salva no MongoDB
         ↓
Material aparece na visualização do paper
```

## Validações Implementadas

1. ✅ Título/descrição obrigatório
2. ✅ URL obrigatória e validada
3. ✅ Prevenção de duplicatas
4. ✅ Geração automática de UUID para cada material
5. ✅ Timestamps automáticos (createdAt, updatedAt)

## Compatibilidade

- ✅ Backward compatible (campo é opcional)
- ✅ Funciona em pages de draft, edição, revisão e publicação
- ✅ Suporta dark mode
- ✅ Responsivo para mobile
- ✅ Acessível (ARIA labels, semantic HTML)

## Próximos Passos (Opcional)

1. Adicionar validação de acesso à URL (verificar se link é válido)
2. Gerar preview automático de repositórios (usando APIs públicas)
3. Adicionar contador de acessos aos materiais
4. Permitir edição de materiais já adicionados
5. Adicionar busca e filtro por tipo de material
6. Integrar com Altmetrics para rastrear impacto dos materiais
