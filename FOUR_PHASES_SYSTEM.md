## 🚀 Sistema de 4 Fases - Acompanhamento Completo de Prazos

### 📋 **Visão Geral das 4 Fases**

O processo de revisão de artigos agora é dividido em **4 fases distintas**, cada uma com seu próprio prazo e data fixa:

| Fase | Nome | Duração | Responsáveis | Status |
|------|------|---------|--------------|--------|
| **1** | Initial Review by Peers | 15 dias | Revisores | `in review` |
| **2** | Author Corrections | 15 dias | Autor | `needing corrections` |
| **3** | Final Review by Peers | 10 dias | Revisores | `under final review` |
| **4** | Final Decision | 7 dias | Editorial | `awaiting final decision` |

### 🔧 **Implementação Técnica**

#### 1. **Estrutura de Dados**
```typescript
// Paper.ts
phaseTimestamps?: {
    phase1_initial_review_started?: Date;    // Fase 1: Primeira revisão
    phase2_author_corrections_started?: Date; // Fase 2: Correções do autor  
    phase3_final_review_started?: Date;      // Fase 3: Revisão final
    phase4_final_decision_started?: Date;    // Fase 4: Decisão final
}
```

#### 2. **Enumeração de Fases**
```typescript
// ReviewPhases.ts
export enum ReviewPhase {
    PHASE_1_INITIAL_REVIEW = 'phase1_initial_review',
    PHASE_2_AUTHOR_CORRECTIONS = 'phase2_author_corrections', 
    PHASE_3_FINAL_REVIEW = 'phase3_final_review',
    PHASE_4_FINAL_DECISION = 'phase4_final_decision'
}
```

#### 3. **Mapeamento Status → Fase**
```typescript
export const STATUS_TO_PHASE_MAP = {
    'in review': ReviewPhase.PHASE_1_INITIAL_REVIEW,
    'needing corrections': ReviewPhase.PHASE_2_AUTHOR_CORRECTIONS,
    'under final review': ReviewPhase.PHASE_3_FINAL_REVIEW,
    'awaiting final decision': ReviewPhase.PHASE_4_FINAL_DECISION
};
```

### ⚡ **Captura Automática de Timestamps**

#### **Quando o Status Muda**
```typescript
// Verifica se precisa capturar timestamp
const phaseCapture = shouldCapturePhaseTimestamp(
    currentStatus,    // Status atual
    newStatus,       // Novo status  
    existingTimestamps // Timestamps já existentes
);

if (phaseCapture.shouldCapture) {
    // Captura timestamp FIXO para a nova fase
    updateFields[`phaseTimestamps.${phaseCapture.timestampKey}`] = new Date();
}
```

#### **Proteção Contra Sobrescrita**
- Timestamps são capturados **apenas uma vez** por fase
- Não são alterados mesmo se o artigo for editado
- Garantem prazos reais e definitivos

### 🎯 **Fluxo Completo**

```
📝 Artigo Submetido
    ↓
🔍 FASE 1: Initial Review (15 dias)
    ↓ [Todos revisores terminam]
✏️ FASE 2: Author Corrections (15 dias)  
    ↓ [Autor termina correções]
🔍 FASE 3: Final Review (10 dias)
    ↓ [Revisores verificam correções]
📋 FASE 4: Final Decision (7 dias)
    ↓ [Decisão editorial]
📚 PUBLICADO ou ❌ REJEITADO
```

### 📊 **Vantagens do Sistema**

#### ✅ **Prazos Individuais por Fase**
- Cada fase tem sua duração específica
- Não há interferência entre fases
- Timestamps fixos que nunca mudam

#### ✅ **Flexibilidade de Duração**
- Fase 1: 15 dias (revisão inicial completa)
- Fase 2: 15 dias (tempo para correções)
- Fase 3: 10 dias (verificação mais rápida)
- Fase 4: 7 dias (decisão editorial)

#### ✅ **Acompanhamento Visual**
- Barras de progresso específicas por fase
- Informações contextuais sobre a fase atual
- Status visual (verde/amarelo/vermelho) por urgência

#### ✅ **Compatibilidade**
- Funciona com sistema antigo (fallback)
- Migração gradual e transparente
- Dados históricos preservados

### 🔧 **APIs Criadas**

#### 1. **Captura de Timestamp de Fase**
```
POST /api/papers/set-phase-timestamp
Body: {
    paperId: string,
    phase: ReviewPhase,
    timestampKey: string,
    timestamp: ISO string
}
```

#### 2. **Cálculo de Prazo por Fase**
```typescript
const phaseInfo = getPhaseBasedTimeRemaining(paper, currentUser);
// Retorna informações específicas da fase atual
```

### 📈 **Exemplo de Uso**

```typescript
// Artigo em Fase 2 (Author Corrections)
const paper = {
    status: 'needing corrections',
    phaseTimestamps: {
        phase1_initial_review_started: '2025-01-01T00:00:00Z',
        phase2_author_corrections_started: '2025-01-16T00:00:00Z' // 15 dias depois
    }
};

// Cálculo do prazo
const timeInfo = getPhaseBasedTimeRemaining(paper);
// Resultado:
// - Fase atual: "Author Corrections"  
// - Prazo: 15 dias a partir de 16/01/2025
// - Deadline: 31/01/2025
// - Dias restantes: calculado dinamicamente
```

### 🚀 **Resultado Final**

- ✅ **4 fases bem definidas** com prazos específicos
- ✅ **Timestamps fixos** que nunca mudam  
- ✅ **Captura automática** na mudança de status
- ✅ **Interface visual** com informações por fase
- ✅ **Compatibilidade total** com sistema existente
- ✅ **Flexibilidade** para diferentes durações por fase

**Agora cada fase do processo tem seu próprio cronômetro independente e imutável!** 🎯