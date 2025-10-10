## Barras de Progresso de Tempo de Correção - Implementação Completa

### ✅ Funcionalidades Implementadas

1. **Componente CorrectionProgressBar.svelte**
   - Barra de progresso visual para mostrar o tempo decorrido
   - Diferentes estilos baseados no status (normal, aviso, urgente, atrasado)
   - Duas fases de correção: Revisores (15 dias) e Autores (15 dias)
   - Informações detalhadas de prazo e progresso

2. **Lógica de Cálculo de Prazos**
   - **Para Revisores**: 15 dias a partir da data de aceitação da revisão
   - **Para Autores**: 15 dias a partir do término de todas as revisões
   - Campo `correctionAcceptedAt` adicionado ao modelo Paper para controle preciso

3. **Integração nos Componentes**
   - `PaperPreview.svelte`: Versão compacta das barras de progresso
   - `MyPapers.svelte`: Barras de progresso na listagem pessoal
   - `/publish/inreview/[slug]`: Página de artigo em revisão
   - `/review/correction/[slug]`: Página de correção pelo revisor
   - `/publish/corrections/[slug]`: Página de correções pelo autor

4. **Fases de Correção**
   - **Fase 1 - Revisão pelos Pares**: Status "in review"
     - ⚡ **INDIVIDUAL**: Cada revisor tem 15 dias a partir da SUA data de aceitação
     - ⚡ **INDEPENDENTE**: Revisores podem ter prazos diferentes baseados em quando aceitaram
     - Barra mostra progresso individual do revisor atual
   
   - **Fase 2 - Correção pelo Autor**: Status "needing corrections"  
     - ⚡ **MUDANÇA DE ROTA**: Inicia quando o artigo muda para "needing corrections"
     - ⚡ **TODOS FINALIZARAM**: Significa que todos os revisores terminaram
     - 15 dias para o autor fazer as correções (baseado em updatedAt)

5. **Status Visuais**
   - 🟢 **Verde**: Mais de 5 dias restantes
   - 🟡 **Amarelo**: 3-5 dias restantes (aviso)
   - 🟠 **Laranja**: 1-2 dias restantes (urgente)  
   - 🔴 **Vermelho**: Prazo vencido (atrasado)

6. **Componente Responsivo**
   - 3 tamanhos: `sm`, `md`, `lg`
   - Versão detalhada e compacta
   - Informações de deadline formatadas

### 🔧 Arquivos Modificados

1. **Novos Componentes**
   - `src/lib/components/CorrectionProgressBar/CorrectionProgressBar.svelte`

2. **Modelos Atualizados**
   - `src/lib/types/Paper.ts` - Adicionado `correctionAcceptedAt?: Date`
   - `src/lib/db/schemas/PaperSchema.ts` - Campo no schema MongoDB

3. **Helpers Aprimorados**
   - `src/lib/helpers/correctionTimeHelper.ts` - Lógica melhorada para 15 dias

4. **Páginas Integradas**
   - `src/routes/(app)/publish/inreview/[slug]/+page.svelte`
   - `src/routes/(app)/review/correction/[slug]/+page.svelte`
   - `src/routes/(app)/publish/corrections/[slug]/+page.svelte`

5. **Componentes de Listagem**
   - `src/lib/PaperList/PaperPreview.svelte`
   - `src/lib/MyPapers.svelte`
   - `src/lib/Pages/Publish/PublishPage.svelte`
   - `src/lib/Pages/Review/ReviewPage.svelte`

### 📋 Como Usar

```svelte
<!-- Versão completa com detalhes -->
<CorrectionProgressBar 
  {paper} 
  currentUser={user} 
  showDetails={true} 
  size="lg" 
/>

<!-- Versão compacta -->
<CorrectionProgressBar 
  {paper} 
  currentUser={user} 
  showDetails={false} 
  size="sm" 
/>
```

### 🎯 Fluxo de Funcionamento

1. **Artigo enviado para revisão** → Status: "in review"
2. **Revisores aceitam a tarefa** → Inicia contagem de 15 dias (Fase 1)
3. **Todos os revisores finalizam** → Status muda para "needing corrections"
4. **Autor aceita correções** → Inicia contagem de 15 dias (Fase 2)  
5. **Autor finaliza correções** → Processo completo

### ⚡ Nova Lógica Implementada

**Para Revisores (Tempo Individual):**
```
Revisor A aceita em 01/01/2025 → Prazo até 16/01/2025
Revisor B aceita em 05/01/2025 → Prazo até 20/01/2025  
Revisor C aceita em 10/01/2025 → Prazo até 25/01/2025
```

**Para Autores (Baseado na Mudança de Rota):**
```
Todos revisores terminam → Status muda para "needing corrections" 
updatedAt = 30/01/2025 → Prazo do autor até 14/02/2025
```

### 🚀 Resultado Final

- ✅ **Prazos Individuais**: Cada revisor tem seu próprio cronômetro de 15 dias
- ✅ **Mudança de Rota**: Autores têm 15 dias a partir da transição de status
- ✅ **Barras Contextuais**: Mostram informação específica do usuário atual
- ✅ **Cálculos Precisos**: Baseados em datas reais de aceitação individual
- ✅ **Interface Responsiva**: Diferentes níveis de detalhe por contexto
- ✅ **Integração Completa**: Funciona em todo o sistema existente