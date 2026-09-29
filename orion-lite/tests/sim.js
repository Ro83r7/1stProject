/* Simuliert komplette Partien (nur KI-Reiche) und prüft Invarianten.
   Aufruf: node tests/sim.js [anzahlPartien] [runden] [--verbose] */
'use strict';
const path = require('path');
const js = (f) => path.join(__dirname, '..', 'js', f);
require(js('data.js'));
require(js('engine.js'));
require(js('ai.js'));
const OL = globalThis.OL;

const games = +(process.argv[2] || 6);
const turns = +(process.argv[3] || 250);
const verbose = process.argv.includes('--verbose');
let failures = 0;

function check(cond, msg) {
  if (!cond) { failures++; console.error('  FEHLER: ' + msg); }
}

function invariants(g) {
  g.stars.forEach((s) => {
    const c = s.colony;
    if (!c) return;
    check(g.players[c.owner] && g.players[c.owner].alive, `Kolonie ${s.name} gehört totem Reich`);
    if (!c.outpost) {
      const cit = Math.floor(c.pop + 1e-9);
      OL.normalizeJobs(c);
      check(c.jobs.every((j) => j >= 0) && c.jobs[0] + c.jobs[1] + c.jobs[2] === cit, `Jobs ${s.name}`);
      check(c.pop <= OL.maxPop(g, g.players[c.owner], s) + 1e-6 || c.pop > 0, `Pop ${s.name}`);
      check(Number.isFinite(c.pop) && c.pop >= 0, `Pop ungültig ${s.name}`);
    }
  });
  g.fleets.forEach((f) => {
    check(f.ships.length > 0, 'leere Flotte');
    check(Number.isFinite(f.x) && Number.isFinite(f.y), 'Flottenposition');
    f.ships.forEach((sh) => check(sh.hp > 0 && sh.hp <= sh.mhp, 'Schiffsstruktur ' + sh.hp + '/' + sh.mhp));
  });
  g.players.forEach((p) => check(Number.isFinite(p.credits) && p.credits >= 0, 'Credits ' + p.name + ' ' + p.credits));
}

const totals = { wars: 0, peace: 0, invasions: 0, guardian: 0, over: 0 };
for (let i = 0; i < games; i++) {
  const seed = 1000 + i * 7919;
  const galaxy = ['klein', 'mittel', 'gross'][i % 3];
  const g = OL.newGame({ seed, galaxy, opponents: 3 + (i % 2), difficulty: 'normal', allAI: true,
    race: Object.keys(OL.RACES)[i % 6] });
  const t0 = Date.now();
  for (let t = 0; t < turns && !g.over; t++) {
    OL.endTurn(g);
    if (t % 10 === 0) invariants(g);
  }
  invariants(g);
  JSON.parse(JSON.stringify(g)); // Spielstand muss serialisierbar sein
  const ms = Date.now() - t0;
  const wars = g.log.filter((e) => e.kind === 'war').length;
  const peace = g.log.filter((e) => e.kind === 'diplo' && /Frieden\./.test(e.msg)).length;
  const inv = g.log.filter((e) => /Invasion erfolgreich/.test(e.msg)).length;
  const guard = g.log.some((e) => /Wächter von Orion vernichtet/.test(e.msg));
  totals.wars += wars; totals.peace += peace; totals.invasions += inv; totals.guardian += guard ? 1 : 0; totals.over += g.over ? 1 : 0;
  console.log(`Partie ${i + 1} (${galaxy}, Seed ${seed}): ${g.turn - 1} Runden in ${ms} ms, Kriege ${wars}, Frieden ${peace}, Eroberungen ${inv}, Orion ${guard ? 'gefallen' : 'steht'}${g.over ? ', Ende: ' + g.over.reason + ' → ' + (g.players[g.over.winner] || {}).name : ''}`);
  g.players.forEach((p) => {
    const cols = OL.coloniesOf(g, p.id, true);
    const pop = cols.reduce((a, s) => a + s.colony.pop, 0);
    const tech = OL.FIELDS.map((f) => f.short + p.tech[f.id]).join(' ');
    console.log(`   ${p.alive ? ' ' : '†'} ${p.name.padEnd(24)} Kol ${String(cols.length).padStart(2)}  Pop ${pop.toFixed(0).padStart(3)}  Macht ${OL.militaryPower(g, p.id).toFixed(0).padStart(4)}  Cr ${Math.round(p.credits).toString().padStart(4)}  ${tech}`);
    if (verbose && p.ai) {
      const rc = Object.keys(p.ai.ruleCount).sort((a, b) => a - b).map((r) => `R${r}:${p.ai.ruleCount[r]}`).join(' ');
      console.log('       Regeln: ' + rc);
    }
  });
}
console.log('\nSumme:', JSON.stringify(totals));
if (failures) { console.error(failures + ' Invariantenverletzungen'); process.exit(1); }
console.log('Alle Invarianten erfüllt.');
