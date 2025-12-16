#!/bin/bash

# Production Setup Script for Image Optimizer Pro
# This script helps configure the production environment

set -e

echo "============================================"
echo "Image Optimizer Pro - Production Setup"
echo "============================================"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed"
    echo "Install with: brew install supabase/tap/supabase"
    exit 1
fi

PROJECT_ID="xleufdtjdmcgbnbduzun"

echo "Step 1: Apply Database Migrations"
echo "----------------------------------"
echo "Running: supabase db push"
echo ""
supabase db push

echo ""
echo "Step 2: Set Edge Function Secrets"
echo "----------------------------------"
echo ""

# Stripe secrets
read -p "Enter STRIPE_SECRET_KEY (or press Enter to skip): " STRIPE_SECRET
if [ -n "$STRIPE_SECRET" ]; then
    supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET" --project-ref $PROJECT_ID
    echo "STRIPE_SECRET_KEY set"
fi

read -p "Enter STRIPE_WEBHOOK_SECRET (or press Enter to skip): " STRIPE_WEBHOOK
if [ -n "$STRIPE_WEBHOOK" ]; then
    supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK" --project-ref $PROJECT_ID
    echo "STRIPE_WEBHOOK_SECRET set"
fi

# Image processing servers (these have defaults but can be overridden)
echo ""
echo "Image server URLs (defaults already in code):"
echo "  IMAGINARY_URL=http://38.97.60.181:9000"
echo "  IOPAINT_URL=http://38.97.60.181:8085"
read -p "Override IMAGINARY_URL? (or press Enter to use default): " IMAGINARY
if [ -n "$IMAGINARY" ]; then
    supabase secrets set IMAGINARY_URL="$IMAGINARY" --project-ref $PROJECT_ID
fi

read -p "Override IOPAINT_URL? (or press Enter to use default): " IOPAINT
if [ -n "$IOPAINT" ]; then
    supabase secrets set IOPAINT_URL="$IOPAINT" --project-ref $PROJECT_ID
fi

echo ""
echo "Step 3: Regenerate TypeScript Types"
echo "------------------------------------"
echo ""
supabase gen types typescript --project-id $PROJECT_ID > src/types/database.ts
echo "Types saved to src/types/database.ts"

echo ""
echo "Step 4: Deploy Edge Functions"
echo "-----------------------------"
echo ""
echo "Deploying new functions..."
supabase functions deploy stripe --project-ref $PROJECT_ID
supabase functions deploy stripe-webhook --project-ref $PROJECT_ID
supabase functions deploy image-process --project-ref $PROJECT_ID

echo ""
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Configure Stripe webhook endpoint in Stripe Dashboard:"
echo "   URL: https://$PROJECT_ID.supabase.co/functions/v1/stripe-webhook"
echo "   Events: checkout.session.completed, invoice.paid, invoice.payment_failed,"
echo "           customer.subscription.updated, customer.subscription.deleted, charge.refunded"
echo ""
echo "2. Run 'npm run build' to verify everything compiles"
echo ""
