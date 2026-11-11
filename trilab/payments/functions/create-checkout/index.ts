// ENTWURF (nicht getestet) – Supabase Edge Function: legt eine Bestellung an und gibt die Stripe-Checkout-URL zurück.
// Preise kommen IMMER aus der Datenbank, nie vom Client.
// Secrets: STRIPE_SECRET_KEY, SITE_URL (z. B. https://ro83r7.github.io/1stProject), SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY sind vorhanden.
import Stripe from 'https://esm.sh/stripe@16.12.0?target=denonext';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = Deno.env.get('SITE_URL')!;
const cors = { 'Access-Control-Allow-Origin': SITE.replace(/(https?:\/\/[^/]+).*/, '$1'), 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json(401, { error: 'login_required' });

    const { product } = await req.json();
    const { data: p } = await sb.from('products').select('*').eq('id', product).eq('active', true).maybeSingle();
    if (!p) return json(404, { error: 'unknown_product' });
    const q = 1;

    if (p.once) {
      const { count } = await sb.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('product_id', p.id).in('status', ['paid', 'fulfilled']);
      if (count) return json(409, { error: 'already_owned' });
    }
    const { data: order, error } = await sb.from('orders').insert({ user_id: user.id, product_id: p.id, qty: q, amount_cents: p.amount_cents * q }).select('id').single();
    if (error) throw error;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'de',
      customer_email: user.email ?? undefined,
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      line_items: [{ quantity: q, price_data: { currency: 'eur', unit_amount: p.amount_cents, product_data: { name: p.name } } }],
      // Kleinunternehmerin (§ 19 UStG): keine Umsatzsteuer ausweisen, Stripe Tax NICHT aktivieren. Hinweis auf Belegen: im Dashboard unter Rechnungs-/Beleg-Einstellungen als Fußzeile.
      // Digitale Leistung: ausdrückliche Zustimmung zum Erlöschen des Widerrufsrechts per Checkout-Zustimmungstext
      consent_collection: { terms_of_service: 'required' },
      custom_text: { terms_of_service_acceptance: { message: 'Ich akzeptiere die AGB und verlange ausdrücklich den sofortigen Beginn der Leistung; mein Widerrufsrecht erlischt mit vollständiger Erbringung bzw. Bereitstellung. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.' } },
      // Zahlarten (Karte, Apple/Google Pay, PayPal, SEPA, Klarna …) werden im Stripe-Dashboard aktiviert – nicht hier im Code.
      success_url: `${SITE}/trilab/#/shop`,
      cancel_url: `${SITE}/trilab/#/shop`,
    });
    await sb.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);
    return json(200, { url: session.url });
  } catch (_e) {
    return json(500, { error: 'checkout_failed' });
  }
});
