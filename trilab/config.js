/* Lena's TriLab – Konfiguration.
   Leer lassen = Offline-/Demo-Modus (alles bleibt auf dem Gerät).
   Mit Supabase-Werten: Login, Sync, "Ask Lena"-Antworten. Siehe README.md */
window.TRILAB_CONFIG = {
  supabaseUrl: '',          // z. B. https://xxxx.supabase.co
  supabaseKey: '',          // "anon"/publishable key (darf öffentlich sein, Schutz läuft über RLS)
  garmin: false,
  /* Shop / Bezahlung. Beides leer = Demo-Kasse (Zahlung wird nur simuliert, nichts wird abgebucht).
     Stufe 1 (ohne Backend): paymentLinks: { 'plan-personal': 'https://buy.stripe.com/…' }  (Stripe Payment Links)
     Stufe 2 (mit Supabase):  checkoutEndpoint: 'https://xxxx.supabase.co/functions/v1/create-checkout'
     Siehe payments/README.md */
  vatNote: 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.',   // Kleinunternehmerregelung; bei Wechsel zur Regelbesteuerung anpassen
  vatNoteEn: 'Small business under § 19 UStG – no VAT is charged.',
  paymentLinks: {},
  checkoutEndpoint: '',            // true, sobald die Garmin-Edge-Function live ist (siehe README)
  instagram: 'https://www.instagram.com/lenaasang',
  linktree: 'https://linktr.ee/lenaasang'
};
