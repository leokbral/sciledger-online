# Diagnóstico ORCID em Produção

## Seu Problema Atual
```
https://scideep.imd.ufrn.br/login?error=orcid_auth_failed
```

## Passo 1: Verificar Configuração em Produção

1. **SSH no servidor** em `/var/www/sciledger/`

2. **Verifique as variáveis de ambiente:**
```bash
cat .env | grep -E "NODE_ENV|ORCID_"
```

Você deve ver:
```
NODE_ENV=production
ORCID_CLIENT_ID=APP-6M2AKUYLCFMIFVQP
ORCID_CLIENT_SECRET=22c13c95-ebb4-4ac4-b084-09d5cd1e3cac
ORCID_REDIRECT_URI=https://scideep.imd.ufrn.br/orcid/callback
```

**Importante**: **Sem espaços** no início de `ORCID_REDIRECT_URI`!

## Passo 2: Testar Endpoint de Debug

Após deploy, acesse via navegador:
```
https://scideep.imd.ufrn.br/api/orcid/debug
```

Você deve ver JSON como:
```json
{
  "timestamp": "2026-03-03T...",
  "nodeEnv": "production",
  "orcidConfigured": true,
  "orcidConfig": {
    "clientId": "APP-6M...",
    "redirectUri": "https://scideep.imd.ufrn.br/orcid/callback",
    "hasSecret": true
  },
  "mongodbConnected": true
}
```

### Se `orcidConfigured` for `false`:
- Verifi que `NODE_ENV=production` está definido
- Verifique que `ORCID_CLIENT_ID` contém `APP-`
- Verifique que `ORCID_REDIRECT_URI` **não tem espaço** no início

### Se `nodeEnv` for `development`:
- Seu servidor está rodando em modo development
- Mude `.env`: `NODE_ENV=production`
- Reinicie o serviço

## Passo 3: Monitorar Logs ao Testar ORCID

1. **Em um terminal**, monitore os logs do servidor:
```bash
# Se usando systemd:
journalctl -u sciledger -f

# Se usando pm2:
pm2 logs

# Se usando docker:
docker logs -f sciledger
```

2. **Em outro terminal**, teste o login:
```bash
curl "https://scideep.imd.ufrn.br/api/orcid/authorize"
```

3. **Nos logs, procure por:**
   - `[ORCID Authorize]` - Inicialização do fluxo
   - `[OrcidConfig]` - Configuração sendo carregada
   - `ERROR` ou `failed` - Problemas

## Passo 4: Verificar Erros Específicos

### Erro: "Config is NULL - ORCID NOT CONFIGURED"
```
[OrcidConfig] ✗ NO ORCID CONFIGURATION FOUND
```

**Solução**:
- Verifique que `NODE_ENV=production` no .env
- Verifique que `ORCID_CLIENT_ID` está definido (começa com `APP-`)
- Verifique que `ORCID_CLIENT_SECRET` está definido (não é placeholder)

### Erro: "Token exchange failed"
```
[OrcidService] Token exchange failed. Response: {"error":"invalid_client",...}
```

**Causas possíveis**:
1. `ORCID_CLIENT_SECRET` errado
2. `ORCID_REDIRECT_URI` não registrada no ORCID (ou com espaço)
3. Authorization code expirou (válido 10 min)

**Solução**:
- Verifique credenciais em https://orcid.org/account
- Confirme URI registrada: `https://scideep.imd.ufrn.br/orcid/callback`
- Certifique-se sem espaço: `ORCID_REDIRECT_URI=https://...` (sem espaço antes de `https`)

### Erro: "Failed to fetch user data"
```
[OrcidService] Failed to fetch ORCID person data: ...
```

**Causa**: Token access inválido ou expirado

**Solução**: Usuário pode precisar autorizar novamente

## Passo 5: Verificar Salva no Banco de Dados

Se o ORCID auth passar mas usuário não salvar:

```bash
# Conectar ao MongoDB
mongosh "mongodb://user:pass@localhost/database"

# Procurar usuário
db.users.find({ orcid: "0000-0001-XXXX-XXXX" })

# Deve retornar algo como:
# {
#   _id: "...",
#   orcid: "0000-0001-XXXX-XXXX",
#   email: "user@example.com",
#   emailVerified: true,
#   orcidAccessToken: "...",
#   ...
# }
```

Se não encontrar o usuário:
- Verifique os logs: `[ORCID Callback] ✗ Failed to save new user`
- Procure pela mensagem de erro específica
- Verifique permissões do MongoDB

## Próximas Ações

1. **Faça essas verificações no servidor**
2. **Compartilhe os outputs** do `/api/orcid/debug`
3. **Compartilhe qualquer erro** que apareça nos logs
4. Vou ajudar com base nos resultados

## Checklist Rápido

- [ ] `NODE_ENV=production` em `.env` do servidor?
- [ ] `ORCID_CLIENT_ID=APP-6M2AKUYLCFMIFVQP` definido?
- [ ] `ORCID_CLIENT_SECRET` não está vazio?
- [ ] `ORCID_REDIRECT_URI` SEM espaço no início?
- [ ] `/api/orcid/debug` retorna `orcidConfigured: true`?
- [ ] Logs mostram `[ORCID Authorize]` e `[OrcidService]`?

---

**Proceda nessa ordem e me compartilhe os resultados!**
