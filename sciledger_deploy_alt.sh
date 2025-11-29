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

# Start using the npm start script with environment variables
PORT=3000 HOST=0.0.0.0 pm2 start npm --name "sciledger" -- start

# Save PM2 process list
pm2 save

# Display status
pm2 status
