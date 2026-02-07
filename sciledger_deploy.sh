#!/bin/bash

# Navigate to project directory
cd /var/www/sciledger

# # Stash any local changes
# git stash

# # Pull latest changes
# git pull origin main

# Fetch latest changes
git fetch origin main

# Force reset to match remote (discards local changes)
git reset --hard origin/main

# Install dependencies and build
npm ci
npm run build

# Stop all existing instances (ignore errors if not running)
pm2 delete sciledger || true

# Start new instance with environment variables
# BODY_SIZE_LIMIT sets max upload size (adapter-node)
# PORT and HOST configure the server
BODY_SIZE_LIMIT=10485760 PORT=3000 HOST=0.0.0.0 pm2 start build/index.js --name "sciledger"

# Save PM2 process list
pm2 save

# Display status
pm2 status
