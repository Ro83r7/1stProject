/* Orion Lite – Oberfläche: Sternenkarte (Canvas), Konsole, Dialoge, Rundenablauf. */
(function () {
  'use strict';
  var OL = window.OL;
  var SAVE_KEY = 'orion-lite-save-v1';
  var ME = 0;

  var g = null;
  var ui = { tab: 'system', star: null, fleet: null, send: {}, hover: null, view: null, modal: null,
    rulesAI: null, scrapAsk: false, logDot: false,
    intro: { race: 'menschen', galaxy: 'mittel', opponents: 3, difficulty: 'normal', name: '' } };

  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var fmt = function (n) { return OL.fmt(n); };
  function sign(n) { var v = Math.round(n * 10) / 10; return (v > 0 ? '+' : v < 0 ? '−' : '±') + fmt(Math.abs(v)); }
  function me() { return g.players[ME]; }
  function pname(pid) { return pid < 0 ? 'Wächter von Orion' : g.players[pid].name; }
  function pcolor(pid) { return pid < 0 ? '#ff5a4a' : g.players[pid].color; }
  function swatch(pid) { return '<span class="swatch" style="background:' + pcolor(pid) + '"></span>'; }
  function starLink(id) { var s = g.stars[id]; return '<button class="link" data-act="selstar" data-arg="' + id + '">' + esc(s.name) + '</button>'; }
  function fleetById(id) { return g && g.fleets.find(function (f) { return f.id === id; }); }
  function typeSummary(ships) {
    var c = OL.countTypes(ships), order = ['titan', 'battleship', 'cruiser', 'destroyer', 'frigate', 'transport', 'colony', 'outpost', 'scout'];
    return order.filter(function (t) { return c[t]; }).map(function (t) { return c[t] + '× ' + OL.HULLS[t].name; }).join(', ');
  }

  // ------------------------------------------------------------ Speicher
  function save() { try { if (g) localStorage.setItem(SAVE_KEY, JSON.stringify(g)); } catch (e) { /* kein Speicher verfügbar */ } }
  function loadSaved() { try { var s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }

  // ------------------------------------------------------------ Karte
  var wrap = $('#map-wrap'), cv = $('#map'), cx = cv.getContext('2d');
  var W = 0, H = 0, DPR = 1, bgCanvas = null, hits = [];

  function resize() {
    var r = wrap.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    buildBg();
    if (g && !ui.view) fit();
    draw();
  }
  function fit() {
    var s = Math.min(W / (g.w + 1.5), H / (g.h + 1.5));
    ui.view = { scale: s, ox: (W - g.w * s) / 2, oy: (H - g.h * s) / 2 };
  }
  function sx(x) { return ui.view.ox + x * ui.view.scale; }
  function sy(y) { return ui.view.oy + y * ui.view.scale; }
  function zoomAt(px, py, f) {
    var v = ui.view, ns = Math.max(6, Math.min(90, v.scale * f)), k = ns / v.scale;
    v.ox = px - (px - v.ox) * k; v.oy = py - (py - v.oy) * k; v.scale = ns;
    draw();
  }
  function buildBg() {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = cv.width; bgCanvas.height = cv.height;
    var b = bgCanvas.getContext('2d'), n = Math.round(W * H / 2600), seed = 7;
    var r = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    b.fillStyle = '#06080f'; b.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (var i = 0; i < n; i++) {
      var a = r() * 0.55 + 0.1;
      b.fillStyle = 'rgba(' + (200 + r() * 55 | 0) + ',' + (205 + r() * 50 | 0) + ',255,' + a.toFixed(2) + ')';
      var s = r() < 0.92 ? 1 : 2;
      b.fillRect(r() * bgCanvas.width, r() * bgCanvas.height, s * DPR * 0.8, s * DPR * 0.8);
    }
  }

  function draw() {
    if (!g || !ui.view) { cx.setTransform(1, 0, 0, 1, 0, 0); if (bgCanvas) cx.drawImage(bgCanvas, 0, 0); return; }
    var p = me(), vis = OL.visibility(g, ME), v = ui.view, sc = v.scale;
    hits = [];
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.drawImage(bgCanvas, 0, 0);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Nebel (aus dem Seed, damit jede Galaxie ihr eigenes Gesicht hat)
    var seed = g.seed % 2147483646 + 1;
    var r = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var tints = ['120,90,210', '214,165,81', '60,170,190', '190,80,120'];
    for (var i = 0; i < 4; i++) {
      var nx = sx(r() * g.w), ny = sy(r() * g.h), rad = (4 + r() * 8) * sc;
      var gr = cx.createRadialGradient(nx, ny, 0, nx, ny, rad);
      gr.addColorStop(0, 'rgba(' + tints[i] + ',0.10)'); gr.addColorStop(1, 'rgba(' + tints[i] + ',0)');
      cx.fillStyle = gr; cx.fillRect(nx - rad, ny - rad, rad * 2, rad * 2);
    }

    var sel = ui.fleet != null ? fleetById(ui.fleet) : null;
    var own = sel && sel.owner === ME;

    // Reichweite der ausgewählten Flotte
    if (own) {
      var range = OL.mods(p).range;
      cx.save();
      cx.beginPath();
      OL.coloniesOf(g, ME, true).forEach(function (s) { cx.moveTo(sx(s.x) + range * sc, sy(s.y)); cx.arc(sx(s.x), sy(s.y), range * sc, 0, Math.PI * 2); });
      cx.fillStyle = 'rgba(214,165,81,0.06)';
      cx.fill('nonzero');
      cx.restore();
    }

    // Flugbahnen
    g.fleets.forEach(function (f) {
      if (f.dest == null || !vis.fleets[f.id]) return;
      var d = g.stars[f.dest];
      cx.save();
      cx.setLineDash([4, 5]);
      cx.strokeStyle = hexA(pcolor(f.owner), f.owner === ME ? 0.75 : 0.45);
      cx.lineWidth = f.id === ui.fleet ? 2 : 1;
      cx.beginPath(); cx.moveTo(sx(f.x), sy(f.y)); cx.lineTo(sx(d.x), sy(d.y)); cx.stroke();
      cx.restore();
      if (f.owner === ME) {
        label(OL.eta(g, f, f.dest) + ' R', (sx(f.x) + sx(d.x)) / 2, (sy(f.y) + sy(d.y)) / 2 - 6, '#d6a551', 11);
      }
    });

    // Sterne
    var rStar = Math.max(2.6, Math.min(6, sc * 0.17));
    g.stars.forEach(function (s) {
      var x = sx(s.x), y = sy(s.y), known = !!p.explored[s.id], col = OL.STAR_COLORS[s.color].c;
      var glow = cx.createRadialGradient(x, y, 0, x, y, rStar * 4.5);
      glow.addColorStop(0, hexA(col, known ? 0.55 : 0.28)); glow.addColorStop(1, hexA(col, 0));
      cx.fillStyle = glow; cx.fillRect(x - rStar * 5, y - rStar * 5, rStar * 10, rStar * 10);
      cx.fillStyle = known ? col : hexA(col, 0.55);
      cx.beginPath(); cx.arc(x, y, rStar, 0, Math.PI * 2); cx.fill();

      if (known) {
        var env = OL.ENV[s.planet.env], pr = 1.6 + s.planet.size * 0.55;
        cx.fillStyle = env.color;
        cx.beginPath(); cx.arc(x + rStar + 4 + pr, y + rStar + 1, pr, 0, Math.PI * 2); cx.fill();
      }
      var c = s.colony;
      if (known && c) {
        cx.strokeStyle = pcolor(c.owner); cx.lineWidth = 2;
        if (c.outpost) cx.setLineDash([3, 3]);
        cx.beginPath(); cx.arc(x, y, rStar + 6, 0, Math.PI * 2); cx.stroke();
        cx.setLineDash([]);
        if (c.buildings.base) {
          cx.fillStyle = pcolor(c.owner);
          cx.beginPath(); cx.moveTo(x, y - rStar - 11); cx.lineTo(x + 3.5, y - rStar - 6); cx.lineTo(x - 3.5, y - rStar - 6); cx.closePath(); cx.fill();
        }
      }
      if (s.guardian && known) {
        cx.strokeStyle = 'rgba(255,90,74,0.85)'; cx.lineWidth = 1.5;
        cx.setLineDash([2, 3]);
        cx.beginPath(); cx.arc(x, y, rStar + 10, 0, Math.PI * 2); cx.stroke();
        cx.setLineDash([]);
      }
      if (s.id === ui.star) {
        cx.strokeStyle = '#f0c97a'; cx.lineWidth = 1.5;
        cx.beginPath(); cx.arc(x, y, rStar + 13, 0, Math.PI * 2); cx.stroke();
        for (var k = 0; k < 4; k++) {
          var a = k * Math.PI / 2 + Math.PI / 4;
          cx.beginPath(); cx.moveTo(x + Math.cos(a) * (rStar + 13), y + Math.sin(a) * (rStar + 13));
          cx.lineTo(x + Math.cos(a) * (rStar + 18), y + Math.sin(a) * (rStar + 18)); cx.stroke();
        }
      }
      if (s.id === ui.hover && s.id !== ui.star) {
        cx.strokeStyle = 'rgba(240,201,122,0.45)'; cx.lineWidth = 1;
        cx.beginPath(); cx.arc(x, y, rStar + 13, 0, Math.PI * 2); cx.stroke();
      }
      var name = s.name + (known && c && !c.outpost ? ' ' + Math.floor(c.pop) : '');
      var nameCol = known ? (c ? pcolor(c.owner) : '#c9c6bb') : '#6b7192';
      label(name, x, y + rStar + 16, nameCol, Math.max(10, Math.min(13, sc * 0.5)));
      if (s.guardian && known) label('Wächter', x, y + rStar + 29, '#ff8a7a', 10);
      hits.push({ t: 'star', id: s.id, x: x, y: y, r: Math.max(14, rStar + 10) });
    });

    // Flotten
    var slot = {};
    g.fleets.forEach(function (f) {
      if (!vis.fleets[f.id] || !f.ships.length) return;
      var x, y, ang = 0;
      if (f.star != null) {
        var key = f.star, i = slot[key] = (slot[key] || 0) + 1;
        x = sx(g.stars[f.star].x) + rStar + 12; y = sy(g.stars[f.star].y) - rStar - 6 - (i - 1) * 12;
      } else {
        x = sx(f.x); y = sy(f.y);
        var d = g.stars[f.dest];
        ang = Math.atan2(sy(d.y) - y, sx(d.x) - x);
      }
      chevron(x, y, ang, pcolor(f.owner), f.id === ui.fleet, OL.fleetArmed(f));
      hits.push({ t: 'fleet', id: f.id, x: x, y: y, r: 9 });
    });

    // Vorschau des Kurses
    if (own && ui.hover != null && ui.hover !== sel.star) {
      var hs = g.stars[ui.hover], ok = OL.inRange(g, ME, hs);
      cx.save();
      cx.setLineDash([2, 4]);
      cx.strokeStyle = ok ? 'rgba(240,201,122,0.9)' : 'rgba(240,107,92,0.8)';
      cx.beginPath(); cx.moveTo(sx(sel.x), sy(sel.y)); cx.lineTo(sx(hs.x), sy(hs.y)); cx.stroke();
      cx.restore();
    }
    updateHint();
  }

  function label(text, x, y, color, size) {
    cx.font = '500 ' + Math.round(size) + 'px "Barlow Semi Condensed", "Arial Narrow", sans-serif';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.lineWidth = 3; cx.strokeStyle = 'rgba(6,8,15,0.85)';
    cx.strokeText(text, x, y);
    cx.fillStyle = color; cx.fillText(text, x, y);
  }
  function chevron(x, y, ang, color, selected, armed) {
    cx.save();
    cx.translate(x, y); cx.rotate(ang);
    cx.beginPath();
    cx.moveTo(7, 0); cx.lineTo(-5, -5); cx.lineTo(-2, 0); cx.lineTo(-5, 5); cx.closePath();
    cx.fillStyle = armed ? color : hexA(color, 0.55);
    cx.fill();
    cx.lineWidth = selected ? 2 : 1;
    cx.strokeStyle = selected ? '#f0c97a' : 'rgba(6,8,15,0.9)';
    cx.stroke();
    cx.restore();
  }
  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h, 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function hitTest(x, y) {
    var best = null, bd = Infinity;
    hits.forEach(function (h) {
      var d = Math.hypot(h.x - x, h.y - y);
      if (d <= h.r && (h.t === 'fleet' ? d - 6 : d) < bd) { bd = h.t === 'fleet' ? d - 6 : d; best = h; }
    });
    return best;
  }

  function updateHint() {
    var el = $('#map-hint'), sel = ui.fleet != null ? fleetById(ui.fleet) : null, txt = '';
    if (sel && sel.owner === ME) {
      var n = selectedShips(sel).length;
      txt = n + ' Schiff' + (n === 1 ? '' : 'e') + ' ausgewählt · Ziel auf der Karte anklicken';
      if (ui.hover != null && ui.hover !== sel.star) {
        var hs = g.stars[ui.hover];
        txt = OL.inRange(g, ME, hs)
          ? 'Nach ' + hs.name + ': ' + OL.eta(g, sel, hs.id) + ' Runde(n)'
          : hs.name + ' liegt außer Reichweite (' + fmt(OL.supplyDist(g, ME, hs)) + ' pc, max. ' + OL.mods(me()).range + ' pc)';
      }
    } else if (g && g.turn <= 3 && ui.star == null) {
      txt = 'Stern anklicken für Details · Karte ziehen zum Verschieben · Mausrad oder Knöpfe zum Zoomen';
    }
    if (el.textContent !== txt) el.textContent = txt;
  }

  // Zeiger: Ziehen, Zoomen, Klicken
  var pointers = new Map(), drag = null, pinch = null;
  cv.addEventListener('pointerdown', function (e) {
    if (!g) return;
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pointers.size === 1) drag = { x: e.offsetX, y: e.offsetY, ox: ui.view.ox, oy: ui.view.oy, moved: false };
    else if (pointers.size === 2) {
      var pts = Array.from(pointers.values());
      pinch = { d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, scale: ui.view.scale };
      drag = null;
    }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!g) return;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (pinch && pointers.size === 2) {
      var pts = Array.from(pointers.values());
      var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      zoomAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, (pinch.scale * d / pinch.d) / ui.view.scale);
      return;
    }
    if (drag) {
      var dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
      if (drag.moved || Math.hypot(dx, dy) > 5) {
        drag.moved = true;
        ui.view.ox = drag.ox + dx; ui.view.oy = drag.oy + dy;
        cv.style.cursor = 'grabbing';
        draw();
        return;
      }
    }
    var h = hitTest(e.offsetX, e.offsetY);
    var hv = h && h.t === 'star' ? h.id : null;
    cv.style.cursor = h ? 'pointer' : 'crosshair';
    if (hv !== ui.hover) { ui.hover = hv; draw(); }
  });
  function pointerEnd(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
    if (drag && !drag.moved && e.type === 'pointerup') mapClick(e.offsetX, e.offsetY);
    drag = null;
    cv.style.cursor = 'crosshair';
  }
  cv.addEventListener('pointerup', pointerEnd);
  cv.addEventListener('pointercancel', pointerEnd);
  cv.addEventListener('pointerleave', function () { if (ui.hover != null && !drag) { ui.hover = null; draw(); } });
  cv.addEventListener('wheel', function (e) {
    if (!g) return;
    e.preventDefault();
    zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  $('#zoom-in').addEventListener('click', function () { if (g) zoomAt(W / 2, H / 2, 1.3); });
  $('#zoom-out').addEventListener('click', function () { if (g) zoomAt(W / 2, H / 2, 1 / 1.3); });
  $('#zoom-fit').addEventListener('click', function () { if (g) { fit(); draw(); } });

  function mapClick(x, y) {
    var h = hitTest(x, y);
    var sel = ui.fleet != null ? fleetById(ui.fleet) : null;
    if (h && h.t === 'star' && sel && sel.owner === ME && h.id !== sel.star) {
      orderFleet(sel, h.id);
      return;
    }
    if (h && h.t === 'fleet') {
      var f = fleetById(h.id);
      selectFleet(f);
      return;
    }
    if (h && h.t === 'star') {
      ui.star = h.id;
      if (sel && sel.star !== h.id) ui.fleet = null;
      ui.tab = 'system';
    } else {
      ui.fleet = null;
      ui.star = null;
    }
    ui.scrapAsk = false;
    render();
  }

  function selectFleet(f) {
    if (!f) return;
    ui.fleet = f.id;
    ui.star = f.star != null ? f.star : ui.star;
    ui.send = {};
    ui.scrapAsk = false;
    var c = OL.countTypes(f.ships);
    for (var t in c) ui.send[t] = c[t];
    ui.tab = 'system';
    render();
  }

  function selectedShips(f) {
    var want = Object.assign({}, ui.send), out = [];
    f.ships.forEach(function (s) {
      var n = want[s.t] == null ? Infinity : want[s.t];
      if (n > 0) { out.push(s); want[s.t] = n - 1; }
    });
    return out;
  }

  function orderFleet(f, starId) {
    var ships = selectedShips(f), star = g.stars[starId];
    if (!ships.length) { toast('Keine Schiffe ausgewählt.', 'bad'); return; }
    if (!OL.inRange(g, ME, star)) {
      toast(star.name + ' liegt außer Reichweite (' + fmt(OL.supplyDist(g, ME, star)) + ' pc von der nächsten Kolonie, Reichweite ' + OL.mods(me()).range + ' pc). Antrieb erforschen oder Außenposten gründen.', 'bad');
      return;
    }
    var nf = OL.splitFleet(g, f, ships);
    var err = OL.orderMove(g, nf, starId);
    if (err) { toast(err, 'bad'); return; }
    ui.fleet = nf.id;
    var c = OL.countTypes(nf.ships); ui.send = {};
    for (var t in c) ui.send[t] = c[t];
    toast(typeSummary(nf.ships) + ' → ' + star.name + ' (' + OL.eta(g, nf, starId) + ' Runde' + (OL.eta(g, nf, starId) === 1 ? '' : 'n') + ')');
    save();
    render();
  }

  // ------------------------------------------------------------ Befehlsleiste
  function renderBar() {
    var p = me(), sum = OL.empireSummary(g, p);
    $('#empire').innerHTML = swatch(ME) + '<span>' + esc(p.name) + '</span>';
    var rf = p.research.field, cost = rf ? OL.techCost(p, rf) : 0;
    var resTxt = rf ? esc(OL.nextTech(p, rf).name) + ' <span class="d">' + Math.floor(p.research.progress) + '/' + cost + '</span>' : 'Ziel wählen!';
    var html = '' +
      stat('Runde', g.turn) +
      stat('Credits', Math.floor(p.credits) + ' <span class="d ' + (sum.income < 0 ? 'neg' : 'pos') + '">' + sign(sum.income) + '</span>', sum.income < 0 && p.credits < 30, 'c-cred') +
      stat('Nahrung', sign(sum.foodNet), sum.foodNet < 0, sum.foodNet < 0 ? 'neg' : 'c-food') +
      stat('Produktion', fmt(sum.prod), false, 'c-prod') +
      '<button class="stat' + (rf ? '' : ' alert pulse') + '" data-open="research"><span class="k">Forschung</span><span class="v c-res">' + resTxt + '</span><span class="d">+' + fmt(sum.res) + '</span></button>' +
      stat('Bevölkerung', fmt(sum.pop));
    $('#stats').innerHTML = html;
    var btn = $('#btn-end');
    btn.disabled = !!g.over;
    var offers = g.offers.filter(function (o) { return o.to === ME; }).length;
    $('#btn-diplo').textContent = 'Diplomatie' + (offers ? ' (' + offers + ')' : '');
    $('#btn-diplo').classList.toggle('on', offers > 0);
  }
  function stat(k, v, alert, cls) {
    return '<div class="stat' + (alert ? ' alert' : '') + '"><span class="k">' + k + '</span><span class="v ' + (cls || '') + '">' + v + '</span></div>';
  }

  // ------------------------------------------------------------ Konsole
  function render() {
    if (!g) return;
    if (ui.fleet != null && !fleetById(ui.fleet)) ui.fleet = null;
    renderBar();
    document.querySelectorAll('.tab').forEach(function (t) {
      t.setAttribute('aria-selected', t.dataset.tab === ui.tab ? 'true' : 'false');
      if (t.dataset.tab === 'log') t.innerHTML = 'Ereignisse' + (ui.logDot && ui.tab !== 'log' ? '<span class="dot"></span>' : '');
    });
    if (ui.tab === 'log') ui.logDot = false;
    var body = $('#side-body'), html = '';
    if (ui.tab === 'system') html = renderSystem();
    else if (ui.tab === 'empire') html = renderEmpire();
    else if (ui.tab === 'fleets') html = renderFleets();
    else html = renderLog();
    body.innerHTML = html;
    draw();
  }

  function renderSystem() {
    var out = '';
    var f = ui.fleet != null ? fleetById(ui.fleet) : null;
    if (f) out += renderFleetCard(f);
    if (ui.star == null) {
      if (!f) out += '<div class="card"><h3 class="sub">Kein System gewählt</h3><p class="muted small" style="margin:0">Klicken Sie einen Stern an, um Planet, Kolonie und Flotten zu sehen. Ihre Heimatwelt ist ' + starLink(me().capital != null ? me().capital : 0) + '.</p></div>';
      return out;
    }
    var s = g.stars[ui.star], p = me(), known = !!p.explored[s.id], c = s.colony;
    out += '<div class="stack"><div class="spread"><h2 class="title">' + esc(s.name) + '</h2><span class="faint small">' + OL.STAR_COLORS[s.color].name + 'er Stern</span></div>';
    if (known && c) out += '<div class="row small">' + swatch(c.owner) + '<span>' + esc(pname(c.owner)) + (c.outpost ? ' · Außenposten' : '') + '</span></div>';
    out += '</div>';
    if (!known) {
      out += '<div class="card"><p class="muted" style="margin:0">Unerforscht. Schicken Sie einen Späher, um den Planeten zu erkunden.</p><p class="small faint" style="margin:0">Entfernung zur nächsten Kolonie: ' + fmt(OL.supplyDist(g, ME, s)) + ' pc</p></div>';
      out += renderFleetsAt(s);
      return out;
    }
    var pl = s.planet, env = OL.ENV[pl.env], mp = OL.maxPop(g, p, s);
    out += '<div class="card"><h3 class="sub">Planet</h3><dl class="kv">' +
      '<dt>Umwelt</dt><dd><span style="color:' + env.color + '">●</span> ' + env.name + '</dd>' +
      '<dt>Größe</dt><dd>' + OL.SIZES[pl.size].name + '</dd>' +
      '<dt>Mineralien</dt><dd>' + OL.MINERALS[pl.min].name + ' (' + OL.MINERALS[pl.min].prod + ' je Arbeiter)</dd>' +
      '<dt>Nahrung</dt><dd>' + (env.food ? fmt(env.food) + ' je Bauer' : 'keine Landwirtschaft') + '</dd>' +
      '<dt>Max. Bevölkerung</dt><dd>' + (mp ? mp + ' Mio.' : 'unbewohnbar') + '</dd>' +
      (pl.special ? '<dt>Besonderheit</dt><dd class="c-cred">' + OL.SPECIALS[pl.special].name + '</dd>' : '') +
      (!c || c.owner !== ME ? '<dt>Entfernung</dt><dd>' + fmt(OL.supplyDist(g, ME, s)) + ' pc ' + (OL.inRange(g, ME, s) ? '<span class="pos">in Reichweite</span>' : '<span class="neg">außer Reichweite</span>') + '</dd>' : '') +
      '</dl>' + (pl.special ? '<p class="small faint" style="margin:0">' + OL.SPECIALS[pl.special].desc + '</p>' : '') + '</div>';
    if (s.guardian) {
      out += '<div class="card danger"><h3 class="sub" style="color:var(--bad)">Wächter von Orion</h3><p class="small" style="margin:0">Ein uralter Kampfkoloss: 12 Waffen mit Schaden 20, Schild 8, Struktur ' + s.guardian.hp + '/' + s.guardian.mhp + '. Er regeneriert 50 je Runde. Wer ihn besiegt, erbeutet Orioner-Technik und darf die beste Welt der Galaxis besiedeln.</p></div>';
    }
    if (c && c.owner === ME) out += c.outpost ? '<div class="card"><h3 class="sub">Außenposten</h3><p class="small muted" style="margin:0">Erweitert die Reichweite Ihrer Schiffe und sichert den Anspruch. ' + (env.pop ? 'Mit einem Kolonieschiff lässt er sich zur Kolonie ausbauen.' : '') + '</p></div>' : renderColony(s);
    else if (c) out += renderForeignColony(s);
    out += renderFleetsAt(s);
    return out;
  }

  function renderForeignColony(s) {
    var c = s.colony, vis = OL.visibility(g, ME).stars[s.id], rel = me().rel[c.owner];
    var o = '<div class="card"><div class="spread"><h3 class="sub">Fremde Kolonie</h3><span class="pill ' + (rel === 'war' ? 'war' : 'peace') + '">' + (rel === 'war' ? 'Krieg' : 'Frieden') + '</span></div><dl class="kv">' +
      '<dt>Besitzer</dt><dd>' + esc(pname(c.owner)) + '</dd>';
    if (vis) {
      o += '<dt>Bevölkerung</dt><dd>' + (c.outpost ? 'Außenposten' : Math.floor(c.pop) + ' Mio.') + '</dd>' +
        '<dt>Raketenbasis</dt><dd>' + (c.buildings.base ? (c.baseHp > 0 ? c.baseHp + ' Struktur' : '<span class="pos">zerstört</span>') : 'keine') + '</dd>' +
        (!c.outpost ? '<dt>Garnison</dt><dd>≈ ' + Math.round(OL.garrison(g, s)) + ' Truppen</dd>' : '');
    } else o += '<dt>Aufklärung</dt><dd class="faint">außerhalb der Scanner</dd>';
    return o + '</dl></div>';
  }

  function renderColony(s) {
    var c = s.colony, p = me(), o = OL.colonyOutput(g, s, p), mp = OL.maxPop(g, p, s), gr = OL.growth(g, p, s);
    var sum = OL.empireSummary(g, p);
    var html = '<div class="card accent"><div class="spread"><h3 class="sub">Kolonie</h3><span class="small muted">' + fmt(c.pop) + ' / ' + mp + ' Mio. <span class="' + (gr > 0 ? 'pos' : 'faint') + '">' + (gr > 0 ? sign(gr) : '') + '</span></span></div>' +
      '<div class="bar-meter pop"><i style="width:' + Math.min(100, c.pop / Math.max(1, mp) * 100) + '%"></i></div>';
    html += '<div class="jobs">' +
      jobRow('f', 'Bauern', c.jobs[0], o.perFarmer ? fmt(o.perFarmer) + ' Nahrung je Bauer' : 'hier wächst nichts') +
      jobRow('w', 'Arbeiter', c.jobs[1], fmt(o.perWorker) + ' Produktion je Arbeiter') +
      jobRow('s', 'Forscher', c.jobs[2], fmt(o.perSci) + ' Forschung je Forscher') + '</div>';
    html += '<div class="row"><button class="btn small" data-act="autojobs" title="Verteilt alle Bürger des Reichs nach den KI-Regeln 2 und 3, der Forscheranteil bleibt erhalten.">Reichsweit optimieren</button>' +
      (sum.foodNet < 0 ? '<span class="small neg">Reich hungert: ' + sign(sum.foodNet) + ' Nahrung</span>' : '<span class="small faint">Nahrung wird reichsweit geteilt (' + sign(sum.foodNet) + ')</span>') + '</div>';
    html += '<div class="out">' +
      '<div><b class="c-food">' + fmt(o.food) + '</b><span>Nahrung</span></div>' +
      '<div><b class="c-prod">' + fmt(o.prod) + '</b><span>Produktion</span></div>' +
      '<div><b class="c-res">' + fmt(o.res) + '</b><span>Forschung</span></div>' +
      '<div><b class="c-cred">' + sign(o.cred - o.upkeep) + '</b><span>Credits</span></div></div>';
    var bl = Object.keys(c.buildings).filter(function (b) { return c.buildings[b] && OL.BUILDINGS[b]; });
    html += '<div class="chips">' + (bl.length ? bl.map(function (b) {
      var extra = b === 'base' ? ' (' + c.baseHp + '/' + OL.baseMaxHp(p) + ')' : '';
      return '<span class="chip' + (b === 'capital' ? ' hi' : '') + '" title="' + esc(OL.BUILDINGS[b].desc) + '">' + OL.BUILDINGS[b].name + extra + '</span>';
    }).join('') : '<span class="small faint">Noch keine Gebäude</span>') + '</div></div>';

    // Bauliste
    html += '<div class="card"><div class="spread"><h3 class="sub">Bauliste</h3>';
    var price = OL.buyCost(s);
    if (price != null && price > 0) html += '<button class="btn small" data-act="buy" ' + (price > p.credits ? 'disabled' : '') + ' title="Rest sofort bezahlen (doppelter Preis, dreifach ohne Anzahlung)">Kaufen · ' + price + ' Cr</button>';
    html += '</div><div class="queue">';
    if (!c.queue.length) html += '<p class="small faint" style="margin:0">Leer. Ungenutzte Produktion wird zur Hälfte in Credits umgewandelt.</p>';
    c.queue.forEach(function (q, i) {
      var cost = OL.itemCost(q), fin = isFinite(cost);
      var prog = i === 0 && fin ? Math.min(c.progress, cost) : 0;
      var eta = fin ? (o.prod > 0 ? Math.max(1, Math.ceil((cost - prog - (i === 0 ? 0 : 0)) / o.prod)) + ' R' : '∞') : 'laufend';
      html += '<div class="qitem' + (i === 0 ? ' head' : '') + '"><div><b>' + OL.itemName(q) + '</b> <span class="small faint">' + (fin ? Math.floor(prog) + '/' + cost + ' · ' + eta : eta) + '</span></div>' +
        '<div class="qa">' + (i > 0 ? '<button class="btn small" data-act="qup" data-arg="' + i + '" aria-label="Nach oben">↑</button>' : '') +
        '<button class="btn small" data-act="qdel" data-arg="' + i + '" aria-label="Entfernen">✕</button></div>' +
        (i === 0 && fin ? '<div class="bar-meter"><i style="width:' + (prog / cost * 100) + '%"></i></div>' : '') + '</div>';
    });
    html += '</div>';
    var opts = OL.buildOptions(g, p, s);
    var groups = { building: [], ship: [], other: [] };
    opts.forEach(function (it) { (it.type === 'building' ? groups.building : it.type === 'ship' ? groups.ship : groups.other).push(it); });
    var optHtml = function (it) {
      var cost = OL.itemCost(it), desc = '', sub = '';
      if (it.type === 'building') desc = OL.BUILDINGS[it.id].desc;
      else if (it.type === 'ship') {
        var sh = OL.makeShip(p, it.id), H = OL.HULLS[it.id];
        desc = sh.sl ? sh.sl + ' Waffen à ' + sh.d + ' Schaden · Struktur ' + sh.hp + (sh.sh ? ' · Schild ' + sh.sh : '') : it.id === 'colony' ? 'Gründet eine Kolonie auf einem bewohnbaren Planeten.' : it.id === 'outpost' ? 'Außenposten auf jedem freien Planeten, erweitert die Reichweite.' : it.id === 'transport' ? 'Bringt ' + Math.round(OL.troopStrength(g, p, [sh])) + ' Truppen für Invasionen.' : 'Schnell, großer Scanner.';
        if (H.upkeep) desc += ' · Unterhalt ' + fmt(H.upkeep);
      } else if (it.type === 'terraform') desc = 'Macht aus ' + OL.ENV[s.planet.env].name + ' eine ' + OL.ENV[OL.ENV[s.planet.env].next].name + '-Welt.';
      else if (it.type === 'housing') desc = 'Produktion beschleunigt das Bevölkerungswachstum.';
      else if (it.type === 'trade') desc = 'Produktion wird zur Hälfte zu Credits.';
      sub = isFinite(cost) ? cost + ' PP · ' + (o.prod > 0 ? Math.max(1, Math.ceil(cost / o.prod)) + ' R' : '∞') : 'laufend';
      return '<button class="build-opt" data-act="enqueue" data-arg="' + it.type + ':' + it.id + '" title="' + esc(desc) + '"><b>' + OL.itemName(it) + '</b><span>' + sub + '</span><span>' + esc(desc) + '</span></button>';
    };
    html += '<details class="fold" open><summary><h3 class="sub">Gebäude</h3></summary><div class="build-grid" style="margin-top:8px">' + (groups.building.length ? groups.building.map(optHtml).join('') : '<span class="small faint">Alles gebaut, was die Forschung erlaubt.</span>') + '</div></details>';
    html += '<details class="fold" open><summary><h3 class="sub">Schiffe</h3></summary><div class="build-grid" style="margin-top:8px">' + groups.ship.map(optHtml).join('') + '</div></details>';
    html += '<details class="fold"><summary><h3 class="sub">Sonstiges</h3></summary><div class="build-grid" style="margin-top:8px">' + groups.other.map(optHtml).join('') + '</div></details>';
    html += '</div>';
    return html;
  }
  function jobRow(k, name, n, hint) {
    return '<div class="lbl"><b>' + name + '</b><span>' + hint + '</span></div>' +
      '<button class="btn icon small" data-act="job" data-arg="' + k + '-" aria-label="' + name + ' weniger">−</button>' +
      '<span class="n">' + n + '</span>' +
      '<button class="btn icon small" data-act="job" data-arg="' + k + '+" aria-label="' + name + ' mehr">+</button>';
  }

  function renderFleetsAt(s) {
    var vis = OL.visibility(g, ME);
    var fl = g.fleets.filter(function (f) { return f.star === s.id && vis.fleets[f.id]; });
    var inbound = g.fleets.filter(function (f) { return f.dest === s.id && vis.fleets[f.id]; });
    if (!fl.length && !inbound.length) return '';
    var html = '<div class="stack"><h3 class="sub">Flotten im System</h3>';
    fl.concat(inbound).forEach(function (f) {
      var armed = OL.fleetArmed(f), where = f.star === s.id ? 'im Orbit' : 'Ankunft in ' + OL.eta(g, f, s.id) + ' R';
      html += '<button class="fleet-row' + (f.id === ui.fleet ? ' sel' : '') + '" data-act="selfleet" data-arg="' + f.id + '">' +
        '<span class="row">' + swatch(f.owner) + '<b>' + esc(f.owner === ME ? 'Eigene Flotte' : pname(f.owner)) + '</b></span><span class="small faint">' + where + '</span>' +
        '<span class="small muted" style="grid-column:1/-1">' + typeSummary(f.ships) + (armed ? '' : ' · unbewaffnet') + '</span></button>';
    });
    return html + '</div>';
  }

  function renderFleetCard(f) {
    var p = me(), mine = f.owner === ME;
    var html = '<div class="card accent"><div class="spread"><h3 class="sub">' + (mine ? 'Ausgewählte Flotte' : 'Flotte von ' + esc(pname(f.owner))) + '</h3><button class="btn small" data-act="unselfleet">Abwählen</button></div>';
    html += '<p class="small muted" style="margin:0">' + (f.star != null ? 'Im Orbit von ' + starLink(f.star) : 'Unterwegs nach ' + starLink(f.dest) + ', Ankunft in ' + OL.eta(g, f, f.dest) + ' Runde(n)') + ' · Tempo ' + OL.fleetSpeed(f) + ' pc/Runde</p>';
    var groups = {};
    f.ships.forEach(function (s) { (groups[s.t] = groups[s.t] || []).push(s); });
    html += '<div class="ship-grid">';
    Object.keys(groups).forEach(function (t) {
      var list = groups[t], hp = 0, mhp = 0, s0 = list[0];
      list.forEach(function (s) { hp += s.hp; mhp += s.mhp; });
      var info = s0.sl ? s0.sl + '×' + s0.d + ' Schaden · Struktur ' + s0.mhp + (s0.sh ? ' · Schild ' + s0.sh : '') : (s0.tr ? Math.round(OL.troopStrength(g, g.players[f.owner], [s0])) + ' Truppen' : 'unbewaffnet');
      html += '<div><b>' + list.length + '× ' + OL.HULLS[t].name + '</b><div class="small faint">' + info + (hp < mhp ? ' · <span class="neg">' + Math.round(hp / mhp * 100) + ' % intakt</span>' : '') + '</div></div>';
      if (mine) {
        var n = Math.min(list.length, ui.send[t] == null ? list.length : ui.send[t]);
        html += '<div class="stepper"><button class="btn icon small" data-act="send" data-arg="' + t + ':-1" aria-label="Weniger senden">−</button><span class="n">' + n + '/' + list.length + '</span><button class="btn icon small" data-act="send" data-arg="' + t + ':1" aria-label="Mehr senden">+</button></div>';
      } else html += '<span></span>';
    });
    html += '</div>';
    if (mine) {
      var acts = [];
      var cCol = OL.canColonize(g, f, 'colony'), cOut = OL.canColonize(g, f, 'outpost'), cInv = OL.canInvade(g, f);
      if (f.ships.some(function (s) { return s.t === 'colony'; })) acts.push(cCol ? '<span class="small faint">Kolonie: ' + esc(cCol) + '</span>' : '<button class="btn primary small" data-act="colonize" data-arg="colony">Kolonie gründen</button>');
      if (f.ships.some(function (s) { return s.t === 'outpost'; })) acts.push(cOut ? '<span class="small faint">Außenposten: ' + esc(cOut) + '</span>' : '<button class="btn primary small" data-act="colonize" data-arg="outpost">Außenposten errichten</button>');
      if (f.ships.some(function (s) { return s.tr > 0; }) && f.star != null && g.stars[f.star].colony && g.stars[f.star].colony.owner !== ME) {
        var troops = OL.troopStrength(g, p, f.ships.filter(function (s) { return s.tr > 0; }));
        var gar = g.stars[f.star].colony.outpost ? 0 : OL.garrison(g, g.stars[f.star]);
        acts.push(cInv ? '<span class="small faint">Invasion: ' + esc(cInv) + '</span>' : '<button class="btn primary small" data-act="invade">Invasion (' + Math.round(troops) + ' gegen ≈' + Math.round(gar) + ')</button>');
      }
      if (f.dest != null) acts.push('<button class="btn small" data-act="stop">Kurs abbrechen</button>');
      if (ui.scrapAsk) acts.push('<span class="small">Ausgewählte Schiffe verschrotten?</span><button class="btn danger small" data-act="scrap-yes">Ja, verschrotten</button><button class="btn small" data-act="scrap-no">Nein</button>');
      else acts.push('<button class="btn ghost small" data-act="scrap">Verschrotten</button>');
      html += '<div class="row">' + acts.join('') + '</div>';
      html += '<p class="small faint" style="margin:0">Ziel auf der Karte anklicken. Mit − und + senden Sie nur einen Teil der Flotte.</p>';
    }
    return html + '</div>';
  }

  function renderEmpire() {
    var p = me(), sum = OL.empireSummary(g, p), m = OL.mods(p);
    var html = '<div class="card accent"><h3 class="sub">Reichsübersicht</h3><dl class="kv">' +
      '<dt>Kolonien / Außenposten</dt><dd>' + sum.colonies + ' / ' + sum.outposts + '</dd>' +
      '<dt>Bevölkerung</dt><dd>' + fmt(sum.pop) + ' Mio.</dd>' +
      '<dt>Nahrung</dt><dd class="' + (sum.foodNet < 0 ? 'neg' : 'c-food') + '">' + fmt(sum.food) + ' für ' + sum.cons + ' (' + sign(sum.foodNet) + ')</dd>' +
      '<dt>Credits aus Kolonien</dt><dd class="c-cred">' + sign(sum.cred) + '</dd>' +
      '<dt>Unterhalt Gebäude</dt><dd class="neg">−' + fmt(sum.bUpkeep) + '</dd>' +
      '<dt>Unterhalt Schiffe</dt><dd class="neg">−' + fmt(sum.sUpkeep) + '</dd>' +
      '<dt>Saldo je Runde</dt><dd class="' + (sum.income < 0 ? 'neg' : 'pos') + '">' + sign(sum.income) + '</dd>' +
      '<dt>Reichweite / Tempo</dt><dd>' + m.range + ' pc / ' + m.speed + ' pc</dd>' +
      '<dt>Waffe / Schild</dt><dd>' + OL.WEAPONS[m.weapon].name + ' / ' + (m.shield ? 'Klasse ' + m.shield : 'keiner') + '</dd>' +
      '<dt>Punkte</dt><dd>' + OL.score(g, p) + '</dd></dl></div>';
    var cols = OL.coloniesOf(g, ME, true).sort(function (a, b) { return b.colony.pop - a.colony.pop; });
    html += '<div class="card"><h3 class="sub">Kolonien</h3><div class="scroll-x"><table class="tbl"><thead><tr><th>Name</th><th class="r">Bev.</th><th class="r">Prod.</th><th class="r">Forsch.</th><th>Baut</th></tr></thead><tbody>';
    cols.forEach(function (s) {
      var c = s.colony, o = OL.colonyOutput(g, s, p);
      html += '<tr class="click" data-act="selstar" data-arg="' + s.id + '"><td>' + esc(s.name) + (c.buildings.capital ? ' <span class="faint">★</span>' : '') + '</td>' +
        (c.outpost ? '<td class="r faint" colspan="3">Außenposten</td><td></td>' :
          '<td class="r">' + Math.floor(c.pop) + '/' + OL.maxPop(g, p, s) + '</td><td class="r c-prod">' + fmt(o.prod) + '</td><td class="r c-res">' + fmt(o.res) + '</td><td class="small">' + (c.queue[0] ? OL.itemName(c.queue[0]) : '<span class="faint">—</span>') + '</td>') + '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  function renderFleets() {
    var fl = OL.fleetsOf(g, ME);
    if (!fl.length) return '<div class="card"><p class="muted" style="margin:0">Sie haben keine Schiffe. Bauen Sie welche in einer Kolonie.</p></div>';
    var html = '<div class="stack"><h3 class="sub">Eigene Flotten</h3>';
    fl.forEach(function (f) {
      var where = f.star != null ? 'bei ' + g.stars[f.star].name : '→ ' + g.stars[f.dest].name + ' (' + OL.eta(g, f, f.dest) + ' R)';
      html += '<button class="fleet-row' + (f.id === ui.fleet ? ' sel' : '') + '" data-act="selfleet" data-arg="' + f.id + '"><b>' + esc(where) + '</b><span class="small faint">' + f.ships.length + ' Schiff' + (f.ships.length === 1 ? '' : 'e') + '</span><span class="small muted" style="grid-column:1/-1">' + typeSummary(f.ships) + '</span></button>';
    });
    return html + '</div>';
  }

  function renderLog() {
    var items = g.log.filter(function (e) { return e.p === ME || e.p === -1; }).slice(-160).reverse();
    if (!items.length) return '<p class="muted">Noch keine Ereignisse.</p>';
    var html = '<div class="log">', lastT = null;
    items.forEach(function (e) {
      if (e.t !== lastT) { html += '<div class="log-turn">Runde ' + e.t + '</div>'; lastT = e.t; }
      var extra = '';
      if (e.star != null) extra += ' ' + starLink(e.star);
      if (e.rep != null) extra += ' · <button class="link" data-act="report" data-arg="' + e.rep + '">Kampfbericht</button>';
      html += '<div class="log-e ' + e.kind + '">' + esc(e.msg) + (extra ? '<span class="small">' + extra + '</span>' : '') + '</div>';
    });
    return html + '</div>';
  }

  // ------------------------------------------------------------ Dialoge
  function openModal(kind, arg) {
    ui.modal = { kind: kind, arg: arg };
    renderModal();
  }
  function closeModal() {
    if (ui.modal && ui.modal.kind === 'intro' && !g) return;
    ui.modal = null;
    $('#modal-back').hidden = true;
    render();
  }
  function renderModal() {
    var m = ui.modal, el = $('#modal'), back = $('#modal-back');
    if (!m) { back.hidden = true; return; }
    var html = '', narrow = false;
    if (m.kind === 'intro') html = modalIntro();
    else if (m.kind === 'research') html = modalResearch();
    else if (m.kind === 'diplo') html = modalDiplo();
    else if (m.kind === 'rules') html = modalRules();
    else if (m.kind === 'menu') { html = modalMenu(); narrow = true; }
    else if (m.kind === 'help') html = modalHelp();
    else if (m.kind === 'report') { html = modalReport(m.arg); narrow = true; }
    else if (m.kind === 'over') { html = modalOver(); narrow = true; }
    else if (m.kind === 'welcome') { html = modalWelcome(); narrow = true; }
    el.className = 'modal' + (narrow ? ' narrow' : '') + (m.kind === 'intro' ? ' intro' : '');
    el.innerHTML = html;
    back.hidden = false;
  }
  function head(title, sub, closable) {
    return '<div class="modal-head"><div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (closable === false ? '' : '<button class="btn small" data-act="close">Schließen</button>') + '</div>';
  }

  function modalIntro() {
    var I = ui.intro;
    var html = '<div class="modal-head"><div><h1>Orion Lite</h1><p class="lede">Ein kleines Weltraum-Strategiespiel in Runden. Besiedeln Sie Planeten, erforschen Sie neue Technik und schlagen Sie Computergegner, die nach 15 Faustregeln aus Master of Orion 2 spielen.</p></div>' + (g ? '<button class="btn small" data-act="close">Zurück</button>' : '') + '</div>';
    html += '<div class="stack"><h3 class="sub">Ihr Volk</h3><div class="races">';
    Object.keys(OL.RACES).forEach(function (r) {
      var R = OL.RACES[r];
      html += '<button class="race" data-act="intro-race" data-arg="' + r + '" aria-pressed="' + (I.race === r) + '"><b><span class="swatch" style="background:' + R.color + '"></span>' + R.name + '</b><span>' + R.desc + '</span><span class="faint">KI-Persönlichkeit: ' + OL.PERSONALITIES[R.personality].name + '</span></button>';
    });
    html += '</div></div><div class="opts">';
    html += '<label><span class="lab">Name Ihres Reichs</span><input type="text" id="intro-name" maxlength="32" value="' + esc(I.name || defaultName(I.race)) + '"></label>';
    html += '<div class="stack"><span class="lab" style="font:600 11px/1 var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)">Galaxis</span><div class="seg">' +
      Object.keys(OL.GALAXY).map(function (k) { return '<button data-act="intro-opt" data-arg="galaxy:' + k + '" aria-pressed="' + (I.galaxy === k) + '">' + OL.GALAXY[k].name + ' (' + OL.GALAXY[k].stars + ')</button>'; }).join('') + '</div></div>';
    html += '<div class="stack"><span class="lab" style="font:600 11px/1 var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)">Gegner</span><div class="seg">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button data-act="intro-opt" data-arg="opponents:' + n + '" aria-pressed="' + (I.opponents === n) + '">' + n + '</button>'; }).join('') + '</div></div>';
    html += '<div class="stack"><span class="lab" style="font:600 11px/1 var(--font-display);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)">Schwierigkeit</span><div class="seg">' +
      Object.keys(OL.DIFFICULTY).map(function (k) { return '<button data-act="intro-opt" data-arg="difficulty:' + k + '" aria-pressed="' + (I.difficulty === k) + '">' + OL.DIFFICULTY[k].name + '</button>'; }).join('') + '</div>' +
      '<span class="small faint">' + ({ leicht: 'KI mit 80 % Produktion, greift zögerlich an.', normal: 'Gleiche Bedingungen für alle.', schwer: 'KI mit 130 % Produktion und Forschung, aggressiver.' })[I.difficulty] + '</span></div>';
    html += '</div><div class="row"><button class="btn primary" data-act="start">Neues Spiel starten</button>' + (hasSave() && !g ? '<button class="btn" data-act="continue">Gespeichertes Spiel fortsetzen</button>' : '') + '</div>';
    return html;
  }
  function defaultName(race) {
    return { menschen: 'Terranische Föderation', psilonen: 'Psilonische Akademie', sakkra: 'Sakkra-Hegemonie', klackonen: 'Große Klackonen-Kolonie', bulrathi: 'Bulrathi-Horde', mrrshan: 'Mrrshan-Königreich' }[race];
  }

  function modalWelcome() {
    var home = g.stars[me().capital];
    return head('Willkommen, Imperator', 'Ihr Reich beginnt auf ' + esc(home.name) + '.') +
      '<div class="stack small"><p style="margin:0">Sie starten mit einer Heimatwelt, einem Kolonieschiff, zwei Spähern und zwei Fregatten. So geht es los:</p>' +
      '<ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">' +
      '<li>Wählen Sie ein <b>Forschungsziel</b>. Konstruktion bringt die Automatisierte Fabrik.</li>' +
      '<li>Klicken Sie die <b>Flotte</b> neben ' + esc(home.name) + ' an, stellen Sie mit − und + ein, welche Schiffe fliegen, und klicken Sie einen <b>Zielstern</b> an. Späher erkunden, das Kolonieschiff sucht eine gute Welt.</li>' +
      '<li>Ist das Kolonieschiff angekommen, drücken Sie <b>Kolonie gründen</b>.</li>' +
      '<li>In der Kolonie verteilen Sie <b>Bauern, Arbeiter und Forscher</b> und füllen die <b>Bauliste</b>.</li>' +
      '<li>Mit <b>Runde beenden</b> (oder Enter) handeln alle Reiche gleichzeitig.</li></ol>' +
      '<p style="margin:0" class="muted">Unter <b>KI-Regeln</b> sehen Sie jederzeit, nach welchen Faustregeln die Gegner spielen und was sie gerade entschieden haben.</p></div>' +
      '<div class="row"><button class="btn primary" data-act="open" data-arg="research">Forschung wählen</button><button class="btn" data-act="close">Zur Karte</button></div>';
  }

  function modalResearch() {
    var p = me(), sum = OL.empireSummary(g, p);
    var html = head('Forschung', 'Ihr Reich erzeugt ' + fmt(sum.res) + ' Forschungspunkte je Runde. Wählen Sie das nächste Ziel.');
    html += '<div class="grid-fields">';
    OL.FIELDS.forEach(function (f) {
      var lvl = p.tech[f.id], next = f.levels[lvl], cur = p.research.field === f.id;
      var cost = OL.techCost(p, f.id), prog = cur ? p.research.progress : 0;
      var eta = isFinite(cost) && sum.res > 0 ? Math.max(1, Math.ceil((cost - (cur ? prog : p.research.field ? 0 : p.research.progress)) / sum.res)) : null;
      var have = lvl ? f.levels[lvl - 1].name : (f.base || '—');
      html += '<button class="card field' + (cur ? ' cur' : '') + '" data-act="research" data-arg="' + f.id + '"' + (next ? '' : ' disabled') + '>' +
        '<div class="spread"><h3 class="sub">' + f.name + '</h3><span class="small faint">Stufe ' + lvl + '/' + f.levels.length + '</span></div>' +
        '<div class="lvls">' + f.levels.map(function (_, i) { return '<i class="' + (i < lvl ? 'done' : '') + '"></i>'; }).join('') + '</div>' +
        '<span class="small faint">Aktuell: ' + esc(have) + '</span>' +
        (next ? '<div><b>' + esc(next.name) + '</b><div class="small muted">' + esc(next.desc) + '</div></div>' +
          '<span class="small">' + (cur ? '<span class="c-res">In Arbeit: ' + Math.floor(prog) + '/' + cost + '</span>' : cost + ' Punkte') + (eta ? ' · ca. ' + eta + ' R' : '') + '</span>'
          : '<b class="pos">Vollständig erforscht</b>') + '</button>';
    });
    html += '</div>';
    if (!p.research.field && p.research.progress > 0) html += '<p class="small faint" style="margin:0">' + Math.floor(p.research.progress) + ' übrige Punkte fließen in das nächste Ziel.</p>';
    return html;
  }

  function strengthWord(r) {
    if (r < 0.5) return '<span class="pos">deutlich schwächer</span>';
    if (r < 0.8) return '<span class="pos">schwächer</span>';
    if (r < 1.25) return 'ebenbürtig';
    if (r < 2) return '<span class="neg">stärker</span>';
    return '<span class="neg">deutlich stärker</span>';
  }
  function modalDiplo() {
    var p = me(), myPow = Math.max(1, OL.militaryPower(g, ME));
    var html = head('Diplomatie', 'Krieg herrscht nur, wenn er erklärt wurde. Nach einem Friedensschluss gilt 20 Runden lang ein Vertrag.');
    var offers = g.offers.filter(function (o) { return o.to === ME; });
    if (offers.length) {
      html += '<div class="stack">';
      offers.forEach(function (o) {
        html += '<div class="card accent"><div class="spread"><span class="row">' + swatch(o.from) + '<b>' + esc(pname(o.from)) + '</b> bietet Frieden an.</span><span class="row"><button class="btn primary small" data-act="offer-yes" data-arg="' + o.from + '">Annehmen</button><button class="btn small" data-act="offer-no" data-arg="' + o.from + '">Ablehnen</button></span></div></div>';
      });
      html += '</div>';
    }
    html += '<div class="scroll-x"><table class="tbl"><thead><tr><th>Reich</th><th>Volk</th><th>Status</th><th>Flotte</th><th>Kolonien</th><th></th></tr></thead><tbody>';
    g.players.forEach(function (q) {
      if (q.id === ME) return;
      var contact = p.contact[q.id], rel = p.rel[q.id];
      var status = !q.alive ? '<span class="pill none">Vernichtet</span>' : !contact ? '<span class="pill none">Kein Kontakt</span>' : rel === 'war' ? '<span class="pill war">Krieg</span>' : '<span class="pill peace">Frieden</span>';
      var treaty = (p.treaty[q.id] || 0) > g.turn ? ' <span class="small faint">Vertrag noch ' + (p.treaty[q.id] - g.turn) + ' R</span>' : '';
      var act = '';
      if (q.alive && contact) {
        act = rel === 'war' ? '<button class="btn small" data-act="peace" data-arg="' + q.id + '">Frieden anbieten</button>' : '<button class="btn danger small" data-act="war" data-arg="' + q.id + '">Krieg erklären</button>';
      }
      html += '<tr><td><span class="row">' + swatch(q.id) + esc(q.name) + '</span></td><td>' + OL.RACES[q.race].name + '<div class="small faint">' + OL.PERSONALITIES[q.ai ? q.ai.personality : OL.RACES[q.race].personality].name + '</div></td><td>' + status + treaty + '</td>' +
        '<td>' + (q.alive && contact ? strengthWord(OL.militaryPower(g, q.id) / myPow) : '<span class="faint">?</span>') + '</td>' +
        '<td class="r">' + (q.alive && contact ? OL.coloniesOf(g, q.id, true).filter(function (s) { return p.explored[s.id]; }).length + ' bekannt' : '') + '</td><td>' + act + '</td></tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function modalRules() {
    var ais = g.players.filter(function (q) { return q.ai; });
    if (ui.rulesAI == null || !g.players[ui.rulesAI] || !g.players[ui.rulesAI].ai) ui.rulesAI = ais.length ? ais[0].id : null;
    var total = {};
    ais.forEach(function (q) { for (var r in q.ai.ruleCount) total[r] = (total[r] || 0) + q.ai.ruleCount[r]; });
    var html = head('Die Faustregeln der KI', 'Die Computergegner spielen ausschließlich nach diesen 15 Regeln aus Master of Orion 2. Jede Entscheidung wird mit der Regel protokolliert, die sie ausgelöst hat.');
    html += '<div class="rule-list">';
    OL.RULES.forEach(function (r) {
      html += '<div class="card"><div class="spread"><span class="rule-no">' + r.id + '</span><span class="small faint">' + (total[r.id] || 0) + '× angewandt</span></div><b>' + esc(r.title) + '</b><span class="small muted">' + esc(r.text) + '</span></div>';
    });
    html += '</div>';
    if (ais.length) {
      var q = g.players[ui.rulesAI];
      html += '<div class="stack"><div class="spread"><h3 class="sub">Entscheidungsprotokoll (Spoiler)</h3><div class="seg">' + ais.map(function (a) {
        return '<button data-act="rules-ai" data-arg="' + a.id + '" aria-pressed="' + (a.id === ui.rulesAI) + '"><span class="swatch" style="background:' + a.color + '"></span> ' + esc(OL.RACES[a.race].name) + '</button>';
      }).join('') + '</div></div>';
      html += '<p class="small faint" style="margin:0">' + esc(q.name) + ' · Persönlichkeit: ' + OL.PERSONALITIES[q.ai.personality].name + (q.alive ? '' : ' · vernichtet') + '</p><div class="log">';
      q.ai.log.slice(-80).reverse().forEach(function (e) {
        html += '<div class="log-e"><span class="row" style="gap:8px;align-items:baseline"><span class="faint small">R' + e.t + '</span><span class="badge" title="' + esc(OL.RULES[e.r - 1].title) + '">Regel ' + e.r + '</span><span>' + esc(e.msg) + '</span></span></div>';
      });
      html += '</div></div>';
    }
    return html;
  }

  function modalMenu() {
    var s = g.settings;
    return head('Menü') + '<div class="stack"><button class="btn" data-act="open" data-arg="help">Kurzanleitung</button><button class="btn" data-act="newgame">Neues Spiel</button></div>' +
      '<dl class="kv small"><dt>Galaxis</dt><dd>' + OL.GALAXY[s.galaxy].name + ', ' + g.stars.length + ' Sterne</dd><dt>Gegner</dt><dd>' + (g.players.length - 1) + '</dd><dt>Schwierigkeit</dt><dd>' + OL.DIFFICULTY[s.difficulty].name + '</dd><dt>Startwert</dt><dd>' + g.seed + '</dd></dl>' +
      '<p class="small faint" style="margin:0">Der Spielstand wird nach jeder Runde automatisch in diesem Browser gespeichert.</p>';
  }

  function modalHelp() {
    return head('Kurzanleitung') + '<div class="rule-list small">' +
      helpCard('Ziel', 'Vernichten Sie alle Rivalen oder vereinen Sie zwei Drittel aller Bewohner der Galaxis in Ihrem Reich (ab Runde 50). Dann ernennt Sie der Galaktische Rat zum Imperator.') +
      helpCard('Bürger', 'Jede Million Einwohner ist ein Bürger: Bauern erzeugen Nahrung, Arbeiter Produktion, Forscher Forschung. Nahrung wird reichsweit geteilt. Fehlt sie, wird für 2 Credits je Einheit importiert, ohne Geld hungert das Volk.') +
      helpCard('Produktion', 'Jede Kolonie arbeitet ihre Bauliste ab. Kaufen kostet das Doppelte des Rests, ohne Anzahlung das Dreifache. Leere Listen erzeugen Credits.') +
      helpCard('Reichweite', 'Schiffe fliegen nur zu Sternen in Reichweite der nächsten eigenen Kolonie oder des nächsten Außenpostens. Antrieb und Außenposten erweitern sie.') +
      helpCard('Raumkampf', 'Treffen Kriegsparteien in einem System aufeinander, wird automatisch gekämpft: bis zu 10 Runden, Schilde ziehen von jedem Treffer Schaden ab. Veraltete Waffen prallen an guten Schilden ab.') +
      helpCard('Invasion', 'Sind feindliche Kriegsschiffe im Orbit vertrieben und die Raketenbasis zerstört, landen Truppentransporter. Ihre Truppen müssen die Garnison übertreffen (mit etwas Glück).') +
      helpCard('Orion', 'Im Zentrum wacht ein uralter Wächter. Wer ihn besiegt, erhält zwei Technologien und darf die reichste Welt der Galaxis besiedeln.') +
      helpCard('Steuerung', 'Karte ziehen zum Verschieben, Mausrad oder Knöpfe zum Zoomen. Enter beendet die Runde, Esc schließt Dialoge und hebt die Auswahl auf.') +
      '</div>';
  }
  function helpCard(t, x) { return '<div class="card"><b>' + t + '</b><span class="muted">' + x + '</span></div>'; }

  function modalReport(id) {
    var rep = g.reports.find(function (r) { return r.id === +id; });
    if (!rep) return head('Kampfbericht') + '<p class="muted">Dieser Bericht ist nicht mehr verfügbar.</p>';
    var html = head('Schlacht bei ' + esc(rep.starName), 'Runde ' + rep.turn + ' · ' + rep.rounds + ' Gefechtsrunde' + (rep.rounds === 1 ? '' : 'n'));
    rep.sides.forEach(function (sd) {
      html += '<div class="card' + (sd.survived ? '' : ' danger') + '"><div class="spread"><span class="row">' + swatch(sd.owner) + '<b>' + esc(pname(sd.owner)) + '</b></span><span class="small ' + (sd.survived ? 'pos' : 'neg') + '">' + (sd.survived ? 'hält das Feld' : 'vernichtet') + '</span></div><table class="tbl"><tbody>';
      Object.keys(sd.before).forEach(function (k) {
        var lost = sd.lost[k] || 0;
        html += '<tr><td>' + esc(k) + '</td><td class="r">' + sd.before[k] + '</td><td class="r ' + (lost ? 'neg' : 'faint') + '">' + (lost ? '−' + lost : '0') + '</td></tr>';
      });
      html += '</tbody></table><span class="small faint">Verursachter Schaden: ' + sd.dealt + '</span></div>';
    });
    if (rep.guardianKilled) html += '<p class="pos" style="margin:0">Der Wächter von Orion ist gefallen.</p>';
    return html;
  }

  function modalOver() {
    var o = g.over, win = o.win;
    var text = o.reason === 'conquest' ? 'Alle Rivalen sind vernichtet. Die Galaxis gehört Ihnen.'
      : o.reason === 'dominance' ? (win ? 'Zwei Drittel aller Bewohner der Galaxis leben in Ihrem Reich. Der Galaktische Rat ernennt Sie zum Imperator.' : esc(pname(o.winner)) + ' vereint zwei Drittel der Galaxis und wird zum Imperator ernannt.')
        : 'Ihr letzter Planet ist gefallen. Ihr Volk lebt nur noch in den Geschichtsbüchern der Sieger.';
    var rows = g.players.map(function (q) { return { q: q, s: OL.score(g, q) }; }).sort(function (a, b) { return b.s - a.s; });
    return head(win ? 'Sieg!' : 'Niederlage', 'Runde ' + o.turn, false) + '<p style="margin:0">' + text + '</p>' +
      '<table class="tbl"><thead><tr><th>Reich</th><th class="r">Punkte</th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr><td><span class="row">' + swatch(r.q.id) + esc(r.q.name) + (r.q.alive ? '' : ' <span class="faint">†</span>') + '</span></td><td class="r">' + r.s + '</td></tr>';
      }).join('') + '</tbody></table><div class="row"><button class="btn primary" data-act="newgame">Neues Spiel</button><button class="btn" data-act="close">Karte ansehen</button></div>';
  }

  // ------------------------------------------------------------ Meldungen
  function toast(msg, kind, html) {
    var el = document.createElement('div');
    el.className = 'toast' + (kind === 'bad' ? ' bad' : '');
    if (html) el.innerHTML = msg; else el.textContent = msg;
    var box = $('#toasts');
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5000);
  }

  // ------------------------------------------------------------ Runde beenden
  function endTurn() {
    if (!g || g.over) return;
    var last = g.log[g.log.length - 1], p = me();
    var hadField = !!p.research.field;
    OL.endTurn(g);
    var idx = last ? g.log.lastIndexOf(last) : -1;
    var fresh = g.log.slice(idx + 1).filter(function (e) { return e.p === ME || e.p === -1; });
    if (fresh.length) ui.logDot = true;
    save();
    render();
    var important = fresh.filter(function (e) { return ['combat', 'bad', 'war', 'major', 'good', 'tech', 'diplo'].indexOf(e.kind) >= 0; });
    toast('Runde ' + g.turn + ' · ' + fresh.length + ' Meldung' + (fresh.length === 1 ? '' : 'en'));
    important.slice(-3).forEach(function (e) {
      var extra = e.rep != null ? ' <button class="link" data-act="report" data-arg="' + e.rep + '">Bericht</button>' : '';
      toast(esc(e.msg) + extra, e.kind === 'bad' || e.kind === 'war' ? 'bad' : '', true);
    });
    if (g.over) openModal('over');
    else if (hadField && !p.research.field) openModal('research');
    else if (g.offers.some(function (o) { return o.to === ME; })) openModal('diplo');
  }

  // ------------------------------------------------------------ Aktionen
  function act(name, arg, el) {
    var p = g && me(), s = g && ui.star != null ? g.stars[ui.star] : null, f = g && ui.fleet != null ? fleetById(ui.fleet) : null;
    switch (name) {
      case 'close': closeModal(); return;
      case 'open': openModal(arg); return;
      case 'selstar': {
        ui.star = +arg; ui.tab = 'system'; ui.fleet = null;
        var st = g.stars[+arg];
        if (ui.view && (sx(st.x) < 40 || sx(st.x) > W - 40 || sy(st.y) < 40 || sy(st.y) > H - 40)) { ui.view.ox += W / 2 - sx(st.x); ui.view.oy += H / 2 - sy(st.y); }
        if (ui.modal) { ui.modal = null; $('#modal-back').hidden = true; }
        render(); return;
      }
      case 'selfleet': selectFleet(fleetById(+arg)); return;
      case 'unselfleet': ui.fleet = null; render(); return;
      case 'job': {
        if (!s || !s.colony || s.colony.owner !== ME) return;
        var c = s.colony, k = { f: 0, w: 1, s: 2 }[arg[0]], plus = arg[1] === '+';
        var from = plus ? (k === 1 ? [2, 0] : [1, k === 0 ? 2 : 0]) : [k === 1 ? 2 : 1];
        if (plus) { for (var i = 0; i < from.length; i++) if (c.jobs[from[i]] > 0) { c.jobs[from[i]]--; c.jobs[k]++; break; } }
        else if (c.jobs[k] > 0) { c.jobs[k]--; c.jobs[from[0]]++; }
        break;
      }
      case 'autojobs': OL.AI.autoJobs(g, p); toast('Bürger nach Regel 2 und 3 verteilt.'); break;
      case 'enqueue': {
        if (!s || !s.colony) return;
        var parts = arg.split(':');
        OL.enqueue(g, s, { type: parts[0], id: parts[1] });
        break;
      }
      case 'qdel': s.colony.queue.splice(+arg, 1); break;
      case 'qup': { var q = s.colony.queue, i2 = +arg; var t = q[i2]; q[i2] = q[i2 - 1]; q[i2 - 1] = t; break; }
      case 'buy': {
        var price = OL.buyCost(s);
        if (OL.buy(g, p, s)) toast(OL.itemName(s.colony.queue[0]) + ' gekauft (' + price + ' Credits). Fertig nach dieser Runde.');
        break;
      }
      case 'send': {
        if (!f) return;
        var a = arg.split(':'), cnt = OL.countTypes(f.ships)[a[0]] || 0;
        var cur = ui.send[a[0]] == null ? cnt : ui.send[a[0]];
        ui.send[a[0]] = Math.max(0, Math.min(cnt, cur + +a[1]));
        break;
      }
      case 'stop': if (f && f.dest != null) { if (f.star == null) { toast('Die Flotte kehrt um und fliegt zur nächsten Kolonie.'); var home = nearestOwn(f); if (home) f.dest = home.id; } else f.dest = null; } break;
      case 'colonize': {
        var err = OL.colonize(g, f, arg);
        if (err) toast(err, 'bad'); else { toast(arg === 'colony' ? 'Kolonie gegründet!' : 'Außenposten errichtet!'); if (!fleetById(ui.fleet)) ui.fleet = null; }
        break;
      }
      case 'invade': {
        var res = OL.invade(g, f);
        toast(res.msg, res.ok ? '' : 'bad');
        if (!fleetById(ui.fleet)) ui.fleet = null;
        break;
      }
      case 'scrap': ui.scrapAsk = true; break;
      case 'scrap-no': ui.scrapAsk = false; break;
      case 'scrap-yes': {
        var gain = OL.scrapShips(g, f, selectedShips(f));
        ui.scrapAsk = false;
        if (!fleetById(ui.fleet)) ui.fleet = null;
        toast('Verschrottet: +' + gain + ' Credits.');
        break;
      }
      case 'report': openModal('report', arg); return;
      case 'research': p.research.field = arg; closeModal(); toast('Forschungsziel: ' + OL.nextTech(p, arg).name + '.'); save(); return;
      case 'war': OL.declareWar(g, ME, +arg); renderModal(); break;
      case 'peace': {
        var ok = OL.proposePeace(g, ME, +arg);
        toast(ok ? 'Frieden mit ' + pname(+arg) + ' geschlossen.' : pname(+arg) + ' lehnt Ihr Friedensangebot ab.', ok ? '' : 'bad');
        renderModal(); break;
      }
      case 'offer-yes': case 'offer-no': {
        var from = +arg;
        g.offers = g.offers.filter(function (o) { return !(o.from === from && o.to === ME); });
        if (name === 'offer-yes') { OL.makePeace(g, ME, from); toast('Frieden mit ' + pname(from) + ' geschlossen.'); }
        else toast('Friedensangebot von ' + pname(from) + ' abgelehnt.');
        renderModal(); break;
      }
      case 'rules-ai': ui.rulesAI = +arg; renderModal(); return;
      case 'newgame': ui.intro.name = ''; openModal('intro'); return;
      case 'intro-race': {
        var nmEl = $('#intro-name');
        ui.intro.name = nmEl && nmEl.value.trim() && nmEl.value.trim() !== defaultName(ui.intro.race) ? nmEl.value.trim() : '';
        ui.intro.race = arg; renderModal(); return;
      }
      case 'intro-opt': { var kv = arg.split(':'); ui.intro[kv[0]] = kv[0] === 'opponents' ? +kv[1] : kv[1]; var nm = $('#intro-name'); if (nm) ui.intro.name = nm.value; renderModal(); return; }
      case 'start': {
        var nameEl = $('#intro-name');
        var I = ui.intro;
        g = OL.newGame({ race: I.race, galaxy: I.galaxy, opponents: I.opponents, difficulty: I.difficulty, name: (nameEl && nameEl.value.trim()) || defaultName(I.race) });
        ui.star = me().capital; ui.fleet = null; ui.view = null; ui.tab = 'system'; ui.logDot = false; ui.rulesAI = null;
        fit(); save();
        ui.modal = null; render();
        openModal('welcome');
        return;
      }
      case 'continue': {
        var data = loadSaved();
        if (data) { g = data; ui.star = me().capital; ui.view = null; fit(); ui.modal = null; $('#modal-back').hidden = true; render(); }
        return;
      }
      default: return;
    }
    save();
    render();
    if (ui.modal) renderModal();
  }
  function nearestOwn(f) {
    var best = null, bd = Infinity;
    OL.coloniesOf(g, ME, true).forEach(function (s) { var d = OL.dist(s, f); if (d < bd) { bd = d; best = s; } });
    return best;
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act],[data-open],[data-tab]');
    if (!t) {
      if (e.target === $('#modal-back') && ui.modal && ui.modal.kind !== 'intro' && ui.modal.kind !== 'over') closeModal();
      return;
    }
    if (t.dataset.tab) { if (!g) return; ui.tab = t.dataset.tab; render(); return; }
    if (t.dataset.open) { if (!g) return; openModal(t.dataset.open); return; }
    act(t.dataset.act, t.dataset.arg, t);
  });
  $('#btn-end').addEventListener('click', endTurn);
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Escape') {
      if (ui.modal) closeModal();
      else if (g) { ui.fleet = null; ui.star = null; render(); }
    } else if (e.key === 'Enter' && !ui.modal && g && !(e.target && e.target.tagName === 'BUTTON')) {
      e.preventDefault(); endTurn();
    }
  });

  // Zugang für automatisierte Tests
  OL.debug = { game: function () { return g; }, ui: ui, endTurn: endTurn,
    screenOf: function (starId) { var st = g.stars[starId]; return { x: sx(st.x), y: sy(st.y) }; },
    fleetHit: function (id) { var h = hits.find(function (x) { return x.t === 'fleet' && x.id === id; }); return h ? { x: h.x, y: h.y } : null; } };

  // ------------------------------------------------------------ Start
  function start(data) {
    if (data && data.g) {
      g = data.g;
      if (data.ui) { ui.tab = data.ui.tab || 'system'; ui.star = data.ui.star; ui.fleet = data.ui.fleet; ui.view = data.ui.view || null; }
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);
    window.addEventListener('resize', resize);
    resize();
    if (g) render();
    else {
      var saved = loadSaved();
      if (saved && saved.version === 1 && !saved.over) {
        g = saved; ui.star = me().capital; fit(); render();
      } else openModal('intro');
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  }
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(function () { return { g: g, ui: { tab: ui.tab, star: ui.star, fleet: ui.fleet, view: ui.view } }; });
  if (hot && hot.ready) hot.ready(start); else start(hot && hot.data ? hot.data : {});
})();
