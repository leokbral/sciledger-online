# Payment Hold System - Setup & Deployment Guide

## Variáveis de Ambiente Requeridas

No seu `.env.local` ou `.env`, adicione:

```env
# Stripe Keys (obtém em https://dashboard.stripe.com/keys)
STRIPE_SECRET_KEY=sk_test_... (ou sk_live_...)
STRIPE_PUBLIC_KEY=pk_test_... (ou pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_... (obtém em Dashboard > Webhooks)

# Site URL (para redirects de sucesso/cancelamento)
SITE_URL=http://localhost:5173  (ou sua URL de produção)
```

## Configuração do Stripe

### 1. Webhook de Sincronização

1. Vá para [Dashboard Stripe → Webhooks](https://dashboard.stripe.com/webhooks)
2. Clique em "Add endpoint"
3. Insira a URL: `https://seu-site.com/api/stripe/webhook`
4. Selecione os eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. Copie o "Signing secret" e adicione em `STRIPE_WEBHOOK_SECRET`

### 2. Testando Localmente

Use o Stripe CLI para testar webhooks:

```bash
# 1. Instale Stripe CLI
# Windows: https://github.com/stripe/stripe-cli/releases
# Mac: brew install stripe/stripe-cli/stripe
# Linux: curl https://raw.githubusercontent.com/stripe/stripe-cli/master/install.sh | sh

# 2. Faça login
stripe login

# 3. Inicie o forwarding para seu webhook
stripe listen --forward-to localhost:5173/api/stripe/webhook

# 4. Copie o signing secret e adicione em .env.local
# stripe listen --forward-to ... vai mostrar: whsec_test_...
```

## Fluxo de Integração com Suas Páginas

### Modificações Necessárias

#### 1. Botão "Publish Paper" (sua página de dashboard)

Antes:
```svelte
onclick={() => goto('/publish/new')}
```

Depois:
```svelte
onclick={() => goto('/publish/payment-hold')}
```

#### 2. Alternativamente, no seu layout ou componente principal

Se você tiver um componente `PaperPublishPage` ou similar, adicione a verificação:

```svelte
<script>
  import { goto } from '$app/navigation';
  
  async function publishPaper() {
    // Redireciona para payment-hold
    // Que depois redireciona para /publish/new após autorização
    goto('/publish/payment-hold');
  }
</script>

<button onclick={publishPaper}>Publish Paper</button>
```

## Fluxo de Captura de Pagamento

### Quando Publicação é Aprovada

Encontre onde você aprova a publicação (provavelmente em um componente admin ou rota):

```typescript
// Quando aprova a publicação
async function approvePublication(paperId: string) {
  try {
    // 1. Capturar o bloqueio de pagamento
    const captureRes = await fetch('/api/stripe/payment-hold-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId })
    });

    const captureData = await captureRes.json();
    if (!captureRes.ok) {
      console.error('Failed to capture payment:', captureData.error);
      alert(`Payment capture error: ${captureData.error}`);
      return;
    }

    // 2. Atualizar status do paper para published
    const paperRes = await post(`/api/papers/${paperId}/approve-publication`, {});
    
    // 3. Notificar usuário
    alert(`Paper published! Payment of R$ ${(captureData.amount / 100).toFixed(2)} has been charged.`);
    
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred during publication approval');
  }
}
```

### Quando Publicação é Rejeitada

```typescript
// Quando rejeita a publicação
async function rejectPaper(paperId: string, rejectionReason: string) {
  try {
    // 1. Liberar o bloqueio de pagamento
    const releaseRes = await fetch('/api/stripe/payment-hold-release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        paperId,
        reason: rejectionReason 
      })
    });

    const releaseData = await releaseRes.json();
    if (!releaseRes.ok) {
      console.error('Failed to release payment:', releaseData.error);
      alert(`Payment release error: ${releaseData.error}`);
      return;
    }

    // 2. Atualizar status do paper para rejected
    const paperRes = await post(`/api/papers/${paperId}/reject`, {
      reason: rejectionReason
    });
    
    // 3. Notificar usuário
    alert(`Paper rejected. The payment hold has been released. No charge will be made.`);
    
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred during rejection');
  }
}
```

## Monitoramento e Debugging

### Ver Status do Bloqueio

```bash
# GET request para verificar
curl "http://localhost:5173/api/stripe/payment-hold-capture?paperId=YOUR_PAPER_ID"
```

### Dashboard Stripe

1. Vá para [Stripe Dashboard - Payments](https://dashboard.stripe.com/payments)
2. Procure pelo `paperId` nos metadados
3. Veja o status: `succeeded`, `requires_capture`, `canceled`, etc.

### Logs do Stripe

```bash
# Se estiver usando Stripe CLI
stripe logs tail
```

## Testes

### Teste 1: Autorização Bem-sucedida

1. Vá para `/publish/payment-hold`
2. Use cartão de teste: `4242 4242 4242 4242`
3. Data: `12/25` (qualquer data futura)
4. CVC: `123`
5. Qualquer nome e endereço
6. Clique "Authorize"
7. Deve ser redirecionado para `/publish/new?authorizationCode=pi_...`

### Teste 2: Falha de Pagamento

Use cartão: `4000 0000 0000 0002` - vai falhar
Ou: `4000 0000 0000 0069` - vai exigir 3D Secure

### Teste 3: Captura Manual

```bash
# Após autorização bem-sucedida
curl -X POST http://localhost:5173/api/stripe/payment-hold-capture \
  -H "Content-Type: application/json" \
  -d '{"paperId": "your-paper-id"}'
```

### Teste 4: Liberação Manual

```bash
curl -X POST http://localhost:5173/api/stripe/payment-hold-release \
  -H "Content-Type: application/json" \
  -d '{"paperId": "your-paper-id", "reason": "Test release"}'
```

## Valores de Teste no Stripe

### Cartões Visa
- ✅ Sucesso: `4242 4242 4242 4242`
- ❌ Declínio: `4000 0000 0000 0002`
- ⚠️ 3D Secure: `4000 0000 0000 0069`
- ⚠️ Exige action: `4000 0025 0000 3155`

### CPF/Documento (se usar Stripe Brasil)
- Qualquer número: `000.000.000-00`

## Troubleshooting

### "Stripe key not configured"
- Verifique se `VITE_STRIPE_PUBLIC_KEY` está em `.env.local`
- Ou defina em variável global no `svelte.config.js`:
  ```js
  export const config = {
    env: {
      publicPrefix: 'VITE_'
    }
  }
  ```

### "Payment intent not found"
- Verifique o `authorizationCode` na URL
- Confirme que foi criado há menos de 24h
- Verifique no Stripe Dashboard se o intent existe

### "Payment already captured"
- Paper já foi publicado
- Chame novamente a mesma função - retorna sucesso

### Webhook não está funcionando
- Verifique no Stripe Dashboard > Webhooks > History
- Procure por respostas de erro (4xx, 5xx)
- Verifique se `STRIPE_WEBHOOK_SECRET` está correto
- Se mudar webhook secret, atualize na URL de webhook também

## Produção

### Antes de Deploy

1. ✅ Trocar `sk_test_` para `sk_live_` (STRIPE_SECRET_KEY)
2. ✅ Trocar `pk_test_` para `pk_live_` (VITE_STRIPE_PUBLIC_KEY)
3. ✅ Atualizar webhook URL para domínio de produção
4. ✅ Novo webhook secret para produção
5. ✅ Testar fluxo completo na staging
6. ✅ Revisar política de reembolso

### Monitoramento Pós-Deploy

```bash
# Monitorar eventos de webhook
stripe logs tail --live

# Revisar transações reais
# Vá para https://dashboard.stripe.com/payments
```

## Suporte

Para problemas com Stripe:
- [Documentação Stripe](https://stripe.com/docs)
- [Suporte Stripe](https://support.stripe.com)
- Email: seu-email@sciledger.com
