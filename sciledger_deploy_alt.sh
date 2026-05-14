#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/sciledger-dev}"
APP_NAME="${APP_NAME:-sciledger-dev}"
APP_PORT="${APP_PORT:-3002}"
APP_HOST="${APP_HOST:-0.0.0.0}"
APP_BRANCH="${APP_BRANCH:-main}"
BODY_SIZE_LIMIT="${BODY_SIZE_LIMIT:-10485760}"

cd "$APP_DIR"

git pull --ff-only origin "$APP_BRANCH"

npm ci
npm run build

pm2 delete "$APP_NAME" || true

BODY_SIZE_LIMIT="$BODY_SIZE_LIMIT" PORT="$APP_PORT" HOST="$APP_HOST" \
	pm2 start build/index.js --name "$APP_NAME" --update-env

pm2 save
pm2 status "$APP_NAME"
