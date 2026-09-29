/* Orion Lite – Spieldaten (Planeten, Völker, Technologien, Gebäude, Schiffe) */
(function (OL) {
  'use strict';

  // Umwelt: pop = Einwohner je Größenstufe, food = Nahrung je Bauer
  OL.ENV = {
    gaia:      { name: 'Gaia',        pop: 5, food: 3,   color: '#58d68d', next: null },
    terran:    { name: 'Terranisch',  pop: 4, food: 2,   color: '#4f9fe8', next: 'gaia' },
    ocean:     { name: 'Ozean',       pop: 4, food: 2,   color: '#3f7fd8', next: 'gaia' },
    swamp:     { name: 'Sumpf',       pop: 3, food: 1.5, color: '#6f9a4f', next: 'terran' },
    arid:      { name: 'Arid',        pop: 3, food: 1,   color: '#c9a263', next: 'terran' },
    tundra:    { name: 'Tundra',      pop: 3, food: 1,   color: '#a9c3cf', next: 'terran' },
    desert:    { name: 'Wüste',       pop: 2, food: 0.5, color: '#d8b56a', next: 'arid' },
    barren:    { name: 'Öde',         pop: 1, food: 0,   color: '#8d8a86', next: 'desert' },
    toxic:     { name: 'Toxisch',     pop: 1, food: 0,   color: '#9bbf3a', next: 'desert' },
    radiated:  { name: 'Verstrahlt',  pop: 1, food: 0,   color: '#c46a4a', next: 'desert' },
    gas:       { name: 'Gasriese',    pop: 0, food: 0,   color: '#d7995a', next: null, outpostOnly: true },
    asteroids: { name: 'Asteroiden',  pop: 0, food: 0,   color: '#7b746c', next: null, outpostOnly: true }
  };
  OL.ENV_WEIGHTS = { gas: 12, asteroids: 8, barren: 10, toxic: 7, radiated: 7, desert: 9, tundra: 9,
    arid: 9, swamp: 7, ocean: 7, terran: 8, gaia: 2 };

  OL.SIZES = [
    { name: 'Winzig', f: 1 }, { name: 'Klein', f: 2 }, { name: 'Mittel', f: 3 },
    { name: 'Groß', f: 4 }, { name: 'Riesig', f: 5 }
  ];
  OL.SIZE_WEIGHTS = [15, 25, 30, 20, 10];

  // Produktion je Arbeiter
  OL.MINERALS = [
    { name: 'Ultra-arm', prod: 1 }, { name: 'Arm', prod: 2 }, { name: 'Normal', prod: 3 },
    { name: 'Reich', prod: 4 }, { name: 'Ultra-reich', prod: 6 }
  ];
  OL.MINERAL_WEIGHTS = [10, 25, 35, 20, 10];

  OL.SPECIALS = {
    artifacts: { name: 'Antike Artefakte', desc: '+2 Forschung je Forscher' },
    gold:      { name: 'Goldvorkommen',    desc: '+5 Credits' },
    gems:      { name: 'Edelsteine',       desc: '+8 Credits' }
  };

  OL.STAR_COLORS = {
    yellow: { name: 'Gelb',   c: '#ffe08a' },
    white:  { name: 'Weiß',   c: '#f2f4ff' },
    red:    { name: 'Rot',    c: '#ff8a72' },
    orange: { name: 'Orange', c: '#ffb86b' },
    blue:   { name: 'Blau',   c: '#9cc4ff' }
  };

  OL.STAR_NAMES = ['Aldebar', 'Kheta', 'Vulcan', 'Rigel', 'Draconis', 'Nazin', 'Tauri', 'Pollux',
    'Kronos', 'Helios', 'Vega', 'Altair', 'Denebola', 'Mira', 'Zeta Rho', 'Algol', 'Castor',
    'Spica', 'Achernar', 'Hadar', 'Menkar', 'Sirius', 'Capella', 'Nekkar', 'Talitha', 'Ukdah',
    'Proxima', 'Tyrion', 'Xendar', 'Obrix', 'Paladia', 'Quarn', 'Rhoan', 'Selene', 'Thule',
    'Ursin', 'Varda', 'Wolkor', 'Yrth', 'Zhaal', 'Ankaa', 'Bellatrix', 'Cygni', 'Diphda',
    'Elnath', 'Fomalhaut', 'Gienah', 'Izar', 'Jabbah', 'Kochab', 'Lesath', 'Marfik'];

  OL.RACES = {
    menschen:  { name: 'Menschen',   home: 'Sol',      color: '#4fa3ff', personality: 'diplomat',
      desc: 'Händler und Diplomaten: +50 % Credits.', credits: 1.5 },
    psilonen:  { name: 'Psilonen',   home: 'Mentar',   color: '#b07cf0', personality: 'technologe',
      desc: 'Geborene Forscher: +50 % Forschung, −25 % Bodentruppen.', research: 1.5, ground: 0.75 },
    sakkra:    { name: 'Sakkra',     home: 'Sssla',    color: '#54c47a', personality: 'expansionist',
      desc: 'Brüten schnell: doppeltes Wachstum, +25 % Bodentruppen.', growth: 2, ground: 1.25 },
    klackonen: { name: 'Klackonen',  home: 'Kholdan',  color: '#f08a3c', personality: 'industriell',
      desc: 'Arbeitsstaat: +1 Produktion je Arbeiter, −20 % Forschung.', prodPerWorker: 1, research: 0.8 },
    bulrathi:  { name: 'Bulrathi',   home: 'Ursa',     color: '#e5534b', personality: 'militarist',
      desc: 'Kriegerbären: +50 % Bodentruppen, +10 % Trefferchance.', ground: 1.5, hit: 0.1 },
    mrrshan:   { name: 'Mrrshan',    home: 'Fierias',  color: '#3cc8c8', personality: 'militarist',
      desc: 'Jägervolk: +20 % Trefferchance im Raumkampf.', hit: 0.2 }
  };

  OL.PERSONALITIES = {
    diplomat:     { name: 'Diplomat',     war: 1.15, mil: 0.9, sci: 0.35, expand: 1.0, peace: 1.3 },
    technologe:   { name: 'Technologe',   war: 1.1,  mil: 0.8, sci: 0.55, expand: 0.9, peace: 1.1 },
    expansionist: { name: 'Expansionist', war: 1.0,  mil: 1.0, sci: 0.3,  expand: 1.4, peace: 1.0 },
    industriell:  { name: 'Industrieller', war: 1.0, mil: 1.1, sci: 0.25, expand: 1.1, peace: 1.0 },
    militarist:   { name: 'Militarist',   war: 0.85, mil: 1.4, sci: 0.25, expand: 1.0, peace: 0.8 }
  };

  // Forschungsfelder: jede Stufe ist eine Technologie mit Effekten (fx)
  OL.TECH_COST = [60, 140, 280, 500, 850, 1400, 2300];
  OL.FIELDS = [
    { id: 'kon', name: 'Konstruktion', short: 'KON', levels: [
      { name: 'Automatisierte Fabrik', desc: 'Gebäude: +1 Produktion je Arbeiter, +3 fix. Rumpf: Zerstörer.', fx: { building: 'factory', hull: 'destroyer' } },
      { name: 'Tritanium-Panzerung', desc: 'Schiffsstruktur ×1,5. Rumpf: Kreuzer.', fx: { armor: 1.5, hull: 'cruiser' } },
      { name: 'Robotische Minen', desc: 'Gebäude: +2 Produktion je Arbeiter, +5 fix.', fx: { building: 'robominer' } },
      { name: 'Zortrium-Panzerung', desc: 'Schiffsstruktur ×2. Rumpf: Schlachtschiff.', fx: { armor: 2, hull: 'battleship' } },
      { name: 'Neutronium-Panzerung', desc: 'Schiffsstruktur ×3. Rumpf: Titan.', fx: { armor: 3, hull: 'titan' } },
      { name: 'Nanofabriken', desc: '+25 % Produktion im ganzen Reich.', fx: { prodPct: 0.25 } },
      { name: 'Adamantium-Panzerung', desc: 'Schiffsstruktur ×4.', fx: { armor: 4 } }
    ] },
    { id: 'bio', name: 'Biologie', short: 'BIO', levels: [
      { name: 'Hydrokultur-Farm', desc: 'Gebäude: +3 Nahrung.', fx: { building: 'hydro' } },
      { name: 'Bodenveredelung', desc: '+1 Nahrung je Bauer auf fruchtbaren Welten.', fx: { foodPerFarmer: 1 } },
      { name: 'Klonzentrum', desc: 'Gebäude: schnelleres Bevölkerungswachstum.', fx: { building: 'cloning' } },
      { name: 'Unterirdische Städte', desc: '+1 max. Bevölkerung je Planetengröße.', fx: { popPerSize: 1 } },
      { name: 'Terraforming', desc: 'Planeten um eine Umweltstufe verbessern (bis Terranisch).', fx: { terraform: true } },
      { name: 'Gaia-Transformation', desc: 'Terranische und Ozean-Welten zu Gaia umwandeln.', fx: { gaia: true } },
      { name: 'Biomorphe Pilze', desc: '+1 Nahrung je Bauer, auch auf kargen Welten.', fx: { foodPerFarmer: 1, barrenFarming: true } }
    ] },
    { id: 'phy', name: 'Physik', short: 'PHY', base: 'Laser (Schaden 4)', levels: [
      { name: 'Fusionsstrahl', desc: 'Waffe mit Schaden 6.', fx: { weapon: 1 } },
      { name: 'Gravitonstrahl', desc: 'Waffe mit Schaden 9.', fx: { weapon: 2 } },
      { name: 'Phasor', desc: 'Waffe mit Schaden 12.', fx: { weapon: 3 } },
      { name: 'Plasmakanone', desc: 'Waffe mit Schaden 16.', fx: { weapon: 4 } },
      { name: 'Disruptor', desc: 'Waffe mit Schaden 20.', fx: { weapon: 5 } },
      { name: 'Todesstrahl', desc: 'Waffe mit Schaden 26.', fx: { weapon: 6 } }
    ] },
    { id: 'kra', name: 'Kraftfelder', short: 'KRA', base: 'Keine Schilde', levels: [
      { name: 'Deflektor Klasse I', desc: 'Schiffsschild absorbiert 1 Schaden je Treffer.', fx: { shield: 1 } },
      { name: 'Planetarer Schild', desc: 'Gebäude: +5 Schild für die Raketenbasis. Schiffsschild Klasse III.', fx: { shield: 3, building: 'plshield' } },
      { name: 'Deflektor Klasse V', desc: 'Schiffsschild absorbiert 5 Schaden.', fx: { shield: 5 } },
      { name: 'Deflektor Klasse VII', desc: 'Schiffsschild absorbiert 7 Schaden.', fx: { shield: 7 } },
      { name: 'Deflektor Klasse X', desc: 'Schiffsschild absorbiert 10 Schaden.', fx: { shield: 10 } },
      { name: 'Klasse XV', desc: 'Schiffsschild absorbiert 15 Schaden.', fx: { shield: 15 } }
    ] },
    { id: 'ant', name: 'Antrieb', short: 'ANT', base: 'Kernantrieb (2 pc/Runde, Reichweite 6 pc)', levels: [
      { name: 'Fusionsantrieb', desc: 'Tempo 3 pc/Runde, Reichweite 7 pc.', fx: { speed: 3, range: 7 } },
      { name: 'Deuterium-Tanks', desc: 'Reichweite 9 pc.', fx: { range: 9 } },
      { name: 'Ionenantrieb', desc: 'Tempo 4 pc/Runde, Reichweite 10 pc.', fx: { speed: 4, range: 10 } },
      { name: 'Antimaterie-Antrieb', desc: 'Tempo 5 pc/Runde, Reichweite 12 pc.', fx: { speed: 5, range: 12 } },
      { name: 'Hyperraum-Antrieb', desc: 'Tempo 6 pc/Runde, Reichweite 15 pc.', fx: { speed: 6, range: 15 } },
      { name: 'Transwarp', desc: 'Tempo 8 pc/Runde, Reichweite 20 pc.', fx: { speed: 8, range: 20 } }
    ] },
    { id: 'com', name: 'Computer', short: 'COM', levels: [
      { name: 'Forschungslabor', desc: 'Gebäude: +1 Forschung je Forscher, +3 fix.', fx: { building: 'lab' } },
      { name: 'Zielcomputer Mk I', desc: '+10 % Trefferchance, Scanner +1 pc.', fx: { hit: 0.1, scan: 1 } },
      { name: 'Supercomputer', desc: 'Gebäude: +2 Forschung je Forscher, +5 fix.', fx: { building: 'supercomp' } },
      { name: 'Zielcomputer Mk II', desc: '+20 % Trefferchance, Scanner +2 pc.', fx: { hit: 0.2, scan: 2 } },
      { name: 'Positronisches Netz', desc: '+25 % Forschung im ganzen Reich.', fx: { researchPct: 0.25 } },
      { name: 'Zielcomputer Mk III', desc: '+30 % Trefferchance, Scanner +3 pc.', fx: { hit: 0.3, scan: 3 } },
      { name: 'Bewusstseins-KI', desc: '+50 % Forschung im ganzen Reich.', fx: { researchPct: 0.5 } }
    ] },
    { id: 'soz', name: 'Soziologie', short: 'SOZ', levels: [
      { name: 'Raumhafen', desc: 'Gebäude: +50 % Credits der Kolonie.', fx: { building: 'spaceport' } },
      { name: 'Kampfanzüge', desc: '+50 % Bodentruppen (Angriff und Verteidigung).', fx: { ground: 0.5 } },
      { name: 'Planetare Börse', desc: 'Gebäude: +4 Credits und +50 % Credits der Kolonie.', fx: { building: 'exchange' } },
      { name: 'Imperiale Verwaltung', desc: '+10 % Produktion und Forschung.', fx: { prodPct: 0.1, researchPct: 0.1 } },
      { name: 'Galaktische Währung', desc: '+50 % Credits im ganzen Reich.', fx: { creditPct: 0.5 } },
      { name: 'Psionik', desc: '+100 % Bodentruppen.', fx: { ground: 1.0 } }
    ] }
  ];
  OL.FIELD_BY_ID = {};
  OL.FIELDS.forEach(function (f) { OL.FIELD_BY_ID[f.id] = f; });

  OL.WEAPONS = [
    { name: 'Laser', dmg: 4 }, { name: 'Fusionsstrahl', dmg: 6 }, { name: 'Gravitonstrahl', dmg: 9 },
    { name: 'Phasor', dmg: 12 }, { name: 'Plasmakanone', dmg: 16 }, { name: 'Disruptor', dmg: 20 },
    { name: 'Todesstrahl', dmg: 26 }
  ];

  OL.BUILDINGS = {
    capital:   { name: 'Hauptstadt', cost: 0, upkeep: 0, hidden: true,
      desc: '+2 Nahrung, +3 Produktion, +2 Forschung, +5 Credits, +20 Garnison.' },
    factory:   { name: 'Automatisierte Fabrik', cost: 60, upkeep: 1, desc: '+1 Produktion je Arbeiter, +3 fix.' },
    robominer: { name: 'Robotische Minen', cost: 150, upkeep: 2, desc: '+2 Produktion je Arbeiter, +5 fix.' },
    hydro:     { name: 'Hydrokultur-Farm', cost: 50, upkeep: 1, desc: '+3 Nahrung.' },
    cloning:   { name: 'Klonzentrum', cost: 80, upkeep: 1, desc: '+0,15 Bevölkerungswachstum je Runde.' },
    lab:       { name: 'Forschungslabor', cost: 60, upkeep: 1, desc: '+1 Forschung je Forscher, +3 fix.' },
    supercomp: { name: 'Supercomputer', cost: 150, upkeep: 2, desc: '+2 Forschung je Forscher, +5 fix.' },
    spaceport: { name: 'Raumhafen', cost: 60, upkeep: 0, desc: '+50 % Credits dieser Kolonie.' },
    exchange:  { name: 'Planetare Börse', cost: 120, upkeep: 0, desc: '+4 Credits, +50 % Credits dieser Kolonie.' },
    barracks:  { name: 'Marinekaserne', cost: 40, upkeep: 1, desc: '+20 Garnison gegen Invasionen.' },
    base:      { name: 'Raketenbasis', cost: 80, upkeep: 1, desc: 'Orbitale Verteidigung: 6 Waffen, eigene Struktur.' },
    plshield:  { name: 'Planetarer Schild', cost: 100, upkeep: 1, desc: '+5 Schild für die Raketenbasis.' }
  };
  // Immer verfügbare Gebäude
  OL.BASE_BUILDINGS = ['barracks', 'base'];

  OL.HULLS = {
    scout:      { name: 'Späher',             cost: 12,  slots: 0,  hp: 3,   eva: 0.25, upkeep: 0,   civil: true, scan: 3 },
    colony:     { name: 'Kolonieschiff',      cost: 60,  slots: 0,  hp: 5,   eva: 0,    upkeep: 0,   civil: true },
    outpost:    { name: 'Außenposten-Schiff', cost: 30,  slots: 0,  hp: 4,   eva: 0,    upkeep: 0,   civil: true },
    transport:  { name: 'Truppentransporter', cost: 20,  slots: 0,  hp: 4,   eva: 0.05, upkeep: 0.5, civil: true, troops: 2 },
    frigate:    { name: 'Fregatte',           cost: 20,  slots: 1,  hp: 5,   eva: 0.15, upkeep: 0.5 },
    destroyer:  { name: 'Zerstörer',          cost: 40,  slots: 2,  hp: 10,  eva: 0.1,  upkeep: 1 },
    cruiser:    { name: 'Kreuzer',            cost: 90,  slots: 4,  hp: 24,  eva: 0.05, upkeep: 1.5 },
    battleship: { name: 'Schlachtschiff',     cost: 180, slots: 8,  hp: 55,  eva: 0,    upkeep: 2.5 },
    titan:      { name: 'Titan',              cost: 360, slots: 16, hp: 120, eva: -0.05, upkeep: 4 }
  };
  OL.WARSHIPS = ['frigate', 'destroyer', 'cruiser', 'battleship', 'titan'];
  OL.BASE_HULLS = ['scout', 'colony', 'outpost', 'transport', 'frigate'];

  OL.GALAXY = {
    klein:  { name: 'Klein',  w: 26, h: 18, stars: 15 },
    mittel: { name: 'Mittel', w: 34, h: 23, stars: 24 },
    gross:  { name: 'Groß',   w: 42, h: 29, stars: 34 }
  };
  OL.DIFFICULTY = {
    leicht: { name: 'Leicht', bonus: 0.8,  attack: 1.9, warTurn: 60 },
    normal: { name: 'Normal', bonus: 1.0,  attack: 1.5, warTurn: 45 },
    schwer: { name: 'Schwer', bonus: 1.3,  attack: 1.3, warTurn: 30 }
  };

  // Die Faustregeln, nach denen die KI spielt (siehe ai.js)
  OL.RULES = [
    { id: 1,  title: 'Expansion schlägt alles', text: 'In der Frühphase haben Kolonie- und Außenposten-Schiffe Vorrang vor allem anderen. Wer zuerst die guten Welten besetzt, gewinnt das Spiel meist schon in den ersten 50 Runden.' },
    { id: 2,  title: 'Nahrung zuerst, aber knapp', text: 'Nur so viele Bauern wie nötig, damit das Reich nicht hungert (kleiner Puffer). Jeder überzählige Bauer ist ein verschenkter Arbeiter oder Forscher.' },
    { id: 3,  title: 'Arbeiter auf reiche, Forscher auf arme Welten', text: 'Mineralreiche Planeten produzieren, arme Planeten und Welten mit Artefakten forschen. Der Anteil der Forscher richtet sich nach der Persönlichkeit.' },
    { id: 4,  title: 'Neue Kolonie: Fabrik zuerst, Winzlinge wachsen lassen', text: 'Bauliste einer Kolonie: Fabrik, dann Labor, dann der Rest. Kolonien mit weniger als 3 Einwohnern bauen Wohnprojekte, bis sie auf eigenen Beinen stehen.' },
    { id: 5,  title: 'Wirtschaft vor Waffen', text: 'Solange kein Krieg droht, werden Konstruktion, Computer und Biologie bevorzugt. Waffen und Schilde erst bei Bedrohung, dann aber mit Nachdruck.' },
    { id: 6,  title: 'Keine Lücken im Technologiebaum', text: 'Kein Forschungsfeld fällt mehr als zwei Stufen hinter das beste zurück. Liegen gute Welten außer Reichweite, wird Antrieb erforscht. Schilde halten mit den Waffen des Gegners Schritt.' },
    { id: 7,  title: 'Kein Militär ohne Bedrohung, aber nie wehrlos', text: 'Die Flottenstärke folgt der Bedrohung durch die Nachbarn. Bedrohte Grenzkolonien bekommen eine Raketenbasis.' },
    { id: 8,  title: 'Angreifen nur mit klarer Überlegenheit', text: 'Ein Angriff startet erst, wenn die geschätzte Kampfkraft das Ziel deutlich übertrifft (Normal: 1,5-fach). Ziel ist die schwächste, wertvollste und nächstgelegene feindliche Kolonie.' },
    { id: 9,  title: 'Alles auf einen Stapel', text: 'Kriegsschiffe werden nie aufgeteilt. Die Flotte sammelt sich an einem Sammelpunkt und schlägt geschlossen zu.' },
    { id: 10, title: 'Truppen folgen der Flotte', text: 'Transporter warten am Sammelpunkt, bis der Orbit gesäubert und die Raketenbasis zerstört ist. Erst dann landen die Truppen, mit genug Übermacht.' },
    { id: 11, title: 'Rückzug bei Unterlegenheit', text: 'Ist die Flotte unterlegen, zieht sie sich zur nächsten eigenen Kolonie zurück, statt sinnlos unterzugehen.' },
    { id: 12, title: 'Krieg gegen den schwächsten Nachbarn, nie an zwei Fronten', text: 'Krieg wird nur einem schwachen Nachbarn erklärt, und nur, wenn kein anderer Krieg läuft. Läuft ein Krieg schlecht, bietet die KI Frieden an.' },
    { id: 13, title: 'Nie pleite, nie horten', text: 'Bei negativem Einkommen: Handelsgüter produzieren, keine teuren Gebäude, veraltete Schiffe verschrotten. Liegt Geld über der Reserve, wird es in Käufe gesteckt: Basen, Kolonieschiffe, Fabriken, im Krieg Schiffe.' },
    { id: 14, title: 'Heimatverteidigung vor Angriff', text: 'Greift ein Feind eine eigene Kolonie an und kann die Flotte ihn schlagen, fängt sie ihn ab, bevor sie selbst angreift.' },
    { id: 15, title: 'Orion nur mit doppelter Übermacht', text: 'Der Wächter von Orion wird erst angegriffen, wenn die Flotte mindestens doppelt so stark ist. Der Lohn: die beste Welt der Galaxis und zwei Technologien.' }
  ];
})(typeof globalThis !== 'undefined' ? (globalThis.OL = globalThis.OL || {}) : (window.OL = window.OL || {}));
