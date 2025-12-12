# Sistema de Convites de Revisores para Papers Específicos

## Visão Geral

Sistema completo implementado para permitir que administradores de hubs convidem revisores individuais para revisar papers específicos através de notificações, onde o revisor pode aceitar ou recusar diretamente.

## Fluxo do Sistema

### 1. Gerenciamento de Revisores do Hub

- **Todos os usuários** que foram convidados para o hub e aceitaram aparecem na lista do administrador
- O administrador pode gerenciar esses revisores através do componente `ReviewerManagement`
- Revisores do hub estão disponíveis para serem convidados para revisar papers específicos

### 2. Convite Individual para Paper Específico

**Quando o administrador convida um revisor:**

1. O admin usa o componente `PaperReviewerInvite` na página de negociação do paper
2. Seleciona revisores específicos do hub para convidar
3. O sistema cria:
   - Um registro em `PaperReviewInvitation` (novo modelo)
   - Uma notificação para cada revisor convidado do tipo `review_request`

**Arquivos envolvidos:**
- `/api/paper-reviewer-invitations/+server.ts` - Endpoint POST para criar convites
- `PaperReviewerInvite.svelte` - Componente para selecionar e convidar revisores
- `PaperReviewInvitation.ts` (type) - Modelo de dados do convite

### 3. Notificação e Resposta do Revisor

**O revisor recebe:**

1. Uma notificação na página de notificações (`/notifications`)
2. Duas seções distintas:
   - **Hub Invitations**: Convites para se tornar revisor de um hub
   - **Paper Review Invitations**: Convites para revisar papers específicos

**Ao clicar na notificação de paper review:**

- O revisor vê:
  - Título do paper
  - Abstract (resumo)
  - Hub associado
  - Quem enviou o convite
- Pode escolher entre:
  - **Accept**: Aceita revisar o paper
  - **Decline**: Recusa o convite

**Arquivos envolvidos:**
- `/notifications/+page.svelte` - Página com interface de aceitar/recusar
- `/notifications/+page.server.ts` - Carrega convites pendentes

### 4. Processamento da Resposta

**Quando o revisor aceita:**

1. O status do convite é atualizado para `accepted`
2. Uma entrada é criada na `ReviewQueue` com status `accepted`
3. O paper fica **disponível para o revisor** na página de revisão (`/review`)
4. O administrador do hub recebe uma notificação do tipo `reviewer_accepted_review`

**Quando o revisor recusa:**

1. O status do convite é atualizado para `declined`
2. O administrador recebe uma notificação do tipo `reviewer_declined_review`
3. Nenhuma entrada é criada na ReviewQueue

**Arquivos envolvidos:**
- `/api/paper-reviewer-invitations/[inviteId]/+server.ts` - Endpoint POST para aceitar/recusar

### 5. Acesso ao Paper para Revisão

**Papers disponíveis na página de revisão:**

A lógica em `/review/+page.server.ts` foi atualizada para incluir papers onde:
- O revisor aceitou através da `ReviewQueue` (via convite direto)
- O revisor é revisor do hub
- O revisor é dono do hub
- O revisor foi designado diretamente no sistema de peer review

## Modelos de Dados

### PaperReviewInvitation

```typescript
{
    _id: string;
    id: string;
    paper: Paper | string;           // Referência ao paper
    reviewer: User | string;         // Revisor convidado
    invitedBy: User | string;        // Quem enviou o convite
    hubId: Hub | string;             // Hub associado
    status: 'pending' | 'accepted' | 'declined';
    invitedAt: Date;
    respondedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
```

### ReviewQueue (atualizado)

```typescript
{
    _id: string;
    id: string;
    paperId: string;                 // Paper a ser revisado
    reviewer: User;                  // Revisor designado
    peerReviewType: 'open' | 'selected';
    hubId?: string;                  // Hub associado
    isLinkedToHub: boolean;
    status: 'pending' | 'accepted' | 'declined';
    assignedAt: Date;
    respondedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
```

## Tipos de Notificação

Foram adicionados novos tipos:

- `review_request` - Convite para revisar um paper específico
- `reviewer_accepted_review` - Revisor aceitou revisar o paper
- `reviewer_declined_review` - Revisor recusou revisar o paper
- `hub_reviewer_accepted` - Revisor aceitou fazer parte do hub
- `hub_reviewer_declined` - Revisor recusou fazer parte do hub

## Endpoints da API

### POST `/api/paper-reviewer-invitations`

Cria convites para revisores

**Body:**
```json
{
  "paperId": "string",
  "hubId": "string",
  "reviewerIds": ["string"]
}
```

**Resposta:**
```json
{
  "success": true,
  "invitations": 2,
  "message": "Successfully invited 2 reviewer(s)"
}
```

### POST `/api/paper-reviewer-invitations/[inviteId]`

Aceita ou recusa um convite

**Body:**
```json
{
  "action": "accept" | "decline"
}
```

**Resposta:**
```json
{
  "success": true,
  "action": "accept",
  "message": "You accepted the review invitation..."
}
```

## Segurança

- Apenas o dono do hub pode convidar revisores para papers
- Apenas o revisor convidado pode aceitar/recusar seu próprio convite
- Verificação de autenticação em todos os endpoints
- Validação de dados de entrada

## Componentes UI

1. **PaperReviewerInvite**: Seleção e envio de convites
2. **Notifications Page**: Visualização e resposta a convites
   - Seção de convites de hub
   - Seção de convites de paper review
   - Botões de aceitar/recusar
3. **ReviewerManagement**: Gerenciamento geral de revisores do hub

## Fluxo Completo de Exemplo

1. **Admin convida revisor João para paper "IA em Medicina"**
   - Admin acessa `/publish/negotiation/paper-123`
   - Clica em "Invite Reviewers"
   - Seleciona João da lista de revisores do hub
   - Clica em "Send Invitations"

2. **João recebe notificação**
   - João vê notificação em `/notifications`
   - Notificação mostra: "You have been invited to review the paper 'IA em Medicina'"
   - Mostra título, abstract e quem convidou

3. **João aceita o convite**
   - João clica em "Accept"
   - Sistema cria entrada na ReviewQueue
   - Admin recebe notificação: "João accepted the invitation to review 'IA em Medicina'"

4. **Paper disponível para João**
   - João acessa `/review`
   - Vê o paper "IA em Medicina" na lista
   - Pode clicar para revisar

## Arquivos Criados/Modificados

### Novos Arquivos:
- `src/lib/types/PaperReviewInvitation.ts`
- `src/lib/db/schemas/PaperReviewInvitation.ts`
- `src/lib/db/models/PaperReviewInvitation.ts`
- `src/routes/api/paper-reviewer-invitations/[inviteId]/+server.ts`

### Arquivos Modificados:
- `src/lib/types/Notification.ts` - Novos tipos de notificação
- `src/routes/api/paper-reviewer-invitations/+server.ts` - Integração com notificações
- `src/routes/(app)/notifications/+page.svelte` - UI para aceitar/recusar
- `src/routes/(app)/notifications/+page.server.ts` - Carregamento de convites
- `src/routes/(app)/review/+page.server.ts` - Filtro de papers aceitos
- `src/lib/components/PaperReviewerInvite/PaperReviewerInvite.svelte` - Atualização pós-convite

## Melhorias Futuras

1. Sistema de lembretes para convites pendentes
2. Prazo para aceitar convites
3. Dashboard com estatísticas de convites
4. Notificações por email
5. Histórico de convites aceitos/recusados
