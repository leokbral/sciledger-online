# 📋 RESUMO DE ALTERAÇÕES - PAYMENT HOLD SYSTEM

Data: 18 de Março de 2026
Sistema: SciLedger Online
Feature: Sistema de Bloqueio de Fundos (Payment Hold)

---

## 🔍 Visão Geral

Um sistema de **autorização de pagamento com bloqueio de fundos** foi implementado, similar a aluguel de carros:

1. ✅ **Autorização**: Valor é bloqueado no cartão do autor
2. ✅ **Permanência**: Bloqueio fica ativo durante revisão (sem cobrança)
3. ✅ **Captura**: Se publicado, valor é finalmente cobrado
4. ✅ **Liberação**: Se rejeitado, bloqueio é cancelado (sem cobrança)

---

## 📂 ARQUIVOS CRIADOS (7 novos)

### 🔌 API Endpoints (5 arquivos)

```
src/routes/api/stripe/
├── payment-hold/+server.ts              ← Criar bloqueio
├── payment-hold-confirm/+server.ts      ← Confirmar
├── payment-hold-capture/+server.ts      ← Cobrar
├── payment-hold-release/+server.ts      ← Liberar
└── webhook/+server.ts                   ← Sincronizar com Stripe
```

### 🎨 Frontend (1 arquivo)

```
src/routes/(app)/publish/
└── payment-hold/+page.svelte            ← Tela de autorização
```

### 📖 Documentação (6 arquivos)

```
PAYMENT_HOLD_README.md                   ← LEIA PRIMEIRO!
PAYMENT_HOLD_SYSTEM.md                   ← Documentação detalhada
PAYMENT_HOLD_SETUP.md                    ← Guia de setup
PAYMENT_HOLD_SETUP_CHECKLIST.md          ← Step-by-step checklist
PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts     ← Códigos prontos para usar
```

---

## ✏️ ARQUIVOS MODIFICADOS (2 arquivos)

### 1. Database Schema
**Arquivo**: `src/lib/db/schemas/PaperSchema.ts`

**O que foi adicionado**:
```typescript
paymentHold: {
  stripePaymentIntentId: string,    // ID único do Stripe
  status: string,                    // 'pending' | 'authorized' | 'captured' | 'released' | 'failed'
  amount: number,                    // Valor em centavos
  currency: string,                  // 'brl'
  authorizedAt: Date,                // Quando foi autorizado
  capturedAt?: Date,                 // Quando foi cobrado
  releasedAt?: Date,                 // Quando foi liberado
  failureReason?: string,            // Motivo se falhou
  receiptUrl?: string                // URL do recebimento
}
```

### 2. Rota de Submissão

**Arquivo**: `src/routes/(app)/publish/new/+page.svelte`

**Mudanças**:
- ✅ Adiciona verificação de `authorizationCode` na URL
- ✅ Se não tiver, redireciona para `/publish/payment-hold`
- ✅ Passa `authorizationCode` para backend

**Arquivo**: `src/routes/(app)/publish/new/+server.ts`

**Mudanças**:
- ✅ Valida `paymentAuthorizationCode` do frontend
- ✅ Verifica com Stripe se a autorização é válida
- ✅ Armazena dados de pagamento no paper
- ✅ Rejeita submissão se não tiver autorização válida

---

## 🔧 COMPONENTES DO SISTEMA

### Flow Chart
```
User → /publish/payment-hold → Card Input
              ↓
        Stripe.js confirmCardPayment()
              ↓
        /api/stripe/payment-hold (POST)
              ↓
        Stripe autoriza bloqueio
              ↓
        Redireciona → /publish/new?authorizationCode=pi_...
              ↓
        Valida authCode via /api/stripe/payment-hold (GET)
              ↓
        Salva paper com paymentHold.status = "authorized"
              ↓
        ┌─────────────────────────────────────┐
        │ Durante revisão (sem cobrança)       │
        │ Bloqueio permanece ativo            │
        └─────────────────────────────────────┘
              ↓
        Publicado? ↓                  Rejeitado? ↓
              
        /api/stripe/              /api/stripe/
        payment-hold-capture      payment-hold-release
        (POST)                    (POST)
              ↓                         ↓
        status = "captured"       status = "released"
        R$ 50,00 COBRADO          SEM COBRANÇA
        💳 ✓                       ✅ ✓
```

---

## 🔐 Variáveis de Ambiente (4 necessárias)

```env
STRIPE_SECRET_KEY=sk_test_...          # Chave secreta Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_...     # Chave pública Stripe
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret
SITE_URL=http://localhost:5173         # URL para redirecionamentos
```

---

## 📊 Estados Possíveis

```
┌─────────┐
│ pending │ ← Nunca usado (a menos que webhook falhe)
└────┬────┘
     │
     ↓
┌───────────┴──────────────────┐
│                              │
↓                              ↓
authorized                  failed ✗
(bloqueio ativo)           (erro no processo)
│
├──→ captured ✓            released ✓
│    (publicado,            (rejeitado,
│     R$ 50 cobrado)        sem cobrança)
│
└──→ released ✓
     (cancelado,
      sem cobrança)
```

---

## 💻 Como Chamar as APIs

### Criar Bloqueio
```typescript
const res = await fetch('/api/stripe/payment-hold', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 5000,           // em centavos
    currency: 'brl',
    email: 'author@example.com',
    paperId: 'paper-id',
    description: 'Publication Fee'
  })
});
const data = await res.json(); // { paymentIntentId, clientSecret, ... }
```

### Capturar Bloqueio
```typescript
const res = await fetch('/api/stripe/payment-hold-capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paperId: 'paper-id' })
});
const data = await res.json(); // { success: true, amount, ... }
```

### Liberar Bloqueio
```typescript
const res = await fetch('/api/stripe/payment-hold-release', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paperId: 'paper-id',
    reason: 'Paper rejected'
  })
});
const data = await res.json(); // { success: true, ... }
```

### Verificar Status
```typescript
const res = await fetch(`/api/stripe/payment-hold-capture?paperId=paper-id`);
const data = await res.json(); // { paymentHold: { status, amount, ... } }
```

---

## 🔐 Segurança Implementada

✅ **Validação de Stripe**
- Cada papel valida seu `authorizationCode` com Stripe
- Rejeita se status não é 'succeeded' ou 'requires_capture'

✅ **Webhook Verification**
- Assinatura do webhook é verificada
- Eventos fake são rejeitados

✅ **Transições de Estado Rigorosas**
- Só pode capturar se está 'authorized'
- Só pode liberar se não está 'captured'
- Idempotente (chamar 2x = OK)

✅ **Rastreamento de Auditoria**
- Cada transação tem timestamps
- Razão de rejeição/liberação é registrada
- Receipt URL do Stripe é armazenado

---

## 🧪 Teste Rápido

**Local** (5 minutos):

```bash
# 1. Variáveis de ambiente
export VITE_STRIPE_PUBLIC_KEY=pk_test_seus_dados
export STRIPE_SECRET_KEY=sk_test_seus_dados

# 2. Abrir página
# http://localhost:5173/publish/payment-hold

# 3. Usar cartão de teste
# 4242 4242 4242 4242 → 12/25 → 123

# 4. Deve redirecionar para /publish/new?authorizationCode=pi_...

# 5. Ver transação em https://dashboard.stripe.com/test/payments
```

---

## 📚 Onde Encontrar Cada Coisa

| O que você quer... | Arquivo para ler |
|-------------------|-----------------|
| Entender o fluxo geral | `PAYMENT_HOLD_README.md` |
| Documentação técnica | `PAYMENT_HOLD_SYSTEM.md` |
| Setup passo-a-passo | `PAYMENT_HOLD_SETUP_CHECKLIST.md` |
| Codigo de exemplo | `PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts` |
| Troubleshooting | `PAYMENT_HOLD_SETUP.md` |
| API detalhes | `PAYMENT_HOLD_SYSTEM.md` + código |

---

## 🚀 Próximos Passos

1. **Ler documentação**
   - [ ] Leia `PAYMENT_HOLD_README.md` (5 min)
   
2. **Configurar Stripe**
   - [ ] Siga `PAYMENT_HOLD_SETUP_CHECKLIST.md` (20 min)
   
3. **Testar localmente**
   - [ ] Execute teste rápido acima (5 min)
   
4. **Integrar seu código**
   - [ ] Modifique botão "Publish" para redirecionar
   - [ ] Adicione captura na aprovação
   - [ ] Adicione liberação na rejeição
   - [ ] Veja exemplos em `PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts`

5. **Deploy em produção**
   - [ ] Use chaves LIVE do Stripe
   - [ ] Configure novo webhook
   - [ ] Teste 1 transação real
   - [ ] Monitore no Dashboard

---

## ✅ Checklist Final

- [ ] Seu `.env.local` tem as 4 variáveis
- [ ] Stripe webhook está criado
- [ ] Página `/publish/payment-hold` abre
- [ ] Cartão de teste funciona
- [ ] `authorizationCode` é passado à próxima página
- [ ] Paper é salvo com `paymentHold` data
- [ ] Você leu todos os "README"s
- [ ] Você integrou captura na aprovação
- [ ] Você integrou liberação na rejeição

---

## 💡 Resumo em Uma Linha

> Bloqueio de fundos (hold) é criado na submissão, capturado na publicação, liberado na rejeição.

---

**Sistema pronto para usar! 🎉**

Qualquer dúvida, consulte a documentação ou arquivo `PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts`.
