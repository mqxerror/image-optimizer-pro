# Product Requirements Document: Stripe Payment Integration

## Executive Summary

Integrate Stripe for token purchases and subscription management. Enables monetization beyond AppSumo licenses with on-demand token purchases and recurring subscription options.

---

## Business Context

### Revenue Streams
1. **AppSumo Lifetime Deals**: One-time purchase with monthly token allocation
2. **Token Top-ups**: On-demand token purchases (Stripe)
3. **Premium Subscriptions**: Monthly/annual plans for power users (Stripe)

### Pricing Strategy

#### Token Packages (One-time)
| Package | Tokens | Price | Per Token |
|---------|--------|-------|-----------|
| Starter | 1,000 | $9 | $0.009 |
| Standard | 5,000 | $39 | $0.0078 |
| Pro | 15,000 | $99 | $0.0066 |
| Enterprise | 50,000 | $249 | $0.005 |

#### Subscriptions (Monthly)
| Plan | Tokens/Mo | Team | Stores | Price/Mo |
|------|-----------|------|--------|----------|
| Basic | 3,000 | 2 | 1 | $19 |
| Pro | 10,000 | 5 | 3 | $49 |
| Business | 30,000 | 15 | 10 | $129 |
| Enterprise | 100,000 | Unlimited | Unlimited | $399 |

---

## Technical Architecture

### Stripe Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Payment Flow                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────┐    │
│  │ Frontend │───▶│ Edge Function │───▶│ Stripe API     │    │
│  │          │    │ /stripe      │    │                │    │
│  └──────────┘    └──────────────┘    └────────────────┘    │
│       │                                      │              │
│       │                                      ▼              │
│       │         ┌──────────────────────────────────────┐   │
│       │         │ Stripe Webhook                       │   │
│       │         │ /functions/v1/stripe-webhook         │   │
│       │         └──────────────────────────────────────┘   │
│       │                          │                          │
│       │                          ▼                          │
│       │         ┌──────────────────────────────────────┐   │
│       └────────▶│ Database                             │   │
│                 │ - token_transactions                 │   │
│                 │ - subscriptions                      │   │
│                 │ - token_accounts                     │   │
│                 └──────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components
1. **Stripe Checkout Session**: Hosted payment page
2. **Stripe Customer Portal**: Self-service subscription management
3. **Stripe Webhooks**: Real-time payment status updates
4. **Token Ledger**: Credit/debit token transactions

---

## Feature Specifications

### F1: Token Purchase Flow

**User Story**: As a user running low on tokens, I want to quickly purchase more tokens without leaving the app.

**Trigger Points**:
- Token balance widget (header)
- Low token warning modal
- Billing settings page
- Post-processing "out of tokens" dialog

**UI Flow**:
```
┌─────────────────────────────────────────────────────────────┐
│ Purchase Tokens                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Current Balance: 234 tokens                                  │
│                                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │  STARTER    │ │  STANDARD   │ │    PRO      │            │
│ │             │ │             │ │             │            │
│ │  1,000 🪙   │ │  5,000 🪙   │ │ 15,000 🪙   │            │
│ │    $9       │ │    $39      │ │    $99      │            │
│ │             │ │  POPULAR    │ │  BEST VALUE │            │
│ │  [Select]   │ │  [Select]   │ │  [Select]   │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 💼 Enterprise - 50,000 tokens for $249          [Select]││
│ └─────────────────────────────────────────────────────────┘│
│                                                              │
│ Need more? Contact us for custom packages.                   │
└─────────────────────────────────────────────────────────────┘
```

**API Endpoint**:
```typescript
// POST /functions/v1/stripe
{
  action: 'create_checkout_session',
  type: 'token_purchase',
  package_id: 'standard', // starter | standard | pro | enterprise
  success_url: 'https://app.example.com/billing?success=true',
  cancel_url: 'https://app.example.com/billing?canceled=true'
}

// Response
{
  checkout_url: 'https://checkout.stripe.com/...'
}
```

---

### F2: Subscription Management

**User Story**: As a growing business, I want to upgrade to a subscription plan that gives me predictable monthly tokens and team features.

**UI Flow**:
```
┌─────────────────────────────────────────────────────────────┐
│ Subscription Plans                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Current: Free (AppSumo Tier 2)                           ││
│ │ 10,000 tokens/month • 5 team members • 3 stores          ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Upgrade for more capacity:                                   │
│                                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │   BASIC     │ │    PRO      │ │  BUSINESS   │            │
│ │             │ │             │ │             │            │
│ │  3,000 🪙   │ │ 10,000 🪙   │ │ 30,000 🪙   │            │
│ │  /month     │ │  /month     │ │  /month     │            │
│ │             │ │             │ │             │            │
│ │  2 users    │ │  5 users    │ │ 15 users    │            │
│ │  1 store    │ │  3 stores   │ │ 10 stores   │            │
│ │             │ │             │ │             │            │
│ │  $19/mo     │ │  $49/mo     │ │  $129/mo    │            │
│ │  [Select]   │ │  [Select]   │ │  [Select]   │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                              │
│ 💡 AppSumo tokens stack with subscription tokens!            │
└─────────────────────────────────────────────────────────────┘
```

**Subscription API**:
```typescript
// POST /functions/v1/stripe
{
  action: 'create_subscription',
  plan_id: 'pro', // basic | pro | business | enterprise
  billing_cycle: 'monthly' | 'yearly', // 20% discount for yearly
  success_url: 'https://app.example.com/billing?subscribed=true',
  cancel_url: 'https://app.example.com/billing'
}

// Manage subscription
{
  action: 'create_portal_session',
  return_url: 'https://app.example.com/billing'
}

// Response
{
  portal_url: 'https://billing.stripe.com/...'
}
```

---

### F3: Billing History & Invoices

**User Story**: As an accountant, I want to access all invoices and transaction history for expense tracking.

**UI Design**:
```
┌─────────────────────────────────────────────────────────────┐
│ Billing History                                              │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Dec 15, 2024    Standard Token Pack    +5,000    $39.00 │ │
│ │                 Invoice #INV-2024-0142    [Download PDF] │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Dec 10, 2024    AppSumo Code Redeemed  +10,000   $0.00  │ │
│ │                 Tier 2 License                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Dec 8, 2024     Starter Token Pack     +1,000    $9.00  │ │
│ │                 Invoice #INV-2024-0098    [Download PDF] │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Total spent: $48.00                   [Export CSV]          │
└─────────────────────────────────────────────────────────────┘
```

---

### F4: Low Token Warnings

**User Story**: As a user, I want to be warned when my token balance is low so I can purchase more before running out.

**Warning Thresholds**:
- **Yellow (20%)**: "Running low on tokens"
- **Red (5%)**: "Critically low - some features may be limited"
- **Empty (0)**: Block processing, show purchase modal

**UI Components**:
```tsx
// Token Balance Widget (Header)
<TokenBalance
  balance={234}
  warningThreshold={500}
  criticalThreshold={100}
/>

// Low Token Modal (Auto-triggered)
<LowTokenModal
  balance={89}
  estimatedRunsLeft={12}
  onPurchase={() => openPurchaseModal()}
  onDismiss={() => dismissWarning()}
/>
```

---

## Database Schema

```sql
-- Stripe customer mapping
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  plan_id VARCHAR(50) NOT NULL, -- basic, pro, business, enterprise
  status VARCHAR(50) NOT NULL, -- active, canceled, past_due, trialing
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  tokens_per_period INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token purchases (one-time)
CREATE TABLE IF NOT EXISTS token_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_checkout_session_id VARCHAR(255),
  package_id VARCHAR(50) NOT NULL,
  tokens_amount INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- pending, completed, failed, refunded
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token ledger (all token movements)
CREATE TABLE IF NOT EXISTS token_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type VARCHAR(50) NOT NULL, -- purchase, subscription, appsumo, usage, refund, adjustment
  amount INTEGER NOT NULL, -- positive for credit, negative for debit
  balance_after INTEGER NOT NULL,
  reference_type VARCHAR(50), -- token_purchase, subscription, appsumo_license, processing_job
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events (for debugging and idempotency)
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_customers_org ON stripe_customers(org_id);
CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_token_purchases_org ON token_purchases(org_id);
CREATE INDEX idx_token_ledger_org ON token_ledger(org_id);
CREATE INDEX idx_token_ledger_type ON token_ledger(type);
CREATE INDEX idx_token_ledger_created ON token_ledger(created_at DESC);
CREATE INDEX idx_webhook_events_stripe_id ON stripe_webhook_events(stripe_event_id);

-- RLS Policies
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_ledger ENABLE ROW LEVEL SECURITY;

-- Org members can view their billing info
CREATE POLICY "Members can view billing"
  ON stripe_customers FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can view subscriptions"
  ON subscriptions FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can view purchases"
  ON token_purchases FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can view ledger"
  ON token_ledger FOR SELECT
  USING (org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid()));
```

---

## Stripe Configuration

### Products & Prices

```typescript
// Stripe Products to create
const products = {
  token_packages: {
    starter: { tokens: 1000, price: 900 }, // $9.00
    standard: { tokens: 5000, price: 3900 },
    pro: { tokens: 15000, price: 9900 },
    enterprise: { tokens: 50000, price: 24900 }
  },
  subscriptions: {
    basic: { tokens: 3000, monthly: 1900, yearly: 18240 }, // 20% off yearly
    pro: { tokens: 10000, monthly: 4900, yearly: 47040 },
    business: { tokens: 30000, monthly: 12900, yearly: 123840 },
    enterprise: { tokens: 100000, monthly: 39900, yearly: 383040 }
  }
}
```

### Webhook Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Credit tokens, create purchase record |
| `invoice.paid` | Credit subscription tokens |
| `invoice.payment_failed` | Notify user, mark subscription at risk |
| `customer.subscription.updated` | Update plan details |
| `customer.subscription.deleted` | Mark subscription canceled |
| `charge.refunded` | Debit tokens, update purchase status |

---

## Edge Functions

### Stripe Checkout Function

```typescript
// supabase/functions/stripe/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16'
})

serve(async (req) => {
  const { action, ...params } = await req.json()

  switch (action) {
    case 'create_checkout_session':
      return handleCheckout(params)
    case 'create_subscription':
      return handleSubscription(params)
    case 'create_portal_session':
      return handlePortal(params)
    case 'get_prices':
      return handleGetPrices()
    default:
      return new Response('Unknown action', { status: 400 })
  }
})

async function handleCheckout({ package_id, success_url, cancel_url, org_id }) {
  const packages = {
    starter: { price: 'price_xxx_starter', tokens: 1000 },
    standard: { price: 'price_xxx_standard', tokens: 5000 },
    pro: { price: 'price_xxx_pro', tokens: 15000 },
    enterprise: { price: 'price_xxx_enterprise', tokens: 50000 }
  }

  const pkg = packages[package_id]
  if (!pkg) throw new Error('Invalid package')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: pkg.price, quantity: 1 }],
    success_url,
    cancel_url,
    metadata: {
      org_id,
      package_id,
      tokens: pkg.tokens.toString()
    }
  })

  return new Response(JSON.stringify({ checkout_url: session.url }))
}

async function handleSubscription({ plan_id, billing_cycle, success_url, cancel_url, org_id }) {
  const plans = {
    basic: { monthly: 'price_xxx', yearly: 'price_yyy' },
    pro: { monthly: 'price_xxx', yearly: 'price_yyy' },
    business: { monthly: 'price_xxx', yearly: 'price_yyy' },
    enterprise: { monthly: 'price_xxx', yearly: 'price_yyy' }
  }

  const plan = plans[plan_id]
  if (!plan) throw new Error('Invalid plan')

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: plan[billing_cycle], quantity: 1 }],
    success_url,
    cancel_url,
    metadata: { org_id, plan_id }
  })

  return new Response(JSON.stringify({ checkout_url: session.url }))
}

async function handlePortal({ return_url, stripe_customer_id }) {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripe_customer_id,
    return_url
  })

  return new Response(JSON.stringify({ portal_url: session.url }))
}
```

### Webhook Handler

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Idempotency check
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    return new Response('Already processed', { status: 200 })
  }

  // Store event
  await supabase.from('stripe_webhook_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    data: event.data
  })

  // Handle event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(supabase, event.data.object)
      break
    case 'invoice.paid':
      await handleInvoicePaid(supabase, event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(supabase, event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(supabase, event.data.object)
      break
  }

  // Mark processed
  await supabase
    .from('stripe_webhook_events')
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq('stripe_event_id', event.id)

  return new Response('OK', { status: 200 })
})

async function handleCheckoutCompleted(supabase, session) {
  const { org_id, package_id, tokens } = session.metadata

  if (session.mode === 'payment') {
    // Token purchase
    await supabase.from('token_purchases').insert({
      org_id,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent,
      package_id,
      tokens_amount: parseInt(tokens),
      amount_cents: session.amount_total,
      status: 'completed',
      completed_at: new Date().toISOString()
    })

    // Credit tokens
    await creditTokens(supabase, org_id, parseInt(tokens), 'purchase', session.id)
  }
}

async function creditTokens(supabase, org_id, amount, type, reference_id) {
  // Get current balance
  const { data: account } = await supabase
    .from('token_accounts')
    .select('balance')
    .eq('org_id', org_id)
    .single()

  const newBalance = (account?.balance || 0) + amount

  // Update balance
  await supabase
    .from('token_accounts')
    .upsert({ org_id, balance: newBalance })

  // Add ledger entry
  await supabase.from('token_ledger').insert({
    org_id,
    type,
    amount,
    balance_after: newBalance,
    reference_type: type === 'purchase' ? 'token_purchase' : 'subscription',
    reference_id
  })
}
```

---

## Frontend Components

### Token Balance Hook

```typescript
// src/hooks/useTokenBalance.ts
export function useTokenBalance() {
  const { data: account } = useQuery({
    queryKey: queryKeys.tokens.account(orgId),
    queryFn: () => fetchTokenAccount(orgId)
  })

  const warningLevel = useMemo(() => {
    if (!account) return 'normal'
    const pct = (account.balance / account.monthly_allocation) * 100
    if (pct <= 5) return 'critical'
    if (pct <= 20) return 'warning'
    return 'normal'
  }, [account])

  return {
    balance: account?.balance ?? 0,
    warningLevel,
    isLow: warningLevel !== 'normal'
  }
}
```

### Purchase Modal Component

```tsx
// src/components/billing/PurchaseModal.tsx
interface PurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  initialPackage?: string
}

export function PurchaseModal({ isOpen, onClose, initialPackage }: PurchaseModalProps) {
  const [selectedPackage, setSelectedPackage] = useState(initialPackage || 'standard')
  const [isLoading, setIsLoading] = useState(false)

  const handlePurchase = async () => {
    setIsLoading(true)
    const { checkout_url } = await createCheckoutSession(selectedPackage)
    window.location.href = checkout_url
  }

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Purchase Tokens</DialogTitle>
      <DialogContent>
        <PackageSelector
          packages={TOKEN_PACKAGES}
          selected={selectedPackage}
          onSelect={setSelectedPackage}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          onClick={handlePurchase}
          loading={isLoading}
        >
          Continue to Payment
        </Button>
      </DialogActions>
    </Dialog>
  )
}
```

---

## Implementation Plan

### Phase 1: Stripe Setup (Day 1)
- [ ] Create Stripe account and products
- [ ] Configure webhook endpoint
- [ ] Add environment variables
- [ ] Create database migrations

### Phase 2: Backend (Days 2-3)
- [ ] Implement stripe edge function
- [ ] Implement stripe-webhook edge function
- [ ] Add token crediting logic
- [ ] Test webhook handling

### Phase 3: Frontend (Days 4-5)
- [ ] Create PurchaseModal component
- [ ] Create SubscriptionPlans component
- [ ] Add TokenBalance widget
- [ ] Implement LowTokenWarning
- [ ] Build BillingHistory view

### Phase 4: Testing & Launch (Day 6)
- [ ] Test complete purchase flow
- [ ] Test subscription lifecycle
- [ ] Verify webhook reliability
- [ ] Test refund handling
- [ ] Go live with Stripe

---

## Security Considerations

1. **Webhook Verification**: Always verify Stripe signature
2. **Idempotency**: Track processed events to prevent duplicate credits
3. **Server-side Prices**: Never trust client-side price data
4. **RLS Policies**: Ensure billing data is properly protected
5. **Audit Trail**: Log all token movements in ledger

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Conversion rate | 5% free → paid | Analytics |
| Average purchase | $50 | Stripe dashboard |
| Subscription retention | 90% month 2 | Stripe dashboard |
| Payment success rate | >98% | Stripe dashboard |
| Time to first purchase | <7 days | Analytics |
