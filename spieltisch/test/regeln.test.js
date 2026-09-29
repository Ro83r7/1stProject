'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

require('../js/wuerfel.js');
require('../js/regeln.js');
require('../js/held.js');
require('../js/meister.js');
require('../js/solo.js');
const DSA = globalThis.DSA;

function held() {
  return DSA.standardHeld();
}

test('SHA-256 stimmt mit node:crypto überein', () => {
  for (const s of ['', 'abc', 'Draana', 'Ä'.repeat(100), 'x'.repeat(1000)]) {
    assert.equal(DSA.sha256(s), crypto.createHash('sha256').update(s, 'utf8').digest('hex'));
  }
});

test('Würfelformeln werden geprüft', () => {
  assert.deepEqual(DSA.parseFormel('1W6+3'), { anzahl: 1, seiten: 6, bonus: 3 });
  assert.deepEqual(DSA.parseFormel('w20'), { anzahl: 1, seiten: 20, bonus: 0 });
  assert.deepEqual(DSA.parseFormel('2d6-1'), { anzahl: 2, seiten: 6, bonus: -1 });
  assert.equal(DSA.parseFormel('1W7'), null);
  assert.equal(DSA.parseFormel('99W6'), null);
  assert.equal(DSA.parseFormel('Schaden'), null);
});

test('Kryptozufall bleibt im Bereich und trifft alle Seiten', () => {
  const gesehen = new Set();
  for (let i = 0; i < 2000; i++) {
    const x = DSA.kryptoZufall(20);
    assert.ok(x >= 1 && x <= 20);
    gesehen.add(x);
  }
  assert.equal(gesehen.size, 20);
});

test('Talentprobe: gelungen mit QS aus übrigen FP', () => {
  const h = held(); // Klettern MU/GE/KK = 14/13/14, FW 6
  const p = DSA.talentprobe(h, 'Klettern', 0, DSA.folgeBecher([10, 15, 5]));
  assert.deepEqual(p.ueber, [0, 2, 0]);
  assert.equal(p.fpRest, 4);
  assert.equal(p.gelungen, true);
  assert.equal(p.qs, 2);
});

test('Talentprobe: Erschwernis senkt alle drei Eigenschaften', () => {
  const h = held();
  const p = DSA.talentprobe(h, 'Klettern', 2, DSA.folgeBecher([13, 12, 12]));
  assert.deepEqual(p.eigenschaften.map((e) => e.wert), [12, 11, 12]);
  assert.deepEqual(p.ueber, [1, 1, 0]);
  assert.equal(p.fpRest, 4);
});

test('Talentprobe: misslungen, wenn FP nicht reichen', () => {
  const h = held();
  const p = DSA.talentprobe(h, 'Klettern', 0, DSA.folgeBecher([19, 18, 3]));
  assert.equal(p.fpRest, 6 - 5 - 5);
  assert.equal(p.gelungen, false);
  assert.equal(p.qs, 0);
});

test('Doppel-1 ist kritisch, Doppel-20 ist Patzer', () => {
  const h = held();
  const krit = DSA.talentprobe(h, 'Verbergen', 0, DSA.folgeBecher([1, 1, 20]));
  assert.equal(krit.kritisch, true);
  assert.equal(krit.gelungen, true);
  assert.ok(krit.qs >= 1);
  const patzer = DSA.talentprobe(h, 'Zechen', 0, DSA.folgeBecher([20, 20, 1]));
  assert.equal(patzer.patzer, true);
  assert.equal(patzer.gelungen, false);
  const spekt = DSA.talentprobe(h, 'Zechen', 0, DSA.folgeBecher([20, 20, 20]));
  assert.equal(spekt.spektakulaer, true);
});

test('QS-Stufen nach FP', () => {
  assert.deepEqual([0, 1, 3, 4, 6, 7, 10, 13, 16, 18].map(DSA.qsAusFP), [1, 1, 1, 2, 2, 3, 4, 5, 6, 6]);
});

test('Schmerzstufen nach LeP-Anteil', () => {
  const h = held(); // 36 LeP
  const stufe = (lep) => DSA.schmerzStufe(Object.assign({}, h, { lep: { max: 36, aktuell: lep } }));
  assert.equal(stufe(36), 0);
  assert.equal(stufe(28), 0);
  assert.equal(stufe(27), 1);
  assert.equal(stufe(18), 2);
  assert.equal(stufe(9), 3);
  assert.equal(stufe(5), 4);
  assert.equal(stufe(-3), 4);
});

test('Schmerz erschwert Proben automatisch', () => {
  const h = held();
  h.lep.aktuell = 18; // Schmerz II
  const p = DSA.talentprobe(h, 'Klettern', 1, DSA.folgeBecher([1, 2, 3]));
  assert.equal(p.schmerz, 2);
  assert.deepEqual(p.eigenschaften.map((e) => e.wert), [11, 10, 11]);
});

test('Schicksalspunkt: je Würfel zählt der bessere Wert', () => {
  const h = held();
  const p = DSA.talentprobe(h, 'Klettern', 0, DSA.folgeBecher([19, 18, 3]));
  const neu = DSA.talentNeuwurf(p, [0, 1], DSA.folgeBecher([4, 20]));
  assert.deepEqual(neu.wuerfe, [4, 18, 3]);
  assert.deepEqual(neu.vorNeuwurf, [19, 18, 3]);
  assert.equal(neu.fpRest, 6 - 5);
  assert.equal(neu.gelungen, true);
});

test('Eigenschaftsprobe mit Bestätigungswurf', () => {
  const h = held();
  const krit = DSA.eigenschaftsprobe(h, 'MU', 0, DSA.folgeBecher([1, 5]));
  assert.equal(krit.kritisch, true);
  const eins = DSA.eigenschaftsprobe(h, 'Mut', 0, DSA.folgeBecher([1, 18]));
  assert.equal(eins.gelungen, true);
  assert.equal(eins.kritisch, false);
  const patzer = DSA.eigenschaftsprobe(h, 'KL', 0, DSA.folgeBecher([20, 15]));
  assert.equal(patzer.patzer, true);
  assert.equal(patzer.gelungen, false);
});

test('Kampfrunde: Treffer, Parade, Schaden abzüglich RS', () => {
  const h = held(); // AT 14, PA 7, TP 1W6+3, RS 2
  const kampf = {
    gegner: [{ name: 'Räuber', lep: 20, lepMax: 20, at: 11, pa: 5, rs: 1, tp: '1W6+2' }],
    runde: 0,
    ziel: 0,
    verteidigung: 'parade',
  };
  // Heldin: AT 8 (Treffer), Räuber PA 12 (misslungen), TP 5 → 8 - RS 1 = 7
  // Räuber: AT 3 (Treffer), Heldin PA 15 (misslungen), TP 4 → 6 - RS 2 = 4
  const r = DSA.kampfrunde(h, kampf, DSA.folgeBecher([8, 12, 5, 3, 15, 4]));
  assert.equal(kampf.gegner[0].lep, 13);
  assert.equal(h.lep.aktuell, 32);
  assert.equal(r.runde, 1);
  assert.equal(r.ergebnis, null);
  assert.equal(r.ereignisse.length, 2);
});

test('Kampfrunde: zweite Verteidigung ist um 3 erschwert', () => {
  const h = held();
  const g = (name) => ({ name, lep: 20, lepMax: 20, at: 11, pa: 5, rs: 1, tp: '1W6' });
  const kampf = { gegner: [g('A'), g('B')], runde: 0, ziel: 0, verteidigung: 'parade' };
  // Heldin verfehlt (19). A: AT 2, PA 7 → Wurf 7 gelingt. B: AT 2, PA 7-3=4 → Wurf 5 misslingt, TP 6 → 4 SP
  DSA.kampfrunde(h, kampf, DSA.folgeBecher([19, 2, 7, 2, 5, 6]));
  assert.equal(h.lep.aktuell, 32);
});

test('Kampfrunde: Sieg, wenn alle Gegner fallen', () => {
  const h = held();
  const kampf = { gegner: [{ name: 'Wolf', lep: 3, lepMax: 20, at: 12, pa: 0, rs: 0, tp: '1W6+3' }], runde: 0, ziel: 0, verteidigung: 'ausweichen' };
  const r = DSA.kampfrunde(h, kampf, DSA.folgeBecher([5, 6]));
  assert.equal(r.ergebnis, 'sieg');
  assert.ok(kampf.gegner[0].lep <= 0);
});

test('Protokoll: Hash-Kette erkennt nachträgliche Änderungen', () => {
  const p = new DSA.Protokoll();
  p.eintragen('Talentprobe', 'Klettern', [{ w: 20, x: 3 }, { w: 20, x: 17 }, { w: 20, x: 9 }]);
  p.eintragen('Schaden', '1W6', [{ w: 6, x: 4 }]);
  p.eintragen('Kampfrunde 1', '…', [{ w: 20, x: 11 }]);
  assert.deepEqual(p.pruefen(), { ok: true, anzahl: 3 });
  p.eintraege[1].wuerfe[0] = 'W6:1';
  assert.deepEqual(p.pruefen(), { ok: false, nr: 2, anzahl: 3 });
});

test('Becher.mitschnitt zeichnet alle Würfe auf', () => {
  const b = DSA.folgeBecher([4, 5, 6]);
  const { ergebnis, wuerfe } = b.mitschnitt(() => b.wurf('3W6+1'));
  assert.equal(ergebnis.summe, 16);
  assert.deepEqual(wuerfe, [{ w: 6, x: 4 }, { w: 6, x: 5 }, { w: 6, x: 6 }]);
});

// ---------- Regelwächter ----------

function antwort(extra) {
  return Object.assign(
    { szene: 'Hafen', erzaehlung: 'Es regnet.', probe: null, kampf: null, kampf_beenden: false, vorschlaege: [], inventar_neu: [], ap: 0, abenteuer_ende: false },
    extra
  );
}

test('Regelwächter: Aliase werden auf DSA5-Talente abgebildet', () => {
  const { antwort: a, hinweise } = DSA.pruefeAntwort(
    antwort({ probe: { typ: 'talent', name: 'Wahrnehmung', erschwernis: 1, formel: '', grund: 'Nebel' } }),
    { kampf: null }
  );
  assert.equal(a.probe.name, 'Sinnesschärfe');
  assert.equal(a.probe.erschwernis, 1);
  assert.ok(hinweise.some((h) => h.includes('Sinnesschärfe')));
});

test('Regelwächter: erfundene Talente werden verworfen, Erschwernis begrenzt', () => {
  const r1 = DSA.pruefeAntwort(antwort({ probe: { typ: 'talent', name: 'Drachenreiten', erschwernis: 0, formel: '', grund: '' } }), { kampf: null });
  assert.equal(r1.antwort.probe, null);
  assert.equal(r1.hinweise.length, 1);
  const r2 = DSA.pruefeAntwort(antwort({ probe: { typ: 'talent', name: 'Klettern', erschwernis: 12, formel: '', grund: '' } }), { kampf: null });
  assert.equal(r2.antwort.probe.erschwernis, 5);
});

test('Regelwächter: überzogener Schaden und Gegnerwerte werden abgefangen', () => {
  const r1 = DSA.pruefeAntwort(antwort({ probe: { typ: 'schaden', name: '', erschwernis: 0, formel: '10W20', grund: 'Drache' } }), { kampf: null });
  assert.equal(r1.antwort.probe, null);
  const r2 = DSA.pruefeAntwort(
    antwort({ kampf: { gegner: [{ name: 'Oger', lep: 500, at: 25, pa: 3, rs: 2, tp: '9W20' }] } }),
    { kampf: null }
  );
  const g = r2.antwort.gegner[0];
  assert.equal(g.lep, 80);
  assert.equal(g.at, 18);
  assert.equal(g.tp, '1W6+2');
  assert.ok(r2.hinweise.length >= 3);
});

test('Regelwächter: keine Talentprobe während eines Kampfes', () => {
  const r = DSA.pruefeAntwort(antwort({ probe: { typ: 'talent', name: 'Klettern', erschwernis: 0, formel: '', grund: '' } }), { kampf: { gegner: [] } });
  assert.equal(r.antwort.probe, null);
});

test('Regelwächter: AP-Vergabe begrenzt, leere Erzählung abgelehnt', () => {
  assert.equal(DSA.pruefeAntwort(antwort({ ap: 500 }), { kampf: null }).antwort.ap, 10);
  assert.throws(() => DSA.pruefeAntwort(antwort({ erzaehlung: '' }), { kampf: null }));
  assert.throws(() => DSA.pruefeAntwort('kein JSON', { kampf: null }));
});

test('Nachrichten wechseln die Rollen ab und enden mit dem Zustand', () => {
  const z = { held: held(), kampf: null };
  const n = DSA.baueNachrichten(
    [
      { rolle: 'tisch', text: 'Start' },
      { rolle: 'meister', text: 'Es war einmal', probeText: 'Klettern' },
      { rolle: 'tisch', text: 'Probe gelungen' },
      { rolle: 'spieler', text: 'Ich schaue mich um' },
    ],
    z
  );
  assert.deepEqual(n.map((m) => m.role), ['user', 'assistant', 'user']);
  assert.match(n[2].content, /\[Spieltisch\] Probe gelungen/);
  assert.match(n[2].content, /\[Handlung der Heldin\] Ich schaue mich um/);
  assert.match(n[2].content, /Spieltisch-Zustand/);
  assert.match(n[1].content, /Angefordert: Klettern/);
});

test('Das Antwortschema ist für strukturierte Ausgaben vollständig', () => {
  function pruefe(s, pfad) {
    if (s.type === 'object') {
      assert.equal(s.additionalProperties, false, pfad);
      assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), pfad);
      Object.entries(s.properties).forEach(([k, v]) => pruefe(v, pfad + '.' + k));
    }
    if (s.anyOf) s.anyOf.forEach((v, i) => pruefe(v, pfad + '|' + i));
    if (s.items) pruefe(s.items, pfad + '[]');
  }
  pruefe(DSA.ANTWORT_SCHEMA, 'antwort');
});

// ---------- Solo-Abenteuer ----------

test('Solo-Abenteuer: alle Verweise zeigen auf existierende Szenen', () => {
  const K = DSA.SOLO_KNOTEN;
  for (const [id, k] of Object.entries(K)) {
    const ziele = [k.erfolg, k.misserfolg, k.weiter, k.sieg, k.niederlage].concat((k.wahl || []).map((w) => w[1])).filter(Boolean);
    ziele.forEach((z) => assert.ok(K[z], id + ' → ' + z));
    const hatWeg = ziele.length > 0 || k.ende;
    assert.ok(hatWeg, id + ' ist eine Sackgasse');
    if (k.probe) {
      const p = typeof k.probe === 'function' ? k.probe({}) : k.probe;
      if (p.typ === 'talent') assert.ok(DSA.findeTalent(p.name), id + ': ' + p.name);
      if (p.typ === 'schaden' || p.typ === 'heilung') assert.ok(DSA.parseFormel(p.formel), id);
    }
    if (k.kampf) assert.ok(k.sieg && k.niederlage, id);
  }
});

test('Solo-Abenteuer: jede Antwort besteht den Regelwächter ohne Korrektur', async () => {
  const m = new DSA.SoloMeister();
  for (const id of Object.keys(DSA.SOLO_KNOTEN)) {
    const z = { held: held(), kampf: null, solo: { knoten: null } };
    const roh = m.antwortAus(id, z.solo);
    const { hinweise } = DSA.pruefeAntwort(roh, z);
    assert.deepEqual(hinweise, [], id);
  }
});

test('Solo-Abenteuer lässt sich bis zum Ende durchspielen', async () => {
  const m = new DSA.SoloMeister();
  const z = { held: held(), kampf: null, solo: null };
  let a = await m.zug({ zustand: z, ereignis: { art: 'start' } });
  let schritte = 0;
  while (!a.abenteuer_ende && schritte++ < 40) {
    let ereignis;
    if (a.probe) ereignis = { art: 'probe', gelungen: true };
    else if (a.kampf) ereignis = { art: 'kampf', ergebnis: 'sieg' };
    else ereignis = { art: 'aktion', text: a.vorschlaege[a.vorschlaege.length - 1] };
    a = await m.zug({ zustand: z, ereignis });
  }
  assert.equal(a.abenteuer_ende, true);
  assert.equal(z.solo.knoten, 'ende_gut');
});
