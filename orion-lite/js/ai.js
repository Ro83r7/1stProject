/* Orion Lite – Computergegner.
   Die KI spielt ausschließlich nach den Faustregeln in OL.RULES (data.js).
   Jede Entscheidung wird mit der Nummer der Regel protokolliert, die sie ausgelöst hat. */
(function (OL) {
  'use strict';

  var ENV = OL.ENV, HULLS = OL.HULLS, BUILDINGS = OL.BUILDINGS;
  var dist = OL.dist;

  function note(g, p, rule, msg, key) {
    var ai = p.ai;
    if (key) {
      if (ai.mem[key]) return; // gleiche Lage, nicht erneut protokollieren
      ai.mem[key] = g.turn;
    }
    ai.log.push({ t: g.turn, r: rule, msg: msg });
    if (ai.log.length > 400) ai.log.splice(0, ai.log.length - 400);
    ai.ruleCount[rule] = (ai.ruleCount[rule] || 0) + 1;
  }

  var AI = {};
  AI.init = function (g, p) {
    p.ai = { personality: OL.RACES[p.race].personality, log: [], ruleCount: {}, mem: {}, stage: null,
      attack: null, lastGain: 0, lastPeaceTry: {}, wantPower: 0 };
  };

  function fr(r) { return r === Infinity ? '∞' : r < 1 ? r.toFixed(2).replace('.', ',') : OL.fmt(r); }

  function pers(p) { return OL.PERSONALITIES[p.ai.personality]; }
  function diff(g) { return OL.DIFFICULTY[g.settings.difficulty]; }

  // ---------------------------------------------------------------- Lagebild
  function analyze(g, p) {
    var m = OL.mods(p);
    var ctx = { m: m, pers: pers(p), diff: diff(g) };
    ctx.cols = OL.coloniesOf(g, p.id, true);
    ctx.popCols = ctx.cols.filter(function (s) { return !s.colony.outpost; });
    ctx.vis = OL.visibility(g, p.id);
    ctx.sum = OL.empireSummary(g, p);
    ctx.enemies = g.players.filter(function (q) { return q.alive && q !== p && p.rel[q.id] === 'war'; });
    ctx.myUnits = OL.militaryUnits(g, p.id);
    ctx.myPower = OL.powerOf(ctx.myUnits, 1);
    ctx.powerOf = {};
    g.players.forEach(function (q) { if (q.alive && q !== p) ctx.powerOf[q.id] = OL.militaryPower(g, q.id); });

    // Nachbarn: Kontakt und Kolonien in Reichweite
    ctx.neighbors = g.players.filter(function (q) {
      if (!q.alive || q === p || !p.contact[q.id]) return false;
      var theirs = OL.coloniesOf(g, q.id, true);
      return theirs.some(function (t) {
        return ctx.cols.some(function (c) { return dist(c, t) <= m.range + 4; });
      });
    });

    // Bedrohungen: sichtbare feindliche Kriegsflotten in der Nähe eigener Kolonien
    ctx.threats = [];
    ctx.threatByStar = {};
    g.fleets.forEach(function (f) {
      if (!ctx.vis.fleets[f.id] || !OL.isWar(g, p.id, f.owner) || !OL.fleetArmed(f)) return;
      ctx.cols.forEach(function (c) {
        // Bedrohung: Flotte steht im Orbit oder hält sichtbar auf die Kolonie zu
        if (f.dest === c.id || f.star === c.id) {
          var t = ctx.threatByStar[c.id];
          if (!t) { t = ctx.threatByStar[c.id] = { star: c, fleets: [], units: [] }; ctx.threats.push(t); }
          if (t.fleets.indexOf(f) < 0) {
            t.fleets.push(f);
            f.ships.forEach(function (s) { if (s.sl > 0) t.units.push(OL.shipUnit(f.owner, s)); });
          }
        }
      });
    });
    ctx.threatened = {};
    ctx.threats.forEach(function (t) { ctx.threatened[t.star.id] = true; });
    // Grenzkolonien: feindliche oder fremde Kolonien in der Nähe
    ctx.border = {};
    ctx.popCols.forEach(function (c) {
      g.stars.forEach(function (s) {
        if (s.colony && s.colony.owner !== p.id && dist(s, c) <= 7 && ctx.enemies.some(function (e) { return e.id === s.colony.owner; }))
          ctx.border[c.id] = true;
      });
    });

    computeTargets(g, p, ctx);
    return ctx;
  }

  function hostileVisibleAt(g, p, ctx, star) {
    return g.fleets.some(function (f) {
      return f.star === star.id && ctx.vis.fleets[f.id] && OL.isWar(g, p.id, f.owner) && OL.fleetArmed(f);
    });
  }

  function colonyValue(g, p, s) {
    var pl = s.planet, maxPop = OL.maxPop(g, p, s);
    var v = maxPop * (1 + 0.2 * (pl.min - 2)) + ENV[pl.env].food * 1.5;
    if (pl.special === 'artifacts') v += 6;
    if (pl.special === 'gold') v += 4;
    if (pl.special === 'gems') v += 5;
    if (s.orion) v += 20;
    return v;
  }

  function computeTargets(g, p, ctx) {
    var m = ctx.m, colT = [], outT = [], outOfRange = 0;
    g.stars.forEach(function (s) {
      if (!p.explored[s.id] || s.guardian) return;
      var c = s.colony;
      var ownOutpost = c && c.owner === p.id && c.outpost;
      if (c && !ownOutpost) return;
      if (hostileVisibleAt(g, p, ctx, s)) return;
      var sd = OL.supplyDist(g, p.id, s);
      var env = ENV[s.planet.env];
      if (env.pop && OL.maxPop(g, p, s) >= 2) {
        var val = colonyValue(g, p, s) - (ownOutpost ? 0 : sd * 0.6);
        if (sd <= m.range) colT.push({ star: s, value: val });
        else if (sd <= m.range + 4 && val > 8) outOfRange++;
      }
      if (!c && sd <= m.range) {
        // Außenposten: Wert = neu erreichbare Welten + Gebietsanspruch
        var gain = 0;
        g.stars.forEach(function (t) {
          if (t === s || t.colony) return;
          if (dist(t, s) <= m.range && OL.supplyDist(g, p.id, t) > m.range) {
            if (!p.explored[t.id]) gain += 1.5;
            else if (ENV[t.planet.env].pop >= 3 || t.orion) gain += 3;
          }
        });
        var ov = gain + (env.outpostOnly ? 2 : 0) + (env.pop && OL.maxPop(g, p, s) < 3 ? 1 : 0) - sd * 0.25;
        if (ov >= 2 && (env.outpostOnly || OL.maxPop(g, p, s) < 4)) outT.push({ star: s, value: ov });
      }
    });
    colT.sort(function (a, b) { return b.value - a.value; });
    outT.sort(function (a, b) { return b.value - a.value; });
    ctx.colTargets = colT;
    ctx.outTargets = outT;
    ctx.outOfRange = outOfRange;
    var unexplored = g.stars.filter(function (s) { return !p.explored[s.id]; }).length;
    ctx.expansion = colT.length > 0 || outT.length > 0 || outOfRange > 0 || unexplored > g.stars.length * 0.3;
  }

  // ---------------------------------------------------------------- Diplomatie (Regel 12)
  function diplomacy(g, p, ctx) {
    var P = ctx.pers, D = ctx.diff;
    // Laufende Kriege: Frieden anbieten, wenn es schlecht läuft
    ctx.enemies.forEach(function (q) {
      var r = ctx.myPower / Math.max(1, ctx.powerOf[q.id]);
      var since = g.turn - (p.warSince[q.id] || g.turn);
      var noGain = g.turn - Math.max(p.ai.lastGain || 0, p.warSince[q.id] || 0);
      var bad = r < 0.6 * P.peace || (since > 60 && noGain > 40 && r < 1.5);
      if (bad && (p.ai.lastPeaceTry[q.id] || -99) < g.turn - 10) {
        p.ai.lastPeaceTry[q.id] = g.turn;
        var res = OL.proposePeace(g, p.id, q.id);
        if (res === true) note(g, p, 12, 'Frieden mit ' + q.name + ' geschlossen: der Krieg lief schlecht (Stärkeverhältnis ' + fr(r) + ').');
        else if (res === false) note(g, p, 12, 'Friedensangebot an ' + q.name + ' wurde abgelehnt.');
        else note(g, p, 12, 'Friedensangebot an ' + q.name + ' gesendet (Stärkeverhältnis ' + fr(r) + ').');
      }
    });
    ctx.enemies = g.players.filter(function (q) { return q.alive && q !== p && p.rel[q.id] === 'war'; });
    if (ctx.enemies.length) return; // nie an zwei Fronten

    var warTurn = D.warTurn * P.war;
    if (g.turn < warTurn) return;
    var threshold = D.attack * P.war + 0.1;
    if (!ctx.expansion) threshold *= 0.85; // eingekesselt: Land gibt es nur noch beim Nachbarn
    var best = null, bestR = 0;
    ctx.neighbors.forEach(function (q) {
      if ((p.treaty[q.id] || 0) > g.turn) return;
      var r = ctx.myPower / Math.max(1, ctx.powerOf[q.id]);
      if (r < threshold) return;
      if (ctx.expansion && ctx.colTargets.length > 1 && r < 2.5) return; // erst Land nehmen
      if (ctx.myPower < 15) return;
      if (!best || r > bestR) { best = q; bestR = r; }
    });
    if (best) {
      OL.declareWar(g, p.id, best.id);
      note(g, p, 12, 'Krieg gegen ' + best.name + ' erklärt: schwächster Nachbar, eigene Flotte ' + fr(bestR) + '-fach überlegen.');
      ctx.enemies = [best];
    }
  }

  AI.considerPeace = function (g, p, other) {
    var ctx = { powerMe: OL.militaryPower(g, p.id), powerThem: OL.militaryPower(g, other.id) };
    var r = ctx.powerMe / Math.max(1, ctx.powerThem);
    var since = g.turn - (p.warSince[other.id] || g.turn);
    var sieging = p.ai.attack && p.ai.attack.phase === 'siege' && p.ai.attack.owner === other.id;
    var accept = !sieging && (r < 1.2 * pers(p).peace || since > 50 || (p.lostColonies || 0) > (p.ai.lostAtPeaceCheck || 0));
    p.ai.lostAtPeaceCheck = p.lostColonies || 0;
    note(g, p, 12, (accept ? 'Frieden mit ' + other.name + ' angenommen' : 'Friedensangebot von ' + other.name + ' abgelehnt') +
      ' (Stärkeverhältnis ' + fr(r) + (sieging ? ', Belagerung läuft' : '') + ').');
    return accept;
  };

  // ---------------------------------------------------------------- Forschung (Regeln 5, 6)
  function research(g, p, ctx) {
    if (p.research.field && isFinite(OL.techCost(p, p.research.field))) return;
    var P = p.ai.personality;
    var w = { kon: 1.3, com: 1.2, bio: 1.0, soz: 0.7, ant: 0.6, phy: 0.5, kra: 0.5 };
    var why = {};
    if (P === 'technologe') w.com *= 1.3;
    if (P === 'militarist') { w.phy *= 1.5; w.kra *= 1.4; }
    if (P === 'expansionist') { w.ant *= 1.5; w.bio *= 1.2; }
    if (P === 'industriell') w.kon *= 1.3;
    if (P === 'diplomat') w.soz *= 1.4;
    if (ctx.sum.foodNet < 1) { w.bio *= 1.8; why.bio = [2, 'Nahrung knapp']; }
    if (ctx.enemies.length || ctx.threats.length) {
      w.phy *= 2.5; w.kra *= 2.2;
      why.phy = [5, 'Krieg: Waffen haben jetzt Vorrang']; why.kra = [5, 'Krieg: Schilde haben jetzt Vorrang'];
    }
    var enemyWeapon = 0;
    ctx.neighbors.forEach(function (q) { enemyWeapon = Math.max(enemyWeapon, OL.mods(q).weapon); });
    if (OL.WEAPONS[enemyWeapon].dmg >= 2 * (ctx.m.shield + 2)) { w.kra *= 1.5; why.kra = [6, 'Schilde hinken den Waffen der Nachbarn hinterher']; }
    if (ctx.outOfRange > 0) { w.ant *= 2.5; why.ant = [6, ctx.outOfRange + ' gute Welten knapp außer Reichweite']; }
    if (p.income < 2) { w.soz *= 1.8; why.soz = [13, 'Einkommen zu niedrig']; }
    var maxLvl = 0;
    OL.FIELDS.forEach(function (f) { maxLvl = Math.max(maxLvl, p.tech[f.id]); });
    OL.FIELDS.forEach(function (f) {
      if (p.tech[f.id] <= maxLvl - 2) { w[f.id] *= 2.5; why[f.id] = [6, 'Lücke im Technologiebaum schließen']; }
    });
    var best = null, bestS = -1;
    OL.FIELDS.forEach(function (f) {
      var c = OL.techCost(p, f.id);
      if (!isFinite(c)) return;
      var s = w[f.id] / Math.pow(c, 0.8);
      if (s > bestS) { bestS = s; best = f.id; }
    });
    if (!best) return;
    p.research.field = best;
    var tech = OL.nextTech(p, best), reason = why[best] || [5, 'Wirtschaft vor Waffen'];
    note(g, p, reason[0], 'Forschung: ' + tech.name + ' (' + OL.FIELD_BY_ID[best].name + '). Grund: ' + reason[1] + '.');
  }

  // ---------------------------------------------------------------- Arbeitsteilung (Regeln 2, 3)
  function assignJobs(g, p, ctx, quiet) {
    var cols = ctx.popCols;
    if (!cols.length) return;
    var info = cols.map(function (s) {
      var c = s.colony;
      OL.normalizeJobs(c);
      var cit = Math.floor(c.pop + 1e-9);
      c.jobs = [0, cit, 0];
      var o = OL.colonyOutput(g, s, p);
      return { s: s, c: c, cit: cit, free: cit, o: o };
    });
    var food = 0, cons = 0;
    info.forEach(function (x) { food += x.o.food; cons += x.o.cons; }); // food: nur Pauschalen, da keine Bauern
    var farmers = 0;
    // Jede Kolonie ab 2 Einwohnern behält mindestens einen Arbeiter, sonst baut sie nie etwas.
    var keep = function (x) { return x.cit >= 2 ? 1 : 0; };
    while (food < cons + 1) {
      var bestX = null;
      info.forEach(function (x) { if (x.free > keep(x) && x.o.perFarmer > 0 && (!bestX || x.o.perFarmer > bestX.o.perFarmer)) bestX = x; });
      if (!bestX) info.forEach(function (x) { if (x.free > 0 && x.o.perFarmer > 0 && (!bestX || x.o.perFarmer > bestX.o.perFarmer)) bestX = x; });
      if (!bestX) break;
      bestX.c.jobs[0]++; bestX.c.jobs[1]--; bestX.free--; food += bestX.o.perFarmer; farmers++;
    }
    var free = 0;
    info.forEach(function (x) { free += x.free; });
    var share = ctx.sciShare != null ? ctx.sciShare : ctx.pers.sci * (ctx.enemies.length ? 0.6 : 1);
    var wantSci = Math.round(free * share);
    info.sort(function (a, b) { return (b.o.perSci / Math.max(0.1, b.o.perWorker)) - (a.o.perSci / Math.max(0.1, a.o.perWorker)); });
    var sci = 0;
    info.forEach(function (x) {
      var n = Math.min(x.free - keep(x), wantSci - sci);
      if (n > 0) { x.c.jobs[2] += n; x.c.jobs[1] -= n; sci += n; }
    });
    if (!quiet && g.turn % 10 === 1) {
      note(g, p, 2, 'Bauern: ' + farmers + ' (Nahrung ' + OL.fmt(food) + ' für ' + cons + ' Einwohner).');
      note(g, p, 3, 'Forscher: ' + sci + ' auf den forschungsstärksten Welten, ' + (free - sci) + ' Arbeiter auf den mineralreichen.');
    }
  }

  // ---------------------------------------------------------------- Flotten
  function roleOf(s) { return s.sl > 0 ? 'war' : s.t; }

  // Idle-Flotten nach Aufgaben trennen (Krieg, Kolonie, Außenposten, Späher, Transport)
  function splitByRole(g, p) {
    OL.fleetsOf(g, p.id).slice().forEach(function (f) {
      if (f.dest != null || f.star == null) return;
      var roles = {};
      f.ships.forEach(function (s) { (roles[roleOf(s)] = roles[roleOf(s)] || []).push(s); });
      var keys = Object.keys(roles);
      for (var i = 1; i < keys.length; i++) OL.splitFleet(g, f, roles[keys[i]]);
    });
  }
  function fleetsByRole(g, p, role) {
    return OL.fleetsOf(g, p.id).filter(function (f) { return f.ships.length && roleOf(f.ships[0]) === role; });
  }
  function nearestOwnColony(g, p, from, exceptId) {
    var best = null, bd = Infinity;
    OL.coloniesOf(g, p.id, true).forEach(function (s) {
      if (s.id === exceptId) return;
      var d = dist(s, from);
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }

  function scouts(g, p, ctx) {
    var claimed = {};
    fleetsByRole(g, p, 'scout').forEach(function (f) { if (f.dest != null) claimed[f.dest] = true; });
    fleetsByRole(g, p, 'scout').forEach(function (f) {
      if (f.dest != null) return;
      // jeder Späher einzeln
      while (f.ships.length > 1) OL.splitFleet(g, f, [f.ships[1]]);
    });
    fleetsByRole(g, p, 'scout').forEach(function (f) {
      if (f.dest != null) return;
      var cands = g.stars.filter(function (s) { return !p.explored[s.id] && !claimed[s.id] && OL.inRange(g, p.id, s); })
        .sort(function (a, b) { return dist(a, f) - dist(b, f); });
      if (cands.length) { OL.orderMove(g, f, cands[0].id); claimed[cands[0].id] = true; }
    });
  }

  function settlers(g, p, ctx, kind) {
    var targets = kind === 'colony' ? ctx.colTargets : ctx.outTargets;
    var claimed = {};
    g.fleets.forEach(function (f) {
      if (f.owner === p.id && f.dest != null && f.ships.some(function (s) { return s.t === kind; })) claimed[f.dest] = true;
    });
    fleetsByRole(g, p, kind).forEach(function (f) {
      if (f.dest != null) return;
      while (f.ships.length > 1) OL.splitFleet(g, f, [f.ships[1]]);
    });
    fleetsByRole(g, p, kind).forEach(function (f) {
      if (f.dest != null || !f.ships.length) return;
      var here = g.stars[f.star];
      var isTarget = targets.some(function (t) { return t.star === here; });
      if (isTarget && !OL.canColonize(g, f, kind)) {
        var err = OL.colonize(g, f, kind);
        if (!err) note(g, p, 1, (kind === 'colony' ? 'Kolonie auf ' : 'Außenposten auf ') + here.name + ' gegründet (' + ENV[here.planet.env].name + ', ' + OL.SIZES[here.planet.size].name + ').');
        return;
      }
      var best = null, bestS = -Infinity;
      targets.forEach(function (t) {
        if (claimed[t.star.id]) return;
        var s = t.value - OL.eta(g, f, t.star.id) * 1.0;
        if (s > bestS) { bestS = s; best = t; }
      });
      if (best) {
        if (!OL.orderMove(g, f, best.star.id)) {
          claimed[best.star.id] = true;
          note(g, p, 1, (kind === 'colony' ? 'Kolonieschiff' : 'Außenposten-Schiff') + ' fliegt nach ' + best.star.name + ' (Wert ' + Math.round(best.value) + ').');
        }
      }
    });
  }

  function chooseStage(g, p, ctx) {
    var cols = ctx.popCols.length ? ctx.popCols : ctx.cols;
    if (!cols.length) return null;
    var focus = null;
    if (p.ai.attack) focus = g.stars[p.ai.attack.target];
    else {
      var foes = ctx.enemies.length ? ctx.enemies : ctx.neighbors.slice().sort(function (a, b) { return ctx.powerOf[b.id] - ctx.powerOf[a.id]; }).slice(0, 1);
      var nearest = null, nd = Infinity;
      foes.forEach(function (q) {
        OL.coloniesOf(g, q.id, true).forEach(function (t) {
          cols.forEach(function (c) { var d = dist(c, t); if (d < nd) { nd = d; nearest = t; } });
        });
      });
      focus = nearest;
    }
    if (!focus) return g.stars[p.capital] && g.stars[p.capital].colony && g.stars[p.capital].colony.owner === p.id ? g.stars[p.capital] : cols[0];
    var bestC = null, bd = Infinity;
    cols.forEach(function (c) {
      var d = dist(c, focus) + (c.colony.buildings.base ? -1 : 0);
      if (d < bd) { bd = d; bestC = c; }
    });
    return bestC;
  }

  function warUnitsOf(fleets, owner) {
    var u = [];
    fleets.forEach(function (f) { f.ships.forEach(function (s) { if (s.sl > 0) u.push(OL.shipUnit(owner, s)); }); });
    return u;
  }

  function targetDefense(g, p, ctx, star) {
    var units = [];
    var c = star.colony;
    if (star.guardian) units.push(OL.guardianUnit(star));
    if (c && c.buildings.base && c.baseHp > 0) units.push(OL.baseUnit(g, star));
    if (c) {
      var owner = c.owner;
      if (ctx.vis.stars[star.id]) {
        g.fleets.forEach(function (f) {
          if (f.owner === owner && (f.star === star.id || (ctx.vis.fleets[f.id] && dist(f, star) <= OL.fleetSpeed(f)))) {
            f.ships.forEach(function (s) { if (s.sl > 0) units.push(OL.shipUnit(owner, s)); });
          }
        });
      } else {
        // Keine Sicht: ein Drittel der gegnerischen Flotte wird dort vermutet
        var all = OL.militaryUnits(g, owner);
        for (var i = 0; i < all.length; i += 3) units.push(all[i]);
      }
    }
    return units;
  }

  function moveAll(g, p, fleets, starId) {
    var moved = 0;
    fleets.forEach(function (f) {
      if (f.star === starId && f.dest == null) return;
      if (f.dest === starId) return;
      if (!OL.orderMove(g, f, starId)) moved++;
    });
    return moved;
  }

  function military(g, p, ctx) {
    var ai = p.ai, D = ctx.diff, P = ctx.pers;
    var war = fleetsByRole(g, p, 'war');
    var allUnits = warUnitsOf(war, p.id);
    ai.wantPower = 0;
    ai.transportNeed = 0;

    var stage = chooseStage(g, p, ctx);
    if (stage && ai.stage !== stage.id) {
      ai.stage = stage.id;
      note(g, p, 9, 'Neuer Sammelpunkt der Flotte: ' + stage.name + '.');
    }

    // Regel 14: Heimatverteidigung vor Angriff
    var defended = false;
    var threats = ctx.threats.slice().sort(function (a, b) {
      return (b.star.colony.pop + (b.star.colony.buildings.capital ? 10 : 0)) - (a.star.colony.pop + (a.star.colony.buildings.capital ? 10 : 0));
    });
    for (var i = 0; i < threats.length && !defended; i++) {
      var t = threats[i];
      var mine = allUnits.slice();
      var bu = OL.baseUnit(g, t.star);
      if (bu) mine.push(bu);
      var r = OL.battleRatio(mine, t.units);
      var here = war.filter(function (f) { return f.star === t.star.id; });
      if (r >= 1.2 && allUnits.length) {
        if (moveAll(g, p, war, t.star.id)) note(g, p, 14, 'Flotte fängt Angreifer bei ' + t.star.name + ' ab (Stärke ' + fr(r) + ':1).', 'def' + t.star.id + ':' + Math.floor(g.turn / 5));
        defended = true;
        if (ai.attack && ai.attack.phase !== 'siege') { ai.attack = null; }
      } else if (here.length && r < 0.8) {
        var safe = nearestOwnColony(g, p, t.star, t.star.id);
        if (safe && !ctx.threatened[safe.id]) {
          moveAll(g, p, here, safe.id);
          note(g, p, 11, 'Rückzug von ' + t.star.name + ' nach ' + safe.name + ': Feind überlegen (' + fr(r) + ':1).');
        }
      }
    }

    // Laufender Angriff
    if (!defended && ai.attack) {
      var a = ai.attack, ts = g.stars[a.target];
      var valid = a.guardian ? !!ts.guardian : (ts.colony && ts.colony.owner !== p.id && OL.isWar(g, p.id, ts.colony.owner));
      if (!valid) {
        if (ts.colony && ts.colony.owner === p.id) note(g, p, 8, 'Angriffsziel ' + ts.name + ' eingenommen.');
        else if (a.guardian && !ts.guardian) note(g, p, 15, 'Der Wächter von Orion ist gefallen.');
        else note(g, p, 8, 'Angriff auf ' + ts.name + ' abgebrochen: Ziel nicht mehr gültig.');
        ai.attack = null;
      } else {
        var atTarget = war.filter(function (f) { return f.star === ts.id; });
        var enRoute = war.filter(function (f) { return f.dest === ts.id; });
        var def = targetDefense(g, p, ctx, ts);
        if (atTarget.length) {
          if (!def.length) {
            if (a.phase !== 'siege') { a.phase = 'siege'; a.siegeSince = g.turn; note(g, p, 10, 'Orbit von ' + ts.name + ' gesäubert. Truppen werden nachgeführt.'); }
          } else {
            var rr = OL.battleRatio(warUnitsOf(atTarget, p.id), def);
            if (rr < 0.8) {
              var back = g.stars[ai.stage] || nearestOwnColony(g, p, ts);
              if (back) moveAll(g, p, atTarget, back.id);
              note(g, p, 11, 'Angriff auf ' + ts.name + ' gescheitert (' + fr(rr) + ':1). Rückzug.');
              ai.attack = null;
            }
          }
        } else if (!enRoute.length) {
          // Flotte verloren oder zurückgeschlagen
          note(g, p, 11, 'Angriff auf ' + ts.name + ' eingestellt: keine Flotte mehr vor Ort.');
          ai.attack = null;
        }
        if (ai.attack && a.phase === 'move' && g.turn - a.since > 25) { note(g, p, 8, 'Angriff auf ' + ts.name + ' abgebrochen: Flotte kommt nicht voran.'); ai.attack = null; }
        if (ai.attack && a.phase === 'siege' && g.turn - a.siegeSince > 45) { note(g, p, 10, 'Belagerung von ' + ts.name + ' nach 45 Runden aufgegeben: nicht genug Truppen.'); ai.attack = null; }
        // Nachzügler zum Ziel schicken, wenn der Orbit gehalten wird
        if (ai.attack && a.phase === 'siege') {
          var stragglers = war.filter(function (f) { return f.dest == null && f.star === ai.stage; });
          moveAll(g, p, stragglers, ts.id);
        }
      }
    }

    // Neues Ziel suchen (Regeln 8, 15)
    if (!defended && !ai.attack && allUnits.length) {
      var threshold = D.attack * P.war;
      var best = null, bestS = -1, easiestNeed = Infinity;
      ctx.enemies.forEach(function (q) {
        OL.coloniesOf(g, q.id, true).forEach(function (ts) {
          if (!p.explored[ts.id] || !OL.inRange(g, p.id, ts)) return;
          var def = targetDefense(g, p, ctx, ts);
          var r = OL.battleRatio(allUnits, def);
          var c = ts.colony;
          var value = c.pop + (c.buildings.capital ? 6 : 0) + Object.keys(c.buildings).length + OL.maxPop(g, q, ts) * 0.3 + (c.outpost ? 1 : 0);
          var from = g.stars[ai.stage] || ts;
          var gar = c.outpost ? 0 : OL.garrison(g, ts);
          var score = value / (1 + dist(from, ts) / 5) / (1 + gar / 150) * Math.min(r, 3);
          if (r >= threshold) { if (score > bestS) { bestS = score; best = { star: ts, r: r, owner: q.id }; } }
          else if (def.length) easiestNeed = Math.min(easiestNeed, OL.powerOf(allUnits, 1) * threshold / Math.max(0.05, r));
        });
      });
      if (!best && !ctx.enemies.length) {
        // Regel 15: Orion
        var orion = g.stars.find(function (s) { return s.orion && s.guardian; });
        if (orion && p.explored[orion.id] && OL.inRange(g, p.id, orion)) {
          var rg = OL.battleRatio(allUnits, [OL.guardianUnit(orion)]);
          if (rg >= 2) best = { star: orion, r: rg, guardian: true };
          else if (rg >= 1) note(g, p, 15, 'Orion wird noch nicht angegriffen: Flotte erst ' + fr(rg) + '-fach so stark wie der Wächter.', 'orion' + Math.floor(g.turn / 20));
        }
      }
      if (best) {
        ai.attack = { target: best.star.id, since: g.turn, phase: 'move', guardian: !!best.guardian, owner: best.owner };
        var n = moveAll(g, p, war, best.star.id);
        if (best.guardian) note(g, p, 15, 'Angriff auf den Wächter von Orion mit ' + fr(best.r) + '-facher Übermacht.');
        else note(g, p, 8, 'Angriff auf ' + best.star.name + ' (' + g.players[best.owner].name + '): Übermacht ' + fr(best.r) + ':1, ' + n + ' Flotte(n) in Marsch.');
      } else if (ctx.enemies.length && isFinite(easiestNeed)) {
        ai.wantPower = easiestNeed;
        note(g, p, 8, 'Noch kein lohnendes Ziel: Flotte wird bis zur nötigen Überlegenheit verstärkt.', 'noTarget' + Math.floor(g.turn / 10));
      }
    }

    // Regel 9: Alles auf einen Stapel am Sammelpunkt
    if (!ai.attack && !defended && ai.stage != null) {
      var loose = war.filter(function (f) { return f.dest == null && f.star !== ai.stage; });
      if (loose.length && moveAll(g, p, loose, ai.stage)) note(g, p, 9, loose.length + ' Kampfverband/-verbände sammeln sich bei ' + g.stars[ai.stage].name + '.', 'gather' + Math.floor(g.turn / 5));
    }

    transports(g, p, ctx);
  }

  function transports(g, p, ctx) {
    var ai = p.ai, tf = fleetsByRole(g, p, 'transport');
    var a = ai.attack;
    var target = a && !a.guardian ? g.stars[a.target] : null;
    var have = 0;
    tf.forEach(function (f) { have += OL.troopStrength(g, p, f.ships); });
    if (target && target.colony) {
      var need = (target.colony.outpost ? 1 : OL.garrison(g, target)) * 1.4;
      var perT = OL.troopStrength(g, p, [{ tr: HULLS.transport.troops }]);
      ai.transportNeed = Math.max(0, Math.ceil((need - have) / perT));
      if (a.phase === 'siege') {
        var atT = tf.filter(function (f) { return f.star === target.id; });
        var tAt = 0;
        atT.forEach(function (f) { tAt += OL.troopStrength(g, p, f.ships); });
        if (atT.length && tAt >= need) {
          var fl = atT[0];
          for (var k = 1; k < atT.length; k++) { fl.ships = fl.ships.concat(atT[k].ships); atT[k].ships = []; }
          g.fleets = g.fleets.filter(function (f) { return f.ships.length > 0; });
          if (fl && !OL.canInvade(g, fl)) {
            var res = OL.invade(g, fl);
            note(g, p, 10, 'Invasion von ' + target.name + ': ' + res.msg);
            if (res.ok) { ai.lastGain = g.turn; ai.attack = null; }
          }
          return;
        }
        if (have >= need) {
          var sent = 0;
          tf.forEach(function (f) { if (f.dest == null && f.star !== target.id && !OL.orderMove(g, f, target.id)) sent++; });
          if (sent) note(g, p, 10, 'Truppentransporter starten nach ' + target.name + ' (' + Math.round(have) + ' Truppen gegen ' + Math.round(need / 1.4) + ' Verteidiger).');
          return;
        }
      }
    }
    // sonst am Sammelpunkt warten
    if (ai.stage != null) tf.forEach(function (f) { if (f.dest == null && f.star !== ai.stage && !(target && f.star === target.id)) OL.orderMove(g, f, ai.stage); });
  }

  // ---------------------------------------------------------------- Produktion (Regeln 1, 4, 7, 13)
  function pendingShips(g, p, hull) {
    var n = 0;
    g.fleets.forEach(function (f) { if (f.owner === p.id) f.ships.forEach(function (s) { if (s.t === hull) n++; }); });
    OL.coloniesOf(g, p.id).forEach(function (s) { s.colony.queue.forEach(function (q) { if (q.type === 'ship' && q.id === hull) n++; }); });
    return n;
  }
  function queuedWarPower(g, p) {
    var u = [];
    OL.coloniesOf(g, p.id).forEach(function (s) {
      s.colony.queue.forEach(function (q) { if (q.type === 'ship' && HULLS[q.id].slots > 0) u.push(OL.shipUnit(p.id, OL.makeShip(p, q.id))); });
    });
    return u;
  }
  function bestHull(p, prod) {
    var m = OL.mods(p), best = 'frigate';
    OL.WARSHIPS.forEach(function (h) {
      if (m.hulls[h] && HULLS[h].cost <= Math.max(prod, 1) * 10) best = h;
    });
    return best;
  }

  function production(g, p, ctx) {
    var ai = p.ai, m = ctx.m, P = ctx.pers;
    var income = ctx.sum.income;
    // Militärbedarf (Regel 7)
    var floor = Math.max(0, g.turn - 20) * 0.5 * P.mil;
    var threat = 0;
    ctx.neighbors.forEach(function (q) {
      var atWar = p.rel[q.id] === 'war';
      threat = Math.max(threat, ctx.powerOf[q.id] * (atWar ? 1.2 : 0.7) * P.mil);
    });
    var desired = Math.max(floor, threat, ai.wantPower || 0);
    var planned = ctx.myPower;
    var queuedUnits = queuedWarPower(g, p);
    planned = OL.powerOf(ctx.myUnits.concat(queuedUnits), 1);
    var milNeed = planned < desired;
    if (milNeed) note(g, p, 7, 'Flottenstärke ' + Math.round(ctx.myPower) + ' unter Sollwert ' + Math.round(desired) + ': Kriegsschiffe werden gebaut.', 'milneed' + Math.floor(g.turn / 10));

    var colonyPending = pendingShips(g, p, 'colony');
    var outpostPending = pendingShips(g, p, 'outpost');
    var transportPending = 0; // nur bestellte, vorhandene sind in transportNeed schon abgezogen
    ctx.popCols.forEach(function (s) { s.colony.queue.forEach(function (q) { if (q.type === 'ship' && q.id === 'transport') transportPending++; }); });
    var maxParallel = Math.min(4, 1 + Math.floor(ctx.popCols.length / 3)) * P.expand;

    var cols = ctx.popCols.slice().sort(function (a, b) { return OL.colonyOutput(g, b, p).prod - OL.colonyOutput(g, a, p).prod; });
    // Regel 10: Für eine laufende Belagerung werden Transporter vorgezogen
    if (ai.transportNeed > transportPending) {
      cols.slice(0, 2).forEach(function (s) {
        var c = s.colony;
        if (ai.transportNeed <= transportPending || (c.queue[0] && c.queue[0].id === 'transport')) return;
        c.queue.unshift({ type: 'ship', id: 'transport' });
        transportPending++;
        note(g, p, 10, s.name + ' baut vorrangig Truppentransporter (' + ai.transportNeed + ' benötigt).', 'tr' + s.id + ':' + Math.floor(g.turn / 5));
      });
    }
    cols.forEach(function (s) {
      var c = s.colony, out = OL.colonyOutput(g, s, p), prod = out.prod;
      var head = c.queue[0];
      var continuous = !head || head.type === 'housing' || head.type === 'trade';
      var threatened = ctx.threatened[s.id] || ctx.border[s.id];

      // Regel 7: bedrohte Kolonie ohne Raketenbasis
      if (threatened && !c.buildings.base && c.pop >= 2 && !c.queue.some(function (q) { return q.id === 'base'; })) {
        c.queue.unshift({ type: 'building', id: 'base' });
        note(g, p, 7, s.name + ' ist bedroht: Raketenbasis hat Vorrang.');
        tryBuy(g, p, s, 7);
        return;
      }
      if (!continuous) { if (head.type === 'ship' && (head.id === 'colony' || head.id === 'outpost')) tryBuy(g, p, s, 1); return; }

      var pick = null, rule = 0, why = '';
      // Regel 4: Winzlinge wachsen lassen
      if (c.pop < 3 && prod < 5 && !c.buildings.capital) {
        pick = { type: 'housing', id: 'x' }; rule = 4; why = 'Kolonie noch zu klein';
      }
      // Regel 1: Expansion
      if (!pick && prod >= 4) {
        if (ctx.colTargets.length > colonyPending && colonyPending < maxParallel) {
          pick = { type: 'ship', id: 'colony' }; rule = 1; why = ctx.colTargets.length + ' freie Welten in Reichweite'; colonyPending++;
        } else if (ctx.outTargets.length > outpostPending && outpostPending < 2) {
          pick = { type: 'ship', id: 'outpost' }; rule = 1; why = 'Reichweite und Gebiet sichern'; outpostPending++;
        }
      }
      // Truppen (Regel 10)
      if (!pick && ai.transportNeed > transportPending && prod >= 4) {
        pick = { type: 'ship', id: 'transport' }; rule = 10; why = 'Invasion vorbereiten'; transportPending++;
      }
      // Kriegsschiffe, wenn die Lage es verlangt (Regel 7), aber Gebäude-Grundausstattung zuerst
      var coreDone = c.buildings.factory || !m.buildings.factory || c.pop < 3;
      if (!pick && milNeed && prod >= 5 && (coreDone || ctx.enemies.length)) {
        var h = bestHull(p, prod);
        pick = { type: 'ship', id: h }; rule = 7; why = 'Flotte unter Sollstärke';
        queuedUnits.push(OL.shipUnit(p.id, OL.makeShip(p, h)));
        milNeed = OL.powerOf(ctx.myUnits.concat(queuedUnits), 1) < desired;
      }
      // Regel 4: Gebäude in fester Reihenfolge
      if (!pick) {
        var order = [
          ['factory', c.pop >= 2 || c.buildings.capital],
          ['hydro', ctx.sum.foodNet < 2],
          ['lab', c.pop >= 3],
          ['robominer', c.pop >= 5],
          ['cloning', c.pop < 0.6 * OL.maxPop(g, p, s) && OL.maxPop(g, p, s) >= 8],
          ['supercomp', c.jobs[2] >= 3],
          ['spaceport', c.pop >= 6],
          ['barracks', ctx.enemies.length > 0 && threatened && c.pop >= 4],
          ['plshield', c.buildings.base && threatened],
          ['exchange', c.pop >= 10]
        ];
        for (var i = 0; i < order.length && !pick; i++) {
          var b = order[i][0];
          if (!order[i][1] || c.buildings[b] || !m.buildings[b]) continue;
          var essential = b === 'factory' || b === 'hydro' || b === 'spaceport' || b === 'exchange' || b === 'robominer';
          if (!essential && income - BUILDINGS[b].upkeep < 1) {
            note(g, p, 13, BUILDINGS[b].name + ' auf ' + s.name + ' zurückgestellt: Einkommen zu knapp.', 'afford' + s.id + ':' + Math.floor(g.turn / 20));
            continue;
          }
          pick = { type: 'building', id: b }; rule = 4; why = 'Ausbau nach Plan';
          income -= BUILDINGS[b].upkeep;
        }
      }
      if (!pick && m.terraform && ENV[s.planet.env].next && (ENV[s.planet.env].next !== 'gaia' || m.gaia) && prod >= 6) {
        pick = { type: 'terraform', id: 'x' }; rule = 4; why = 'Planet aufwerten';
      }
      if (!pick) {
        if (income < 1) { pick = { type: 'trade', id: 'x' }; rule = 13; why = 'Einkommen stützen'; }
        else if (c.pop < OL.maxPop(g, p, s) * 0.8) { pick = { type: 'housing', id: 'x' }; rule = 4; why = 'Wachstum beschleunigen'; }
        else if (prod >= 5 && (P.mil > 1 || ctx.enemies.length || p.credits > 400)) { pick = { type: 'ship', id: bestHull(p, prod) }; rule = 7; why = 'Überschuss in die Flotte'; }
        else { pick = { type: 'trade', id: 'x' }; rule = 13; why = 'Überschuss in Credits'; }
      }
      if (head && head.type === pick.type && head.id === pick.id) return;
      c.queue = [];
      OL.enqueue(g, s, pick);
      if (pick.type !== 'housing' && pick.type !== 'trade') {
        note(g, p, rule, s.name + ' baut ' + OL.itemName(pick) + ' (' + why + ').');
        if (pick.type === 'ship' && (pick.id === 'colony' || pick.id === 'outpost')) tryBuy(g, p, s, 1);
      } else note(g, p, rule, s.name + ': ' + OL.itemName(pick) + ' (' + why + ').', 'cont' + s.id + ':' + pick.type + ':' + Math.floor(g.turn / 10));
    });
  }

  // Regel 13: Geld arbeiten lassen – Überschuss in Käufe stecken
  function spendSurplus(g, p, ctx) {
    var reserve = 60 + 8 * ctx.popCols.length + Math.max(0, -ctx.sum.income) * 10;
    var rank = function (s) {
      var h = s.colony.queue[0];
      if (!h || !isFinite(OL.itemCost(h))) return -1;
      if (h.id === 'base') return 5;
      if (h.type === 'ship' && (h.id === 'colony' || h.id === 'outpost')) return 4;
      if (h.type === 'ship' && h.id === 'transport') return 3.5;
      if (h.type === 'ship') return ctx.enemies.length ? 3.8 : 2;
      if (h.type === 'building' && (h.id === 'factory' || h.id === 'robominer' || h.id === 'hydro')) return 3;
      return 1;
    };
    var cands = ctx.popCols.filter(function (s) { return rank(s) > 0; })
      .sort(function (a, b) { return rank(b) - rank(a) || (OL.buyCost(a) - OL.buyCost(b)); });
    var bought = 0;
    for (var i = 0; i < cands.length && bought < 3; i++) {
      var s = cands[i], price = OL.buyCost(s);
      if (!price || p.credits - price < reserve) continue;
      var name = OL.itemName(s.colony.queue[0]);
      if (OL.buy(g, p, s)) { bought++; note(g, p, 13, name + ' auf ' + s.name + ' für ' + price + ' Credits gekauft (Überschuss investiert).'); }
    }
  }

  function tryBuy(g, p, s, rule) {
    var price = OL.buyCost(s);
    var reserve = 40 + Math.max(0, -p.income) * 10;
    if (price && p.credits - price >= reserve) {
      var name = OL.itemName(s.colony.queue[0]);
      if (OL.buy(g, p, s)) note(g, p, rule, name + ' auf ' + s.name + ' für ' + price + ' Credits gekauft.');
    }
  }

  // ---------------------------------------------------------------- Finanzen (Regel 13)
  function finances(g, p, ctx) {
    if (ctx.sum.income >= 0 || p.credits > 40) return;
    var m = ctx.m, victim = null, vf = null;
    OL.fleetsOf(g, p.id).forEach(function (f) {
      f.ships.forEach(function (s) {
        if (s.sl > 0 && s.wl <= m.weapon - 2 && (!victim || s.wl < victim.wl)) { victim = s; vf = f; }
      });
    });
    if (victim) {
      OL.scrapShips(g, vf, [victim]);
      note(g, p, 13, 'Veraltetes Schiff (' + HULLS[victim.t].name + ', ' + OL.WEAPONS[victim.wl].name + ') verschrottet, um Unterhalt zu sparen.');
    }
  }

  // ---------------------------------------------------------------- Ablauf
  AI.takeTurn = function (g, p) {
    if (!p.ai) AI.init(g, p);
    var ctx = analyze(g, p);
    diplomacy(g, p, ctx);
    ctx.enemies = g.players.filter(function (q) { return q.alive && q !== p && p.rel[q.id] === 'war'; });
    research(g, p, ctx);
    assignJobs(g, p, ctx);
    splitByRole(g, p);
    scouts(g, p, ctx);
    settlers(g, p, ctx, 'colony');
    settlers(g, p, ctx, 'outpost');
    computeTargets(g, p, ctx);
    military(g, p, ctx);
    production(g, p, ctx);
    spendSurplus(g, p, ctx);
    finances(g, p, ctx);
  };

  // Die Arbeitsteilung der KI als Hilfe für den Spieler (Knopf „Automatisch“)
  // Behält den aktuellen Forscheranteil des Spielers bei, optimiert Bauern und Verteilung.
  AI.autoJobs = function (g, p) {
    var cols = OL.coloniesOf(g, p.id), sci = 0, nonFarm = 0;
    cols.forEach(function (s) { OL.normalizeJobs(s.colony); sci += s.colony.jobs[2]; nonFarm += s.colony.jobs[1] + s.colony.jobs[2]; });
    assignJobs(g, p, { popCols: cols, sciShare: nonFarm ? sci / nonFarm : 0.35, enemies: [] }, true);
  };

  OL.AI = AI;
})(typeof globalThis !== 'undefined' ? (globalThis.OL = globalThis.OL || {}) : (window.OL = window.OL || {}));
