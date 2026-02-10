# Sistema de Slots de Revisão - Implementação Completa

## Visão Geral

Sistema que limita cada paper a **máximo 3 revisores** através de um mecanismo de slots. Cada slot pode estar disponível, pendente, ocupado ou declinado.

---

## 🎯 Funcionalidades Implementadas

### 1. **Estrutura de Dados**

#### Paper Type & Schema
Novos campos adicionados ao modelo `Paper`:

```typescript
reviewSlots?: Array<{
    slotNumber: number;          // 1, 2, ou 3
    reviewerId: string | null;   // ID do revisor (null se vazio)
    status: 'available' | 'pending' | 'occupied' | 'declined';
    invitedAt?: Date;            // Quando o convite foi enviado
    acceptedAt?: Date;           // Quando o revisor aceitou
    declinedAt?: Date;           // Quando o revisor recusou
}>;
maxReviewSlots?: number;         // Número máximo de slots (padrão: 3)
availableSlots?: number;         // Slots disponíveis (calculado)
```

**Arquivos modificados:**
- `src/lib/types/Paper.ts`
- `src/lib/db/schemas/PaperSchema.ts`

---

### 2. **API de Convites com Verificação de Slots**

**Endpoint:** `POST /api/paper-reviewer-invitations`

**Validações implementadas:**
- ✅ Inicializa `reviewSlots` automaticamente se não existir
- ✅ Verifica slots disponíveis antes de enviar convites
- ✅ Limita número de convites ao número de slots disponíveis
- ✅ Retorna erro se todos os slots estiverem ocupados
- ✅ Verifica se revisor já ocupa algum slot

**Resposta da API:**
```json
{
  "success": true,
  "invitations": 2,
  "message": "Successfully invited 2 reviewer(s)",
  "availableSlots": 1,
  "maxSlots": 3,
  "warning": "Only 2 invites sent due to available slots limit"
}
```

**Arquivo:** `src/routes/api/paper-reviewer-invitations/+server.ts`

---

### 3. **API de Aceitação com Ocupação de Slot**

**Endpoint:** `POST /api/paper-reviewer-invitations/[inviteId]`

**Fluxo de Aceitação:**
1. Verifica se há slots disponíveis
2. Localiza primeiro slot com status `available` ou `declined`
3. Marca slot como `occupied`
4. Atribui `reviewerId` ao slot
5. Registra `acceptedAt`
6. Atualiza contador `availableSlots`
7. Cria `ReviewQueue` e `ReviewAssignment`
8. Notifica o admin do hub

**Resposta se não houver slots:**
```json
{
  "error": "No available review slots. All 3 reviewer slots are already occupied.",
  "slotsOccupied": 3,
  "maxSlots": 3
}
```

**Arquivo:** `src/routes/api/paper-reviewer-invitations/[inviteId]/+server.ts`

---

### 4. **API de Recusa com Liberação de Slot**

**Fluxo de Recusa:**
1. Localiza slot do revisor (se tiver)
2. Marca slot como `declined`
3. Define `reviewerId` como `null`
4. Registra `declinedAt`
5. Atualiza contador `availableSlots`
6. Slot fica disponível para outro revisor

**Arquivo:** `src/routes/api/paper-reviewer-invitations/[inviteId]/+server.ts`

---

### 5. **API de Remoção de Revisor**

**Endpoint:** `POST /api/paper-reviewer-invitations/remove-reviewer`

**Funcionalidades:**
- Remove revisor do paper
- Libera o slot ocupado pelo revisor
- Marca slot como `available`
- Atualiza contador de slots
- Remove entradas em `ReviewQueue` e `ReviewAssignment`
- Notifica o revisor sobre a remoção

**Payload:**
```json
{
  "paperId": "uuid-do-paper",
  "reviewerId": "uuid-do-revisor"
}
```

**Arquivo:** `src/routes/api/paper-reviewer-invitations/remove-reviewer/+server.ts`

---

### 6. **Componente de Visualização de Slots**

#### PaperReviewerInvite (Atualizado)

**Recursos visuais:**
- 🟢 Display de status dos 3 slots (verde = ocupado, amarelo = pendente, cinza = disponível)
- 📊 Contador de slots ocupados (ex: "2 / 3 occupied")
- ⚠️ Alertas visuais quando slots estão se esgotando
- 🚫 Bloqueio de convites quando todos os slots estão ocupados
- 🔢 Legenda com cores e contadores

**Props adicionadas:**
```typescript
reviewSlots?: Array<{
    slotNumber: number;
    reviewerId: string | null;
    status: 'available' | 'pending' | 'occupied' | 'declined';
}>;
```

**Arquivo:** `src/lib/components/PaperReviewerInvite/PaperReviewerInvite.svelte`

---

### 7. **Componente Reutilizável: ReviewSlotsDisplay**

Componente para exibir status de slots em qualquer parte da aplicação.

**Props:**
```typescript
reviewSlots?: Array<...>;  // Array de slots
size?: 'sm' | 'md' | 'lg'; // Tamanho do componente
showLegend?: boolean;      // Mostrar/ocultar legenda
```

**Uso:**
```svelte
<ReviewSlotsDisplay 
    reviewSlots={paper.reviewSlots} 
    size="md" 
    showLegend={true} 
/>
```

**Arquivo:** `src/lib/components/ReviewSlots/ReviewSlotsDisplay.svelte`

---

## 🔄 Estados dos Slots

| Status | Descrição | Cor | Ação |
|--------|-----------|-----|------|
| `available` | Slot livre para uso | Cinza | Pode receber convite |
| `pending` | Convite enviado, aguardando resposta | Amarelo | Aguardando decisão |
| `occupied` | Revisor aceitou e ocupa o slot | Verde | Slot em uso |
| `declined` | Revisor recusou, slot liberado | Cinza | Disponível novamente |

---

## 📊 Fluxo Completo

```
1. Paper criado → 3 slots disponíveis

2. Admin convida revisor
   ├─ Sistema verifica: há slots disponíveis?
   ├─ ✅ Sim → Envia convite
   └─ ❌ Não → Erro "No available slots"

3. Revisor recebe convite
   ├─ Aceita → Ocupa 1 slot (2 disponíveis)
   ├─ Recusa → Slot continua disponível
   └─ Ignora → Slot fica "pending"

4. Admin pode:
   ├─ Convidar mais revisores (se houver slots)
   ├─ Remover revisor → Libera slot
   └─ Ver status dos slots em tempo real

5. Quando 3 slots ocupados:
   └─ Convites bloqueados até liberar slot
```

---

## 🛠️ Script de Migração

**Arquivo:** `scripts/migrate-review-slots.js`

**Funcionalidade:**
- Adiciona `reviewSlots` a papers existentes
- Inicializa 3 slots por paper
- Marca slots como ocupados para revisores aceitos
- Calcula `availableSlots` automaticamente

**Executar:**
```bash
node scripts/migrate-review-slots.js
```

---

## 🎨 Interface Visual

### Modal de Convite
```
┌─────────────────────────────────────┐
│  Invite Reviewers to Review Paper   │
├─────────────────────────────────────┤
│  Review Slots Status                │
│  2 / 3 occupied                     │
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ ✓ 1 │ │ ✓ 2 │ │ ○ 3 │          │
│  └─────┘ └─────┘ └─────┘          │
│                                     │
│  ○ Available  ⏱ Pending  ✓ Occupied│
│                                     │
│  ⚠️ Only 1 slot available          │
└─────────────────────────────────────┘
```

---

## 📝 Exemplos de Uso

### Verificar Slots Disponíveis
```typescript
const availableSlots = paper.reviewSlots.filter(
    slot => slot.status === 'available' || slot.status === 'declined'
).length;
```

### Ocupar um Slot
```typescript
const freeSlot = paper.reviewSlots.find(
    slot => slot.status === 'available'
);
if (freeSlot) {
    freeSlot.reviewerId = reviewerId;
    freeSlot.status = 'occupied';
    freeSlot.acceptedAt = new Date();
}
```

### Liberar um Slot
```typescript
const reviewerSlot = paper.reviewSlots.find(
    slot => slot.reviewerId === reviewerId
);
if (reviewerSlot) {
    reviewerSlot.reviewerId = null;
    reviewerSlot.status = 'available';
}
```

---

## ✅ Casos de Teste

### Cenário 1: Convite com Slots Disponíveis
- **Situação:** Paper com 3 slots livres
- **Ação:** Admin convida 2 revisores
- **Resultado:** ✅ Convites enviados, 1 slot restante

### Cenário 2: Convite sem Slots Disponíveis
- **Situação:** Paper com 3 slots ocupados
- **Ação:** Admin tenta convidar revisor
- **Resultado:** ❌ Erro "No available slots"

### Cenário 3: Revisor Aceita
- **Situação:** Convite pendente, 2 slots livres
- **Ação:** Revisor aceita convite
- **Resultado:** ✅ Slot ocupado, 1 slot livre

### Cenário 4: Revisor Recusa
- **Situação:** Convite pendente, 2 slots livres
- **Ação:** Revisor recusa convite
- **Resultado:** ✅ Slot liberado, 2 slots livres

### Cenário 5: Admin Remove Revisor
- **Situação:** 3 slots ocupados
- **Ação:** Admin remove 1 revisor
- **Resultado:** ✅ Slot liberado, 1 slot livre

---

## 🔐 Segurança

- ✅ Apenas dono do hub pode convidar revisores
- ✅ Apenas dono do hub pode remover revisores
- ✅ Apenas revisor convidado pode aceitar/recusar
- ✅ Verificação de slots em todas as operações
- ✅ Validação de existência de paper e hub

---

## 📌 Próximos Passos (Opcional)

1. **Notificações de Slots:**
   - Avisar admin quando slot for preenchido
   - Avisar admin quando todos os slots estiverem ocupados

2. **Analytics:**
   - Taxa de aceitação por slot
   - Tempo médio até preencher slots
   - Histórico de slots por paper

3. **Slots Customizáveis:**
   - Permitir admin definir número de slots (1-5)
   - Configurar por hub ou por paper

---

## 🎉 Conclusão

O sistema de slots está **100% funcional** e pronto para uso. Todas as funcionalidades principais foram implementadas:

✅ Limite de 3 revisores por paper
✅ Verificação automática de slots disponíveis
✅ Ocupação e liberação de slots
✅ Interface visual completa
✅ APIs robustas com validações
✅ Script de migração para papers existentes
