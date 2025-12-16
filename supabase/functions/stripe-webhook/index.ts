import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[stripe-webhook] Missing Stripe configuration')
    return new Response(
      JSON.stringify({ error: 'Stripe not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
  })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('[stripe-webhook] Signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[stripe-webhook] Event: ${event.type} (${event.id})`)

    // Idempotency check
    const { data: existing } = await supabase
      .from('stripe_webhook_events')
      .select('id, processed')
      .eq('stripe_event_id', event.id)
      .single()

    if (existing?.processed) {
      console.log(`[stripe-webhook] Already processed: ${event.id}`)
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Store event for idempotency
    if (!existing) {
      await supabase.from('stripe_webhook_events').insert({
        stripe_event_id: event.id,
        type: event.type,
        data: event.data,
      })
    }

    // Process event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutCompleted(supabase, session)
          break
        }

        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice
          await handleInvoicePaid(supabase, invoice)
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          await handlePaymentFailed(supabase, invoice)
          break
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionUpdated(supabase, subscription)
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionDeleted(supabase, subscription)
          break
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge
          await handleChargeRefunded(supabase, charge)
          break
        }

        default:
          console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
      }

      // Mark as processed
      await supabase
        .from('stripe_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('stripe_event_id', event.id)

    } catch (processingError) {
      console.error(`[stripe-webhook] Processing error:`, processingError)

      // Record error but still return 200 to prevent Stripe retries for business errors
      await supabase
        .from('stripe_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          error: (processingError as Error).message
        })
        .eq('stripe_event_id', event.id)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[stripe-webhook] Error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Handle successful checkout (token purchase or subscription start)
async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const metadata = session.metadata || {}
  const organizationId = metadata.organization_id
  const userId = metadata.user_id

  if (!organizationId) {
    console.error('[stripe-webhook] No organization_id in session metadata')
    return
  }

  if (session.mode === 'payment') {
    // One-time token purchase
    const packageId = metadata.package_id
    const tokens = parseInt(metadata.tokens || '0')

    if (!tokens) {
      console.error('[stripe-webhook] No tokens in metadata')
      return
    }

    // Create purchase record
    const { data: purchase } = await supabase
      .from('token_purchases')
      .insert({
        organization_id: organizationId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent,
        package_id: packageId,
        tokens_amount: tokens,
        amount_cents: session.amount_total,
        status: 'completed',
        completed_at: new Date().toISOString(),
        created_by: userId,
      })
      .select('id')
      .single()

    if (purchase) {
      // Credit tokens using database function
      await supabase.rpc('credit_tokens_from_purchase', {
        p_org_id: organizationId,
        p_tokens: tokens,
        p_purchase_id: purchase.id,
        p_description: `Purchased ${tokens} tokens`,
      })

      console.log(`[stripe-webhook] Credited ${tokens} tokens to org ${organizationId}`)
    }

  } else if (session.mode === 'subscription') {
    // Subscription created
    const planId = metadata.plan_id
    const tokensMonthly = parseInt(metadata.tokens_monthly || '0')
    const billingCycle = metadata.billing_cycle || 'monthly'

    // Get subscription details from Stripe
    const subscriptionId = session.subscription as string

    // Record subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: organizationId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: '', // Will be updated on invoice.paid
        plan_id: planId,
        status: 'active',
        tokens_per_period: tokensMonthly,
      })
      .select('id')
      .single()

    if (subscription) {
      // Credit first month's tokens
      await supabase.rpc('credit_subscription_tokens', {
        p_org_id: organizationId,
        p_tokens: tokensMonthly,
        p_subscription_id: subscription.id,
        p_description: `${planId} subscription - ${tokensMonthly} tokens`,
      })

      console.log(`[stripe-webhook] Subscription created for org ${organizationId}, credited ${tokensMonthly} tokens`)
    }
  }
}

// Handle recurring subscription payment
async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  // Get subscription from database
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, organization_id, tokens_per_period, plan_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.log(`[stripe-webhook] Subscription not found: ${subscriptionId}`)
    return
  }

  // Update subscription period
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date((invoice.period_start || 0) * 1000).toISOString(),
      current_period_end: new Date((invoice.period_end || 0) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)

  // Only credit tokens for renewal invoices (not the first one which is handled by checkout)
  if (invoice.billing_reason === 'subscription_cycle') {
    await supabase.rpc('credit_subscription_tokens', {
      p_org_id: subscription.organization_id,
      p_tokens: subscription.tokens_per_period,
      p_subscription_id: subscription.id,
      p_description: `${subscription.plan_id} subscription renewal - ${subscription.tokens_per_period} tokens`,
    })

    console.log(`[stripe-webhook] Renewed subscription for org ${subscription.organization_id}`)
  }
}

// Handle failed payment
async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string
  if (!subscriptionId) return

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId)

  console.log(`[stripe-webhook] Payment failed for subscription: ${subscriptionId}`)
}

// Handle subscription updates
async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  console.log(`[stripe-webhook] Subscription updated: ${subscription.id}`)
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  console.log(`[stripe-webhook] Subscription canceled: ${subscription.id}`)
}

// Handle refunds
async function handleChargeRefunded(supabase: any, charge: Stripe.Charge) {
  const paymentIntentId = charge.payment_intent as string
  if (!paymentIntentId) return

  // Find the purchase
  const { data: purchase } = await supabase
    .from('token_purchases')
    .select('id, organization_id, tokens_amount')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .single()

  if (!purchase) {
    console.log(`[stripe-webhook] Purchase not found for refund: ${paymentIntentId}`)
    return
  }

  // Update purchase status
  await supabase
    .from('token_purchases')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
    })
    .eq('id', purchase.id)

  // Deduct tokens (negative credit)
  // Note: In production, you'd want to check if they still have enough balance
  const { data: account } = await supabase
    .from('token_accounts')
    .select('id, balance')
    .eq('organization_id', purchase.organization_id)
    .single()

  if (account) {
    const newBalance = Math.max(0, account.balance - purchase.tokens_amount)

    await supabase
      .from('token_accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', account.id)

    await supabase.from('token_transactions').insert({
      account_id: account.id,
      type: 'refund',
      amount: -purchase.tokens_amount,
      balance_before: account.balance,
      balance_after: newBalance,
      reference_type: 'token_purchase',
      reference_id: purchase.id,
      description: `Refund: ${purchase.tokens_amount} tokens`,
    })
  }

  console.log(`[stripe-webhook] Refund processed for purchase: ${purchase.id}`)
}
