/* Lena's TriLab – Inhalte (Startinhalte, von Lena zu prüfen/anzupassen).
   Alles Inhaltliche liegt hier, nicht im App-Code: Einheiten, Wochenpläne, Tipps, FAQ.
   Intensität z: 1 = locker … 5 = maximal. */
window.TRILAB_CONTENT = {
sports: {
  swim:     { n: 'Schwimmen', col: '#25b6e8' },
  bike:     { n: 'Rad',       col: '#ff5c9d' },
  run:      { n: 'Laufen',    col: '#ff8a3d' },
  strength: { n: 'Kraft',     col: '#7c5cff' },
  mobility: { n: 'Mobility',  col: '#22c39a' },
  brick:    { n: 'Koppel',    col: '#f2b600' },
  other:    { n: 'Anderes',   col: '#8d86a3' }
},
goals: {
  sprint:  { n: 'Sprint-Distanz',   sub: 'Einsteiger · ca. 4–5 h/Woche' },
  olympic: { n: 'Olympische Distanz', sub: 'Fortgeschritten · ca. 6–7 h/Woche' },
  half:    { n: '70.3',             sub: 'Ambitioniert · ca. 8–10 h/Woche' }
},
raceTypes: {
  sprint:  { n: 'Sprint',   d: '750 m · 20 km · 5 km' },
  olympic: { n: 'Olympisch', d: '1,5 km · 40 km · 10 km' },
  half:    { n: '70.3',     d: '1,9 km · 90 km · 21,1 km' },
  full:    { n: 'Langdistanz', d: '3,8 km · 180 km · 42,2 km' },
  other:   { n: 'Anderes',  d: 'Lauf, Duathlon, Swimrun …' }
},
sessions: {
 // ---- Schwimmen
 'sw-tech': { sp:'swim', t:'Technik & Wassergefühl', min:40, z:2, steps:[
   '200 m locker einschwimmen','6 × 50 m Technik (Fingertip-Drag / Catch-up), 20 s Pause',
   '4 × 100 m locker mit Pull-Buoy, 20 s Pause','200 m locker ausschwimmen'],
   tip:'Lieber kurze, saubere Wiederholungen als lange, schlampige.' },
 'sw-endu': { sp:'swim', t:'Grundlagen-Ausdauer', min:50, z:2, steps:[
   '300 m einschwimmen','5 × 200 m gleichmäßig (RPE 5), 30 s Pause','4 × 50 m locker, 15 s Pause','100 m ausschwimmen'],
   tip:'Zähle deine Züge pro Bahn – sinkt die Zahl bei gleichem Tempo, wirst du effizienter.' },
 'sw-thr': { sp:'swim', t:'Schwellen-Sets', min:55, z:4, steps:[
   '400 m einschwimmen (200 locker, 200 Technik)','8 × 100 m zügig (Wettkampf-Tempo), 15 s Pause',
   '6 × 50 m schnell, 20 s Pause','200 m ausschwimmen'],
   tip:'Starte die 100er konservativ – der letzte soll der schnellste sein.' },
 'sw-ow': { sp:'swim', t:'Freiwasser-Simulation', min:45, z:3, steps:[
   '200 m einschwimmen','Orientierung üben: alle 8 Züge nach vorn schauen (6 × 100 m)',
   '4 × 30 m Sprintstart wie im Pulk, 30 s Pause','10 min durchgehend im Wettkampf-Tempo','100 m ausschwimmen'],
   tip:'Im Becken die Bahnlinie ignorieren und nach der Uhr oder Wand peilen.' },
 // ---- Rad
 'bk-base': { sp:'bike', t:'Grundlagen locker', min:90, z:2, steps:[
   '10 min einrollen','70 min gleichmäßig im Grundlagenbereich (Gespräch möglich)','10 min ausrollen'],
   tip:'Locker heißt locker: Wer Grundlage zu schnell fährt, verliert die Frische für harte Tage.' },
 'bk-sst': { sp:'bike', t:'Sweet-Spot-Intervalle', min:75, z:4, steps:[
   '15 min einrollen','3 × 12 min bei 88–93 % FTP, 5 min locker dazwischen','10 min ausrollen'],
   tip:'Konstante Leistung, Kadenz 85–95. Du solltest noch ganze Sätze sprechen können.' },
 'bk-vo2': { sp:'bike', t:'VO₂max-Kurzintervalle', min:60, z:5, steps:[
   '15 min einrollen inkl. 3 × 30 s steigern','6 × 3 min bei 110–120 % FTP, 3 min locker',
   '10 min ausrollen'], tip:'Nur wenn du frisch bist. Qualität vor Quantität.' },
 'bk-long': { sp:'bike', t:'Lange Ausfahrt', min:180, z:2, steps:[
   '3 h im Grundlagenbereich, flaches bis welliges Profil','Alle 20 min trinken, ab Minute 30 essen: 60–80 g Kohlenhydrate/h',
   'Letzte 20 min in Aeroposition, wenn du sie fährst'],
   tip:'Übe in der langen Ausfahrt genau die Verpflegung, die du im Rennen nutzen willst.' },
 'bk-cad': { sp:'bike', t:'Technik & Kadenz', min:60, z:2, steps:[
   '10 min einrollen','5 × 3 min Kadenz 100+ (ruhiger Oberkörper), 2 min locker',
   '3 × 1 min einbeinig je Seite, danach 5 min locker','15 min locker ausrollen'],
   tip:'Runder Tritt statt Stampfen – das spart später auf dem Laufen Kraft.' },
 // ---- Laufen
 'rn-easy': { sp:'run', t:'Easy Run', min:40, z:2, steps:[
   '40 min locker, Gespräch muss möglich sein','Optional: 4 × 20 s lockere Steigerungen am Ende'],
   tip:'Die meisten Läufe sollten sich fast zu leicht anfühlen.' },
 'rn-long': { sp:'run', t:'Long Run', min:80, z:2, steps:[
   '10 min sehr locker starten','60 min gleichmäßig locker','10 min locker auslaufen'],
   tip:'Zeit auf den Beinen zählt, nicht das Tempo.' },
 'rn-tempo': { sp:'run', t:'Tempodauerlauf', min:55, z:4, steps:[
   '15 min einlaufen','20 min im Halbmarathon-Tempo','10 min locker auslaufen','5 min Gehen / Dehnen'],
   tip:'Gleichmäßig bleiben – die letzten 5 min dürfen sich hart anfühlen, nicht die ersten.' },
 'rn-int': { sp:'run', t:'Intervalle 5 × 1000 m', min:60, z:5, steps:[
   '15 min einlaufen + Lauf-ABC','5 × 1000 m im 10-km-Tempo, 2 min Trabpause','10 min auslaufen'],
   tip:'Alle fünf Intervalle sollen ähnlich schnell sein.' },
 'rn-strides': { sp:'run', t:'Lauf-ABC & Steigerungen', min:35, z:2, steps:[
   '15 min locker einlaufen','Lauf-ABC: Skippings, Anfersen, Kniehebelauf (2 × 20 m)',
   '6 × 80 m Steigerungslauf, locker zurückgehen','5–10 min auslaufen'],
   tip:'Kurz, knackig, technisch – ideal vor oder nach dem Schwimmen.' },
 'rn-hill': { sp:'run', t:'Bergsprints', min:45, z:5, steps:[
   '15 min einlaufen','8 × 12 s Sprint bergauf (6–8 %), Gehpause zurück','10 min locker auslaufen'],
   tip:'Maximale Kraft, volle Erholung – das ist kein Ausdauertraining.' },
 // ---- Kraft
 'st-core': { sp:'strength', t:'Core & Rumpf', min:30, z:2, steps:[
   '3 Runden, je 40 s Arbeit / 20 s Pause:','Unterarmstütz · Seitstütz links/rechts · Dead Bug',
   'Bird Dog · Glute Bridge · Hollow Hold'],
   tip:'Ein stabiler Rumpf ist im Wasser, auf dem Rad und beim Laufen derselbe Hebel.' },
 'st-lower': { sp:'strength', t:'Beine & Stabilität', min:40, z:3, steps:[
   '3 × 8 Kniebeuge (schwer, sauber)','3 × 10 Ausfallschritte je Seite','3 × 8 Single-Leg-RDL je Seite',
   '3 × 12 Hip Thrust','3 × 15 Wadenheben'],
   tip:'Zwei Wiederholungen „im Tank“ lassen – Verletzungsprävention geht vor Rekorden.' },
 'st-up': { sp:'strength', t:'Oberkörper & Schulter', min:35, z:3, steps:[
   '3 × 10 Rudern (Kurzhantel oder Band)','3 × 10 Liegestütze','3 × 15 Band Pull-Aparts',
   '3 × 12 Face Pulls','2 × 30 s Superman-Hold'],
   tip:'Starke Schulterblätter = stabiler Zug im Wasser.' },
 // ---- Mobility
 'mo-hip': { sp:'mobility', t:'Hüfte & Beinachse', min:20, z:1, steps:[
   '90/90 Hip Switch · 10 Wiederholungen','Tiefer Ausfallschritt mit Rotation · 8 je Seite',
   'Pigeon Pose · 60 s je Seite','Wadendehnung an der Wand · 45 s je Seite','Cat-Cow · 1 min'],
   tip:'Nach dem Training oder abends – täglich 10 Minuten schlagen einmal 60.' },
 'mo-shoulder': { sp:'mobility', t:'Schultern & Brustwirbelsäule', min:15, z:1, steps:[
   'Thread the Needle · 8 je Seite','Wall Slides · 12','Türrahmen-Dehnung Brust · 45 s je Seite',
   'Arm-Kreise mit Band · 2 × 10','Kindhaltung mit Seitneigung · 1 min'],
   tip:'Wer viel auf dem Rad sitzt, braucht Brust- und Schulteröffner.' },
 'mo-roll': { sp:'mobility', t:'Faszienrolle & Recovery', min:20, z:1, steps:[
   'Waden · 1 min je Seite','Oberschenkel vorn/hinten · 1 min je Seite','Gesäß · 1 min je Seite',
   'Oberer Rücken · 1 min','Beine hochlegen · 5 min'],
   tip:'Langsam rollen, bei Schmerzspitzen kurz halten statt drüberrollen.' },
 // ---- Koppel
 'br-short': { sp:'brick', t:'Mini-Brick Rad → Lauf', min:75, z:3, steps:[
   '45 min Rad: 10 min locker, 25 min zügig (Z3), 10 min locker','Wechsel in unter 2 min üben',
   '15 min Lauf im Wettkampf-Tempo – die ersten 3 min fühlen sich komisch an, das ist normal'],
   tip:'Schuhe vorbereiten, Helm auf dem Lenker – der Wechsel ist auch Training.' },
 'br-race': { sp:'brick', t:'Race-Pace-Brick', min:120, z:4, steps:[
   '75 min Rad: 15 min locker, 45 min im Renntempo, 15 min locker','Wechsel (Zeit nehmen!)',
   '30 min Lauf im geplanten Renntempo','10 min Auslaufen & Dehnen'],
   tip:'Wettkampf-Ernährung und -Ausrüstung komplett testen.' }
},
// Wochenpläne: Mo … So, je Tag Liste von Einheiten (leer = Ruhetag)
plans: {
 sprint:  { days: [['st-core','mo-hip'],['sw-tech'],['rn-easy'],['bk-cad'],[],['br-short'],['sw-endu']] },
 olympic: { days: [['st-lower','mo-hip'],['sw-endu','rn-strides'],['bk-sst'],['rn-tempo','mo-roll'],['sw-tech'],['bk-base'],['rn-long']] },
 half:    { days: [['st-lower','mo-shoulder'],['sw-thr','rn-easy'],['bk-sst'],['rn-int','st-core'],['sw-endu','mo-roll'],['bk-long','rn-easy'],['rn-long']] }
},
tips: [
 'Konstanz schlägt Heldentaten: Lieber 4 Wochen regelmäßig als 1 Woche am Limit.',
 'Mindestens jede dritte bis vierte Woche eine Entlastungswoche mit rund 30 % weniger Umfang.',
 'Schlaf ist dein günstigstes Dopingmittel – 7–9 Stunden sind Trainingszeit.',
 'Teste im Training alles, was du im Wettkampf essen, trinken und tragen willst.',
 'Beim Koppeltraining: kurze Schritte, hohe Frequenz, ruhig atmen – nach 3 Minuten findest du deinen Rhythmus.',
 'Hartes hart, Lockeres wirklich locker. Das Mittelmaß dazwischen bringt am wenigsten.',
 'Mobility ist kein Bonus. Zehn Minuten am Tag halten dich verletzungsfrei.',
 'Trainingstagebuch führen: Wie hast du dich gefühlt? Das erklärt später fast jede Formkurve.'
],
shopCats: {
  training: { n:'Training',  ic:'plan',   col:'#7c5cff' },
  beratung: { n:'Beratung',  ic:'chat',   col:'#25b6e8' },
  service:  { n:'Service',   ic:'watch',  col:'#22c39a' },
  support:  { n:'Support',   ic:'heart',  col:'#f2b600' }
},
// Platzhalter-Produkte/-Preise (Cent, brutto). kind: service | digital | support. once: nur einmal kaufbar.
products: [
  { id:'plan-personal', cat:'training', kind:'service', n:'Persönlicher Trainingsplan', d:'Individueller 8-Wochen-Plan nach deinem Fragebogen (Ziel, Zeit, Level). Lieferung in ca. 5 Werktagen.', price:4900 },
  { id:'plan-3m', cat:'training', kind:'service', n:'Coaching-Paket 3 Monate', d:'Persönlicher Plan, wöchentliche Anpassung und Feedback zu deinem Log.', price:9900 },
  { id:'consult-30', cat:'beratung', kind:'service', n:'Beratungsgespräch · 30 min', d:'Videocall mit Lena: Wettkampfplanung, Material, Ernährung oder dein Trainingsplan.', price:3900 },
  { id:'ask-express', cat:'beratung', kind:'service', n:'Ask Lena Express', d:'Ausführliche Antwort auf deine Frage innerhalb von 48 Stunden.', price:490 },
  { id:'garmin-setup', cat:'service', kind:'digital', once:true, n:'Garmin-Anbindung', d:'Verbindet dein Garmin-Konto mit TriLab – Aktivitäten landen automatisch im Log.', price:1900 },
  { id:'coffee', cat:'support', kind:'support', n:'Kaffee für Lena', d:'Danke fürs kostenlose Training – ein kleiner Support für neue Inhalte.', price:300 }
],
faq: [
 { id:'f1', text:'Ich bin Einsteiger – wie starte ich?', answer:'Wähle im Plan „Sprint-Distanz“, starte mit 3 Einheiten pro Woche und steigere erst nach 2–3 Wochen. (Beispieltext – Lena ersetzt ihn im Admin-Bereich.)' },
 { id:'f2', text:'Was esse ich am Wettkampftag?', answer:'Frühstück 2–3 h vor dem Start, vertraut und kohlenhydratreich. Nichts Neues am Renntag. (Beispieltext)' },
 { id:'f3', text:'Wie gehe ich mit Trainingsausfall um?', answer:'Nicht nachholen. Plan dort fortsetzen, wo du heute stehst – Konstanz zählt mehr als Vollständigkeit. (Beispieltext)' }
]
};
