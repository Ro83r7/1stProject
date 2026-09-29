/*
 * Draanas Heldenbogen: Standardwerte, Prüfung beim Import.
 * Die Werte sind Beispielwerte und lassen sich im Bogen bearbeiten.
 */
(function (root) {
  'use strict';
  const DSA = (root.DSA = root.DSA || {});

  function standardHeld() {
    return {
      version: 1,
      name: 'Draana',
      beschreibung: 'Thorwalerin aus Olport, Seesöldnerin',
      eigenschaften: { MU: 14, KL: 11, IN: 13, CH: 12, FF: 12, GE: 13, KO: 14, KK: 14 },
      lep: { max: 36, aktuell: 36 },
      schip: { max: 3, aktuell: 3 },
      kampf: { waffe: 'Skraja', at: 14, pa: 7, tp: '1W6+3', rs: 2, aw: 7 },
      talente: {
        Klettern: 6,
        Körperbeherrschung: 5,
        Kraftakt: 8,
        Schwimmen: 8,
        Selbstbeherrschung: 7,
        Singen: 5,
        Sinnesschärfe: 6,
        Verbergen: 3,
        Zechen: 9,
        Einschüchtern: 6,
        Gassenwissen: 3,
        Menschenkenntnis: 4,
        Überreden: 3,
        Willenskraft: 5,
        Fesseln: 4,
        'Fischen & Angeln': 5,
        Orientierung: 6,
        Tierkunde: 3,
        Wildnisleben: 4,
        Geographie: 3,
        'Götter & Kulte': 3,
        Kriegskunst: 3,
        'Sagen & Legenden': 5,
        'Boote & Schiffe': 9,
        Handel: 3,
        'Heilkunde Wunden': 4,
        Holzbearbeitung: 4,
      },
      inventar: ['Skraja', 'Lederharnisch', 'Seemannsmesser', 'Wetterfester Umhang', 'Zunderkästchen', 'Wasserschlauch', '12 Silbertaler'],
      ap: 0,
      notizen: '',
    };
  }

  function ganz(x, min, max, fallback) {
    const n = Math.round(Number(x));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  /** Macht aus beliebigem JSON einen gültigen Heldenbogen (oder wirft mit Grund). */
  function pruefeHeld(roh) {
    if (!roh || typeof roh !== 'object') throw new Error('Kein Heldenbogen-Objekt.');
    const basis = standardHeld();
    const h = {
      version: 1,
      name: String(roh.name || basis.name).slice(0, 40),
      beschreibung: String(roh.beschreibung || '').slice(0, 120),
      eigenschaften: {},
      lep: {},
      schip: {},
      kampf: {},
      talente: {},
      inventar: [],
      ap: ganz(roh.ap, 0, 99999, 0),
      notizen: String(roh.notizen || '').slice(0, 4000),
    };
    DSA.EIGENSCHAFTEN.forEach((e) => {
      h.eigenschaften[e.k] = ganz(roh.eigenschaften && roh.eigenschaften[e.k], 1, 25, basis.eigenschaften[e.k]);
    });
    h.lep.max = ganz(roh.lep && roh.lep.max, 1, 200, basis.lep.max);
    h.lep.aktuell = ganz(roh.lep && roh.lep.aktuell, -50, h.lep.max, h.lep.max);
    h.schip.max = ganz(roh.schip && roh.schip.max, 0, 10, basis.schip.max);
    h.schip.aktuell = ganz(roh.schip && roh.schip.aktuell, 0, h.schip.max, h.schip.max);
    const k = roh.kampf || {};
    h.kampf.waffe = String(k.waffe || basis.kampf.waffe).slice(0, 40);
    h.kampf.at = ganz(k.at, 0, 25, basis.kampf.at);
    h.kampf.pa = ganz(k.pa, 0, 25, basis.kampf.pa);
    h.kampf.aw = ganz(k.aw, 0, 25, basis.kampf.aw);
    h.kampf.rs = ganz(k.rs, 0, 10, basis.kampf.rs);
    h.kampf.tp = DSA.parseFormel(k.tp) ? DSA.formelText(DSA.parseFormel(k.tp)) : basis.kampf.tp;
    if (roh.talente && typeof roh.talente === 'object') {
      Object.keys(roh.talente).forEach((name) => {
        const t = DSA.findeTalent(name);
        if (t) h.talente[t.name] = ganz(roh.talente[name], 0, 25, 0);
      });
    }
    if (Array.isArray(roh.inventar)) {
      h.inventar = roh.inventar.map((s) => String(s).slice(0, 80)).filter(Boolean).slice(0, 60);
    }
    return h;
  }

  DSA.standardHeld = standardHeld;
  DSA.pruefeHeld = pruefeHeld;
})(typeof window !== 'undefined' ? window : globalThis);
