// ENTWURF (nicht getestet) – Stripe ruft diese Funktion nach erfolgreicher Zahlung auf.
// Deploy OHNE JWT-Prüfung (Stripe hat kein Supabase-Login), die Echtheit wird über die Signatur geprüft:
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (whsec_…). Events: checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded
import Stripe from 'https://esm.sh/stripe@16.12.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, Stripe.createSubtleCryptoProvider());
  } catch (_e) {
    return new Response('bad signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === 'paid' && s.client_reference_id) {
      await sb.from('orders').update({
        status: 'paid', paid_at: new Date().toISOString(),
        stripe_payment_intent: typeof s.payment_intent === 'string' ? s.payment_intent : null,
        ship: s.shipping_details ?? null,
      }).eq('id', s.client_reference_id).eq('status', 'pending');   // idempotent: Stripe liefert Events mehrfach
    }
  }
  if (event.type === 'charge.refunded') {
    const c = event.data.object as Stripe.Charge;
    if (typeof c.payment_intent === 'string') await sb.from('orders').update({ status: 'refunded' }).eq('stripe_payment_intent', c.payment_intent);
  }
  return new Response('ok');
});
