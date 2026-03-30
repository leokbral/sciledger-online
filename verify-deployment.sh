#!/bin/bash

echo "======================== VERIFICAÇÃO DE DEPLOYMENT ========================"
echo ""
echo "📁 Diretório do projeto:"
cd /var/www/sciledger
pwd
echo ""

echo "📝 Commit atual no servidor:"
git log --oneline -1
echo ""

echo "🌿 Branch atual:"
git branch -v
echo ""

echo "🔄 Status do Git (comparar com remote):"
git log -1 --oneline
git log origin/main -1 --oneline
echo ""

echo "📂 Verificando se as rotas estão no build:"
echo ""
echo "❓ Procurando por onboarding-link nos chunks do server build:"
if grep -r "onboarding-link" /var/www/sciledger/build/server/chunks/ 2>/dev/null | head -5; then
  echo "✅ Encontrado em build/server"
else
  echo "❌ NÃO encontrado em build/server"
fi
echo ""

echo "❓ Procurando por routes no src:"
if [ -f "/var/www/sciledger/src/routes/api/stripe/connect/onboarding-link/+server.ts" ]; then
  echo "✅ Arquivo src/routes/api/stripe/connect/onboarding-link/+server.ts existe"
else
  echo "❌ Arquivo NÃO existe"
fi
echo ""

echo "📦 Último build:"
if [ -d "/var/www/sciledger/build" ]; then
  echo "Data do build: $(stat -c %y /var/www/sciledger/build | cut -d' ' -f1)"
else
  echo "❌ Diretório build não existe"
fi
echo ""

echo "🔄 Status do PM2:"
pm2 status
echo ""

echo "======================== FIM DA VERIFICAÇÃO ========================"
