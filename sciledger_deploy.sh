#!/bin/bash

# Navigate to project directory
cd /var/www/sciledger

# Stash any local changes
git stash

# Pull latest changes
git pull origin main

# Install dependencies and build
npm ci
npm run build

# Stop all existing instances (ignore errors if not running)
pm2 delete sciledger || true

# Start new instance using node directly
# The build/index.js from adapter-node handles --port and --host
pm2 start build/index.js --name "sciledger" -- --port 3000 --host 0.0.0.0

# Save PM2 process list
pm2 save

# Display status
pm2 status
