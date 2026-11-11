# Lena's TriLab

Triathlon-Trainings-PWA für Lenas Follower. Gleiche Grundarchitektur wie *Fit Lab* (statische PWA, kein Build-Schritt,
offline-first, Supabase als Backend) – aber mit echten Logins statt Sync-Code, damit sie mit 1.000+ Nutzer:innen sicher läuft.

## Tabs
| Tab | Inhalt |
|---|---|
| **Heute** | Begrüßung, „Road to …“-Ziel, Wochenring, heutige Einheit, Streak, nächster Wettkampf, Tagestipp |
| **Plan** | Wochenplan (Sprint · Olympisch · 70.3) und Bibliothek, gefiltert nach Schwimmen · Rad · Laufen · Kraft · Mobility · Koppel; Detailansicht mit Schritten + Tipp, „Als erledigt loggen“ |
| **Log** | Training erfassen (Sport, Dauer, km, RPE, Notiz), 8-Wochen-Chart, Filter, **GPX/TCX-Import** (z. B. aus Garmin Connect) |
| **Rennen** | Wettkämpfe planen (Countdown, Zielzeit) und auswerten (Splits Swim/T1/Bike/T2/Run, Bestzeit je Distanz) |
| **Ask Lena** | Fragen stellen (max. 5/Tag), öffentliche FAQ, **Posteingang für Lena** (Antwort + optional anonym in FAQ veröffentlichen) |

## Dateien
- `index.html`, `styles.css`, `app.js` – App (Vanilla JS, Hell-/Dunkelmodus, Piktogramme in `icons.js`)
- `content.js` – **alle Inhalte** (Einheiten, Wochenpläne, Tipps, FAQ). Hier passt Lena ihre Trainings an. Die Startinhalte sind Platzhalter und von ihr fachlich zu prüfen.
- `config.js` – Supabase-URL/-Key. **Leer = Offline-Modus** (läuft sofort, Daten nur lokal).
- `sync.js` – Login (E-Mail-Code) und Sync. `supabase.sql` – Schema inkl. Row-Level-Security.
- `sw.js`, `manifest.webmanifest` – Offline + „Zum Home-Bildschirm“.

## Zweisprachig (Deutsch / English)
- Umschalter: Knopf **DE/EN** oben rechts, außerdem unten auf jeder Seite und in den Einstellungen. Erststart: Sprache des Geräts (Deutsch → DE, sonst EN); die Auswahl wird gespeichert.
- Deutsch ist die Quellsprache im Code. Englisch kommt aus `i18n.en.js`: `content` (Einheiten, Tipps, FAQ, Produkte – gleiche Struktur wie `content.js`) und `dict` (Oberflächentexte, Zahlen als `{n}`). Neue deutsche Texte in `app.js` brauchen einen Eintrag in `dict`, sonst erscheinen sie auch im englischen Modus deutsch (zum Prüfen: `window.__trMiss` in der Browser-Konsole).
- Datum, Dezimalzahlen und Euro-Beträge folgen der Sprache. Ask Lena: Fragen speichern die Sprache (`questions.lang`), die öffentliche FAQ wird je Sprache angezeigt; Lena sieht im Posteingang ein DE/EN-Kennzeichen und antwortet in der Sprache der Frage.

## Lokal ausprobieren
```
cd trilab && python3 -m http.server 8000   # dann http://localhost:8000
```

## Live schalten (ca. 30 min)
1. **Hosting:** Ordner `trilab/` auf GitHub Pages / Cloudflare Pages / Netlify (statisch, CDN – skaliert ohne eigenen Server).
2. **Supabase-Projekt** anlegen → `supabase.sql` im SQL-Editor ausführen → URL + `anon`-Key in `config.js` eintragen.
3. **Auth → E-Mail-Template „Magic Link/OTP“** so anpassen, dass `{{ .Token }}` (6-stelliger Code) im Mail steht. Der Code-Login ist bewusst gewählt, weil Magic Links in iOS-Home-Screen-Apps in einem anderen Speicher landen.
4. **Eigenen SMTP-Anbieter** eintragen (z. B. Resend, Brevo). Der eingebaute Supabase-Mailversand ist stark limitiert und reicht für Registrierungen von 1.000 Nutzern nicht.
5. Nach Lenas erster Anmeldung sie zur Admin machen: `update public.profiles set is_admin = true where id = (select id from auth.users where email = 'LENAS-MAIL');`

## Skalierung auf 1.000+ Nutzer
- **Frontend:** statisch + Service Worker → Last landet auf dem CDN, nicht auf deiner Datenbank.
- **Offline-first:** Die App liest/schreibt lokal; Server nur zum Abgleich. Ausfall/Funkloch stört das Training nicht.
- **Billiger Sync:** Upload gebündelt (200er-Batches, Upsert), Download inkrementell über `synced_at` (Server-Uhr) + Index `(user_id, synced_at)`. Konflikte: last-write-wins über `updated_at` (Client-Uhr, serverseitig geklemmt).
- **Datenmenge:** ~200 Einheiten/Jahr/Nutzer × ~300 B ≈ 60 MB pro 1.000 Nutzer und Jahr – weit unter 1 GB.
- **Sicherheit:** RLS auf allen Tabellen; `is_admin`/`tier` nur per Service-Role änderbar; Check-Constraints begrenzen Feldlängen/Werte; Fragen-Limit (5/Tag) serverseitig per Trigger; FAQ-View enthält keinen Autor; Konto-Löschung (`delete_my_account`) für DSGVO.
- **Betrieb:** Fürs Produktivprojekt Supabase **Pro** (~25 $/Monat) nehmen – das Free-Projekt pausiert nach 1 Woche Inaktivität.
  Das Free-Kontingent (50.000 MAU, 500 MB) würde die Last technisch tragen.

## „Kostenlos oder gegen geringe Gebühr“
`profiles.tier` (`free` | `supporter`) ist vorbereitet. Empfehlung: Stripe Payment Link / Checkout + kleine Edge Function, die per Webhook `tier` setzt (Service-Role). Die App kann dann z. B. Zusatzpläne oder Ask-Lena-Prioritäten auf `supporter` begrenzen. Noch nicht implementiert – bewusst, bis Lena das Modell entschieden hat.

## Garmin
- **Jetzt:** GPX/TCX-Import (kein Garmin-Account-Link nötig, funktioniert für alle).
- **Direkt-Anbindung (optional):** Die offizielle *Garmin Health/Activity API* verlangt eine Freigabe im Garmin Developer Program (Geschäftsanwendung) und OAuth pro Nutzer.
  Vorbereitet sind `workouts.source = 'garmin'` und `garmin_links`. Geplanter Ablauf: Edge Function `garmin-connect` (OAuth-Start/Callback, Tokens nur serverseitig) + Webhook `garmin-activities`,
  der Aktivitäten normalisiert als `workouts` einträgt. Dann `garmin: true` in `config.js` setzen.

## Datenschutz / rechtlich (vor Start prüfen)
Gesundheitsnahe Daten → Datenschutzerklärung + Impressum verlinken, Einwilligung bei Registrierung, Supabase-Region EU wählen, AV-Vertrag. Haftungshinweis steht in den Einstellungen.
