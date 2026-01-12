# Sistema de Prazo Customizado de Revisão

## Visão Geral
Sistema que permite ao administrador do hub personalizar o prazo de revisão para cada revisor individualmente e iniciar automaticamente o processo de revisão ao aceitar o convite.

## Diferenças: Paper do Hub vs Paper Livre

### Paper do Hub
- Tem `hubId` definido
- `isLinkedToHub = true`
- Administrador do hub gerencia convites e prazos
- Revisores são do pool de revisores do hub

### Paper Livre
- `hubId` é null/undefined
- `isLinkedToHub = false`
- Autor do paper gerencia processo
- Qualquer revisor pode aceitar (peer review aberto)

## Implementação

### 1. Schemas Atualizados

#### PaperReviewInvitation
**Novos campos adicionados:**
```typescript
customDeadlineDays: Number (padrão: 15) - Prazo em dias customizado pelo admin
reviewAssignmentId: String - Referência ao ReviewAssignment criado
```

**Arquivo:** `src/lib/db/schemas/PaperReviewInvitation.ts`

#### Type PaperReviewInvitation
**Arquivo:** `src/lib/types/PaperReviewInvitation.ts`

### 2. Componentes UI

#### PaperReviewerInvite (Atualizado)
**Funcionalidades adicionadas:**
- Campo de entrada para prazo customizado (1-90 dias)
- Valor padrão: 15 dias
- Preview da data de deadline
- Envio do prazo customizado na API

**Arquivo:** `src/lib/components/PaperReviewerInvite/PaperReviewerInvite.svelte`

**Estado adicionado:**
```typescript
let customDeadlineDays = $state(15); // Prazo padrão
```

#### ManageReviewerDeadline (Novo)
**Funcionalidades:**
- Gerenciar deadline individual de revisor após aceite
- Visualizar deadline atual e dias restantes
- Definir novo prazo a partir de hoje
- Notificar revisor sobre mudança

**Arquivo:** `src/lib/components/ReviewerManagement/ManageReviewerDeadline.svelte`

**Props:**
```typescript
paperId: string
reviewer: User
currentDeadline?: Date
reviewAssignmentId?: string
```

### 3. Endpoints da API

#### POST /api/paper-reviewer-invitations
**Atualizado para aceitar:**
```json
{
  "paperId": "string",
  "hubId": "string", 
  "reviewerIds": ["string"],
  "customDeadlineDays": 15  // Novo campo (opcional, padrão 15)
}
```

**Arquivo:** `src/routes/api/paper-reviewer-invitations/+server.ts`

#### POST /api/paper-reviewer-invitations/[inviteId]
**Funcionalidade ao aceitar (action: 'accept'):**

1. Cria `ReviewQueue` entry (status: 'accepted')
2. **NOVO:** Cria `ReviewAssignment` automaticamente:
   - Status: 'accepted' (já aceito)
   - `acceptedAt`: Data atual
   - `deadline`: Calculado com base em `customDeadlineDays` do convite
   - `hubId` e `isLinkedToHub` configurados
3. Atualiza `PaperReviewInvitation` com `reviewAssignmentId`
4. Adiciona revisor ao array `reviewers` do Paper
5. Notifica o admin do hub sobre aceitação

**Arquivo:** `src/routes/api/paper-reviewer-invitations/[inviteId]/+server.ts`

#### POST /api/review-assignments/update-deadline (Novo)
**Permite atualizar deadline de um revisor específico:**

**Body:**
```json
{
  "reviewAssignmentId": "string", // Opcional se paperId e reviewerId fornecidos
  "paperId": "string",
  "reviewerId": "string",
  "newDeadlineDays": 15
}
```

**Funcionalidades:**
- Apenas hub owner pode atualizar
- Atualiza ou cria ReviewAssignment
- Calcula deadline a partir de "agora + X dias"
- Notifica revisor sobre mudança
- Valida prazo (1-90 dias)

**Arquivo:** `src/routes/api/review-assignments/update-deadline/+server.ts`

## Fluxo Completo

### Fluxo de Convite com Prazo Customizado

1. **Admin convida revisor:**
   - Abre modal de convite
   - Seleciona revisores
   - Define prazo customizado (ex: 20 dias)
   - Envia convite

2. **Sistema cria:**
   - `PaperReviewInvitation` com `customDeadlineDays: 20`
   - Notificação para revisor

3. **Revisor aceita:**
   - Clica em "Accept" na página de notificações
   - Sistema AUTOMATICAMENTE:
     - Cria `ReviewQueue` (status: 'accepted')
     - Cria `ReviewAssignment` (status: 'accepted')
     - Define `deadline = now + 20 dias`
     - Atualiza `PaperReviewInvitation.reviewAssignmentId`
     - Adiciona revisor em `Paper.reviewers[]`
     - Notifica admin do hub
   - **Revisor pode começar a revisar IMEDIATAMENTE**

4. **Admin gerencia deadline (opcional):**
   - Usa componente `ManageReviewerDeadline`
   - Altera prazo para 30 dias
   - Sistema atualiza `ReviewAssignment.deadline`
   - Revisor é notificado da mudança

### Diferenciação Hub vs Livre

#### Paper do Hub
```typescript
if (paper.hubId && paper.isLinkedToHub) {
  // Sistema de convites do hub
  // Admin controla convites e prazos
  // ReviewAssignment é criado automaticamente ao aceitar
}
```

#### Paper Livre
```typescript
if (!paper.hubId) {
  // Sistema aberto
  // Qualquer revisor pode aceitar
  // Sem controle de prazos pelo admin
}
```

## Benefícios

1. **Flexibilidade:** Admin pode ajustar prazos por revisor conforme necessidade
2. **Início Imediato:** Revisor pode começar assim que aceita (não precisa aguardar atribuição manual)
3. **Rastreamento:** ReviewAssignment criado automaticamente permite monitorar deadlines
4. **Notificações:** Todos são informados sobre mudanças de prazo
5. **Sem Conflitos:** Sistema diferencia claramente papers de hub e livres

## Validações

- Prazo mínimo: 1 dia
- Prazo máximo: 90 dias
- Apenas hub owner pode:
  - Convidar revisores
  - Definir prazos customizados
  - Alterar deadlines após aceite
- Revisor só pode aceitar/recusar seu próprio convite

## Notificações Criadas

1. **Convite enviado:** `review_request` para revisor
2. **Convite aceito:** `reviewer_accepted_review` para admin
3. **Convite recusado:** `reviewer_declined_review` para admin
4. **Deadline atualizado:** `system` para revisor

## Modelos Envolvidos

- `PaperReviewInvitation` - Convite de revisão
- `ReviewQueue` - Fila de revisões aceitas
- `ReviewAssignment` - Assignment com deadline e tracking
- `Paper` - Documento sendo revisado
- `User` - Revisores e admin
- `Hub` - Hub organizador
- `Notification` - Notificações do sistema

## Arquivos Modificados

### Schemas
- `src/lib/db/schemas/PaperReviewInvitation.ts`
- `src/lib/types/PaperReviewInvitation.ts`

### Componentes
- `src/lib/components/PaperReviewerInvite/PaperReviewerInvite.svelte`
- `src/lib/components/ReviewerManagement/ManageReviewerDeadline.svelte` (novo)

### APIs
- `src/routes/api/paper-reviewer-invitations/+server.ts`
- `src/routes/api/paper-reviewer-invitations/[inviteId]/+server.ts`
- `src/routes/api/review-assignments/update-deadline/+server.ts` (novo)

## Próximos Passos (Opcional)

1. Adicionar visualização de deadline na página de revisão
2. Alertas automáticos quando deadline se aproxima
3. Dashboard com status de todos os reviewers e deadlines
4. Histórico de mudanças de deadline
5. Extensão automática de deadline em casos especiais
