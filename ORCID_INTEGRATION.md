# Integração ORCID OAuth 2.0

Sistema completo de autenticação via ORCID integrado ao fluxo de login existente do SciLedger.

## 📋 Configuração

### 1. Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# ORCID OAuth Configuration
ORCID_CLIENT_ID=seu_client_id_aqui
ORCID_CLIENT_SECRET=seu_client_secret_aqui
ORCID_REDIRECT_URI=http://localhost:5173/orcid/callback

# Para produção, use:
# ORCID_REDIRECT_URI=https://seudominio.com/orcid/callback
```

### 2. Obter Credenciais ORCID

#### Ambiente de Desenvolvimento (Sandbox):
1. Acesse: https://sandbox.orcid.org/developer-tools
2. Registre uma aplicação
3. Configure a redirect URI: `http://localhost:5173/orcid/callback`
4. Copie o `Client ID` e `Client Secret`

#### Ambiente de Produção:
1. Acesse: https://orcid.org/developer-tools
2. Registre uma aplicação de produção
3. Configure a redirect URI: `https://seudominio.com/orcid/callback`
4. Copie o `Client ID` e `Client Secret`

**IMPORTANTE**: Para usar produção, altere as URLs em:
- [/orcid/redirect/+server.ts](src/routes/orcid/redirect/+server.ts) linha 27: `https://orcid.org/oauth/authorize`
- [/orcid/callback/+server.ts](src/routes/orcid/callback/+server.ts) linha 49: `https://orcid.org/oauth/token`

## 🚀 Como Usar

### No Frontend (Svelte)

Adicione um botão de login ORCID na sua página de login:

```svelte
<!-- src/routes/(auth)/login/+page.svelte -->
<script lang="ts">
  function loginWithOrcid() {
    // Redireciona para iniciar OAuth flow
    window.location.href = '/orcid/redirect';
  }
</script>

<button on:click={loginWithOrcid}>
  <img src="/orcid-logo.svg" alt="ORCID" />
  Login com ORCID
</button>

<!-- Ou simplesmente um link -->
<a href="/orcid/redirect">
  <img src="/orcid-logo.svg" alt="ORCID" />
  Login com ORCID
</a>
```

### Exibir Erros

Se houver erro, o usuário é redirecionado para `/login?error=codigo_erro`:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  
  $: errorMessage = {
    orcid_config_error: 'Erro na configuração ORCID',
    orcid_authorization_denied: 'Você negou a autorização',
    missing_authorization_code: 'Código de autorização ausente',
    token_exchange_failed: 'Falha ao obter token',
    orcid_callback_failed: 'Erro ao processar login ORCID'
  }[$page.url.searchParams.get('error') || ''];
</script>

{#if errorMessage}
  <div class="error">{errorMessage}</div>
{/if}
```

## 🔄 Fluxo de Autenticação

```
1. Usuário clica em "Login com ORCID"
   ↓
2. Redireciona para /orcid/redirect
   ↓
3. /orcid/redirect redireciona para ORCID.org
   ↓
4. Usuário faz login no ORCID e autoriza
   ↓
5. ORCID redireciona para /orcid/callback?code=...
   ↓
6. /orcid/callback:
   - Troca code por access_token
   - Busca dados do usuário (ORCID iD, nome, email)
   - Verifica se usuário já existe (por ORCID ou email)
   
   Se encontrou por ORCID:
     → Atualiza tokens
     → Faz login
   
   Se encontrou por email:
     → Associa ORCID ao usuário existente
     → Atualiza tokens
     → Faz login
   
   Se não encontrou:
     → Cria novo usuário
     → emailVerified = true
     → Faz login
   ↓
7. Usuário autenticado via cookie JWT
```

## 📁 Arquivos Criados/Modificados

### Criados:
- ✅ [src/routes/orcid/redirect/+server.ts](src/routes/orcid/redirect/+server.ts) - Inicia OAuth
- ✅ [src/routes/orcid/callback/+server.ts](src/routes/orcid/callback/+server.ts) - Processa callback
- ✅ [src/lib/types/orcid.ts](src/lib/types/orcid.ts) - Tipos TypeScript

### Modificados:
- ✅ [src/lib/db/schemas/UserSchema.ts](src/lib/db/schemas/UserSchema.ts) - Adicionados campos ORCID

## 🔐 Campos ORCID no UserSchema

```typescript
{
  orcid: string,              // ORCID iD (ex: 0000-0002-1825-0097)
  orcidAccessToken: string,   // Token de acesso
  orcidRefreshToken: string,  // Token de renovação
  orcidTokenExpiry: Date,     // Data de expiração do token
  password: string (opcional) // Senha agora é opcional
}
```

## 🎯 Lógica de Negócio

### Usuário Novo (primeira vez com ORCID):
- Cria novo usuário
- `emailVerified = true` (se email disponível no ORCID)
- Salva ORCID iD e tokens
- Username gerado: `@nome_123456` (últimos dígitos do ORCID)
- Senha temporária aleatória (usuário pode definir uma depois)
- Usuário pode preencher país e data de nascimento depois

### Usuário Existente (já tem conta com mesmo email):
- **NÃO** cria novo usuário
- Associa ORCID ao usuário existente
- Atualiza tokens ORCID
- `emailVerified = true`
- Faz login normalmente

### Usuário Retornando (já fez login com ORCID antes):
- Encontra usuário pelo ORCID iD
- Atualiza tokens
- Faz login normalmente

## 🛡️ Segurança

- ✅ Tokens armazenados de forma segura no banco
- ✅ Validação de parâmetros OAuth
- ✅ Tratamento de erros em todas as etapas
- ✅ Verificação de duplicidade de email
- ✅ Cookies HttpOnly para sessão
- ✅ Credenciais ORCID em variáveis de ambiente

## 🧪 Testando

### Modo Sandbox (Desenvolvimento):

1. Configure `.env` com credenciais sandbox
2. Acesse: http://localhost:5173/orcid/redirect
3. Use uma conta ORCID sandbox para testar
4. Verifique o callback e criação/login do usuário

### Modo Produção:

1. Altere URLs nas rotas (conforme documentado acima)
2. Configure `.env` com credenciais produção
3. Teste com conta ORCID real

## 📊 Dados Obtidos do ORCID

- ✅ ORCID iD (identificador único)
- ✅ Nome (firstName)
- ✅ Sobrenome (lastName)
- ✅ Email (se público no perfil ORCID)
- ✅ Access Token
- ✅ Refresh Token
- ✅ Data de expiração do token

## 🔄 Renovar Token ORCID (Futuro)

O refresh token pode ser usado para renovar o access token quando expirar:

```typescript
// Exemplo para implementar depois
const refreshOrcidToken = async (refreshToken: string) => {
  const response = await fetch('https://orcid.org/oauth/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: ORCID_CLIENT_ID,
      client_secret: ORCID_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  
  return await response.json();
};
```

## 📝 Próximos Passos

- [ ] Adicionar botão "Login com ORCID" na UI
- [ ] Testar fluxo completo em sandbox
- [ ] Adicionar página de perfil para usuário preencher dados faltantes (país, dob)
- [ ] Implementar renovação automática de token
- [ ] Adicionar opção para desconectar ORCID da conta
- [ ] Deploy em produção com credenciais reais

## 🐛 Troubleshooting

### Erro: "ORCID credentials not configured"
- Verifique se as variáveis de ambiente estão corretas no `.env`
- Reinicie o servidor de desenvolvimento

### Erro: "token_exchange_failed"
- Verifique se o `ORCID_REDIRECT_URI` corresponde exatamente ao configurado no ORCID
- Verifique se `CLIENT_ID` e `CLIENT_SECRET` estão corretos

### Erro: "missing_authorization_code"
- O callback foi chamado sem o código de autorização
- Pode indicar que o usuário cancelou a autorização

## 📚 Referências

- [ORCID OAuth Documentation](https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/)
- [ORCID API Guide](https://info.orcid.org/documentation/integration-guide/)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
