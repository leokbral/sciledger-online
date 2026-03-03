#!/bin/bash

# SciLedger Production Deployment Script
# This script deploys to production while avoiding MongoDB connection issues during build

set -e  # Exit on any error

echo "=== SciLedger Production Deployment ==="
echo "Starting deployment..."

# Step 1: Check .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    exit 1
fi

echo "✓ .env file found"

# Step 2: Disconnect from MongoDB to avoid build issues
echo ""
echo "Step 1: Preparing environment for build..."
ORIGINAL_MONGODB_URI=$MONGODB_URI
export MONGODB_URI=""
echo "✓ MongoDB temporarily disconnected for build"

# Step 3: Install dependencies
echo ""
echo "Step 2: Installing dependencies..."
npm install
echo "✓ Dependencies installed"

# Step 4: Build the application
echo ""
echo "Step 3: Building application..."
npm run build 2>&1 | tail -20
BUILD_STATUS=${PIPESTATUS[0]}

# Restore MongoDB URI
export MONGODB_URI=$ORIGINAL_MONGODB_URI

if [ $BUILD_STATUS -ne 0 ]; then
    echo "✗ Build failed!"
    exit 1
fi
echo "✓ Build completed successfully"

# Step 5: Check ORCID configuration
echo ""
echo "Step 4: Checking ORCID configuration..."
if grep -q "NODE_ENV=production" .env; then
    echo "✓ NODE_ENV is set to production"
else
    echo "⚠ WARNING: NODE_ENV is not set to production!"
fi

if grep -q "ORCID_PROD_CLIENT_ID=APP-" .env; then
    echo "✓ ORCID production credentials found"
else
    echo "✗ ERROR: ORCID production credentials not found!"
    exit 1
fi

# Step 6: Summary
echo ""
echo "=== Deployment Ready ==="
echo ""
echo "Before deploying, ensure:"
echo "1. NODE_ENV=production in your production .env file"
echo "2. ORCID_PROD_* variables are set correctly"
echo "3. MONGODB_URI points to production database"
echo "4. No spaces in ORCID_REDIRECT_URI"
echo ""
echo "To test ORCID configuration in production, visit:"
echo "  https://your-domain.com/api/orcid/debug"
echo ""
echo "Then deploy the 'build/' directory to your production server."
echo "✓ Ready for deployment!"
