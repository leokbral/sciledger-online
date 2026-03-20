# 🔧 Erro Corrigido: Missing Stripe API Key

## O Erro
```
IntegrationError: Missing value for Stripe(): apiKey should be a string.
```

## A Causa
A variável de ambiente `VITE_STRIPE_PUBLIC_KEY` não estava definida ou não estava sendo encontrada.

## ✅ A Solução

### Passo 1: Adicione ao `.env.local`

```env
# Escolha UMA das opções abaixo:

# Opção A (recomendado): Com prefixo VITE_ (exposto ao cliente automaticamente)
VITE_STRIPE_PUBLIC_KEY=pk_test_seus_dados_aqui

# Opção B: Sem prefixo (exposto manualmente via servidor)
STRIPE_PUBLIC_KEY=pk_test_seus_dados_aqui

# Também adicione:
STRIPE_SECRET_KEY=sk_test_seus_dados_aqui
STRIPE_WEBHOOK_SECRET=whsec_seus_dados_aqui
SITE_URL=http://localhost:5173
```

### Passo 2: Obter as Chaves
1. Vá em https://dashboard.stripe.com/keys
2. Copie a **Publishable key** (começa com `pk_`)
3. Copie a **Secret key** (começa com `sk_`)
4. Vá em https://dashboard.stripe.com/webhooks
5. Copie o **Signing secret** (começa com `whsec_`)

### Passo 3: Reinicie o Servidor

```bash
# Pare o servidor (Ctrl+C)
# Depois execute:
npm run dev
```

### Passo 4: Teste

Abra: http://localhost:5173/publish/payment-hold

Você deve ver a página de autorização.

## ✨ Mudanças Implementadas

**Arquivo**: `+page.server.ts` (novo)
- Busca a chave do servidor (mais seguro)
- Suporta `VITE_STRIPE_PUBLIC_KEY` ou `STRIPE_PUBLIC_KEY`
- Retorna erro claro se não estiver configurado

**Arquivo**: `+page.ts` (novo)
- Passa os dados ao componente

**Arquivo**: `+page.svelte` (modificado)
- Usa `data.stripePublicKey` em vez de `import.meta.env`
- Mostra mensagem de configura se Stripe não estiver pronto

## 🆘 Ainda Não Funciona?

1. **Verifique se reiniciou o servidor** após adicionar as variáveis
2. **Verifique se a chave é válida** - Deve começar com `pk_test_` ou `pk_live_`
3. **Verifique o arquivo .env.local** - Não exponha em git/commit
4. **Verifique o navegador** - Abra Console (F12) para ver erros
5. **Verifique no terminal** - npm run dev mostra erros de servidor

## 📚 Próximas Leituras

- `PAYMENT_HOLD_QUICK_START.md` - Começar rápido
- `PAYMENT_HOLD_SETUP_CHECKLIST.md` - Checklist completa
