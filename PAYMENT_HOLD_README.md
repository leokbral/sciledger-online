# 🚀 Sistema de Bloqueio de Fundos - Resumo da Implementação

## O que foi feito?

Implementei um **sistema de bloqueio de fundos (payment hold)** similar a aluguel de carro, onde:

1. ✅ **Bloqueio de Fundos** - No início (R$ 50,00 padrão)
   - Usuário autoriza o cartão
   - Valor fica bloqueado, mas NÃO é cobrado

2. ✅ **Submissão do Paper** - Após autorização
   - Usuário preenche dados do paper
   - Sistema valida o bloqueio
   - Paper é salvo com dados de pagamento

3. ✅ **Captura de Pagamento** - Na publicação aprovada
   - Admin aprova a publicação
   - Sistema captura o valor bloqueado
   - **Agora sim é cobrado**

4. ✅ **Liberação de Bloqueio** - Se rejeitado
   - Paper é rejeitado
   - Bloqueio é cancelado
   - **Nada é cobrado**

---

## 📁 Arquivos Criados/Modificados

### 📊 Database
- `src/lib/db/schemas/PaperSchema.ts` - Adicionado campo `paymentHold`

### 💳 API Endpoints
| Rota | Método | O que faz |
|------|--------|----------|
| `/api/stripe/payment-hold` | POST/GET | Cria e recupera autorização |
| `/api/stripe/payment-hold-confirm` | POST | Confirma o pagamento |
| `/api/stripe/payment-hold-capture` | POST/GET | Cobra o valor autorizado |
| `/api/stripe/payment-hold-release` | POST | Libera o bloqueio (rejeição) |
| `/api/stripe/webhook` | POST | Sincroniza eventos do Stripe |

### 🎨 Páginas/Componentes
| Arquivo | Descrição |
|---------|-----------|
| `/publish/payment-hold/+page.svelte` | **NOVA** - Tela de autorização de bloqueio |
| `/publish/new/+page.svelte` | Modificado - Agora requer authorizationCode |
| `/publish/new/+server.ts` | Modificado - Valida bloqueio e salva dados |

### 📚 Documentação
| Arquivo | Conteúdo |
|---------|----------|
| `PAYMENT_HOLD_SYSTEM.md` | Documentação completa do sistema |
| `PAYMENT_HOLD_SETUP.md` | Guia de setup e configuração |
| `PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts` | Exemplos de integração |

---

## 🔧 Como Usar

### 1️⃣ Configurar Variáveis de Ambiente

Adicione ao seu `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_seus_dados_aqui
VITE_STRIPE_PUBLIC_KEY=pk_test_seus_dados_aqui
STRIPE_WEBHOOK_SECRET=whsec_seus_dados_aqui
SITE_URL=http://localhost:5173
```

### 2️⃣ Redirecionar para Payment Hold

Quando o usuário clicar em "Publish Paper", ele deve ir para:

```svelte
onclick={() => goto('/publish/payment-hold')}
```

**Ou** deixar o redirecionamento automático (já está implementado em `/publish/new`)

### 3️⃣ Capturar Pagamento na Aprovação

Quando aprovar publicação:

```typescript
const res = await fetch('/api/stripe/payment-hold-capture', {
  method: 'POST',
  body: JSON.stringify({ paperId })
});
```

### 4️⃣ Liberar Bloqueio na Rejeição

Quando rejeitar paper:

```typescript
const res = await fetch('/api/stripe/payment-hold-release', {
  method: 'POST',
  body: JSON.stringify({ paperId, reason: 'Paper rejected' })
});
```

---

## 🧪 Testar Localmente

### Teste 1: Fluxo Completo de Sucesso

```bash
# 1. Abra http://localhost:5173/publish/payment-hold
# 2. Use cartão de teste: 4242 4242 4242 4242
# 3. Data: 12/25, CVC: 123
# 4. Deve redirecionar para /publish/new?authorizationCode=pi_...
# 5. Preencha e salve o paper
# 6. Verifique no Stripe Dashboard o payment intent com status 'requires_capture'
```

### Teste 2: Capturar Pagamento

```bash
# Via curl (substitua PAPER_ID)
curl -X POST http://localhost:5173/api/stripe/payment-hold-capture \
  -H "Content-Type: application/json" \
  -d '{"paperId": "PAPER_ID"}'

# No Dashboard Stripe: status muda para 'succeeded'
```

### Teste 3: Liberar Bloqueio

```bash
curl -X POST http://localhost:5173/api/stripe/payment-hold-release \
  -H "Content-Type: application/json" \
  -d '{"paperId": "PAPER_ID", "reason": "Rejected"}'

# No Dashboard Stripe: status muda para 'canceled'
```

---

## 📊 Fluxo Visual

```
┌─────────────────────────────────────────────────┐
│ Usuário clica "Publish Paper"                   │
└──────────────────┬──────────────────────────────┘
                   ↓
        ┌─────────────────────┐
        │ /publish/payment-hold│ ← NOVO!
        │ Autoriza o bloqueio │
        │ Cartão → Stripe     │
        └──────────┬──────────┘
                   ↓
        ┌──────────────────────────┐
        │ Bloqueio autorizado ✓    │
        │ authorizationCode = pi_..│
        └──────────┬───────────────┘
                   ↓
        ┌─────────────────────────┐
        │ /publish/new            │
        │ Preenche dados do paper │
        │ Valida bloqueio         │
        └──────────┬──────────────┘
                   ↓
        ┌──────────────────────┐
        │ Paper salvo com       │
        │ paymentHold.status=   │
        │ "authorized"         │
        └──────────┬───────────┘
                   ↓
        ┌──────────────────────────┐
        │ Revisão do Paper        │
        │ (bloqueio permanece ativo)
        └──────────┬───────────────┘
                   ↓
            ┌──────────────────┐
            │ Aprovado? ou      │
            │ Rejeitado?       │
            └─┬────────────────┬┘
              │                │
              ↓ SIM            ↓ NÃO
        ┌──────────────────┐  ┌─────────────────┐
        │ /api/stripe/     │  │ /api/stripe/    │
        │ payment-hold-    │  │ payment-hold-   │
        │ capture          │  │ release         │
        │                  │  │                 │
        │ status =         │  │ status =        │
        │ "captured"       │  │ "released"      │
        │                  │  │                 │
        │ 💳 COBRADO       │  │ ✓ LIBERADO      │
        │ R$ 50,00         │  │ (sem cobrança)  │
        └──────────────────┘  └─────────────────┘
```

---

## 📝 Documentação Disponível

**Para entender melhor**, leia:

1. **`PAYMENT_HOLD_SYSTEM.md`** - Explicação detalhada do sistema
   - Como funciona
   - Estados possíveis
   - Exemplos de uso

2. **`PAYMENT_HOLD_SETUP.md`** - Guia de configuração
   - Variáveis de ambiente
   - Webhook do Stripe
   - Troubleshooting

3. **`PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts`** - Exemplos de código
   - Como integrar sua aprovação de publicação
   - Como integrar sua rejeição
   - Funções prontas para copiar

---

## 🔑 Campos Importantes no Paper

Após autorização, o paper tem:

```typescript
paper.paymentHold = {
  stripePaymentIntentId: "pi_1234567890abcdef",
  status: "authorized", // → "captured" ou "released"
  amount: 5000, // em centavos (R$ 50,00)
  currency: "brl",
  authorizedAt: "2026-03-18T...",
  capturedAt: null, // preenchido após captura
  releasedAt: null, // preenchido após liberação
}
```

---

## ⚠️ Próximos Passos

1. **Integrar na sua página de aprovação**
   - Vá para onde você aprova publicação
   - Adicione a chamada de captura
   - Veja exemplos em `PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts`

2. **Integrar na sua página de rejeição**
   - Adicione a chamada de liberação
   - Notifique o usuário que não será cobrado

3. **Configurar webhook do Stripe** (opcional, recomendado)
   - Mantém o sistema sincronizado
   - Veja guia em `PAYMENT_HOLD_SETUP.md`

4. **Adicionar notificações por email**
   - Quando bloqueio é autorizado
   - Quando pagamento é capturado
   - Quando bloqueio é liberado

---

## 🆘 Dúvidas Frequentes

### "Por que não cobrar já na submissão?"
Porque o autor pode desistir durante a revisão. Só cobramos quando o paper é publicado, como prometido.

### "E se o cartão expirar?"
O Stripe vai avisar. O webhook sincrona o status. O admin pode tentar capturar novamente.

### "Posso mudar o valor (R$ 50)?"
Sim! Está em `/publish/payment-hold/+page.svelte` na linha:
```typescript
let paymentAmount = 50_00; // Mude para 100_00 (100) ou 25_00 (25)
```

### "E se precisar reembolsar?"
Se foi capturado:
1. Vá ao Stripe Dashboard
2. Procure a transação
3. Clique "Refund"
O sistema atualizará automaticamente via webhook.

---

## 📞 Suporte

Para dúvidas sobre:
- **Stripe**: https://stripe.com/docs
- **Sistema**: Ver `PAYMENT_HOLD_SYSTEM.md` e `PAYMENT_HOLD_SETUP.md`
- **Código**: Ver `PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts`

---

✅ **Tudo está pronto para usar!**
