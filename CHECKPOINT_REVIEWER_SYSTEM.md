# CHECKPOINT - Sistema de Revisores por Convite
**Data**: 2024-12-12
**Estado**: Funcional - Sistema completo de convites para revisão

## Funcionalidades Implementadas

### 1. Modelos e Schemas
- `PaperReviewInvitation.ts` - Tipo para convites de revisão de papers
- `PaperReviewInvitationSchema.ts` - Schema Mongoose
- Todos os campos usando `String` para IDs (UUIDs), não ObjectId

### 2. Endpoints API
- `POST /api/paper-reviewer-invitations` - Criar convites para revisores
- `POST /api/paper-reviewer-invitations/[inviteId]` - Aceitar/recusar convites

### 3. Sistema de Notificações
- Notificações criadas automaticamente ao convidar revisor
- Página `/notifications` mostra convites de hub E convites de paper review
- Dois tipos de convites separados: `hubInvitations` e `paperReviewInvitations`

### 4. ReviewQueue
- Papers aceitos são registrados em `ReviewQueue` com status `'accepted'`
- Permite rastrear quais revisores aceitaram revisar quais papers

### 5. Autorização de Acesso
**Arquivos atualizados com verificação ReviewQueue:**
- `/review/inreview/[slug]/+page.server.ts`
- `/review/paperspool/[slug]/+page.server.ts`
- `/review/correction/[slug]/+page.server.ts`

**Lógica**: Revisor tem acesso se:
- Aceitou pelo sistema antigo (`isReviewerAccepted`), OU
- Aceitou via ReviewQueue (`hasAcceptedViaQueue`), OU
- É dono do hub (`isHubOwner`), OU
- É revisor do hub (`isHubReviewer`)

### 6. Visualização no Hub
**Arquivo**: `/hub/view/[id]/+page.server.ts`
- Papers aceitos via ReviewQueue aparecem na query do hub
- Flag `isAcceptedForReview` adicionada aos papers

**Arquivo**: `/hub/view/[id]/+page.svelte`
- Filtro adiciona papers onde `isAcceptedForReview === true`

### 7. Visual Diferenciado
**Arquivo**: `PapersSection.svelte`
- Papers com revisor designado: fundo azul (`bg-blue-50`)
- Badge azul com ícone: "You are the designated reviewer"
- Papers de autor/admin: fundo amarelo (`bg-yellow-50`)

## Estado dos Arquivos Principais

### PaperReviewInvitation Schema
```typescript
reviewer: { type: String, ref: 'User', required: true }
invitedBy: { type: String, ref: 'User', required: true }
```

### ReviewQueue Schema
```typescript
reviewer: { type: String, ref: 'User', required: true }
status: 'pending' | 'accepted' | 'declined'
```

### Hub View Server (fetchPapers)
```typescript
// Buscar papers aceitos via ReviewQueue
const acceptedReviews = await ReviewQueue.find({
    reviewer: locals.user.id,
    hubId: params.id,
    status: 'accepted'
}).lean();
const acceptedPaperIds = acceptedReviews.map(r => r.paperId);

// Incluir na query
{ id: { $in: acceptedPaperIds } }
```

## Próxima Alteração
Filtrar paperspool para mostrar apenas papers SEM hub associado.

## Como Reverter
Se precisar voltar a este estado:
1. Restaurar os arquivos listados acima
2. Manter a lógica de ReviewQueue
3. Papers com hub continuam aparecendo no paperspool
