/* Orion Lite – Spiel-Engine: Galaxie, Wirtschaft, Forschung, Bewegung, Kampf, Diplomatie.
   Enthält kein DOM, damit sich komplette Partien in Node simulieren lassen. */
(function (OL) {
  'use strict';

  var ENV = OL.ENV, SIZES = OL.SIZES, MINERALS = OL.MINERALS, FIELDS = OL.FIELDS;
  var HULLS = OL.HULLS, BUILDINGS = OL.BUILDINGS, WEAPONS = OL.WEAPONS;

  // ---------- Zufall (reproduzierbar, Zustand liegt im Spielstand) ----------
  function rnd(g) {
    var t = (g.rng = (g.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rint(g, a, b) { return a + Math.floor(rnd(g) * (b - a + 1)); }
  function pickWeighted(g, weights) {
    var keys = Object.keys(weights), total = 0, i;
    for (i = 0; i < keys.length; i++) total += weights[keys[i]];
    var r = rnd(g) * total;
    for (i = 0; i < keys.length; i++) { r -= weights[keys[i]]; if (r < 0) return keys[i]; }
    return keys[keys.length - 1];
  }
  function shuffle(g, arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rnd(g) * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  OL.rnd = rnd; OL.rint = rint;

  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  OL.dist = dist;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- Technologie-Effekte ----------
  var modsCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function techSig(p) { return FIELDS.map(function (f) { return p.tech[f.id]; }).join(','); }
  function computeMods(p) {
    var m = { buildings: {}, hulls: {}, armor: 1, foodPerFarmer: 0, popPerSize: 0, prodPct: 0,
      researchPct: 0, creditPct: 0, ground: 0, hit: 0, scan: 0, weapon: 0, shield: 0, speed: 2,
      range: 6, terraform: false, gaia: false, barrenFarming: false };
    OL.BASE_BUILDINGS.forEach(function (b) { m.buildings[b] = true; });
    OL.BASE_HULLS.forEach(function (h) { m.hulls[h] = true; });
    FIELDS.forEach(function (f) {
      for (var i = 0; i < p.tech[f.id]; i++) {
        var fx = f.levels[i].fx;
        if (fx.building) m.buildings[fx.building] = true;
        if (fx.hull) m.hulls[fx.hull] = true;
        ['armor', 'hit', 'scan', 'weapon', 'shield', 'speed', 'range'].forEach(function (k) {
          if (fx[k] !== undefined) m[k] = Math.max(m[k], fx[k]);
        });
        ['foodPerFarmer', 'popPerSize', 'prodPct', 'researchPct', 'creditPct', 'ground'].forEach(function (k) {
          if (fx[k] !== undefined) m[k] += fx[k];
        });
        if (fx.terraform) m.terraform = true;
        if (fx.gaia) m.gaia = true;
        if (fx.barrenFarming) m.barrenFarming = true;
      }
    });
    var race = OL.RACES[p.race];
    m.hit += race.hit || 0;
    m.groundMult = (race.ground || 1) * (1 + m.ground);
    return m;
  }
  function mods(p) {
    var sig = techSig(p);
    if (modsCache) {
      var c = modsCache.get(p);
      if (c && c.sig === sig) return c.m;
      var m = computeMods(p);
      modsCache.set(p, { sig: sig, m: m });
      return m;
    }
    return computeMods(p);
  }
  OL.mods = mods;
  OL.techCost = function (p, fieldId) {
    var lvl = p.tech[fieldId];
    return lvl >= OL.FIELD_BY_ID[fieldId].levels.length ? Infinity : OL.TECH_COST[lvl];
  };
  OL.nextTech = function (p, fieldId) {
    return OL.FIELD_BY_ID[fieldId].levels[p.tech[fieldId]] || null;
  };

  // ---------- Schiffe ----------
  function makeShip(p, hull) {
    var H = HULLS[hull], m = mods(p);
    var hp = Math.round(H.hp * m.armor);
    return { t: hull, sl: H.slots, d: WEAPONS[m.weapon].dmg, wl: m.weapon, hp: hp, mhp: hp,
      sh: m.shield, sp: m.speed, hit: m.hit, eva: H.eva, tr: H.troops || 0 };
  }
  OL.makeShip = makeShip;
  OL.shipCost = function (hull) { return HULLS[hull].cost; };

  function fleetSpeed(f) {
    var s = Infinity;
    f.ships.forEach(function (sh) { s = Math.min(s, sh.sp); });
    return s === Infinity ? 2 : s;
  }
  OL.fleetSpeed = fleetSpeed;
  OL.fleetArmed = function (f) { return f.ships.some(function (s) { return s.sl > 0; }); };
  OL.countTypes = function (ships) {
    var c = {};
    ships.forEach(function (s) { c[s.t] = (c[s.t] || 0) + 1; });
    return c;
  };

  // ---------- Hilfsfunktionen Spielstand ----------
  OL.player = function (g, id) { return g.players[id]; };
  OL.human = function (g) { return g.players[0]; };
  function coloniesOf(g, pid, includeOutposts) {
    return g.stars.filter(function (s) {
      return s.colony && s.colony.owner === pid && (includeOutposts || !s.colony.outpost);
    });
  }
  OL.coloniesOf = coloniesOf;
  function fleetsOf(g, pid) { return g.fleets.filter(function (f) { return f.owner === pid; }); }
  OL.fleetsOf = fleetsOf;
  OL.fleetsAt = function (g, starId) { return g.fleets.filter(function (f) { return f.star === starId; }); };
  function isWar(g, a, b) {
    if (a === b) return false;
    if (a < 0 || b < 0) return true;
    return g.players[a].rel[b] === 'war';
  }
  OL.isWar = isWar;

  function log(g, pid, msg, kind, extra) {
    var e = { t: g.turn, p: pid, msg: msg, kind: kind || 'info' };
    if (extra) for (var k in extra) e[k] = extra[k];
    g.log.push(e);
    if (g.log.length > 500) g.log.splice(0, g.log.length - 500);
    return e;
  }
  OL.log = log;

  // Entfernung zur nächsten eigenen Kolonie/Außenposten
  function supplyDist(g, pid, star) {
    var best = Infinity;
    for (var i = 0; i < g.stars.length; i++) {
      var s = g.stars[i];
      if (s.colony && s.colony.owner === pid) best = Math.min(best, dist(s, star));
    }
    return best;
  }
  OL.supplyDist = supplyDist;
  OL.inRange = function (g, pid, star) {
    return supplyDist(g, pid, star) <= mods(g.players[pid]).range + 1e-6;
  };

  OL.maxPop = function (g, p, star) {
    var env = ENV[star.planet.env];
    if (!env.pop) return 0;
    return SIZES[star.planet.size].f * (env.pop + mods(p).popPerSize);
  };

  // ---------- Galaxie erzeugen ----------
  OL.newGame = function (opts) {
    opts = opts || {};
    var seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2e9);
    var gal = OL.GALAXY[opts.galaxy || 'mittel'];
    var g = { version: 1, seed: seed, rng: seed, turn: 1, w: gal.w, h: gal.h,
      settings: { galaxy: opts.galaxy || 'mittel', opponents: opts.opponents || 3,
        difficulty: opts.difficulty || 'normal', race: opts.race || 'menschen',
        name: opts.name || 'Terranische Föderation', allAI: !!opts.allAI },
      stars: [], players: [], fleets: [], nextId: 1, log: [], reports: [], offers: [], over: null };

    // Sterne mit Mindestabstand verteilen
    var minD = 3.6, pts = [], tries = 0, margin = 1.6;
    while (pts.length < gal.stars && tries < 20000) {
      tries++;
      if (tries % 4000 === 0) minD *= 0.9;
      var p = { x: margin + rnd(g) * (gal.w - 2 * margin), y: margin + rnd(g) * (gal.h - 2 * margin) };
      var ok = pts.every(function (q) { return dist(p, q) >= minD; });
      if (ok) pts.push(p);
    }
    var names = shuffle(g, OL.STAR_NAMES.slice());
    var colorKeys = Object.keys(OL.STAR_COLORS);
    pts.forEach(function (p, i) {
      g.stars.push({ id: i, name: names[i % names.length], x: p.x, y: p.y,
        color: colorKeys[rint(g, 0, colorKeys.length - 1)], planet: randomPlanet(g),
        colony: null, guardian: null, orion: false });
    });

    // Orion: Stern nahe der Mitte
    var center = { x: gal.w / 2, y: gal.h / 2 };
    var orion = g.stars.slice().sort(function (a, b) { return dist(a, center) - dist(b, center); })[0];
    orion.name = 'Orion'; orion.orion = true; orion.color = 'white';
    orion.planet = { env: 'gaia', size: 4, min: 4, special: 'artifacts' };
    orion.guardian = { hp: 500, mhp: 500 };

    // Völker
    var human = opts.race || 'menschen';
    var others = shuffle(g, Object.keys(OL.RACES).filter(function (r) { return r !== human; }));
    var nPlayers = 1 + clamp(opts.opponents || 3, 1, 5);
    var races = [human].concat(others.slice(0, nPlayers - 1));

    // Heimatwelten maximal verteilt
    var cand = g.stars.filter(function (s) { return !s.orion; });
    var bestSet = null, bestScore = -1;
    for (var attempt = 0; attempt < 40; attempt++) {
      var set = [cand[rint(g, 0, cand.length - 1)]];
      while (set.length < nPlayers) {
        var far = null, farD = -1;
        cand.forEach(function (s) {
          if (set.indexOf(s) >= 0) return;
          var d = Math.min.apply(null, set.map(function (q) { return dist(q, s); }));
          d = Math.min(d, dist(s, orion) * 1.6);
          if (d > farD) { farD = d; far = s; }
        });
        set.push(far);
      }
      var score = Infinity;
      for (var a = 0; a < set.length; a++) for (var b = a + 1; b < set.length; b++) score = Math.min(score, dist(set[a], set[b]));
      if (score > bestScore) { bestScore = score; bestSet = set; }
    }

    races.forEach(function (race, i) {
      var R = OL.RACES[race];
      var isAI = i > 0 || !!opts.allAI;
      var pl = { id: i, name: i === 0 && !opts.allAI ? (opts.name || 'Terranische Föderation') : aiEmpireName(race),
        race: race, color: R.color, isAI: isAI, alive: true, credits: 50, tech: {},
        research: { field: null, progress: 0 }, explored: {}, contact: {}, rel: {}, treaty: {},
        warSince: {}, capital: null, lostColonies: 0, ai: null, income: 0 };
      FIELDS.forEach(function (f) { pl.tech[f.id] = 0; });
      g.players.push(pl);
    });
    g.players.forEach(function (pl) {
      g.players.forEach(function (q) { if (q !== pl) { pl.rel[q.id] = 'peace'; pl.contact[q.id] = false; } });
    });

    bestSet.forEach(function (home, i) {
      var pl = g.players[i];
      home.name = OL.RACES[pl.race].home;
      home.color = 'yellow';
      home.planet = { env: 'terran', size: 3, min: 2, special: null };
      home.colony = { owner: i, pop: 8, jobs: [3, 3, 2], buildings: { capital: true, barracks: true },
        queue: [], progress: 0, baseHp: 0, outpost: false, founded: 1 };
      pl.capital = home.id;
      // Faire Startbedingungen: zwei brauchbare Welten in der Nähe
      var near = g.stars.filter(function (s) { return s !== home && !s.orion && bestSet.indexOf(s) < 0; })
        .sort(function (a, b) { return dist(a, home) - dist(b, home); }).slice(0, 3);
      near.forEach(function (s, k) {
        // Die zwei nächsten Sterne müssen in Startreichweite (6 pc) liegen
        var d = dist(s, home);
        var sharedNeighbour = bestSet.some(function (o) { return o !== home && dist(o, s) <= 6; });
        if (k < 2 && d > 5.2 && !sharedNeighbour) {
          var base = Math.atan2(s.y - home.y, s.x - home.x), r0 = 4.2 + k * 0.7;
          for (var a = 0; a < 16; a++) {
            var ang = base + (a % 2 ? 1 : -1) * Math.ceil(a / 2) * Math.PI / 8;
            var nx = home.x + Math.cos(ang) * r0, ny = home.y + Math.sin(ang) * r0;
            if (nx < 1 || ny < 1 || nx > g.w - 1 || ny > g.h - 1) continue;
            var free = g.stars.every(function (o) { return o === s || dist(o, { x: nx, y: ny }) >= 2.8; });
            if (free) { s.x = nx; s.y = ny; break; }
          }
        }
        if (k < 2 && ENV[s.planet.env].pop < 3) {
          s.planet.env = ['terran', 'ocean', 'arid', 'tundra', 'swamp'][rint(g, 0, 4)];
          s.planet.size = Math.max(s.planet.size, 1 + k);
        }
        if (k === 2 && ENV[s.planet.env].pop === 0) s.planet.env = 'gas';
      });
      var f = newFleet(g, i, home);
      f.ships.push(makeShip(pl, 'colony'), makeShip(pl, 'scout'), makeShip(pl, 'scout'),
        makeShip(pl, 'frigate'), makeShip(pl, 'frigate'));
    });

    bestSet.forEach(function (home) {
      // Notfalls einen zusätzlichen Stern in Startreichweite setzen
      var reach = function () {
        return g.stars.filter(function (o) { return o !== home && !o.orion && bestSet.indexOf(o) < 0 && dist(o, home) <= 5.8; }).length;
      };
      for (var tries2 = 0; reach() < 2 && tries2 < 200; tries2++) {
        var ang = rnd(g) * Math.PI * 2, rr = 4 + rnd(g) * 1.5, minD2 = tries2 < 100 ? 2.8 : 2.2;
        var np = { x: home.x + Math.cos(ang) * rr, y: home.y + Math.sin(ang) * rr };
        if (np.x < 0.8 || np.y < 0.8 || np.x > g.w - 0.8 || np.y > g.h - 0.8) continue;
        if (!g.stars.every(function (o) { return dist(o, np) >= minD2; })) continue;
        var used = {};
        g.stars.forEach(function (o) { used[o.name] = true; });
        var nm = OL.STAR_NAMES.filter(function (n) { return !used[n]; })[0] || ('Nova ' + g.stars.length);
        var pl = randomPlanet(g);
        if (ENV[pl.env].pop < 3) pl.env = ['terran', 'ocean', 'arid', 'tundra', 'swamp'][rint(g, 0, 4)];
        pl.size = Math.max(pl.size, 1);
        g.stars.push({ id: g.stars.length, name: nm, x: np.x, y: np.y, color: 'orange', planet: pl, colony: null, guardian: null, orion: false });
      }
    });

    g.players.forEach(function (pl) {
      if (pl.isAI) OL.AI.init(g, pl);
      updateVisibility(g, pl);
      pl.income = OL.empireSummary(g, pl).income;
    });
    log(g, -1, 'Die Eroberung der Galaxis beginnt. Im Zentrum wartet Orion, bewacht von einem uralten Wächter.', 'major');
    return g;
  };

  function aiEmpireName(race) {
    return { menschen: 'Menschliche Republik', psilonen: 'Psilonisches Kollektiv', sakkra: 'Sakkra-Brut',
      klackonen: 'Klackonen-Schwarm', bulrathi: 'Bulrathi-Imperium', mrrshan: 'Mrrshan-Rudel' }[race];
  }

  function randomPlanet(g) {
    var env = pickWeighted(g, OL.ENV_WEIGHTS);
    var size = +pickWeighted(g, OL.SIZE_WEIGHTS);
    var min = +pickWeighted(g, OL.MINERAL_WEIGHTS);
    if (env === 'gas') size = Math.max(size, 3);
    var special = null, r = rnd(g);
    if (env !== 'gas') {
      if (r < 0.05) special = 'artifacts'; else if (r < 0.09) special = 'gold'; else if (r < 0.12) special = 'gems';
    }
    return { env: env, size: size, min: min, special: special };
  }

  function newFleet(g, owner, star) {
    var f = { id: g.nextId++, owner: owner, ships: [], x: star.x, y: star.y, star: star.id, dest: null };
    g.fleets.push(f);
    return f;
  }
  OL.newFleet = newFleet;

  // ---------- Sicht und Kontakt ----------
  function scanSources(g, pid) {
    var m = mods(g.players[pid]), src = [];
    g.stars.forEach(function (s) {
      if (s.colony && s.colony.owner === pid) src.push({ x: s.x, y: s.y, r: (s.colony.outpost ? 2.5 : 3.5) + m.scan });
    });
    g.fleets.forEach(function (f) {
      if (f.owner !== pid) return;
      var r = 1.5;
      f.ships.forEach(function (s) { if (HULLS[s.t].scan) r = Math.max(r, HULLS[s.t].scan); });
      src.push({ x: f.x, y: f.y, r: r + m.scan * 0.5 });
    });
    return src;
  }
  function visibility(g, pid) {
    var src = scanSources(g, pid), stars = {}, fleets = {};
    g.stars.forEach(function (s) {
      for (var i = 0; i < src.length; i++) if (dist(s, src[i]) <= src[i].r) { stars[s.id] = true; break; }
    });
    g.fleets.forEach(function (f) {
      if (f.owner === pid) { fleets[f.id] = true; return; }
      for (var i = 0; i < src.length; i++) if (dist(f, src[i]) <= src[i].r) { fleets[f.id] = true; break; }
    });
    return { stars: stars, fleets: fleets };
  }
  OL.visibility = visibility;

  function updateVisibility(g, p) {
    var v = visibility(g, p.id);
    for (var id in v.stars) p.explored[id] = true;
    // Kontakt: sichtbare Kolonien oder Flotten eines anderen Reichs
    g.players.forEach(function (q) {
      if (q === p || !q.alive || p.contact[q.id]) return;
      var seen = g.stars.some(function (s) { return s.colony && s.colony.owner === q.id && v.stars[s.id]; }) ||
        g.fleets.some(function (f) { return f.owner === q.id && v.fleets[f.id]; });
      if (seen) {
        p.contact[q.id] = true; q.contact[p.id] = true;
        log(g, p.id, 'Erstkontakt mit ' + q.name + ' (' + OL.RACES[q.race].name + ').', 'diplo');
        log(g, q.id, 'Erstkontakt mit ' + p.name + ' (' + OL.RACES[p.race].name + ').', 'diplo');
      }
    });
    return v;
  }
  OL.updateVisibility = updateVisibility;

  // ---------- Kolonie-Wirtschaft ----------
  function normalizeJobs(c) {
    var cit = Math.floor(c.pop + 1e-9), j = c.jobs, sum = j[0] + j[1] + j[2];
    while (sum < cit) { j[1]++; sum++; }
    var order = [1, 2, 0];
    while (sum > cit) {
      for (var k = 0; k < 3; k++) if (j[order[k]] > 0) { j[order[k]]--; sum--; break; }
    }
  }
  OL.normalizeJobs = normalizeJobs;

  function diffBonus(g, p) { return p.isAI && !g.settings.allAI ? OL.DIFFICULTY[g.settings.difficulty].bonus : 1; }

  function colonyOutput(g, star, p) {
    var c = star.colony, pl = star.planet, env = ENV[pl.env], b = c.buildings, m = mods(p);
    var race = OL.RACES[p.race], bonus = diffBonus(g, p);
    var out = { food: 0, cons: 0, prod: 0, res: 0, cred: 0, upkeep: 0, perFarmer: 0, perWorker: 0, perSci: 0 };
    for (var k in b) if (b[k] && BUILDINGS[k]) out.upkeep += BUILDINGS[k].upkeep;
    if (c.outpost) return out;
    normalizeJobs(c);
    var cit = Math.floor(c.pop + 1e-9), f = c.jobs[0], w = c.jobs[1], s = c.jobs[2];
    var perFarmer = env.food > 0 ? env.food + m.foodPerFarmer : (m.barrenFarming ? 1 : 0);
    out.perFarmer = perFarmer * (race.food || 1);
    out.food = f * out.perFarmer + (b.hydro ? 3 : 0) + (b.capital ? 2 : 0);
    out.cons = cit;
    var prodMult = (1 + m.prodPct) * bonus;
    out.perWorker = (MINERALS[pl.min].prod + (b.factory ? 1 : 0) + (b.robominer ? 2 : 0) + (race.prodPerWorker || 0)) * prodMult;
    out.prod = w * out.perWorker + ((b.factory ? 3 : 0) + (b.robominer ? 5 : 0) + (b.capital ? 3 : 0)) * prodMult;
    var resMult = (race.research || 1) * (1 + m.researchPct) * bonus;
    out.perSci = (2 + (b.lab ? 1 : 0) + (b.supercomp ? 2 : 0) + (pl.special === 'artifacts' ? 2 : 0)) * resMult;
    out.res = s * out.perSci + ((b.lab ? 3 : 0) + (b.supercomp ? 5 : 0) + (b.capital ? 2 : 0)) * resMult;
    out.cred = (cit * 0.5 + (b.capital ? 5 : 0) + (pl.special === 'gold' ? 5 : 0) + (pl.special === 'gems' ? 8 : 0) +
      (b.exchange ? 4 : 0)) * (1 + (b.spaceport ? 0.5 : 0) + (b.exchange ? 0.5 : 0)) * (race.credits || 1) * (1 + m.creditPct);
    var head = c.queue[0];
    if (head && head.type === 'trade') { out.cred += out.prod * 0.5; out.tradeProd = out.prod; }
    return out;
  }
  OL.colonyOutput = colonyOutput;

  function shipUpkeep(g, pid) {
    var u = 0;
    g.fleets.forEach(function (f) { if (f.owner === pid) f.ships.forEach(function (s) { u += HULLS[s.t].upkeep; }); });
    return u;
  }

  // Übersicht eines Reichs (für Oberfläche und KI)
  OL.empireSummary = function (g, p) {
    var sum = { food: 0, cons: 0, prod: 0, res: 0, cred: 0, bUpkeep: 0, sUpkeep: shipUpkeep(g, p.id), pop: 0, colonies: 0, outposts: 0 };
    coloniesOf(g, p.id, true).forEach(function (s) {
      var o = colonyOutput(g, s, p);
      sum.food += o.food; sum.cons += o.cons; sum.res += o.res; sum.cred += o.cred; sum.bUpkeep += o.upkeep;
      sum.prod += o.tradeProd ? 0 : o.prod;
      sum.pop += s.colony.pop;
      if (s.colony.outpost) sum.outposts++; else sum.colonies++;
    });
    sum.foodNet = sum.food - sum.cons;
    sum.income = sum.cred - sum.bUpkeep - sum.sUpkeep;
    return sum;
  };

  // ---------- Bauliste ----------
  OL.itemCost = function (item) {
    if (item.type === 'building') return BUILDINGS[item.id].cost;
    if (item.type === 'ship') return HULLS[item.id].cost;
    if (item.type === 'terraform') return 120;
    return Infinity; // Wohnprojekt, Handelsgüter: laufend
  };
  OL.itemName = function (item) {
    if (item.type === 'building') return BUILDINGS[item.id].name;
    if (item.type === 'ship') return HULLS[item.id].name;
    if (item.type === 'terraform') return 'Terraforming';
    if (item.type === 'housing') return 'Wohnprojekt';
    if (item.type === 'trade') return 'Handelsgüter';
    return '?';
  };

  OL.buildOptions = function (g, p, star) {
    var c = star.colony, m = mods(p), opts = [];
    if (!c || c.outpost) return opts;
    var queued = {};
    c.queue.forEach(function (q) { queued[q.type + ':' + q.id] = true; });
    Object.keys(BUILDINGS).forEach(function (b) {
      if (BUILDINGS[b].hidden || !m.buildings[b] || c.buildings[b] || queued['building:' + b]) return;
      opts.push({ type: 'building', id: b });
    });
    Object.keys(HULLS).forEach(function (h) { if (m.hulls[h]) opts.push({ type: 'ship', id: h }); });
    var env = ENV[star.planet.env];
    if (m.terraform && env.next && (env.next !== 'gaia' || m.gaia) && !queued['terraform:x'])
      opts.push({ type: 'terraform', id: 'x' });
    if (!queued['housing:x']) opts.push({ type: 'housing', id: 'x' });
    if (!queued['trade:x']) opts.push({ type: 'trade', id: 'x' });
    return opts;
  };

  OL.enqueue = function (g, star, item) {
    var q = star.colony.queue;
    var cont = function (it) { return it.type === 'housing' || it.type === 'trade'; };
    var entry = { type: item.type, id: item.id || 'x' };
    // Laufende Posten (Wohnprojekt/Handelsgüter) bleiben am Ende der Liste
    var idx = q.length;
    if (!cont(entry)) while (idx > 0 && cont(q[idx - 1])) idx--;
    if (idx === 0 && q.length && star.colony.progress > 0 && !cont(q[0])) idx = q.length;
    q.splice(idx, 0, entry);
    if (q.length > 8) q.length = 8;
    return entry;
  };

  OL.buyCost = function (star) {
    var c = star.colony, head = c.queue[0];
    if (!head) return null;
    var cost = OL.itemCost(head);
    if (!isFinite(cost)) return null;
    var rest = Math.max(0, cost - c.progress);
    return Math.ceil(rest * (c.progress > 0 ? 2 : 3));
  };
  OL.buy = function (g, p, star) {
    var price = OL.buyCost(star);
    if (price == null || price > p.credits || price === 0) return false;
    p.credits -= price;
    star.colony.progress = OL.itemCost(star.colony.queue[0]);
    return true;
  };

  function completeItem(g, p, star, item) {
    var c = star.colony;
    if (item.type === 'building') {
      c.buildings[item.id] = true;
      if (item.id === 'base') c.baseHp = baseMaxHp(p);
      log(g, p.id, star.name + ': ' + BUILDINGS[item.id].name + ' fertiggestellt.', 'build', { star: star.id });
    } else if (item.type === 'ship') {
      var f = g.fleets.find(function (x) { return x.owner === p.id && x.star === star.id && x.dest == null; }) || newFleet(g, p.id, star);
      f.ships.push(makeShip(p, item.id));
      log(g, p.id, star.name + ': ' + HULLS[item.id].name + ' vom Stapel gelaufen.', 'build', { star: star.id });
    } else if (item.type === 'terraform') {
      var env = ENV[star.planet.env];
      if (env.next) {
        star.planet.env = env.next;
        log(g, p.id, star.name + ' wurde terraformt: jetzt ' + ENV[env.next].name + '.', 'build', { star: star.id });
      }
    }
  }

  function processProduction(g, p, star, out) {
    var c = star.colony;
    if (c.outpost) return;
    var head = c.queue[0];
    if (!head) { p.credits += out.prod * 0.5; return; } // Leerlauf → automatisch Handelsgüter
    if (head.type === 'trade') return; // bereits in Credits umgerechnet
    if (head.type === 'housing') { c.housing = out.prod; return; }
    c.progress += out.prod;
    var guard = 0;
    while (c.queue.length && guard++ < 3) {
      head = c.queue[0];
      var cost = OL.itemCost(head);
      if (!isFinite(cost) || c.progress < cost) break;
      c.progress -= cost;
      c.queue.shift();
      completeItem(g, p, star, head);
    }
    if (!c.queue.length || !isFinite(OL.itemCost(c.queue[0]))) c.progress = Math.min(c.progress, 0) ;
  }

  function baseMaxHp(p) { return Math.round(40 * mods(p).armor); }
  OL.baseMaxHp = baseMaxHp;

  function garrison(g, star) {
    var c = star.colony, owner = g.players[c.owner];
    var raw = Math.floor(c.pop) * 5 + (c.buildings.barracks ? 20 : 0) + (c.buildings.capital ? 20 : 0);
    return raw * mods(owner).groundMult;
  }
  OL.garrison = garrison;
  OL.troopStrength = function (g, p, ships) {
    var t = 0;
    ships.forEach(function (s) { t += s.tr || 0; });
    return t * 10 * mods(p).groundMult;
  };

  // Bevölkerungswachstum je Runde; housingProd = Produktion im Wohnprojekt (sonst aus der Bauliste geschätzt)
  OL.growth = function (g, p, star, housingProd) {
    var c = star.colony;
    if (!c || c.outpost) return 0;
    var max = OL.maxPop(g, p, star);
    if (c.pop > max) return -0.2;
    if (c.pop >= max) return 0;
    if (housingProd === undefined) {
      var head = c.queue[0];
      housingProd = head && head.type === 'housing' ? colonyOutput(g, star, p).prod : 0;
    }
    var race = OL.RACES[p.race];
    return Math.min(max - c.pop, 0.1 * (race.growth || 1) * c.pop * (1 - c.pop / max) + 0.05 +
      (c.buildings.cloning ? 0.15 : 0) + housingProd / 30);
  };

  function growColony(g, p, star, starving) {
    var c = star.colony;
    if (c.outpost) return;
    var max = OL.maxPop(g, p, star), before = Math.floor(c.pop + 1e-9);
    if (starving) return;
    c.pop = c.pop > max ? Math.max(max, c.pop - 0.2) : Math.min(max, c.pop + OL.growth(g, p, star, c.housing || 0));
    c.housing = 0;
    var after = Math.floor(c.pop + 1e-9);
    if (after > before) {
      // neue Bürger arbeiten in der Industrie – beim Spieler auf dem Feld, wenn das Reich hungert
      var toFarm = !p.isAI && colonyOutput(g, star, p).perFarmer > 0 && OL.empireSummary(g, p).foodNet < 0;
      c.jobs[toFarm ? 0 : 1] += after - before;
      if (p.isAI) c.aiDirty = true;
    }
    normalizeJobs(c);
  }

  function processEconomy(g, p) {
    var cols = coloniesOf(g, p.id, true);
    var outs = cols.map(function (s) { return colonyOutput(g, s, p); });
    var food = 0, cons = 0, res = 0, cred = 0, up = 0;
    outs.forEach(function (o) { food += o.food; cons += o.cons; res += o.res; cred += o.cred; up += o.upkeep; });
    up += shipUpkeep(g, p.id);
    cols.forEach(function (s, i) { processProduction(g, p, s, outs[i]); });

    // Nahrung (reichsweit geteilt, Frachter sind inklusive)
    var net = food - cons, starving = false;
    if (net < -1e-6) {
      var need = -net, cost = Math.ceil(need * 2);
      if (p.credits >= cost) {
        p.credits -= cost;
        if (!p.isAI) log(g, p.id, 'Nahrungsmangel: ' + fmt(need) + ' Nahrung für ' + cost + ' Credits importiert.', 'warn');
      } else {
        starving = true;
        var loss = need * 0.1, popTotal = 0;
        cols.forEach(function (s) { popTotal += s.colony.pop; });
        cols.forEach(function (s) {
          if (s.colony.outpost || !popTotal) return;
          s.colony.pop = Math.max(1, s.colony.pop - loss * s.colony.pop / popTotal);
          normalizeJobs(s.colony);
        });
        log(g, p.id, 'Hungersnot! Die Bevölkerung schrumpft. Mehr Bauern einteilen!', 'bad');
      }
    }
    cols.forEach(function (s) { growColony(g, p, s, starving); });

    // Forschung
    if (!p.research.field || !isFinite(OL.techCost(p, p.research.field))) {
      var auto = FIELDS.map(function (f) { return f.id; }).filter(function (id) { return isFinite(OL.techCost(p, id)); })
        .sort(function (a, b) { return OL.techCost(p, a) - OL.techCost(p, b); })[0];
      if (auto && !p.isAI) log(g, p.id, 'Forschungsziel automatisch gewählt: ' + OL.FIELD_BY_ID[auto].name + '.', 'info');
      p.research.field = auto || null;
    }
    if (p.research.field) {
      p.research.progress += res;
      var costT = OL.techCost(p, p.research.field);
      if (p.research.progress >= costT) {
        var tech = OL.nextTech(p, p.research.field);
        p.research.progress -= costT;
        p.tech[p.research.field]++;
        log(g, p.id, 'Durchbruch in ' + OL.FIELD_BY_ID[p.research.field].name + ': ' + tech.name + '. ' + tech.desc, 'tech');
        p.research.field = null;
      }
    }

    // Finanzen
    p.income = cred - up;
    p.credits += p.income;
    if (p.credits < 0) bankrupt(g, p);
  }

  function bankrupt(g, p) {
    // Zuerst Schiffe mit Unterhalt auflösen, dann Gebäude
    var worst = null, wf = null;
    g.fleets.forEach(function (f) {
      if (f.owner !== p.id) return;
      f.ships.forEach(function (s) {
        if (HULLS[s.t].upkeep > 0 && (!worst || HULLS[s.t].upkeep > HULLS[worst.t].upkeep || (HULLS[s.t].upkeep === HULLS[worst.t].upkeep && s.wl < worst.wl))) { worst = s; wf = f; }
      });
    });
    if (worst) {
      wf.ships.splice(wf.ships.indexOf(worst), 1);
      if (!wf.ships.length) g.fleets.splice(g.fleets.indexOf(wf), 1);
      log(g, p.id, 'Staatsbankrott: ' + HULLS[worst.t].name + ' mangels Geld außer Dienst gestellt.', 'bad');
    } else {
      var victim = null, vk = null;
      coloniesOf(g, p.id, true).forEach(function (s) {
        for (var k in s.colony.buildings) {
          var B = BUILDINGS[k];
          if (B && B.upkeep > 0 && s.colony.buildings[k] && (!victim || B.upkeep > BUILDINGS[vk].upkeep)) { victim = s; vk = k; }
        }
      });
      if (victim) {
        delete victim.colony.buildings[vk];
        log(g, p.id, 'Staatsbankrott: ' + BUILDINGS[vk].name + ' auf ' + victim.name + ' verkauft.', 'bad');
        p.credits += Math.round(BUILDINGS[vk].cost * 0.25);
      }
    }
    p.credits = Math.max(0, p.credits);
  }

  // ---------- Bewegung ----------
  OL.orderMove = function (g, fleet, starId) {
    var star = g.stars[starId];
    if (!star) return 'Unbekanntes Ziel.';
    if (fleet.star === starId) { fleet.dest = null; return null; }
    if (!OL.inRange(g, fleet.owner, star)) return 'Außer Reichweite: ' + star.name + ' ist ' + fmt(supplyDist(g, fleet.owner, star)) + ' pc von der nächsten Kolonie entfernt (Reichweite ' + mods(g.players[fleet.owner]).range + ' pc).';
    fleet.dest = starId;
    return null;
  };
  OL.eta = function (g, fleet, starId) {
    var s = g.stars[starId];
    return Math.max(1, Math.ceil((dist(fleet, s) - 1e-6) / fleetSpeed(fleet)));
  };

  OL.splitFleet = function (g, fleet, ships) {
    if (ships.length === fleet.ships.length) return fleet;
    var nf = { id: g.nextId++, owner: fleet.owner, ships: [], x: fleet.x, y: fleet.y, star: fleet.star, dest: null };
    ships.forEach(function (s) {
      var i = fleet.ships.indexOf(s);
      if (i >= 0) { fleet.ships.splice(i, 1); nf.ships.push(s); }
    });
    g.fleets.push(nf);
    return nf;
  };

  function moveFleets(g) {
    g.fleets.forEach(function (f) {
      if (f.dest == null || !f.ships.length) return;
      var s = g.stars[f.dest], sp = fleetSpeed(f), d = dist(f, s);
      f.star = null;
      if (d <= sp + 1e-6) { f.x = s.x; f.y = s.y; f.star = s.id; f.dest = null; f.arrived = g.turn; }
      else { f.x += (s.x - f.x) / d * sp; f.y += (s.y - f.y) / d * sp; }
    });
  }

  function mergeFleets(g) {
    var byKey = {};
    g.fleets.forEach(function (f) {
      if (f.star == null || f.dest != null || !f.ships.length) return;
      var k = f.owner + ':' + f.star;
      if (byKey[k]) { byKey[k].ships = byKey[k].ships.concat(f.ships); f.ships = []; f.mergedInto = byKey[k].id; }
      else byKey[k] = f;
    });
    g.fleets = g.fleets.filter(function (f) { return f.ships.length > 0; });
  }
  OL.mergeFleets = mergeFleets;

  // ---------- Kampf ----------
  function expDmg(d, sh) {
    var lo = Math.ceil(d / 2), tot = 0;
    for (var x = lo; x <= d; x++) tot += Math.max(0, x - sh);
    return tot / (d - lo + 1);
  }
  OL.expDmg = expDmg;

  function baseUnit(g, star) {
    var c = star.colony;
    if (!c || !c.buildings.base || c.baseHp <= 0) return null;
    var p = g.players[c.owner], m = mods(p);
    return { owner: c.owner, kind: 'base', slots: 6, d: WEAPONS[m.weapon].dmg, sh: m.shield + (c.buildings.plshield ? 5 : 0),
      hit: m.hit + 0.1, eva: 0, hp: c.baseHp, mhp: baseMaxHp(p) };
  }
  OL.baseUnit = baseUnit;
  function guardianUnit(star) {
    return { owner: -1, kind: 'guardian', slots: 12, d: 20, sh: 8, hit: 0.2, eva: 0, hp: star.guardian.hp, mhp: star.guardian.mhp };
  }
  OL.guardianUnit = guardianUnit;
  OL.shipUnit = function (owner, s) {
    return { owner: owner, kind: 'ship', ship: s, slots: s.sl, d: s.d, sh: s.sh, hit: s.hit, eva: s.eva, hp: s.hp, mhp: s.mhp };
  };

  // Erwartete Kampfkraft-Relation A:B (Lanchester: Feuerkraft × Struktur)
  function sideStats(units, enemies) {
    var avgSh = 0, avgEva = 0, n = 0;
    enemies.forEach(function (e) { avgSh += e.sh * e.hp; avgEva += e.eva * e.hp; n += e.hp; });
    if (n) { avgSh /= n; avgEva /= n; }
    var dps = 0, hp = 0;
    units.forEach(function (u) {
      hp += u.hp;
      if (u.slots) dps += u.slots * clamp(0.6 + u.hit - avgEva, 0.1, 0.95) * expDmg(u.d, Math.round(avgSh));
    });
    return { dps: dps, hp: hp };
  }
  OL.battleRatio = function (a, b) {
    if (!b.length) return Infinity;
    if (!a.length) return 0;
    var A = sideStats(a, b), B = sideStats(b, a);
    var ea = A.dps * A.hp, eb = B.dps * B.hp;
    if (eb <= 0) return ea > 0 ? Infinity : (A.hp > 0 ? 1 : 0);
    return Math.sqrt(ea / eb);
  };
  // Grober Kampfwert einer Einheitenliste gegen einen Standardgegner
  OL.powerOf = function (units, refShield) {
    var dps = 0, hp = 0;
    units.forEach(function (u) {
      hp += u.hp;
      if (u.slots) dps += u.slots * clamp(0.6 + u.hit - 0.1, 0.1, 0.95) * expDmg(u.d, refShield || 0);
    });
    return Math.sqrt(dps * hp);
  };

  function resolveCombats(g) {
    g.stars.forEach(function (star) {
      var fleets = g.fleets.filter(function (f) { return f.star === star.id && f.ships.length; });
      var units = [];
      fleets.forEach(function (f) { f.ships.forEach(function (s) { var u = OL.shipUnit(f.owner, s); u.fleet = f; units.push(u); }); });
      var bu = baseUnit(g, star);
      if (bu) units.push(bu);
      if (star.guardian && fleets.length) units.push(guardianUnit(star));
      if (units.length < 2) return;
      var hostilePairExists = units.some(function (u) {
        return u.slots > 0 && units.some(function (v) { return v.owner !== u.owner && isWar(g, u.owner, v.owner); });
      });
      if (!hostilePairExists) return;
      fight(g, star, units);
    });
    g.fleets = g.fleets.filter(function (f) { return f.ships.length > 0; });
  }

  function fight(g, star, units) {
    var owners = {};
    units.forEach(function (u) { owners[u.owner] = true; });
    var before = {};
    units.forEach(function (u) {
      var k = u.owner;
      before[k] = before[k] || {};
      var name = u.kind === 'ship' ? HULLS[u.ship.t].name : u.kind === 'base' ? 'Raketenbasis' : 'Wächter von Orion';
      before[k][name] = (before[k][name] || 0) + 1;
      u.label = name;
    });
    var dealt = {}, rounds = 0;
    for (var r = 0; r < 10; r++) {
      rounds = r + 1;
      var order = shuffle(g, units.filter(function (u) { return u.hp > 0 && u.slots > 0; }));
      order.forEach(function (u) {
        if (u.hp <= 0) return;
        for (var k = 0; k < u.slots; k++) {
          var targets = units.filter(function (v) { return v.hp > 0 && v.owner !== u.owner && isWar(g, u.owner, v.owner); });
          if (!targets.length) return;
          // bewaffnete Ziele werden bevorzugt
          var armed = targets.filter(function (v) { return v.slots > 0; });
          var pool = armed.length && rnd(g) < 0.7 ? armed : targets;
          var t = pool[Math.floor(rnd(g) * pool.length)];
          var chance = clamp(0.6 + u.hit - t.eva, 0.1, 0.95);
          if (rnd(g) < chance) {
            var dmg = rint(g, Math.ceil(u.d / 2), u.d) - t.sh;
            if (dmg > 0) { t.hp -= dmg; dealt[u.owner + '>' + t.owner] = (dealt[u.owner + '>' + t.owner] || 0) + dmg; }
          }
        }
      });
      var goOn = units.some(function (u) {
        return u.hp > 0 && u.slots > 0 && units.some(function (v) { return v.hp > 0 && v.owner !== u.owner && isWar(g, u.owner, v.owner); });
      });
      if (!goOn) break;
    }
    // Ergebnisse übernehmen
    var lost = {};
    units.forEach(function (u) {
      if (u.hp <= 0) { lost[u.owner] = lost[u.owner] || {}; lost[u.owner][u.label] = (lost[u.owner][u.label] || 0) + 1; }
      if (u.kind === 'ship') {
        u.ship.hp = Math.max(0, Math.round(u.hp));
        if (u.hp <= 0) u.fleet.ships.splice(u.fleet.ships.indexOf(u.ship), 1);
      } else if (u.kind === 'base') {
        star.colony.baseHp = Math.max(0, Math.round(u.hp));
      } else if (u.kind === 'guardian') {
        star.guardian.hp = Math.max(0, Math.round(u.hp));
      }
    });
    var sides = Object.keys(owners).map(Number);
    var survivors = sides.filter(function (o) { return units.some(function (u) { return u.owner === o && u.hp > 0; }); });
    var rep = { id: g.nextId++, turn: g.turn, star: star.id, starName: star.name, rounds: rounds,
      sides: sides.map(function (o) {
        return { owner: o, before: before[o], lost: lost[o] || {},
          dealt: sides.reduce(function (a, q) { return a + (dealt[o + '>' + q] || 0); }, 0),
          survived: survivors.indexOf(o) >= 0 };
      }) };
    g.reports.push(rep);
    if (g.reports.length > 80) g.reports.shift();

    var guardianKilled = false;
    if (star.guardian && star.guardian.hp <= 0) {
      guardianKilled = true;
      var best = -1, bestD = -1;
      sides.forEach(function (o) { if (o >= 0 && (dealt[o + '>-1'] || 0) > bestD) { bestD = dealt[o + '>-1'] || 0; best = o; } });
      star.guardian = null;
      if (best >= 0) {
        var pw = g.players[best];
        ['phy', 'kra'].forEach(function (fid) { if (isFinite(OL.techCost(pw, fid))) pw.tech[fid]++; });
        log(g, -1, pw.name + ' hat den Wächter von Orion vernichtet!', 'major', { star: star.id });
        log(g, best, 'In den Trümmern des Wächters finden Ihre Ingenieure Waffen- und Schildtechnik der Orioner (+1 Physik, +1 Kraftfelder).', 'tech');
      }
    }
    sides.forEach(function (o) {
      if (o < 0) return;
      var mine = rep.sides.find(function (s) { return s.owner === o; });
      var lostN = Object.keys(mine.lost).reduce(function (a, k) { return a + mine.lost[k]; }, 0);
      var enemyLost = rep.sides.filter(function (s) { return s.owner !== o; })
        .reduce(function (a, s) { return a + Object.keys(s.lost).reduce(function (b, k) { return b + s.lost[k]; }, 0); }, 0);
      var foes = sides.filter(function (q) { return q !== o && isWar(g, o, q); })
        .map(function (q) { return q < 0 ? 'den Wächter von Orion' : g.players[q].name; }).join(', ');
      log(g, o, 'Raumschlacht bei ' + star.name + ' gegen ' + foes + ': ' + enemyLost + ' Feindeinheiten zerstört, ' + lostN + ' eigene verloren.',
        mine.survived ? 'combat' : 'bad', { star: star.id, rep: rep.id });
      if (o >= 0 && !g.players[o].isAI) {
        sides.forEach(function (q) { if (q >= 0 && q !== o) { g.players[o].contact[q] = true; g.players[q].contact[o] = true; } });
      }
    });
    rep.guardianKilled = guardianKilled;
    return rep;
  }
  OL.fight = fight;

  // ---------- Kolonisieren und Invasion ----------
  function hostileArmedAt(g, pid, starId) {
    return g.fleets.some(function (f) { return f.star === starId && isWar(g, pid, f.owner) && OL.fleetArmed(f); });
  }
  OL.hostileArmedAt = hostileArmedAt;

  OL.canColonize = function (g, fleet, kind) {
    if (fleet.star == null) return 'Die Flotte ist unterwegs.';
    var star = g.stars[fleet.star], p = g.players[fleet.owner];
    if (!fleet.ships.some(function (s) { return s.t === kind; })) return 'Kein passendes Schiff in der Flotte.';
    if (star.guardian) return 'Der Wächter von Orion verhindert jede Landung.';
    if (hostileArmedAt(g, p.id, star.id)) return 'Feindliche Kriegsschiffe im Orbit.';
    var env = ENV[star.planet.env];
    if (kind === 'colony') {
      if (!env.pop) return 'Auf ' + env.name + ' kann niemand leben – hier geht nur ein Außenposten.';
      if (star.colony && !(star.colony.owner === p.id && star.colony.outpost)) return 'Der Planet ist bereits besiedelt.';
    } else if (star.colony) return 'Der Planet ist bereits beansprucht.';
    return null;
  };
  OL.colonize = function (g, fleet, kind) {
    var err = OL.canColonize(g, fleet, kind);
    if (err) return err;
    var star = g.stars[fleet.star], p = g.players[fleet.owner];
    var ship = fleet.ships.find(function (s) { return s.t === kind; });
    fleet.ships.splice(fleet.ships.indexOf(ship), 1);
    if (!fleet.ships.length) g.fleets.splice(g.fleets.indexOf(fleet), 1);
    if (kind === 'colony') {
      var old = star.colony;
      star.colony = { owner: p.id, pop: 1, jobs: [0, 1, 0], buildings: old ? old.buildings : {}, queue: [], progress: 0,
        baseHp: old ? old.baseHp : 0, outpost: false, founded: g.turn };
      log(g, p.id, 'Neue Kolonie auf ' + star.name + ' (' + ENV[star.planet.env].name + ', ' + SIZES[star.planet.size].name + ') gegründet.', 'good', { star: star.id });
    } else {
      star.colony = { owner: p.id, pop: 0, jobs: [0, 0, 0], buildings: {}, queue: [], progress: 0, baseHp: 0, outpost: true, founded: g.turn };
      log(g, p.id, 'Außenposten auf ' + star.name + ' errichtet. Er erweitert die Reichweite Ihrer Schiffe.', 'good', { star: star.id });
    }
    return null;
  };

  OL.canInvade = function (g, fleet) {
    if (fleet.star == null) return 'Die Flotte ist unterwegs.';
    var star = g.stars[fleet.star], c = star.colony;
    if (!fleet.ships.some(function (s) { return s.tr > 0; })) return 'Keine Truppentransporter in der Flotte.';
    if (!c || c.owner === fleet.owner) return 'Hier gibt es keine feindliche Kolonie.';
    if (!isWar(g, fleet.owner, c.owner)) return 'Mit ' + g.players[c.owner].name + ' herrscht Frieden.';
    if (g.fleets.some(function (f) { return f.star === star.id && f.owner === c.owner && OL.fleetArmed(f); })) return 'Verteidigende Kriegsschiffe im Orbit.';
    if (c.buildings.base && c.baseHp > 0) return 'Die Raketenbasis steht noch (' + c.baseHp + ' Struktur).';
    return null;
  };
  OL.invade = function (g, fleet) {
    var err = OL.canInvade(g, fleet);
    if (err) return { ok: false, msg: err };
    var star = g.stars[fleet.star], c = star.colony, att = g.players[fleet.owner], def = g.players[c.owner];
    var troops = fleet.ships.filter(function (s) { return s.tr > 0; });
    var a = OL.troopStrength(g, att, troops), d = c.outpost ? 0 : garrison(g, star);
    troops.forEach(function (s) { fleet.ships.splice(fleet.ships.indexOf(s), 1); });
    if (!fleet.ships.length) g.fleets.splice(g.fleets.indexOf(fleet), 1);
    var ra = a * (0.75 + rnd(g) * 0.5), rd = d * (0.75 + rnd(g) * 0.5);
    if (ra > rd) {
      var wasCapital = !!c.buildings.capital;
      c.owner = att.id; c.pop = Math.max(c.outpost ? 0 : 1, c.pop * 0.8); c.jobs = [0, Math.floor(c.pop), 0];
      c.queue = []; c.progress = 0; c.captured = g.turn;
      delete c.buildings.capital;
      def.lostColonies = (def.lostColonies || 0) + 1;
      if (att.ai) att.ai.lastGain = g.turn;
      log(g, att.id, 'Invasion erfolgreich: ' + star.name + ' gehört jetzt Ihnen! (Truppen ' + Math.round(a) + ' gegen ' + Math.round(d) + ')', 'good', { star: star.id });
      log(g, def.id, star.name + ' wurde von ' + att.name + ' erobert!', 'bad', { star: star.id });
      if (wasCapital) relocateCapital(g, def);
      return { ok: true, msg: 'Erobert!' };
    }
    log(g, att.id, 'Invasion von ' + star.name + ' abgewehrt (Truppen ' + Math.round(a) + ' gegen ' + Math.round(d) + ').', 'bad', { star: star.id });
    log(g, def.id, 'Die Garnison von ' + star.name + ' hat eine Invasion von ' + att.name + ' abgewehrt.', 'good', { star: star.id });
    return { ok: false, msg: 'Invasion abgewehrt.' };
  };

  function relocateCapital(g, p) {
    var cols = coloniesOf(g, p.id).sort(function (a, b) { return b.colony.pop - a.colony.pop; });
    if (cols.length) {
      cols[0].colony.buildings.capital = true;
      p.capital = cols[0].id;
      log(g, p.id, 'Der Regierungssitz wurde nach ' + cols[0].name + ' verlegt.', 'warn');
    } else p.capital = null;
  }

  OL.scrapShips = function (g, fleet, ships) {
    var p = g.players[fleet.owner], gain = 0;
    ships.forEach(function (s) {
      var i = fleet.ships.indexOf(s);
      if (i >= 0) { fleet.ships.splice(i, 1); gain += Math.floor(HULLS[s.t].cost * 0.2); }
    });
    p.credits += gain;
    if (!fleet.ships.length) g.fleets.splice(g.fleets.indexOf(fleet), 1);
    return gain;
  };

  // ---------- Diplomatie ----------
  OL.declareWar = function (g, a, b) {
    var A = g.players[a], B = g.players[b];
    if (A.rel[b] === 'war') return;
    A.rel[b] = 'war'; B.rel[a] = 'war';
    A.warSince[b] = g.turn; B.warSince[a] = g.turn;
    log(g, -1, A.name + ' erklärt ' + B.name + ' den Krieg!', 'war');
  };
  OL.makePeace = function (g, a, b) {
    var A = g.players[a], B = g.players[b];
    A.rel[b] = 'peace'; B.rel[a] = 'peace';
    A.treaty[b] = g.turn + 20; B.treaty[a] = g.turn + 20;
    log(g, -1, A.name + ' und ' + B.name + ' schließen Frieden.', 'diplo');
    // Flotten im Orbit fremder Kolonien ziehen ab
  };
  OL.proposePeace = function (g, from, to) {
    var T = g.players[to];
    if (T.isAI) {
      var yes = OL.AI.considerPeace(g, T, g.players[from]);
      if (yes) OL.makePeace(g, from, to);
      return yes;
    }
    if (!g.offers.some(function (o) { return o.from === from && o.to === to; }))
      g.offers.push({ from: from, to: to, type: 'peace', turn: g.turn });
    log(g, to, g.players[from].name + ' bietet Ihnen Frieden an (Diplomatie).', 'diplo');
    return null;
  };

  OL.militaryUnits = function (g, pid) {
    var u = [];
    g.fleets.forEach(function (f) {
      if (f.owner === pid) f.ships.forEach(function (s) { if (s.sl > 0) u.push(OL.shipUnit(pid, s)); });
    });
    return u;
  };
  OL.militaryPower = function (g, pid) { return OL.powerOf(OL.militaryUnits(g, pid), 1); };

  OL.score = function (g, p) {
    var pop = 0, cols = 0, tech = 0;
    coloniesOf(g, p.id, true).forEach(function (s) { pop += s.colony.pop; cols++; });
    FIELDS.forEach(function (f) { tech += p.tech[f.id]; });
    return Math.round(pop + tech * 3 + cols * 2 + OL.militaryPower(g, p.id) / 4);
  };

  // ---------- Rundenablauf ----------
  OL.endTurn = function (g) {
    if (g.over) return;
    g.offers = g.offers.filter(function (o) { return o.turn >= g.turn; });
    g.players.forEach(function (p) { if (p.alive && p.isAI) OL.AI.takeTurn(g, p); });
    moveFleets(g);
    mergeFleets(g);
    g.players.forEach(function (p) { if (p.alive) updateVisibility(g, p); });
    resolveCombats(g);
    g.players.forEach(function (p) { if (p.alive) processEconomy(g, p); });
    repair(g);
    checkElimination(g);
    g.turn++;
    g.players.forEach(function (p) { if (p.alive) updateVisibility(g, p); });
  };

  function repair(g) {
    g.fleets.forEach(function (f) {
      var atHome = f.star != null && g.stars[f.star].colony && g.stars[f.star].colony.owner === f.owner;
      f.ships.forEach(function (s) {
        if (s.hp < s.mhp) s.hp = Math.min(s.mhp, s.hp + Math.ceil(s.mhp * (atHome ? 0.5 : 0.1)));
      });
    });
    g.stars.forEach(function (s) {
      if (s.guardian) s.guardian.hp = Math.min(s.guardian.mhp, s.guardian.hp + 50);
      var c = s.colony;
      if (c && c.buildings.base && !hostileArmedAt(g, c.owner, s.id)) {
        var mx = baseMaxHp(g.players[c.owner]);
        c.baseHp = Math.min(mx, c.baseHp + Math.ceil(mx * 0.25));
      }
    });
  }

  function checkElimination(g) {
    var totalPop = 0, popBy = {};
    g.players.forEach(function (p) {
      if (!p.alive) return;
      var cols = coloniesOf(g, p.id, true);
      var hasSettlers = g.fleets.some(function (f) { return f.owner === p.id && f.ships.some(function (s) { return s.t === 'colony'; }); });
      if (!cols.length && !hasSettlers) {
        p.alive = false;
        g.fleets = g.fleets.filter(function (f) { return f.owner !== p.id; });
        log(g, -1, p.name + ' wurde vernichtet und ist aus der Geschichte der Galaxis getilgt.', 'major');
        g.players.forEach(function (q) { if (q !== p) q.rel[p.id] = 'peace'; });
      }
      popBy[p.id] = 0;
      cols.forEach(function (s) { popBy[p.id] += s.colony.pop; totalPop += s.colony.pop; });
    });
    var human = g.players[0];
    if (g.settings.allAI) {
      var aliveAI = g.players.filter(function (p) { return p.alive; });
      if (aliveAI.length === 1) g.over = { win: false, winner: aliveAI[0].id, reason: 'conquest', turn: g.turn };
      return;
    }
    if (!human.alive) { g.over = { win: false, winner: null, reason: 'destroyed', turn: g.turn }; return; }
    if (g.players.every(function (p) { return p === human || !p.alive; })) {
      g.over = { win: true, winner: 0, reason: 'conquest', turn: g.turn }; return;
    }
    if (g.turn >= 50 && totalPop > 0) {
      g.players.forEach(function (p) {
        if (!g.over && p.alive && popBy[p.id] / totalPop >= 2 / 3) {
          g.over = { win: p.id === 0, winner: p.id, reason: 'dominance', turn: g.turn };
          log(g, -1, 'Der Galaktische Rat ernennt ' + p.name + ' zum Imperator: zwei Drittel aller Bewohner der Galaxis leben in diesem Reich.', 'major');
        }
      });
    }
  }

  function fmt(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }
  OL.fmt = fmt;
})(typeof globalThis !== 'undefined' ? (globalThis.OL = globalThis.OL || {}) : (window.OL = window.OL || {}));
