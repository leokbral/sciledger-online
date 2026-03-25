# ✅ PAYMENT HOLD SYSTEM - SETUP CHECKLIST

## 📋 Antes de Começar

- [ ] Você tem uma conta Stripe (https://stripe.com)
- [ ] Você tem acesso ao Stripe Dashboard
- [ ] Você acesso ao seu `.env.local` ou arquivo de variáveis de ambiente
- [ ] Seu git está atualizado (commit antes de começar)

---

## 🔑 PASSO 1: Obter Chaves do Stripe

### 1.1 Vá para Stripe Dashboard
- [ ] Acesse https://dashboard.stripe.com
- [ ] Faça login
- [ ] Vá em "Developers" → "API Keys" (canto superior direito)

### 1.2 Copie as Chaves
- [ ] Copie **Secret Key** (começa com `sk_`)
  - `sk_test_...` para desenvolvimento
  - `sk_live_...` para produção
- [ ] Copie **Publishable Key** (começa com `pk_`)
  - `pk_test_...` para desenvolvimento
  - `pk_live_...` para produção

---

## 🌐 PASSO 2: Configurar Webhook (IMPORTANTE!)

### 2.1 Criar Webhook
- [ ] No Dashboard Stripe, vá em "Developers" → "Webhooks"
- [ ] Clique em "Add endpoint"
- [ ] Coloque seu URL: `https://seu-site.com/api/stripe/webhook`
  - Desenvolvimento: `http://localhost:5173/api/stripe/webhook`
  - Produção: `https://sciledger.com/api/stripe/webhook`

### 2.2 Selecionar Eventos
- [ ] Marque estes eventos:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `charge.refunded`
- [ ] Clique "Add endpoint"

### 2.3 Copiar Webhook Secret
- [ ] Na lista de webhooks, clique no que você acabou de criar
- [ ] Copie o "Signing secret" (começa com `whsec_`)

---

## 🔐 PASSO 3: Adicionar Variáveis de Ambiente

### 3.1 Abra seu `.env.local`

```bash
# Arquivo: .env.local
```

### 3.2 Adicione as Chaves

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_seus_dados_aqui
VITE_STRIPE_PUBLIC_KEY=pk_test_seus_dados_aqui
STRIPE_WEBHOOK_SECRET=whsec_seus_dados_aqui

# Site URL (para redirecionamentos)
SITE_URL=http://localhost:5173
```

### 3.3 Verificação
- [ ] Salve o arquivo
- [ ] Reinicie seu servidor (`npm run dev`)
- [ ] Não commite `.env.local` (está no `.gitignore`?)

---

## 📱 PASSO 4: Testar Localmente com Stripe CLI (Opcional mas Recomendado)

### 4.1 Instalar Stripe CLI
- [ ] Windows: https://github.com/stripe/stripe-cli/releases
- [ ] Mac: `brew install stripe/stripe-cli/stripe`
- [ ] Linux: https://stripe.com/docs/stripe-cli

### 4.2 Fazer Login
```bash
stripe login
```
- [ ] Você vai para um navegador, confirme o login

### 4.3 Iniciar Webhook Listener
```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
```
- [ ] Você verá: `Ready! Your webhook signing secret is whsec_...`
- [ ] **COPIE e atualize seu `STRIPE_WEBHOOK_SECRET` em `.env.local`**
- [ ] Mantenha este terminal aberto enquanto testa

---

## 🧪 PASSO 5: Testar o Sistema

### 5.1 Acessar a Página de Payment Hold
- [ ] Abra http://localhost:5173/publish/payment-hold
- [ ] Você deve ver:
  - ℹ️ Explicação de como funciona
  - 💰 Valor: R$ 50,00
  - 💳 Campo de cartão de crédito

### 5.2 Preencher Cartão de Teste
- [ ] Cartão: `4242 4242 4242 4242`
- [ ] Data: `12/25` (qualquer data futura)
- [ ] CVC: `123`
- [ ] Nome: qualquer coisa
- [ ] Clique: "Authorize R$ 50.00"

### 5.3 Verificar Redirecionamento
- [ ] Você deve ser redirecionado para:
  `http://localhost:5173/publish/new?authorizationCode=pi_...`
- [ ] O `authorizationCode` deve conter um ID do Stripe

### 5.4 Verificar no Stripe Dashboard
- [ ] Vá para https://dashboard.stripe.com/test/payments
- [ ] Você deve ver uma transação de R$ 50,00
- [ ] Status: `Processing` ou `Requires Action`
- [ ] Clique nela para ver detalhes

---

## 📝 PASSO 6: Integrar na Sua Aplicação

### 6.1 Modificar Botão "Publish Paper"
Encontre onde está o botão "Publish Paper" (geralmente em um dashboard):

**Antes:**
```svelte
onclick={() => goto('/publish/new')}
```

**Depois:**
```svelte
onclick={() => goto('/publish/payment-hold')}
```
- [ ] Salve e teste

### 6.2 Integrar Captura de Pagamento
Encontre onde você **aprova a publicação**:

```typescript
async function approvePublication() {
  // Capture o pagamento ANTES de publicar
  const captureRes = await fetch('/api/stripe/payment-hold-capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paperId })
  });

  const data = await captureRes.json();
  
  if (captureRes.ok) {
    alert('✅ Payment captured! R$ 50.00 charged.');
    // Agora pode publicar
    // ...seu código de publicação
  } else {
    alert(`❌ Error: ${data.error}`);
  }
}
```
- [ ] Adicione este código
- [ ] Teste a aprovação

### 6.3 Integrar Liberação de Bloqueio
Encontre onde você **rejeita o paper**:

```typescript
async function rejectPaper() {
  // Libere o bloqueio ANTES de rejeitar
  const releaseRes = await fetch('/api/stripe/payment-hold-release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paperId, reason: 'Rejected after review' })
  });

  const data = await releaseRes.json();
  
  if (releaseRes.ok) {
    alert('✅ Payment hold released. Author will not be charged.');
    // Agora pode rejeitar
    // ...seu código de rejeição
  }
}
```
- [ ] Adicione este código
- [ ] Teste a rejeição

---

## 🌍 PASSO 7: Preparar para Produção

### 7.1 Variáveis de Ambiente de Produção

```env
# Use chaves LIVE do Stripe
STRIPE_SECRET_KEY=sk_live_seus_dados_aqui
VITE_STRIPE_PUBLIC_KEY=pk_live_seus_dados_aqui
STRIPE_WEBHOOK_SECRET=whsec_live_seus_dados_aqui

# URL de produção
SITE_URL=https://seu-dominio-sciledger.com
```
- [ ] Atualize em seu ambiente de produção

### 7.2 Criar Novo Webhook para Produção
- [ ] No Stripe Dashboard (certifique que você está em "Live" mode)
- [ ] "Developers" → "Webhooks"
- [ ] "Add endpoint"
- [ ] URL: `https://seu-dominio/api/stripe/webhook`
- [ ] Selecione os mesmos eventos
- [ ] Copie o novo `whsec_live_...`

### 7.3 Verificar Transações Reais
- [ ] Acesse https://dashboard.stripe.com/payments
- [ ] Deve estar em modo "Live" (chave de canto)
- [ ] Veja as transações reais dos usuários

---

## ✅ FINAL - Checklist Completa

### Configuração
- [ ] Chaves do Stripe já foram adicionadas
- [ ] Webhook está configurado
- [ ] `.env.local` está atualizado
- [ ] Servidor foi reiniciado

### Testes
- [ ] Página `/publish/payment-hold` funciona
- [ ] Cartão de teste é aceito
- [ ] Redirecionamento para `/publish/new` funciona
- [ ] Transação aparece no Stripe Dashboard
- [ ] Captura de pagamento funciona
- [ ] Liberação de bloqueio funciona

### Integração
- [ ] Botão "Publish" redireciona para payment-hold
- [ ] Aprovação captura o pagamento
- [ ] Rejeição libera o bloqueio
- [ ] Usuários recebem feedback correto

### Producção
- [ ] Chaves LIVE do Stripe foram obtidas
- [ ] Webhook de produção foi criado e testado
- [ ] Variáveis de ambiente foram atualizadas
- [ ] Primeira transação REAL foi testada e funcionou

---

## 🆘 Troubleshooting

### "Stripe key not configured"
- [ ] Verifique se `VITE_STRIPE_PUBLIC_KEY` está no `.env.local`
- [ ] Reinicie o servidor (`npm run dev`)
- [ ] Verifique no navegador → Inspect → Console (procure por erros)

### "Failed to create payment hold"
- [ ] Verifique se o `STRIPE_SECRET_KEY` está correto
- [ ] Verifique se a transação falhou no Stripe Dashboard
- [ ] Se usou cartão inválido em testes, tente `4242 4242 4242 4242`

### "Webhook not working"
- [ ] Se está rodando local: use **Stripe CLI** (`stripe listen`)
- [ ] Se em produção: verifique URL do webhook
- [ ] No Dashboard → Webhooks → veja a aba "Events" para erros

### "Payment already captured"
- [ ] Você tentou capturar 2x
- [ ] Isto é OK - retorna sucesso
- [ ] O sistema é idempotente (seguro chamar múltiplas vezes)

---

## 📚 Documentação Disponível

Leia estes arquivos para entender melhor:

1. **`PAYMENT_HOLD_README.md`** ← COMECE AQUI
   - Resumo visual do que foi implementado
   
2. **`PAYMENT_HOLD_SYSTEM.md`**
   - Documentação técnica completa
   - States e transições
   - Todos os endpoints

3. **`PAYMENT_HOLD_SETUP.md`**
   - Guia detalhado de configuração
   - Testando com Stripe CLI
   - Troubleshooting

4. **`PAYMENT_HOLD_INTEGRATION_EXAMPLES.ts`**
   - Exemplos de código prontos
   - Funções para copiar e colar
   - Templates de email

---

## 🚀 Sucesso!

Se todos os itens da checklist estão verificados ✅, seu sistema de bloqueio de fundos está **100% funcional**!

Se tiver dúvidas, consulte a documentação acima ou contact Stripe Support.

**Bom desenvolvimento! 🎉**
