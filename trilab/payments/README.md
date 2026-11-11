# Bezahlung für Lena's TriLab

**Stand:** Der Shop in der App (`#/shop`) ist eine **Demo**: Katalog, Kasse mit Pflichtangaben, Bestellübersicht, Freischaltung (Garmin), Abzeichen „Supporter:in“ – die Zahlung wird nur simuliert. Die Produkte stehen in `content.js`.
Die Dateien in diesem Ordner sind der **Weg zur echten Zahlung**. Die Edge Functions sind Entwürfe und noch nicht gegen ein Stripe-Konto getestet.

## Empfehlung: Stripe (Checkout) – in zwei Stufen
| | Stripe | PayPal direkt | Händler-Plattform (Lemon Squeezy, Paddle, Digistore24) |
|---|---|---|---|
| Entwickler-Aufwand | gering, gute Doku | höher | sehr gering |
| Zahlarten | Karte, Apple/Google Pay, SEPA, Klarna, PayPal u. a. (im Dashboard schaltbar) | PayPal, Karte | je nach Anbieter |
| Waren + Dienstleistungen + Fanware | ja (Versandadresse, Versandkosten) | ja | v. a. digital, Fanware schwierig |
| Umsatzsteuer/Rechnungen | Stripe Tax + Rechnungen (optional) | selbst | **übernimmt der Anbieter als Verkäufer** (Merchant of Record) |
| Gebühren (ca., bitte aktuell prüfen) | ~1,5 % + 0,25 € (EU-Karten) | ~2,5–3 % + 0,35 € (Mikrozahlungs-Tarif beantragbar) | ~5 % + 0,50 € |

**Warum Stripe:** deckt alle vier Anwendungsfälle ab (Pläne, Beratung, Service, Fanware), Sie sind PCI-seitig raus (gehostete Kasse, keine Kartendaten bei euch), PayPal lässt sich dort ebenfalls anbieten.
**Wann eine Händler-Plattform besser ist:** wenn Lena fast nur digitale Produkte weltweit verkauft und sich um Umsatzsteuer in anderen EU-Ländern nicht kümmern will. Dafür höhere Gebühren, und Fanware geht dort schlecht.

### Mikrobeträge (0,50 €)
Feste Gebühren pro Zahlung machen sehr kleine Beträge unwirtschaftlich: bei 0,50 € gehen ~0,26 € (>50 %) weg, bei 3 € ~0,30 € (10 %), bei 49 € ~1 € (2 %). Deshalb im Demo-Katalog erst ab ca. 3 € („Kaffee“), 4,90 € („Ask Lena Express“). Für echte 50-Cent-Käufe: Guthaben/Credits oder Bündel.

### Stufe 1 – ohne Backend (für den Testbetrieb, ca. 1 Stunde)
1. Stripe-Konto anlegen, zunächst im **Testmodus** bleiben.
2. Je Produkt einen **Payment Link** erstellen (Dashboard → Zahlungslinks); bei Fanware „Lieferadresse erfassen“ + Versandkosten aktivieren; Zahlarten (PayPal, Apple Pay …) aktivieren.
3. Links in `config.js` eintragen: `paymentLinks: { 'plan-personal': 'https://buy.stripe.com/…' }`. Der „Kaufen“-Knopf leitet dann zur Stripe-Kasse weiter (statt Demo-Kasse). Test mit Karte `4242 4242 4242 4242`.
4. Ausführung **manuell**: Stripe schickt dir E-Mails zu Zahlungen; du/Lena liefert Plan, Termin oder Paket.
Vorteil: läuft auf GitHub Pages, null Server. Nachteil: Garmin-Freischaltung etc. nicht automatisch, keine Bestellliste in der App.

### Stufe 2 – mit Supabase (Livegang)
1. `payments.sql` ausführen (Produkte, Bestellungen, Freischaltungen; Preise stehen dann **serverseitig**).
2. Edge Functions deployen: `create-checkout` (Bestellung anlegen → Stripe-Checkout-URL) und `stripe-webhook` (`--no-verify-jwt`; bestätigt Zahlung per Signatur). Secrets setzen: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`.
3. In Stripe einen Webhook auf die Funktions-URL anlegen (Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`).
4. In `config.js`: `checkoutEndpoint: 'https://<projekt>.supabase.co/functions/v1/create-checkout'`. Die App ruft dann mit dem Login-Token den Endpoint auf und leitet zur Stripe-Kasse weiter.
5. Noch zu bauen: Bestellliste/Freischaltungen aus `orders`/`my_entitlements` in der App anzeigen (die Demo nutzt lokalen Speicher), Bestellbestätigungs-Mail, Erfüllungsstatus (`fulfilled`) im Admin-Bereich.

## Welche Dienste brauchst du?
1. **Stripe** (Zahlungen, Belege, ggf. Stripe Tax) – Pflicht.
2. **Supabase** (hast du eingeplant) – Datenbank + Edge Functions für Stufe 2.
3. **Transaktionsmail** (Resend/Brevo) – Bestellbestätigung und Login-Codes (siehe README).
4. **Fanware:** am einfachsten **Print-on-Demand** (Printful, Printify, Gelato, Spreadshirt) – kein Lager, kein Versand; Bestellung später per API anbinden. Eigenversand geht, bedeutet aber Lager, Verpackung, Retouren.
5. **Terminbuchung** für Beratungsgespräche: Cal.com oder Calendly (Link nach Zahlung in der Bestätigung).
6. **Buchhaltung:** lexoffice/sevDesk mit Stripe-Anbindung, Steuerberater.
7. **Rechtstexte:** Impressum, AGB, Widerrufsbelehrung, Datenschutz (z. B. eRecht24 / IT-Recht-Kanzlei).

## Rechtliches / Steuern (Checkliste, keine Rechtsberatung)
- **Wer verkauft?** Der Verkäufer braucht Gewerbeanmeldung bzw. steuerliche Erfassung. Bei Minderjährigen gelten Sonderregeln – vorher klären, wer Vertragspartner ist.
- **Umsatzsteuer:** Kleinunternehmerregelung (§ 19 UStG) oder Regelbesteuerung; bei digitalen Leistungen an Verbraucher in der EU ggf. OSS. Mit Steuerberater klären – das bestimmt auch, ob Preise brutto mit USt oder „ohne USt nach § 19“ ausgewiesen werden.
- **Pflichten im Online-Shop (B2C):** Impressum, Preisangaben inkl. USt/Versand, **Button „zahlungspflichtig bestellen“** (in der Demo schon enthalten), AGB + Datenschutz, **Widerrufsbelehrung** (14 Tage). Bei digitalen Inhalten/Dienstleistungen mit sofortigem Beginn: **ausdrückliche Zustimmung** zum Erlöschen des Widerrufsrechts (in der Demo als Checkbox enthalten).
- **Fanware:** Verpackungsgesetz (LUCID-Registrierung), Textilkennzeichnung, Retouren-/Gewährleistungsprozess. Bei Print-on-Demand übernimmt der Anbieter einen Teil.
- **Datenschutz:** Zahlungsdaten liegen bei Stripe; Bestelldaten (Adresse) nur für die Abwicklung. Belege unterliegen Aufbewahrungsfristen – darum `orders.user_id … on delete set null` (Konto löschbar, Beleg bleibt anonymisiert).
- **App-Stores:** Solange TriLab eine PWA ist, fallen keine Store-Gebühren an. In einer nativen iOS-App müssten *digitale* Inhalte über In-App-Kauf (15–30 %) laufen; Fanware und echte Dienstleistungen nicht.
- **Vor dem echten Geldfluss** keine Live-Schlüssel eintragen, bis Impressum, AGB, Widerruf und Datenschutz stehen.
