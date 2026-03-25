# Payment Hold System (Bloqueio de Fundos)

## Visão Geral

O sistema de bloqueio de fundos funciona similar a um aluguel de carro: o valor é **bloqueado (autorizado)** no início do processo, mas só é **cobrado (capturado)** no final, quando o paper é publicado.

## Fluxo do Processo

### 1. **Submissão Inicial** → Autorização de Bloqueio
   - Usuário clica em "Publish Paper"
   - É redirecionado para `/publish/payment-hold`
   - Página mostra o valor (padrão: R$ 50,00)
   - Usuário insere dados do cartão
   - Sistema chama `/api/stripe/payment-hold` (POST)
   - Stripe autoriza e retorna `paymentIntentId`
   - Sistema confirma o bloqueio com `stripe.confirmCardPayment()`
   - **Nada ainda está cobrado, apenas bloqueado**

### 2. **Preenchimento do Formulário** → Submissão do Paper
   - Usuário é redirecionado para `/publish/new?authorizationCode={paymentIntentId}`
   - Preenche dados do paper (título, autores, abstract, etc.)
   - Sistema valida o `authorizationCode` via Stripe
   - Paper é salvo com os dados do bloqueio:
     ```javascript
     paymentHold: {
       stripePaymentIntentId: "pi_...",
       status: "authorized",
       amount: 5000,
       currency: "brl",
       authorizedAt: "2026-03-18T...",
       ...
     }
     ```

### 3. **Durante a Revisão** → Bloqueio Permanece Ativo
   - O bloqueio pode permanecer ativo enquanto o paper está em revisão
   - Não há cobrança
   - Sem atividade de pagamento

### 4. **Publicação Aprovada** → Captura do Bloqueio
   - Admin aprova a publicação
   - Sistema chama `/api/stripe/payment-hold-capture?paperId={paperId}` (POST)
   - Stripe captura o valor (usando `paymentIntents.capture()`)
   - Status do paper.paymentHold muda para `"captured"`
   - **Neste momento, o valor é efetivamente cobrado**
   - Recebimento é enviado para o email do autor

### 5. **Paper Rejeitado** → Liberação do Bloqueio
   - Se o paper for rejeitado antes de ser publicado
   - Sistema chama `/api/stripe/payment-hold-release?paperId={paperId}` (POST)
   - Stripe cancela o payment intent (usando `paymentIntents.cancel()`)
   - Status muda para `"released"`
   - **O valor bloqueado é liberado, sem cobrança**

## Endpoints da API

### 1. Criar Bloqueio de Pagamento
**POST** `/api/stripe/payment-hold`

**Request:**
```json
{
  "amount": 5000,
  "currency": "brl",
  "email": "author@example.com",
  "paperId": "paper-uuid",
  "description": "Publication Fee Authorization Hold"
}
```

**Response:**
```json
{
  "paymentIntentId": "pi_1234567890abcdef",
  "clientSecret": "pi_1234567890abcdef_secret_abcdef",
  "amount": 5000,
  "currency": "brl",
  "status": "requires_payment_method"
}
```

### 2. Confirmar Bloqueio (com Stripe.js)
Feito no frontend com `stripe.confirmCardPayment(clientSecret, { payment_method })`

### 3. Capturar Bloqueio (Publicação Aprovada)
**POST** `/api/stripe/payment-hold-capture`

**Request:**
```json
{
  "paperId": "paper-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "paymentIntentId": "pi_...",
  "amount": 5000,
  "currency": "brl",
  "capturedAt": "2026-03-18T...",
  "receiptUrl": "https://pay.stripe.com/receipts/..."
}
```

### 4. Liberar Bloqueio (Rejeição)
**POST** `/api/stripe/payment-hold-release`

**Request:**
```json
{
  "paperId": "paper-uuid",
  "reason": "Paper rejected after peer review"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment hold released successfully",
  "paymentIntentId": "pi_...",
  "status": "canceled",
  "releasedAt": "2026-03-18T...",
  "reason": "Paper rejected after peer review"
}
```

### 5. Verificar Status do Bloqueio
**GET** `/api/stripe/payment-hold-capture?paperId={paperId}`

**Response:**
```json
{
  "paperId": "paper-uuid",
  "paymentHold": {
    "status": "authorized",
    "amount": 5000,
    "currency": "brl",
    "authorizedAt": "2026-03-18T...",
    "capturedAt": null,
    "releasedAt": null,
    "stripePaymentIntentId": "pi_..."
  }
}
```

## Fluxo Visual (State Machine)

```
pending (nunca usado)
    ↓
authorized (bloqueio ativo, sem cobrança)
    ├→ captured (publicado, valor cobrado) ✓
    └→ released (rejeitado, bloqueio liberado) ✓
    └→ failed (erro no processamento)
```

## Integração no Paper Schema

```typescript
paymentHold: {
  stripePaymentIntentId: string,      // ID único do Stripe
  status: 'pending' | 'authorized' | 'captured' | 'released' | 'failed',
  amount: number,                     // Valor em centavos
  currency: string,                   // 'brl'
  authorizedAt: Date,                 // Quando foi autorizado
  capturedAt?: Date,                  // Quando foi cobrado (null até captura)
  releasedAt?: Date,                  // Quando foi liberado (null até liberação)
  failureReason?: string,             // Motivo da falha/rejeição
  receiptUrl?: string                 // URL do recebimento Stripe
}
```

## Campos Críticos

| Campo | Requerido | Descrição |
|-------|-----------|-----------|
| `stripePaymentIntentId` | Sim | ID único do Stripe para rastreamento |
| `status` | Sim | Estado atual do bloqueio |
| `amount` | Sim | Valor bloqueado (em centavos) |
| `authorizedAt` | Sim | Data/hora de autorização |
| `capturedAt` | Não | Preenchido apenas após captura |
| `releasedAt` | Não | Preenchido apenas após liberação |
| `receiptUrl` | Não | Para referência financeira |

## Casos de Uso

### ✅ Sucesso Normal
1. Autor autoriza bloqueio (R$ 50)
2. Submete paper
3. Paper em revisão (bloqueio ativo)
4. Admin aprova publicação
5. Sistema captura os R$ 50
6. Autor recebe recebimento

### ✅ Rejeição
1. Autor autoriza bloqueio (R$ 50)
2. Submete paper
3. Paper em revisão (bloqueio ativo)
4. Reviewers rejeitam
5. Sistema libera o bloqueio
6. **Nada é cobrado**
7. Autor pode tentar novamente

### ✅ Cancelamento
1. Autor autoriza bloqueio (R$ 50)
2. Muda de ideia, sai da página
3. Sistema libera bloqueio **automaticamente** (opcional, via webhook)
4. **Nada é cobrado**

## Segurança & Validações

- ✅ `authorizationCode` é validado via Stripe antes de criar o paper
- ✅ Transições de estado são rigorosamente controladas
- ✅ Só "captured" se already "authorized"
- ✅ Só "released" se not "captured"
- ✅ Webhook do Stripe para sincronizar estado se necessário

## Próximas Melhorias

1. **Webhook do Stripe** - Sincronizar estado automaticamente se pagamento falhar
2. **Refund automático** - Se paper for rejeitado após captura, refund automático
3. **Auditoria** - Log de todas as transações financeiras
4. **UI Admin** - Dashboard mostrando status dos bloqueios
5. **Notificações** - Email ao autor quando bloqueio for capturado
6. **Valor variável** - Permitir diferentes valores conforme tipo de paper
