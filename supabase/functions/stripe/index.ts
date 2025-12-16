import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface StripeRequest {
  action: 'create_checkout' | 'create_subscription' | 'create_portal' | 'get_packages' | 'get_plans'
  package_id?: string
  plan_id?: string
  billing_cycle?: 'monthly' | 'yearly'
  success_url?: string
  cancel_url?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('organization_id, organizations(name)')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'No organization found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const organizationId = membership.organization_id
    const orgName = (membership.organizations as any)?.name || 'Organization'

    const body: StripeRequest = await req.json()
    const { action } = body

    console.log(`[stripe] Action: ${action} for org: ${organizationId}`)

    switch (action) {
      case 'get_packages': {
        const { data: packages } = await supabase
          .from('token_packages')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')

        return new Response(
          JSON.stringify({ packages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_plans': {
        const { data: plans } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order')

        return new Response(
          JSON.stringify({ plans }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_checkout': {
        const { package_id, success_url, cancel_url } = body

        if (!package_id || !success_url || !cancel_url) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get package details
        const { data: pkg } = await supabase
          .from('token_packages')
          .select('*')
          .eq('id', package_id)
          .eq('is_active', true)
          .single()

        if (!pkg) {
          return new Response(
            JSON.stringify({ error: 'Invalid package' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get or create Stripe customer
        let stripeCustomerId: string

        const { data: existingCustomer } = await supabase
          .from('stripe_customers')
          .select('stripe_customer_id')
          .eq('organization_id', organizationId)
          .single()

        if (existingCustomer?.stripe_customer_id) {
          stripeCustomerId = existingCustomer.stripe_customer_id
        } else {
          // Create new Stripe customer
          const customer = await stripe.customers.create({
            email: user.email,
            name: orgName,
            metadata: {
              organization_id: organizationId,
              user_id: user.id,
            },
          })

          stripeCustomerId = customer.id

          await supabase.from('stripe_customers').insert({
            organization_id: organizationId,
            stripe_customer_id: stripeCustomerId,
            email: user.email,
            name: orgName,
          })
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${pkg.display_name} - ${pkg.tokens} Tokens`,
                  description: pkg.description,
                },
                unit_amount: pkg.price_cents,
              },
              quantity: 1,
            },
          ],
          success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url,
          metadata: {
            organization_id: organizationId,
            package_id: pkg.id,
            tokens: pkg.tokens.toString(),
            user_id: user.id,
          },
        })

        console.log(`[stripe] Checkout session created: ${session.id}`)

        return new Response(
          JSON.stringify({ checkout_url: session.url, session_id: session.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_subscription': {
        const { plan_id, billing_cycle = 'monthly', success_url, cancel_url } = body

        if (!plan_id || !success_url || !cancel_url) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get plan details
        const { data: plan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', plan_id)
          .eq('is_active', true)
          .single()

        if (!plan) {
          return new Response(
            JSON.stringify({ error: 'Invalid plan' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get or create Stripe customer
        let stripeCustomerId: string

        const { data: existingCustomer } = await supabase
          .from('stripe_customers')
          .select('stripe_customer_id')
          .eq('organization_id', organizationId)
          .single()

        if (existingCustomer?.stripe_customer_id) {
          stripeCustomerId = existingCustomer.stripe_customer_id
        } else {
          const customer = await stripe.customers.create({
            email: user.email,
            name: orgName,
            metadata: {
              organization_id: organizationId,
              user_id: user.id,
            },
          })

          stripeCustomerId = customer.id

          await supabase.from('stripe_customers').insert({
            organization_id: organizationId,
            stripe_customer_id: stripeCustomerId,
            email: user.email,
            name: orgName,
          })
        }

        const priceCents = billing_cycle === 'yearly' ? plan.price_yearly_cents : plan.price_monthly_cents
        const interval = billing_cycle === 'yearly' ? 'year' : 'month'

        // Create subscription checkout
        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: 'subscription',
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${plan.display_name} Plan`,
                  description: `${plan.tokens_monthly.toLocaleString()} tokens/month`,
                },
                unit_amount: priceCents,
                recurring: {
                  interval,
                },
              },
              quantity: 1,
            },
          ],
          success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url,
          metadata: {
            organization_id: organizationId,
            plan_id: plan.id,
            tokens_monthly: plan.tokens_monthly.toString(),
            billing_cycle,
            user_id: user.id,
          },
        })

        console.log(`[stripe] Subscription session created: ${session.id}`)

        return new Response(
          JSON.stringify({ checkout_url: session.url, session_id: session.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_portal': {
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('stripe_customer_id')
          .eq('organization_id', organizationId)
          .single()

        if (!customer?.stripe_customer_id) {
          return new Response(
            JSON.stringify({ error: 'No billing account found' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const returnUrl = body.success_url || `${req.headers.get('origin')}/settings/billing`

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customer.stripe_customer_id,
          return_url: returnUrl,
        })

        return new Response(
          JSON.stringify({ portal_url: portalSession.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (err) {
    const error = err as Error
    console.error('[stripe] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
