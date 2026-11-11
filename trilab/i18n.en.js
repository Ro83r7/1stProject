/* Lena's TriLab – English (Englisch).
   dict:    Oberflächentexte. Schlüssel = deutscher Text (Zahlen als {n}), Wert = englischer Text.
   content: englische Fassung der Inhalte aus content.js (gleiche Struktur, nur übersetzte Felder).
   Weitere Sprache hinzufügen: analoge Datei + Eintrag im Sprachumschalter (app.js). */
window.TRILAB_EN = {
dict: {
/* Navigation & Kopf */
'Heute':'Today','Plan':'Plan','Log':'Log','Rennen':'Races','Ask Lena':'Ask Lena','Einstellungen':'Settings','Hauptnavigation':'Main navigation',
'Level und Erfolge':'Level and achievements','Schließen':'Close','Weiter':'Continue','Speichern':'Save','Löschen':'Delete','Alle':'All','Gebucht':'Booked',
/* Heute */
'Diese Woche':'This week','{n} Einheit geloggt':'{n} session logged','{n} Einheiten geloggt':'{n} sessions logged',
'{n} Tag in Folge':'{n} day in a row','{n} Tage in Folge':'{n} days in a row','von {n} h':'of {n} h','Noch {n} XP bis Level {n}':'{n} XP to level {n}',
'Heute im Plan':'Today’s plan','Woche ansehen':'View week','Ruhetag – Erholung gehört zum Training.':'Rest day – recovery is part of training.','Ruhetag':'Rest day',
'Nächster Wettkampf':'Next race','Tag':'day','Tage':'days','Woche nach Sportart':'Week by sport','Noch nichts geloggt – los geht’s!':'Nothing logged yet – let’s go!',
'Wochenquests':'Weekly quests','+{n} XP je Quest':'+{n} XP per quest','Persönlicher Plan, Beratung & Garmin-Anbindung':'Personal plan, coaching & Garmin connection','Tipp des Tages':'Tip of the day',
/* Quests */
'Dreikampf':'Triple threat','Schwimmen, Rad und Laufen in einer Woche':'Swim, bike and run in one week','Dranbleiben':'Keep going','An {n} verschiedenen Tagen trainieren':'Train on {n} different days',
'Stabil bleiben':'Stay strong','Kraft und Mobility in einer Woche':'Strength and mobility in one week',
'Quest erledigt:':'Quest completed:','Neues Abzeichen:':'New badge:','Training gespeichert':'Workout saved','Wettkampf gespeichert':'Race saved',
/* Erfolge */
'‹ Zurück':'‹ Back','Erfolge':'Achievements','{n} XP gesamt':'{n} XP total','{n} / {n} XP bis Level {n}':'{n} / {n} XP to level {n}','Tage-Streak':'Day streak','Wochen-Serie':'Week streak','Wochen':'weeks',
'Abzeichen':'Badges','So gibt es XP':'How to earn XP','Training:':'Workout:','+ {n} XP je Minute (bis {n} min)':'+ {n} XP per minute (up to {n} min)','Anstrengung RPE ≥ {n}:':'Effort RPE ≥ {n}:',
'Einheit aus dem Plan:':'Session from the plan:','Jeder Trainingstag:':'Each training day:','Wettkampf mit Ergebnis:':'Race with result:',', neue Bestzeit':', new personal best','Wochenquest:':'Weekly quest:','Ränge':'Ranks',
/* Abzeichen */
'Erster Schritt':'First step','Erstes Training geloggt':'First workout logged','{n} Trainingstage':'{n} training days','An {n} Tagen trainiert':'Trained on {n} days',
'Wasserratte':'Water rat','{n} × Schwimmen':'{n} × swimming','Pedal-Power':'Pedal power','{n} × Rad':'{n} × cycling','Läuferherz':'Runner’s heart','{n} × Laufen':'{n} × running',
'Kraftpaket':'Powerhouse','{n} × Kraft':'{n} × strength','Beweglich':'Flexible','{n} × Mobility':'{n} × mobility','Koppel-Premiere':'Brick debut','Erstes Koppeltraining':'First brick session',
'{n} × Koppeltraining':'{n} × brick sessions','Alle drei Disziplinen in einer Woche':'All three disciplines in one week','Triathlon-Woche ×{n}':'Triathlon week ×{n}','{n} Dreikampf-Wochen':'{n} triple-threat weeks',
'Langer Atem':'Long breath','Lauf ≥ {n} min':'Run ≥ {n} min','Langstrecke':'Long haul','Radausfahrt ≥ {n} h':'Bike ride ≥ {n} h','{n} km Wasser':'{n} km of water','{n} km geschwommen':'{n} km swum',
'{n} km Rad':'{n} km on the bike','{n} km Rad gefahren':'{n} km cycled','{n} km Laufen':'{n} km running','{n} km gelaufen':'{n} km run','Startnummer':'Race number','Erstes Rennen mit Ergebnis':'First race with a result',
'Bestzeit':'Personal best','Brick-Boss':'Brick Boss','Neue Bestzeit über eine Distanz':'New personal best over a distance','{n} Wochen Serie':'{n}-week streak','{n} Wochen in Folge ≥ {n} Trainingstage':'{n} weeks in a row with ≥ {n} training days',
'Quest-Jäger:in':'Quest hunter','{n} Wochenquests erledigt':'{n} weekly quests completed','Supporter:in':'Supporter','Etwas im Shop gekauft':'Bought something in the shop',
/* Plan */
'Trainingsplan':'Training plan','Meine Woche':'My week','Bibliothek':'Library','Wochenumfang ca.':'Weekly volume approx.','Intensität {n}/{n}':'Intensity {n}/{n}',
'Als erledigt loggen':'Mark as done',
/* Log */
'Letzte {n} Wochen':'Last {n} weeks','Gesamt {n}:{n} h · {n} km':'Total {n}:{n} h · {n} km','Gesamt {n} min · {n} km':'Total {n} min · {n} km',
'KW {n} · {n}:{n} h':'Week {n} · {n}:{n} h','KW {n} · {n} min':'Week {n} · {n} min','KW{n}':'W{n}','Noch keine Einheiten.':'No sessions yet.','Tippe auf':'Tap','und logge dein erstes Training.':'and log your first workout.',
'Training hinzufügen':'Add workout','Trainingszeit der letzten {n} Wochen':'Training time over the last {n} weeks','Training bearbeiten':'Edit workout','Training loggen':'Log workout',
'Datum':'Date','Dauer (min)':'Duration (min)','Distanz (km)':'Distance (km)','Anstrengung (RPE):':'Effort (RPE):','Notiz':'Note','Wie hat es sich angefühlt?':'How did it feel?',
/* Rennen */
'Wettkämpfe':'Races','Nächster Start':'Next start','Geplant':'Planned','Noch kein Wettkampf geplant.':'No race planned yet.','Ergebnisse':'Results','Wettkampf hinzufügen':'Add race','Wettkampf bearbeiten':'Edit race',
'Ort':'Location','Zielzeit':'Goal time','Ergebnis (optional)':'Result (optional)','Gesamtzeit':'Total time','Schwimmen':'Swim','Rad':'Bike','Laufen':'Run','Platzierung':'Placement','Ziel:':'Goal:',
'z. B. Challenge Roth':'e.g. Challenge Roth','z. B. AK {n} / Gesamt {n}':'e.g. AG {n} / overall {n}',
/* Ask Lena */
'Frag Lena':'Ask Lena','Training, Wettkampf, Ernährung, Mindset – Lena antwortet persönlich.':'Training, racing, nutrition, mindset – Lena answers personally.',
'Mehr als eine kurze Antwort?':'Want more than a short answer?','Beratungsgespräch oder Express-Antwort im Shop':'Coaching call or express answer in the shop','Deine Frage an Lena …':'Your question for Lena …',
'Max. {n} Fragen pro Tag':'Max. {n} questions per day','Max. {n} Fragen pro Tag · zum Absenden bitte anmelden':'Max. {n} questions per day · please sign in to send','Senden':'Send','Posteingang ({n})':'Inbox ({n})',
'Deine Antwort …':'Your answer …','In den FAQ veröffentlichen (anonym)':'Publish in the FAQ (anonymous)','Antworten':'Reply','Meine Fragen':'My questions','Wartet auf Lenas Antwort':'Waiting for Lena’s answer',
'Wird gesendet, sobald du angemeldet & online bist':'Will be sent once you are signed in & online','Offline-Modus – wird nicht gesendet':'Offline mode – will not be sent','Häufige Fragen':'Frequently asked questions',
'Bitte eine Frage eingeben':'Please enter a question','Frage gesendet ✓':'Question sent ✓','Gespeichert – wird nach der Anmeldung gesendet':'Saved – will be sent after sign-in','Gespeichert (Offline-Modus)':'Saved (offline mode)',
'Bitte eine Antwort eingeben':'Please enter an answer','Antwort gespeichert ✓':'Answer saved ✓',
/* Shop */
'Demo-Modus':'Demo mode','So sieht der Shop aus. Zahlungen werden nur simuliert – es wird nichts abgebucht.':'This is what the shop looks like. Payments are only simulated – nothing is charged.',
'Kaufen':'Buy','Meine Bestellungen':'My orders','Kasse':'Checkout','E-Mail für Bestätigung und Lieferung':'Email for confirmation and delivery','Zahlungsart':'Payment method','Karte':'Card','Gesamt':'Total',
'Ich akzeptiere die AGB und die Datenschutzerklärung.':'I accept the terms and conditions and the privacy policy.',
'Ich verlange ausdrücklich, dass Lena sofort mit der Leistung beginnt bzw. die digitalen Inhalte sofort bereitstellt. Mir ist bekannt, dass mein Widerrufsrecht bei vollständiger Erbringung erlischt bzw. mit Beginn der Bereitstellung verloren geht.':'I expressly request that Lena starts the service immediately and provides the digital content right away. I am aware that my right of withdrawal expires once the service has been fully provided, or when the provision of digital content begins.',
'Zahlungspflichtig bestellen (Demo)':'Order with obligation to pay (demo)','Demo: Es wird keine Zahlung ausgelöst. In der Live-Version läuft die Zahlung über Stripe.':'Demo: no payment is triggered. In the live version, payment is processed via Stripe.',
'Zahlung wird simuliert …':'Simulating payment …','Danke für deine Bestellung!':'Thank you for your order!','Bestellnummer':'Order number',
'Lena meldet sich in Kürze per E-Mail bei dir.':'Lena will get in touch with you by email shortly.','Die Garmin-Anbindung ist für dich freigeschaltet. Die Einrichtung folgt (Demo).':'The Garmin connection is unlocked for you. Setup follows (demo).',
'Du bist großartig – danke für deinen Support!':'You’re awesome – thanks for your support!','Zurück zum Shop':'Back to shop','Demo-Bestellung – es wurde nichts abgebucht.':'Demo order – nothing was charged.',
'Freigeschaltet':'Unlocked','Danke!':'Thank you!','Bezahlt · Lena meldet sich':'Paid · Lena will be in touch','Bitte eine gültige E-Mail angeben':'Please enter a valid email address',
'Bitte AGB und Datenschutz akzeptieren':'Please accept the terms and the privacy policy','Bitte der sofortigen Leistung zustimmen':'Please agree to the immediate start of the service','Bitte zuerst anmelden (Einstellungen)':'Please sign in first (Settings)',
/* Einstellungen */
'Profil':'Profile','Vorname':'First name','Ziel':'Goal','Profil speichern':'Save profile','Design':'Theme','Hell':'Light','Konto & Sync':'Account & sync',
'Offline-Modus: Deine Daten bleiben auf diesem Gerät. Sichere sie regelmäßig über den Export.':'Offline mode: your data stays on this device. Back it up regularly using the export.',
'Angemeldet als':'Signed in as','Nicht angemeldet':'Not signed in','Bereit':'Ready','Synchronisiere …':'Syncing …','Synchronisiert':'Synced','Jetzt synchronisieren':'Sync now','Abmelden':'Sign out',
'{n}-stelliger Code':'{n}-digit code','Bestätigen':'Confirm','Melde dich an, um dein Training auf allen Geräten zu sichern und Lena Fragen zu stellen. Kein Passwort nötig.':'Sign in to back up your training on all devices and to ask Lena questions. No password needed.',
'E-Mail':'Email','Code senden':'Send code','Die Garmin-Anbindung ist für dich freigeschaltet. Lena richtet sie in Kürze ein (Demo).':'The Garmin connection is unlocked for you. Lena will set it up shortly (demo).',
'Verbinde dein Garmin-Konto, damit Aktivitäten automatisch im Log landen.':'Connect your Garmin account so activities land in your log automatically.','Mit Garmin verbinden':'Connect with Garmin',
'Direkte Garmin-Anbindung folgt. Bis dahin: In Garmin Connect eine Aktivität öffnen → ⋯ →':'Direct Garmin connection is coming. Until then: open an activity in Garmin Connect → ⋯ →','Exportieren als GPX/TCX':'Export as GPX/TCX',
'und im Tab „Training“ über „GPX/TCX“ importieren.':'and import it in the “Training” tab via “GPX/TCX”.','Garmin-Anbindung im Shop':'Garmin connection in the shop',
'Daten':'Data','Backup laden':'Load backup','Konto & alle Daten löschen':'Delete account & all data','Lokale Daten löschen':'Delete local data',
'Lena’s TriLab ersetzt keine ärztliche oder trainerliche Beratung. Bei Beschwerden oder Vorerkrankungen vor Trainingsbeginn ärztlich abklären lassen. Training auf eigene Verantwortung.':'Lena’s TriLab does not replace medical or professional coaching advice. If you have health issues or pre-existing conditions, consult a doctor before you start training. Train at your own risk.',
'Speichern fehlgeschlagen – bitte Daten exportieren':'Saving failed – please export your data','Profil gespeichert ✓':'Profile saved ✓','Bitte gültige E-Mail eingeben':'Please enter a valid email address',
'Code ungültig oder abgelaufen':'Code invalid or expired','Angemeldet ✓':'Signed in ✓','Sync-Fehler':'Sync error','Konto gelöscht':'Account deleted','Backup geladen ✓':'Backup loaded ✓','Ungültige Backup-Datei':'Invalid backup file',
'Garmin-Anbindung: siehe README':'Garmin connection: see README','Bitte eine Dauer zwischen {n} und {n} min eingeben':'Please enter a duration between {n} and {n} min','Distanz bitte prüfen':'Please check the distance',
'Gespeichert ✓':'Saved ✓','Name und Datum werden benötigt':'Name and date are required','Zeiten bitte als h:mm:ss eingeben':'Please enter times as h:mm:ss','Wettkampf gespeichert ✓':'Race saved ✓',
'Training wirklich löschen?':'Really delete this workout?','Wettkampf wirklich löschen?':'Really delete this race?','Konto und ALLE Daten unwiderruflich löschen?':'Permanently delete your account and ALL data?',
'Alle lokalen Daten löschen? Das kann nicht rückgängig gemacht werden.':'Delete all local data? This cannot be undone.'
},
content: {
sports: { swim:'Swim', bike:'Bike', run:'Run', strength:'Strength', mobility:'Mobility', brick:'Brick', other:'Other' },
goals: {
  sprint:  { n:'Sprint distance',   sub:'Beginner · approx. 4–5 h/week' },
  olympic: { n:'Olympic distance',  sub:'Intermediate · approx. 6–7 h/week' },
  half:    { n:'70.3',              sub:'Ambitious · approx. 8–10 h/week' }
},
raceTypes: {
  sprint:  { n:'Sprint',   d:'750 m · 20 km · 5 km' },
  olympic: { n:'Olympic',  d:'1.5 km · 40 km · 10 km' },
  half:    { n:'70.3',     d:'1.9 km · 90 km · 21.1 km' },
  full:    { n:'Long distance', d:'3.8 km · 180 km · 42.2 km' },
  other:   { n:'Other',    d:'Run, duathlon, swim-run …' }
},
shopCats: { training:'Training', beratung:'Coaching', service:'Service', support:'Support' },
sessions: {
 'sw-tech': { t:'Technique & water feel', steps:['200 m easy warm-up','6 × 50 m technique (fingertip drag / catch-up), 20 s rest','4 × 100 m easy with pull buoy, 20 s rest','200 m easy cool-down'], tip:'Short, clean repeats beat long, sloppy ones.' },
 'sw-endu': { t:'Aerobic endurance', steps:['300 m warm-up','5 × 200 m steady (RPE 5), 30 s rest','4 × 50 m easy, 15 s rest','100 m cool-down'], tip:'Count your strokes per length – if the number drops at the same pace, you’re getting more efficient.' },
 'sw-thr': { t:'Threshold sets', steps:['400 m warm-up (200 easy, 200 technique)','8 × 100 m strong (race pace), 15 s rest','6 × 50 m fast, 20 s rest','200 m cool-down'], tip:'Start the 100s conservatively – the last one should be the fastest.' },
 'sw-ow': { t:'Open-water simulation', steps:['200 m warm-up','Practise sighting: look forward every 8 strokes (6 × 100 m)','4 × 30 m sprint start as in a pack, 30 s rest','10 min continuous at race pace','100 m cool-down'], tip:'In the pool, ignore the lane line and sight on the clock or the wall.' },
 'bk-base': { t:'Easy endurance ride', steps:['10 min easy spin','70 min steady in the endurance zone (you can hold a conversation)','10 min cool-down'], tip:'Easy means easy: riding base too hard costs you the freshness for the hard days.' },
 'bk-sst': { t:'Sweet-spot intervals', steps:['15 min warm-up','3 × 12 min at 88–93 % FTP, 5 min easy between','10 min cool-down'], tip:'Steady power, cadence 85–95. You should still be able to speak full sentences.' },
 'bk-vo2': { t:'VO₂max short intervals', steps:['15 min warm-up incl. 3 × 30 s build-ups','6 × 3 min at 110–120 % FTP, 3 min easy','10 min cool-down'], tip:'Only when you’re fresh. Quality over quantity.' },
 'bk-long': { t:'Long ride', steps:['3 h in the endurance zone, flat to rolling terrain','Drink every 20 min, start eating after 30 min: 60–80 g carbs/h','Last 20 min in aero position if you ride one'], tip:'Use the long ride to practise exactly the fuelling you want to use on race day.' },
 'bk-cad': { t:'Technique & cadence', steps:['10 min warm-up','5 × 3 min cadence 100+ (quiet upper body), 2 min easy','3 × 1 min one-legged per side, then 5 min easy','15 min easy cool-down'], tip:'A round pedal stroke instead of stomping saves energy for the run later.' },
 'rn-easy': { t:'Easy run', steps:['40 min easy – you must be able to talk','Optional: 4 × 20 s easy strides at the end'], tip:'Most runs should feel almost too easy.' },
 'rn-long': { t:'Long run', steps:['10 min very easy start','60 min steady and easy','10 min easy cool-down jog'], tip:'Time on your feet counts, not pace.' },
 'rn-tempo': { t:'Tempo run', steps:['15 min warm-up','20 min at half-marathon pace','10 min easy cool-down','5 min walk / stretch'], tip:'Stay even – the last 5 min may feel hard, not the first.' },
 'rn-int': { t:'Intervals 5 × 1000 m', steps:['15 min warm-up + running drills','5 × 1000 m at 10 km pace, 2 min jog recovery','10 min cool-down'], tip:'All five intervals should be about the same speed.' },
 'rn-strides': { t:'Running drills & strides', steps:['15 min easy warm-up','Running drills: skipping, butt kicks, high knees (2 × 20 m)','6 × 80 m strides, walk back easy','5–10 min cool-down'], tip:'Short, sharp, technical – ideal before or after swimming.' },
 'rn-hill': { t:'Hill sprints', steps:['15 min warm-up','8 × 12 s sprint uphill (6–8 %), walk back down','10 min easy cool-down'], tip:'Maximal power, full recovery – this is not endurance training.' },
 'st-core': { t:'Core & trunk', steps:['3 rounds, 40 s work / 20 s rest each:','Forearm plank · side plank left/right · dead bug','Bird dog · glute bridge · hollow hold'], tip:'A stable core is the same lever in the water, on the bike and when running.' },
 'st-lower': { t:'Legs & stability', steps:['3 × 8 squats (heavy, clean)','3 × 10 lunges per side','3 × 8 single-leg RDL per side','3 × 12 hip thrusts','3 × 15 calf raises'], tip:'Leave two reps in the tank – injury prevention comes before records.' },
 'st-up': { t:'Upper body & shoulders', steps:['3 × 10 rows (dumbbell or band)','3 × 10 push-ups','3 × 15 band pull-aparts','3 × 12 face pulls','2 × 30 s superman hold'], tip:'Strong shoulder blades = a stable pull in the water.' },
 'mo-hip': { t:'Hips & leg alignment', steps:['90/90 hip switch · 10 reps','Deep lunge with rotation · 8 per side','Pigeon pose · 60 s per side','Calf stretch at the wall · 45 s per side','Cat-cow · 1 min'], tip:'After training or in the evening – 10 minutes daily beat 60 minutes once.' },
 'mo-shoulder': { t:'Shoulders & thoracic spine', steps:['Thread the needle · 8 per side','Wall slides · 12','Doorway chest stretch · 45 s per side','Arm circles with band · 2 × 10','Child’s pose with side bend · 1 min'], tip:'If you spend a lot of time in the saddle, you need chest and shoulder openers.' },
 'mo-roll': { t:'Foam roller & recovery', steps:['Calves · 1 min per side','Quads / hamstrings · 1 min per side','Glutes · 1 min per side','Upper back · 1 min','Legs up the wall · 5 min'], tip:'Roll slowly; on pain spikes hold briefly instead of rolling over them.' },
 'br-short': { t:'Mini brick bike → run', steps:['45 min bike: 10 min easy, 25 min steady (Z3), 10 min easy','Practise a transition under 2 min','15 min run at race pace – the first 3 min feel odd, that’s normal'], tip:'Prepare your shoes, helmet on the handlebars – the transition is training too.' },
 'br-race': { t:'Race-pace brick', steps:['75 min bike: 15 min easy, 45 min at race pace, 15 min easy','Transition (take your time!)','30 min run at planned race pace','10 min cool-down & stretching'], tip:'Test your complete race-day nutrition and gear.' }
},
tips: [
 'Consistency beats heroics: four regular weeks are better than one week at the limit.',
 'Plan a recovery week with about 30 % less volume at least every third or fourth week.',
 'Sleep is your cheapest performance booster – 7–9 hours is training time.',
 'In training, test everything you want to eat, drink and wear on race day.',
 'In brick workouts: short steps, high cadence, calm breathing – after 3 minutes you find your rhythm.',
 'Hard days hard, easy days really easy. The middle ground in between brings the least.',
 'Mobility is not a bonus. Ten minutes a day keep you injury-free.',
 'Keep a training diary: how did you feel? It explains almost every form curve later.'
],
faq: [
 { id:'f1', text:'I’m a beginner – how do I start?', answer:'Choose “Sprint distance” in the plan, start with 3 sessions per week and only increase after 2–3 weeks. (Sample text – Lena replaces it in the admin area.)' },
 { id:'f2', text:'What do I eat on race day?', answer:'Breakfast 2–3 h before the start, familiar and rich in carbohydrates. Nothing new on race day. (Sample text)' },
 { id:'f3', text:'How do I deal with missed training?', answer:'Don’t make it up. Continue the plan where you are today – consistency matters more than completeness. (Sample text)' }
],
products: {
 'plan-personal': { n:'Personal training plan', d:'Individual 8-week plan based on your questionnaire (goal, time, level). Delivery in approx. 5 working days.' },
 'plan-3m': { n:'Coaching package · 3 months', d:'Personal plan, weekly adjustments and feedback on your log.' },
 'consult-30': { n:'Coaching call · 30 min', d:'Video call with Lena: race planning, equipment, nutrition or your training plan.' },
 'ask-express': { n:'Ask Lena Express', d:'A detailed answer to your question within 48 hours.' },
 'garmin-setup': { n:'Garmin connection', d:'Connects your Garmin account to TriLab – activities land in your log automatically.' },
 'coffee': { n:'Coffee for Lena', d:'Thanks for the free training – a small support for new content.' }
}
}
};
