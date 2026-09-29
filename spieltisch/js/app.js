/*
 * Oberfläche des Spieltischs: Zustand, Ablauf und Darstellung.
 */
(function () {
  'use strict';
  const DSA = window.DSA;
  const SPEICHER = 'aventurischer-spieltisch-v1';
  const SCHLUESSEL_SPEICHER = 'aventurischer-spieltisch-api-schluessel';
  const MAX_VERLAUF = 400;

  const SZENARIEN = [
    {
      titel: 'Das dunkle Leuchtfeuer',
      text: 'Thorwalsche Küste bei Nacht: Das Leuchtfeuer auf der Sturmfels-Klippe bei Tjolmar ist erloschen, und ein Schiff wird zurückerwartet. Wer steckt dahinter?',
    },
    {
      titel: 'Nebel über der Reichsstraße',
      text: 'Eine Handelskarawane ist auf der Reichsstraße zwischen Gareth und Angbar im Nebel verschwunden. Draana wird als Geleitschutz angeheuert, um sie zu finden.',
    },
    {
      titel: 'Der gestohlene Rondra-Wimpel',
      text: 'Aus dem Rondra-Tempel in Havena wurde ein geweihter Kriegswimpel gestohlen. Die Spur führt in die Unterstadt und zu den Schmugglern am Großen Fluss.',
    },
  ];

  const DENKZEILEN = [
    'Der Meister blättert in seinen Notizen …',
    'Der Meister schiebt Figuren über die Karte …',
    'Der Meister murmelt etwas von Aventurien …',
    'Der Meister nippt am Tee und überlegt …',
  ];

  // ---------- Zustand ----------

  const becher = new DSA.Becher();
  let protokoll = new DSA.Protokoll();
  let z = neuerZustand();
  let meister = null;
  let sampleFn = null;
  let claudeAiStatus = 'pruefe'; // pruefe | ja | nein
  let apiSchluessel = '';
  let hatteSpielstand = false;
  let laufend = null; // AbortController, solange der Meister antwortet
  let denkzeile = DENKZEILEN[0];
  let fehler = null; // {text, dauerhaft}
  let bearbeiten = false;
  let neuwurfAuswahl = new Set();
  let freierWurf = null;
  let ketteStatus = null;
  let entwurf = '';
  let letzteEintraege = 0;
  let animieren = null; // Selektor, dessen Würfel kurz flackern

  function neuerZustand(held) {
    return {
      held: held || DSA.standardHeld(),
      verlauf: [],
      offen: null,
      wurf: null,
      kampf: null,
      szene: '',
      vorschlaege: [],
      backend: 'solo',
      stufe: 'default',
      modell: DSA.MODELLE[0].id,
      solo: null,
      ende: false,
      ereignis: null,
      gestartet: false,
    };
  }

  function speichern() {
    if (z.verlauf.length > MAX_VERLAUF) z.verlauf = z.verlauf.slice(-MAX_VERLAUF);
    try {
      localStorage.setItem(SPEICHER, JSON.stringify({ z, protokoll: protokoll.eintraege }));
    } catch (e) {
      /* Speicher nicht verfügbar – das Spiel läuft trotzdem. */
    }
  }

  function laden() {
    try {
      const roh = localStorage.getItem(SPEICHER);
      if (roh) {
        const d = JSON.parse(roh);
        if (d && d.z && d.z.held) {
          z = Object.assign(neuerZustand(), d.z);
          z.held = DSA.pruefeHeld(d.z.held);
          protokoll = new DSA.Protokoll(Array.isArray(d.protokoll) ? d.protokoll : []);
          hatteSpielstand = true;
        }
      }
    } catch (e) {
      hatteSpielstand = false;
    }
    try {
      apiSchluessel = localStorage.getItem(SCHLUESSEL_SPEICHER) || '';
    } catch (e) {
      apiSchluessel = '';
    }
  }

  function erzeugeMeister() {
    if (z.backend === 'claudeai') {
      if (sampleFn) return new DSA.ClaudeAiMeister(sampleFn, z.stufe);
      if (claudeAiStatus === 'pruefe') return null;
    }
    if (z.backend === 'api') return apiSchluessel ? new DSA.ApiMeister(apiSchluessel, z.modell) : null;
    z.backend = 'solo';
    return new DSA.SoloMeister();
  }

  // ---------- Hilfen ----------

  const $ = (s, el) => (el || document).querySelector(s);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function prosa(text) {
    return esc(text)
      .split(/\n{2,}/)
      .map((p) =>
        '<p>' +
        p
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br>') +
        '</p>'
      )
      .join('');
  }

  function vz(n) {
    return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '±0';
  }

  function modText(n) {
    if (!n) return 'ohne Modifikator';
    return n > 0 ? 'erschwert um ' + n : 'erleichtert um ' + Math.abs(n);
  }

  function heldName() {
    return z.held.name || 'Die Heldin';
  }

  function schmalesLayout() {
    return window.matchMedia('(max-width: 1099px)').matches;
  }

  // ---------- Würfelgrafik ----------

  function w20(wert, k, extra) {
    const klasse = 'w20 ' + (k ? 'eig-' + k : 'eig-neutral') + (extra ? ' ' + extra : '');
    return (
      '<span class="' + klasse + '"' + (k ? ' title="' + k + '"' : '') + '>' +
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<polygon class="w-koerper" points="50,4 92,28 92,72 50,96 8,72 8,28"/>' +
      '<path class="w-kante" d="M50 4 L50 24 M92 28 L77 66 M8 28 L23 66 M50 96 L77 66 M50 96 L23 66 M92 72 L77 66 M8 72 L23 66 M92 28 L50 24 M8 28 L50 24"/>' +
      '<polygon class="w-flaeche" points="50,24 77,66 23,66"/>' +
      '</svg>' +
      '<span class="w-zahl" data-end="' + esc(wert) + '">' + esc(wert) + '</span></span>'
    );
  }

  function w6(wert) {
    return '<span class="w6"><span class="w-zahl" data-end="' + esc(wert) + '">' + esc(wert) + '</span></span>';
  }

  function wuerfelGrafik(seiten, wert, k) {
    return seiten === 20 ? w20(wert, k) : w6(wert);
  }

  function flackern(selektor) {
    const bereich = document.querySelector(selektor);
    if (!bereich) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const zahlen = Array.from(bereich.querySelectorAll('.w-zahl'));
    bereich.classList.add('rollt');
    const start = performance.now();
    function schritt(t) {
      const fertig = t - start > 650;
      zahlen.forEach((el) => {
        const w = el.closest('.w6') ? 6 : 20;
        // Nur Optik: Das Ergebnis steht längst fest (data-end, aus dem Becher).
        el.textContent = fertig ? el.dataset.end : String(1 + Math.floor(Math.random() * w));
      });
      if (!fertig) requestAnimationFrame(schritt);
      else bereich.classList.remove('rollt');
    }
    requestAnimationFrame(schritt);
  }

  // ---------- Ablauf ----------

  async function handeln(eintrag, ereignis) {
    if (eintrag) z.verlauf.push(eintrag);
    z.ereignis = ereignis || null;
    z.vorschlaege = [];
    fehler = null;
    speichern();
    render();
    await frageMeister();
  }

  async function frageMeister() {
    if (!meister) {
      fehler = { text: 'Der Meister ist noch nicht verbunden. Wähle unter „Meister“ einen aus.', dauerhaft: true };
      render();
      return;
    }
    const ctl = new AbortController();
    laufend = ctl;
    denkzeile = DENKZEILEN[Math.floor(Math.random() * DENKZEILEN.length)];
    render();
    try {
      const roh = await meister.zug({ verlauf: z.verlauf, zustand: z, ereignis: z.ereignis, signal: ctl.signal });
      if (ctl.signal.aborted) throw new DSA.MeisterFehler('Abgebrochen.', { abgebrochen: true });
      uebernehmeAntwort(roh);
    } catch (e) {
      if (e && e.abgebrochen) fehler = { text: 'Du hast den Meister unterbrochen.', dauerhaft: false };
      else fehler = { text: (e && e.message) || String(e), dauerhaft: !!(e && e.dauerhaft) };
    } finally {
      if (laufend === ctl) laufend = null;
      speichern();
      render();
    }
  }

  function anforderungText(p) {
    if (p.typ === 'talent') {
      const t = DSA.findeTalent(p.name);
      return p.name + ' ' + vz(-p.erschwernis) + (t ? ' (' + t.probe.join('/') + ')' : '') + (p.grund ? ' – ' + p.grund : '');
    }
    if (p.typ === 'eigenschaft') return 'Eigenschaftsprobe ' + p.name + ' ' + vz(-p.erschwernis) + (p.grund ? ' – ' + p.grund : '');
    return (p.typ === 'schaden' ? 'Schaden ' : 'Heilung ') + p.formel + (p.grund ? ' – ' + p.grund : '');
  }

  function uebernehmeAntwort(roh) {
    const { antwort: a, hinweise } = DSA.pruefeAntwort(roh, z);
    const eintrag = { rolle: 'meister', text: a.erzaehlung, szene: a.szene, hinweise };
    if (a.szene) z.szene = a.szene;
    if (a.kampfBeenden && z.kampf) {
      z.kampf = null;
      eintrag.kampfEnde = true;
    }
    if (a.gegner.length) {
      if (!z.kampf) z.kampf = { gegner: [], runde: 0, ziel: 0, verteidigung: 'parade', ungesendet: [], ergebnis: null };
      a.gegner.forEach((g) => z.kampf.gegner.push(g));
      eintrag.kampfText = a.gegner
        .map((g) => g.name + ' (LeP ' + g.lep + ', AT ' + g.at + ', PA ' + g.pa + ', RS ' + g.rs + ', TP ' + g.tp + ')')
        .join('; ');
    }
    if (a.probe) {
      z.offen = a.probe;
      eintrag.probeText = anforderungText(a.probe);
    }
    if (a.inventarNeu.length) {
      z.held.inventar.push.apply(z.held.inventar, a.inventarNeu);
      eintrag.gewinn = a.inventarNeu;
    }
    if (a.ap) {
      z.held.ap += a.ap;
      eintrag.ap = a.ap;
    }
    z.vorschlaege = a.vorschlaege;
    z.ende = a.ende;
    z.verlauf.push(eintrag);
  }

  function wuerfleOffeneProbe() {
    const p = z.offen;
    if (!p) return;
    const { ergebnis, wuerfe } = becher.mitschnitt(() => {
      if (p.typ === 'talent') return DSA.talentprobe(z.held, p.name, p.erschwernis, becher);
      if (p.typ === 'eigenschaft') return DSA.eigenschaftsprobe(z.held, p.name, p.erschwernis, becher);
      return becher.wurf(p.formel);
    });
    let w;
    if (p.typ === 'schaden' || p.typ === 'heilung') {
      const menge = Math.max(0, ergebnis.summe);
      const vorher = z.held.lep.aktuell;
      if (p.typ === 'schaden') z.held.lep.aktuell -= menge;
      else z.held.lep.aktuell = Math.min(z.held.lep.max, z.held.lep.aktuell + menge);
      w = Object.assign({ typ: p.typ, menge, vorher, nachher: z.held.lep.aktuell }, ergebnis);
    } else {
      w = ergebnis;
    }
    w.grund = p.grund;
    protokoll.eintragen(artName(w), ergebnisText(w), wuerfe);
    z.wurf = w;
    z.offen = null;
    neuwurfAuswahl = new Set();
    animieren = '#ergebnis-wuerfel';
    speichern();
    render();
  }

  function artName(w) {
    return { talent: 'Talentprobe', eigenschaft: 'Eigenschaftsprobe', schaden: 'Schaden', heilung: 'Heilung' }[w.typ] || 'Wurf';
  }

  function ergebnisText(w) {
    if (w.typ === 'talent' || w.typ === 'eigenschaft') return DSA.probeText(w);
    const rechnung = w.formel + ' = ' + w.einzeln.join('+') + (w.bonus ? (w.bonus > 0 ? '+' : '') + w.bonus : '') + ' = ' + w.summe;
    if (w.typ === 'schaden') {
      return 'Schaden' + (w.grund ? ' (' + w.grund + ')' : '') + ': ' + rechnung + ' → ' + heldName() + ' verliert ' + w.menge + ' LeP (jetzt ' + w.nachher + '/' + z.held.lep.max + ').';
    }
    return 'Heilung' + (w.grund ? ' (' + w.grund + ')' : '') + ': ' + rechnung + ' → ' + heldName() + ' erhält ' + (w.nachher - w.vorher) + ' LeP zurück (jetzt ' + w.nachher + '/' + z.held.lep.max + ').';
  }

  function status(w) {
    if (!w) return 'neutral';
    if (w.patzer) return 'patzer';
    if (w.kritisch) return 'krit';
    if (w.typ === 'schaden') return 'misserfolg';
    if (w.typ === 'heilung') return 'erfolg';
    return w.gelungen ? 'erfolg' : 'misserfolg';
  }

  function schicksalspunkt() {
    const w = z.wurf;
    if (!w || w.neuwurf || z.held.schip.aktuell < 1) return;
    if (w.typ !== 'talent' && w.typ !== 'eigenschaft') return;
    let indizes = Array.from(neuwurfAuswahl).sort();
    if (w.typ === 'talent' && !indizes.length) indizes = [0, 1, 2];
    const { ergebnis, wuerfe } = becher.mitschnitt(() =>
      w.typ === 'talent' ? DSA.talentNeuwurf(w, indizes, becher) : DSA.eigenschaftNeuwurf(w, becher)
    );
    ergebnis.grund = w.grund;
    z.held.schip.aktuell -= 1;
    z.wurf = ergebnis;
    protokoll.eintragen('Schicksalspunkt', 'Neuwurf für ' + w.name + ': ' + DSA.probeText(ergebnis), wuerfe);
    neuwurfAuswahl = new Set();
    animieren = '#ergebnis-wuerfel';
    speichern();
    render();
  }

  function ergebnisSenden() {
    const w = z.wurf;
    if (!w) return;
    z.wurf = null;
    handeln(
      { rolle: 'tisch', text: ergebnisText(w), status: status(w) },
      { art: 'probe', typ: w.typ, gelungen: !!w.gelungen, kritisch: !!w.kritisch, patzer: !!w.patzer }
    );
  }

  function kampfrundeWuerfeln() {
    const k = z.kampf;
    if (!k || k.ergebnis) return;
    const { ergebnis: r, wuerfe } = becher.mitschnitt(() => DSA.kampfrunde(z.held, k, becher));
    protokoll.eintragen('Kampfrunde ' + r.runde, r.ereignisse.map((e) => e.text).join(' ') + ' Stand: ' + r.stand + '.', wuerfe);
    k.ungesendet.push(r);
    if (r.ergebnis) k.ergebnis = r.ergebnis;
    speichern();
    render();
  }

  /** Fasst ungesendete Kampfrunden zu einem Spieltisch-Eintrag zusammen. */
  function kampfZusammenfassung() {
    const k = z.kampf;
    if (!k || !k.ungesendet.length) return null;
    const zeilen = k.ungesendet.map((r) => 'Runde ' + r.runde + ': ' + r.ereignisse.map((e) => e.text).join(' '));
    zeilen.push('Stand: ' + k.ungesendet[k.ungesendet.length - 1].stand + '.');
    let st = 'neutral';
    if (k.ergebnis === 'sieg') {
      zeilen.push('KAMPF GEWONNEN – alle Gegner sind kampfunfähig.');
      st = 'erfolg';
    } else if (k.ergebnis === 'niederlage') {
      zeilen.push(heldName() + ' ist kampfunfähig. Der Kampf ist verloren.');
      st = 'patzer';
    }
    k.ungesendet = [];
    const ergebnis = k.ergebnis;
    if (ergebnis) z.kampf = null;
    return { eintrag: { rolle: 'tisch', text: zeilen.join('\n'), status: st }, ergebnis };
  }

  function kampfSenden() {
    const zs = kampfZusammenfassung();
    if (!zs) return;
    handeln(zs.eintrag, { art: 'kampf', ergebnis: zs.ergebnis });
  }

  function freiHandeln(text) {
    const t = String(text || '').trim();
    if (!t) return;
    const zs = kampfZusammenfassung();
    if (zs) z.verlauf.push(zs.eintrag);
    entwurf = '';
    handeln({ rolle: 'spieler', text: t }, { art: 'aktion', text: t });
  }

  function rasten() {
    if (z.kampf || z.offen || z.wurf || laufend) return;
    const { ergebnis, wuerfe } = becher.mitschnitt(() => becher.wurf('1W6'));
    const vorher = z.held.lep.aktuell;
    z.held.lep.aktuell = Math.min(z.held.lep.max, vorher + ergebnis.summe);
    const text = 'Rast: Regeneration 1W6 = ' + ergebnis.summe + ' → ' + heldName() + ' hat jetzt ' + z.held.lep.aktuell + '/' + z.held.lep.max + ' LeP.';
    protokoll.eintragen('Regeneration', text, wuerfe);
    if (z.gestartet) z.verlauf.push({ rolle: 'tisch', text, status: 'erfolg' });
    freierWurf = { titel: 'Rast', text, wuerfe: wuerfe, status: 'erfolg' };
    speichern();
    render();
  }

  function freieProbe(art, name) {
    let res;
    const { ergebnis, wuerfe } = becher.mitschnitt(() => {
      if (art === 'talent') return DSA.talentprobe(z.held, name, 0, becher);
      if (art === 'eigenschaft') return DSA.eigenschaftsprobe(z.held, name, 0, becher);
      return becher.wurf(name);
    });
    if (art === 'formel') {
      res = { titel: 'Freier Wurf ' + ergebnis.formel, text: ergebnis.formel + ' = ' + ergebnis.einzeln.join(' + ') + (ergebnis.bonus ? ' ' + (ergebnis.bonus > 0 ? '+ ' : '− ') + Math.abs(ergebnis.bonus) : '') + ' = ' + ergebnis.summe, wuerfe, status: 'neutral' };
      protokoll.eintragen('Freier Wurf', res.text, wuerfe);
    } else {
      res = { titel: 'Freie Probe: ' + ergebnis.name, text: DSA.probeText(ergebnis), probe: ergebnis, wuerfe, status: status(ergebnis) };
      protokoll.eintragen('Freie Probe', res.text, wuerfe);
    }
    freierWurf = res;
    animieren = '#frei-wuerfel';
    speichern();
    if (schmalesLayout()) zeigeReiter('wuerfel');
    render();
  }

  function freienWurfMelden() {
    if (!freierWurf || !kannHandeln()) return;
    const text = 'Aus eigenem Antrieb: ' + freierWurf.text;
    freierWurf = null;
    handeln({ rolle: 'tisch', text, status: 'neutral' }, { art: 'aktion', text: '' });
    if (schmalesLayout()) zeigeReiter('abenteuer');
  }

  function kannHandeln() {
    return !!meister && z.gestartet && !laufend && !z.offen && !z.wurf && !z.ende;
  }

  function neuesAbenteuer(aufhaenger, heilen) {
    if (laufend) laufend.abort();
    const held = z.held;
    if (heilen) {
      held.lep.aktuell = held.lep.max;
      held.schip.aktuell = held.schip.max;
    }
    z = Object.assign(neuerZustand(held), { backend: z.backend, stufe: z.stufe, modell: z.modell, gestartet: true });
    meister = erzeugeMeister();
    fehler = null;
    letzteEintraege = 0;
    if (schmalesLayout()) zeigeReiter('abenteuer');
    if (meister && !meister.freitext) {
      handeln({ rolle: 'tisch', text: 'Das Solo-Abenteuer „Das dunkle Leuchtfeuer“ beginnt.', status: 'neutral' }, { art: 'start' });
    } else {
      handeln(
        {
          rolle: 'tisch',
          text:
            'Ein neues Abenteuer beginnt. Aufhänger: ' + aufhaenger +
            ' Eröffne mit einer stimmungsvollen Szene, die ' + heldName() + ' direkt ins Geschehen holt, und ende mit einer Situation, in der sie handeln muss.',
          status: 'neutral',
        },
        { art: 'start' }
      );
    }
  }

  // ---------- Darstellung: Heldenbogen ----------

  function lepLeiste(akt, max, klein) {
    const anteil = Math.max(0, Math.min(1, akt / max));
    const stufe = anteil > 0.5 ? 'gut' : anteil > 0.25 ? 'mittel' : 'kritisch';
    return (
      '<span class="leiste ' + (klein ? 'klein ' : '') + stufe + '" role="img" aria-label="' + akt + ' von ' + max + ' Lebenspunkten">' +
      '<span style="width:' + (anteil * 100).toFixed(1) + '%"></span></span>'
    );
  }

  function renderHeld() {
    const h = z.held;
    const el = $('#heldenbogen');
    if (bearbeiten) {
      el.innerHTML = renderHeldBearbeiten(h);
      return;
    }
    const schmerz = DSA.schmerzStufe(h);
    const aktiv = !laufend && !z.offen && !z.wurf;
    let html = '<div class="bogen karte">';
    html +=
      '<div class="bogen-kopf"><div><h2>' + esc(h.name) + '</h2><p>' + esc(h.beschreibung) + '</p></div>' +
      '<div class="bogen-knoepfe"><button type="button" class="knopf klein" data-aktion="bearbeiten">Bearbeiten</button>' +
      '<button type="button" class="knopf klein" data-aktion="sichern">Sichern</button></div></div>';

    html += '<div class="zustandswerte">';
    html +=
      '<div class="wert-lep"><div class="wert-zeile"><span class="etikett">Lebensenergie</span><span class="zahl">' + h.lep.aktuell + ' / ' + h.lep.max + '</span></div>' +
      lepLeiste(h.lep.aktuell, h.lep.max) +
      (schmerz ? '<span class="chip warnung">Schmerz ' + DSA.ROEMISCH[schmerz] + ' · alle Proben −' + schmerz + '</span>' : '') +
      (h.lep.aktuell <= 0 ? '<span class="chip gefahr">kampfunfähig</span>' : '') +
      '</div>';
    let pips = '';
    for (let i = 0; i < h.schip.max; i++) pips += '<span class="pip' + (i < h.schip.aktuell ? ' voll' : '') + '"></span>';
    html +=
      '<div class="wert-klein"><span class="etikett">Schicksalspunkte</span><span class="pips" aria-label="' + h.schip.aktuell + ' von ' + h.schip.max + '">' + pips + '</span></div>' +
      '<div class="wert-klein"><span class="etikett">Abenteuerpunkte</span><span class="zahl">' + h.ap + '</span></div>';
    html += '</div>';

    html += '<h3 class="abschnitt">Eigenschaften</h3><div class="eig-raster">';
    DSA.EIGENSCHAFTEN.forEach((e) => {
      html +=
        '<button type="button" class="eig" data-aktion="frei-eig" data-k="' + e.k + '" title="Freie Probe auf ' + e.name + '"' + (aktiv ? '' : ' disabled') + '>' +
        '<span class="eig-punkt eig-' + e.k + '"></span><span class="eig-k">' + e.k + '</span><span class="eig-w">' + h.eigenschaften[e.k] + '</span></button>';
    });
    html += '</div>';

    html += '<h3 class="abschnitt">Kampf</h3><dl class="kampfwerte">' +
      '<div class="kw-waffe"><dt>Waffe</dt><dd>' + esc(h.kampf.waffe) + '</dd></div>' +
      '<div><dt>AT</dt><dd>' + h.kampf.at + '</dd></div>' +
      '<div><dt>PA</dt><dd>' + h.kampf.pa + '</dd></div>' +
      '<div><dt>AW</dt><dd>' + h.kampf.aw + '</dd></div>' +
      '<div><dt>TP</dt><dd>' + esc(h.kampf.tp) + '</dd></div>' +
      '<div><dt>RS</dt><dd>' + h.kampf.rs + '</dd></div></dl>';

    html += '<h3 class="abschnitt">Talente <small>Antippen für eine freie Probe</small></h3>';
    DSA.TALENT_GRUPPEN.forEach((g) => {
      const liste = DSA.TALENTE.filter((t) => t.gruppe === g);
      const gelernt = liste.filter((t) => h.talente[t.name] > 0).length;
      html += '<details class="talentgruppe"' + (g === 'Körper' || g === 'Gesellschaft' ? ' open' : '') + '><summary>' + g + ' <span class="leise">' + gelernt + ' von ' + liste.length + ' gelernt</span></summary><ul>';
      liste.forEach((t) => {
        const fw = h.talente[t.name] || 0;
        html +=
          '<li><button type="button" class="talent' + (fw ? '' : ' ungelernt') + '" data-aktion="frei-talent" data-name="' + esc(t.name) + '"' + (aktiv ? '' : ' disabled') + '>' +
          '<span class="t-name">' + esc(t.name) + '</span>' +
          '<span class="t-probe">' + t.probe.map((k) => '<i class="eig-punkt eig-' + k + '" title="' + k + '"></i>').join('') + '</span>' +
          '<span class="t-fw">' + fw + '</span></button></li>';
      });
      html += '</ul></details>';
    });

    html += '<h3 class="abschnitt">Ausrüstung</h3><ul class="inventar">' + h.inventar.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>';
    if (h.notizen) html += '<h3 class="abschnitt">Notizen</h3><p class="notizen">' + esc(h.notizen) + '</p>';
    html +=
      '<div class="bogen-fuss"><button type="button" class="knopf klein" data-aktion="rast"' +
      (z.kampf || !aktiv || h.lep.aktuell >= h.lep.max ? ' disabled' : '') +
      '>Rasten (1W6 LeP)</button></div>';
    html += '</div>';
    el.innerHTML = html;
  }

  function zahlFeld(id, wert, min, max) {
    return '<input type="number" inputmode="numeric" id="' + id + '" value="' + wert + '" min="' + min + '" max="' + max + '">';
  }

  function renderHeldBearbeiten(h) {
    let html = '<form class="bogen karte bearbeiten" id="form-held">';
    html += '<div class="bogen-kopf"><h2>Bogen bearbeiten</h2></div>';
    html += '<label for="hb-name">Name</label><input type="text" id="hb-name" value="' + esc(h.name) + '" maxlength="40">';
    html += '<label for="hb-beschreibung">Beschreibung</label><input type="text" id="hb-beschreibung" value="' + esc(h.beschreibung) + '" maxlength="120">';
    html += '<h3 class="abschnitt">Eigenschaften</h3><div class="feld-raster">';
    DSA.EIGENSCHAFTEN.forEach((e) => {
      html += '<label><span>' + e.k + '</span>' + zahlFeld('hb-' + e.k, h.eigenschaften[e.k], 1, 25) + '</label>';
    });
    html += '</div><h3 class="abschnitt">Zustand</h3><div class="feld-raster">';
    html += '<label><span>LeP</span>' + zahlFeld('hb-lep', h.lep.aktuell, -50, 200) + '</label>';
    html += '<label><span>LeP max</span>' + zahlFeld('hb-lepmax', h.lep.max, 1, 200) + '</label>';
    html += '<label><span>SchiP</span>' + zahlFeld('hb-schip', h.schip.aktuell, 0, 10) + '</label>';
    html += '<label><span>SchiP max</span>' + zahlFeld('hb-schipmax', h.schip.max, 0, 10) + '</label>';
    html += '<label><span>AP</span>' + zahlFeld('hb-ap', h.ap, 0, 99999) + '</label>';
    html += '</div><h3 class="abschnitt">Kampf</h3>';
    html += '<label for="hb-waffe">Waffe</label><input type="text" id="hb-waffe" value="' + esc(h.kampf.waffe) + '" maxlength="40">';
    html += '<div class="feld-raster">';
    html += '<label><span>AT</span>' + zahlFeld('hb-at', h.kampf.at, 0, 25) + '</label>';
    html += '<label><span>PA</span>' + zahlFeld('hb-pa', h.kampf.pa, 0, 25) + '</label>';
    html += '<label><span>AW</span>' + zahlFeld('hb-aw', h.kampf.aw, 0, 25) + '</label>';
    html += '<label><span>RS</span>' + zahlFeld('hb-rs', h.kampf.rs, 0, 10) + '</label>';
    html += '<label><span>TP</span><input type="text" id="hb-tp" value="' + esc(h.kampf.tp) + '" maxlength="10"></label>';
    html += '</div><h3 class="abschnitt">Talente (FW)</h3><div class="feld-raster talente">';
    DSA.TALENTE.forEach((t, i) => {
      html += '<label><span>' + esc(t.name) + '</span>' + zahlFeld('hb-t' + i, h.talente[t.name] || 0, 0, 25) + '</label>';
    });
    html += '</div><label for="hb-inventar">Ausrüstung (eine Zeile pro Gegenstand)</label><textarea id="hb-inventar" rows="6">' + esc(h.inventar.join('\n')) + '</textarea>';
    html += '<label for="hb-notizen">Notizen</label><textarea id="hb-notizen" rows="4">' + esc(h.notizen) + '</textarea>';
    html +=
      '<div class="dialog-knoepfe"><button type="button" class="knopf leise-knopf" data-aktion="standard-held">Draanas Grundwerte</button>' +
      '<button type="button" class="knopf leise-knopf" data-aktion="bearbeiten-abbrechen">Abbrechen</button>' +
      '<button type="submit" class="knopf haupt">Speichern</button></div>';
    html += '</form>';
    return html;
  }

  function heldAusFormular() {
    const wert = (id) => $('#' + id).value;
    const roh = {
      name: wert('hb-name'),
      beschreibung: wert('hb-beschreibung'),
      eigenschaften: {},
      lep: { aktuell: wert('hb-lep'), max: wert('hb-lepmax') },
      schip: { aktuell: wert('hb-schip'), max: wert('hb-schipmax') },
      ap: wert('hb-ap'),
      kampf: { waffe: wert('hb-waffe'), at: wert('hb-at'), pa: wert('hb-pa'), aw: wert('hb-aw'), rs: wert('hb-rs'), tp: wert('hb-tp') },
      talente: {},
      inventar: wert('hb-inventar').split('\n').map((s) => s.trim()).filter(Boolean),
      notizen: wert('hb-notizen'),
    };
    DSA.EIGENSCHAFTEN.forEach((e) => {
      roh.eigenschaften[e.k] = wert('hb-' + e.k);
    });
    DSA.TALENTE.forEach((t, i) => {
      const fw = Number(wert('hb-t' + i));
      if (fw > 0) roh.talente[t.name] = fw;
    });
    return DSA.pruefeHeld(roh);
  }

  // ---------- Darstellung: Erzählung ----------

  function renderEintrag(e) {
    if (e.rolle === 'meister') {
      let html = '<article class="eintrag meister">';
      if (e.szene) html += '<h3 class="szene-titel">' + esc(e.szene) + '</h3>';
      html += '<div class="prosa">' + prosa(e.text) + '</div>';
      const marken = [];
      if (e.probeText) marken.push('<span class="marke-probe">Probe: ' + esc(e.probeText) + '</span>');
      if (e.kampfText) marken.push('<span class="marke-kampf">Kampf: ' + esc(e.kampfText) + '</span>');
      if (e.kampfEnde) marken.push('<span class="marke-kampf">Kampf beendet</span>');
      if (e.gewinn) marken.push('<span class="marke-gewinn">Erhalten: ' + esc(e.gewinn.join(', ')) + '</span>');
      if (e.ap) marken.push('<span class="marke-gewinn">+' + e.ap + ' AP</span>');
      if (marken.length) html += '<div class="marken">' + marken.join('') + '</div>';
      if (e.hinweise && e.hinweise.length) {
        html += '<ul class="waechter" aria-label="Regelwächter">' + e.hinweise.map((h) => '<li>Regelwächter: ' + esc(h) + '</li>').join('') + '</ul>';
      }
      return html + '</article>';
    }
    if (e.rolle === 'spieler') {
      return '<article class="eintrag spieler"><span class="wer">' + esc(heldName()) + '</span><p>' + esc(e.text) + '</p></article>';
    }
    return (
      '<article class="eintrag tisch status-' + esc(e.status || 'neutral') + '"><span class="wer">Spieltisch</span><p>' +
      esc(e.text).replace(/\n/g, '<br>') + '</p></article>'
    );
  }

  function renderWillkommen() {
    const claudeText =
      claudeAiStatus === 'ja'
        ? 'Claude ist bereit, dein Meister zu sein.'
        : claudeAiStatus === 'pruefe'
          ? 'Prüfe, ob Claude hier als Meister verfügbar ist …'
          : 'Für Claude als Meister brauchst du hier einen API-Schlüssel – oder du öffnest die Seite als Artifact in claude.ai.';
    return (
      '<article class="willkommen">' +
      '<p class="eyebrow">Willkommen am Tisch</p>' +
      '<h2>Draana wartet auf ihr nächstes Abenteuer.</h2>' +
      '<div class="prosa"><p>Hier spielt eine Maschine mit, die nicht schummeln kann: <strong>Das Programm würfelt</strong>, rechnet Qualitätsstufen, Schaden und Lebenspunkte. <strong>Der Meister erzählt nur.</strong> Er darf Proben anfordern und muss mit dem leben, was die drei W20 sagen.</p>' +
      '<p>' + esc(claudeText) + '</p></div>' +
      '<div class="willkommen-knoepfe">' +
      (claudeAiStatus === 'ja' ? '<button type="button" class="knopf haupt" data-aktion="start-claude">Mit Claude als Meister spielen</button>' : '') +
      '<button type="button" class="knopf' + (claudeAiStatus === 'ja' ? '' : ' haupt') + '" data-aktion="start-solo">Solo-Abenteuer „Das dunkle Leuchtfeuer“</button>' +
      '<button type="button" class="knopf leise-knopf" data-aktion="meister-dialog">Meister wählen</button>' +
      '</div>' +
      '<ol class="ablauf"><li><b>Du</b> beschreibst, was Draana tut.</li><li><b>Der Meister</b> erzählt und fordert bei Unsicherem eine Probe an.</li><li><b>Der Spieltisch</b> prüft die Anforderung, würfelt und meldet das Ergebnis zurück.</li><li><b>Der Meister</b> erzählt die Folgen – so, wie die Würfel gefallen sind.</li></ol>' +
      '</article>'
    );
  }

  function renderErzaehlung() {
    const el = $('#erzaehlung');
    $('#szene').innerHTML = z.gestartet && z.szene ? '<span class="eyebrow">Szene</span><span class="szene-name">' + esc(z.szene) + '</span>' : '';
    if (!z.gestartet) {
      el.innerHTML = renderWillkommen();
      letzteEintraege = 0;
      return;
    }
    el.innerHTML = z.verlauf.map(renderEintrag).join('');
    if (z.verlauf.length !== letzteEintraege) {
      const neu = z.verlauf.length > letzteEintraege;
      letzteEintraege = z.verlauf.length;
      if (neu) {
        const letzter = el.lastElementChild;
        if (letzter) {
          const glatt = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          requestAnimationFrame(() => letzter.scrollIntoView({ block: 'start', behavior: glatt ? 'smooth' : 'auto' }));
        }
      }
    }
  }

  // ---------- Darstellung: Aktionsbereich ----------

  function renderAnforderung(p) {
    const h = z.held;
    const schmerz = DSA.schmerzStufe(h);
    let werte = '';
    let knopf = '';
    let titel = '';
    if (p.typ === 'talent') {
      const t = DSA.findeTalent(p.name);
      const mod = p.erschwernis + schmerz;
      titel = p.name;
      werte =
        '<div class="probe-werte">' +
        t.probe.map((k) => '<span class="pw"><i class="eig-punkt eig-' + k + '"></i>' + k + ' <b>' + (h.eigenschaften[k] - mod) + '</b>' + (mod ? '<small>' + h.eigenschaften[k] + vz(-mod) + '</small>' : '') + '</span>').join('') +
        '<span class="pw fw">FW <b>' + (h.talente[p.name] || 0) + '</b></span></div>';
      knopf = 'Drei W20 würfeln';
    } else if (p.typ === 'eigenschaft') {
      const mod = p.erschwernis + schmerz;
      titel = 'Eigenschaftsprobe ' + p.name;
      werte = '<div class="probe-werte"><span class="pw"><i class="eig-punkt eig-' + p.name + '"></i>' + p.name + ' <b>' + (h.eigenschaften[p.name] - mod) + '</b>' + (mod ? '<small>' + h.eigenschaften[p.name] + vz(-mod) + '</small>' : '') + '</span></div>';
      knopf = 'W20 würfeln';
    } else {
      titel = p.typ === 'schaden' ? 'Schaden' : 'Heilung';
      werte = '<div class="probe-werte"><span class="pw"><b>' + esc(p.formel) + '</b> ' + (p.typ === 'schaden' ? 'Schadenspunkte' : 'Lebenspunkte') + '</span></div>';
      knopf = p.formel + ' würfeln';
    }
    const modZeile =
      p.typ === 'talent' || p.typ === 'eigenschaft'
        ? '<span class="mod">' + modText(p.erschwernis) + (schmerz ? ', Schmerz −' + schmerz : '') + '</span>'
        : '';
    return (
      '<div class="karte probe-karte">' +
      '<div class="karte-kopf"><span class="eyebrow">Der Meister verlangt</span><h3>' + esc(titel) + '</h3>' + modZeile + '</div>' +
      (p.grund ? '<p class="grund">' + esc(p.grund) + '</p>' : '') +
      werte +
      '<button type="button" class="knopf haupt gross" data-aktion="wuerfeln">' + esc(knopf) + '</button>' +
      '</div>'
    );
  }

  function urteilHtml(w) {
    if (w.typ === 'schaden') return '<span class="urteil misserfolg">−' + w.menge + ' LeP</span>';
    if (w.typ === 'heilung') return '<span class="urteil erfolg">+' + (w.nachher - w.vorher) + ' LeP</span>';
    if (w.patzer) return '<span class="urteil patzer">' + (w.spektakulaer ? 'Spektakulärer Patzer' : 'Patzer') + '</span>';
    if (w.kritisch) return '<span class="urteil krit">' + (w.spektakulaer ? 'Spektakulärer Erfolg' : 'Kritischer Erfolg') + (w.qs ? ' · QS ' + w.qs : '') + '</span>';
    if (w.gelungen) return '<span class="urteil erfolg">Gelungen' + (w.qs ? ' · QS ' + w.qs : '') + '</span>';
    return '<span class="urteil misserfolg">Misslungen</span>';
  }

  function renderErgebnis(w) {
    const h = z.held;
    let wuerfel = '';
    let detail = '';
    const schipMoeglich = (w.typ === 'talent' || w.typ === 'eigenschaft') && !w.neuwurf && h.schip.aktuell > 0;
    if (w.typ === 'talent') {
      wuerfel = w.wuerfe
        .map((x, i) => {
          const e = w.eigenschaften[i];
          const ueber = w.ueber[i];
          const gewaehlt = neuwurfAuswahl.has(i);
          const inhalt =
            w20(x, e.k) +
            '<span class="w-unter">' + e.k + ' ' + e.wert + '</span>' +
            '<span class="w-diff ' + (ueber ? 'minus' : 'plus') + '">' + (ueber ? '−' + ueber + ' FP' : 'geschafft') + '</span>';
          if (schipMoeglich) {
            return '<button type="button" class="w-slot waehlbar' + (gewaehlt ? ' gewaehlt' : '') + '" data-aktion="neuwurf-wahl" data-i="' + i + '" aria-pressed="' + gewaehlt + '">' + inhalt + '</button>';
          }
          return '<span class="w-slot">' + inhalt + '</span>';
        })
        .join('');
      detail = '<p class="rechnung">FW ' + w.fw + ' − ' + w.ueber.reduce((a, b) => a + b, 0) + ' = <b>' + w.fpRest + ' FP</b>' + (w.neuwurf ? ' · nach Schicksalspunkt (vorher ' + w.vorNeuwurf.join('/') + ')' : '') + '</p>';
    } else if (w.typ === 'eigenschaft') {
      wuerfel =
        '<span class="w-slot">' + (w.wurf === null ? '<span class="w-leer">–</span>' : w20(w.wurf, w.name)) + '<span class="w-unter">' + w.name + ' ' + w.wert + '</span></span>' +
        (w.bestaetigung ? '<span class="w-slot">' + w20(w.bestaetigung, null) + '<span class="w-unter">Bestätigung</span></span>' : '');
      if (w.neuwurf) detail = '<p class="rechnung">nach Schicksalspunkt (vorher ' + w.vorNeuwurf.join('/') + ')</p>';
    } else {
      wuerfel = w.einzeln.map((x) => '<span class="w-slot">' + wuerfelGrafik(parseInt(w.formel.split('W')[1], 10), x) + '</span>').join('');
      detail = '<p class="rechnung">' + esc(w.formel) + ' = <b>' + w.summe + '</b> · ' + esc(heldName()) + ' jetzt ' + w.nachher + '/' + h.lep.max + ' LeP</p>';
    }
    let schip = '';
    if (schipMoeglich) {
      schip =
        '<p class="leise klein">' + (w.typ === 'talent' ? 'Wähle Würfel für den Neuwurf (ohne Auswahl: alle drei). Je Würfel zählt der bessere Wert.' : 'Neuwurf: Der bessere Wert zählt.') + '</p>' +
        '<button type="button" class="knopf" data-aktion="schip">Schicksalspunkt einsetzen (' + h.schip.aktuell + ' übrig)</button>';
    }
    return (
      '<div class="karte ergebnis-karte status-' + status(w) + '">' +
      '<div class="karte-kopf"><span class="eyebrow">' + esc(artName(w)) + (w.grund ? ' · ' + esc(w.grund) : '') + '</span><h3>' + esc(w.name || (w.typ === 'schaden' ? 'Schaden' : 'Heilung')) + '</h3>' + urteilHtml(w) + '</div>' +
      '<div class="wuerfelreihe" id="ergebnis-wuerfel">' + wuerfel + '</div>' +
      detail +
      '<div class="knopfreihe">' + schip + '<button type="button" class="knopf haupt" data-aktion="senden">Weiter – Ergebnis an den Meister</button></div>' +
      '</div>'
    );
  }

  function renderKampf(k) {
    const h = z.held;
    let html = '<div class="karte kampf-karte">';
    html += '<div class="karte-kopf"><span class="eyebrow">Kampf · Runde ' + (k.runde || 0) + '</span><h3>' + (k.ergebnis === 'sieg' ? 'Sieg!' : k.ergebnis === 'niederlage' ? esc(heldName()) + ' geht zu Boden' : 'Die Waffen sind gezogen') + '</h3></div>';
    html += '<ul class="gegner-liste">';
    k.gegner.forEach((g, i) => {
      const lebt = g.lep > 0;
      const ziel = lebt && (k.ziel === i || (!k.gegner[k.ziel] || k.gegner[k.ziel].lep <= 0) && k.gegner.findIndex((x) => x.lep > 0) === i);
      html +=
        '<li class="gegner' + (lebt ? '' : ' besiegt') + (ziel ? ' ziel' : '') + '">' +
        '<button type="button" data-aktion="ziel" data-i="' + i + '"' + (lebt && !k.ergebnis ? '' : ' disabled') + ' aria-pressed="' + ziel + '">' +
        '<span class="g-name">' + esc(g.name) + (ziel ? ' <small>Ziel</small>' : '') + (lebt ? '' : ' <small>kampfunfähig</small>') + '</span>' +
        '<span class="g-lep">' + Math.max(0, g.lep) + '/' + g.lepMax + '</span>' +
        lepLeiste(Math.max(0, g.lep), g.lepMax, true) +
        '<span class="g-werte">AT ' + g.at + ' · PA ' + g.pa + ' · RS ' + g.rs + ' · TP ' + esc(g.tp) + '</span>' +
        '</button></li>';
    });
    html += '</ul>';
    html +=
      '<div class="held-im-kampf"><span class="g-name">' + esc(heldName()) + '</span><span class="g-lep">' + h.lep.aktuell + '/' + h.lep.max + '</span>' + lepLeiste(h.lep.aktuell, h.lep.max, true) +
      '<div class="umschalter" role="group" aria-label="Verteidigung">' +
      '<button type="button" data-aktion="verteidigung" data-v="parade" aria-pressed="' + (k.verteidigung !== 'ausweichen') + '">Parieren ' + h.kampf.pa + '</button>' +
      '<button type="button" data-aktion="verteidigung" data-v="ausweichen" aria-pressed="' + (k.verteidigung === 'ausweichen') + '">Ausweichen ' + h.kampf.aw + '</button>' +
      '</div></div>';
    if (k.ungesendet.length) {
      html += '<ol class="runden-log" id="kampf-log">';
      k.ungesendet.forEach((r) => {
        html += '<li><b>Runde ' + r.runde + '</b>' + r.ereignisse.map((e) => '<span class="' + e.wer + '">' + esc(e.text) + '</span>').join('') + '</li>';
      });
      html += '</ol>';
    }
    html += '<div class="knopfreihe">';
    if (!k.ergebnis) html += '<button type="button" class="knopf' + (k.ungesendet.length ? '' : ' haupt') + '" data-aktion="kampfrunde">Kampfrunde würfeln</button>';
    if (k.ungesendet.length) html += '<button type="button" class="knopf haupt" data-aktion="kampf-senden">Meister erzählen lassen</button>';
    html += '</div></div>';
    return html;
  }

  function renderAktion() {
    const el = $('#aktion');
    if (!z.gestartet) {
      el.innerHTML = '';
      return;
    }
    let html = '';
    if (laufend) {
      html +=
        '<div class="denkt" role="status"><span class="punkte" aria-hidden="true"><i></i><i></i><i></i></span><span>' + esc(denkzeile) + '</span>' +
        '<button type="button" class="knopf klein leise-knopf" data-aktion="stop">Unterbrechen</button></div>';
      el.innerHTML = html;
      return;
    }
    if (fehler) {
      html +=
        '<div class="fehlerkarte" role="alert"><p>' + esc(fehler.text) + '</p><div class="knopfreihe">' +
        (!fehler.dauerhaft ? '<button type="button" class="knopf haupt" data-aktion="erneut">Meister erneut fragen</button>' : '') +
        '<button type="button" class="knopf" data-aktion="meister-dialog">Meister wählen</button></div></div>';
    }
    if (z.wurf) html += renderErgebnis(z.wurf);
    else if (z.offen) html += renderAnforderung(z.offen);
    else if (z.kampf) html += renderKampf(z.kampf);

    if (z.ende && !z.offen && !z.wurf) {
      html +=
        '<div class="karte ende-karte"><span class="eyebrow">Abenteuer abgeschlossen</span><p>' + esc(heldName()) + ' hat ' + z.held.ap + ' Abenteuerpunkte gesammelt.</p>' +
        '<button type="button" class="knopf haupt" data-aktion="neu-dialog">Neues Abenteuer</button></div>';
    } else if (!z.offen && !z.wurf && meister && !(fehler && z.verlauf.length && z.verlauf[z.verlauf.length - 1].rolle !== 'meister')) {
      const kampfOffen = z.kampf && (z.kampf.ungesendet.length || z.kampf.ergebnis);
      if (z.vorschlaege.length && !kampfOffen) {
        html += '<div class="vorschlaege" aria-label="Vorschläge">' + z.vorschlaege.map((v) => '<button type="button" class="vorschlag" data-aktion="vorschlag" data-text="' + esc(v) + '">' + esc(v) + '</button>').join('') + '</div>';
      }
      if (meister.freitext && !(z.kampf && z.kampf.ergebnis)) {
        html +=
          '<form class="eingabe" id="form-eingabe"><label for="eingabe" class="unsichtbar">Was tut ' + esc(heldName()) + '?</label>' +
          '<textarea id="eingabe" rows="2" placeholder="Was tut ' + esc(heldName()) + '? (Enter sendet, Umschalt+Enter für neue Zeile)">' + esc(entwurf) + '</textarea>' +
          '<button type="submit" class="knopf haupt">Handeln</button></form>';
      }
    }
    el.innerHTML = html;
  }

  // ---------- Darstellung: Würfeltisch ----------

  function renderWuerfeltisch() {
    const el = $('#wuerfeltisch');
    let html = '<div class="karte wuerfel-karte"><h2 class="panel-titel">Freier Wurf</h2>';
    html += '<div class="knopfreihe dicht">' + ['1W20', '3W20', '1W6', '2W6'].map((f) => '<button type="button" class="knopf klein" data-aktion="frei-formel" data-f="' + f + '">' + f + '</button>').join('') + '</div>';
    html += '<form class="formel-form" id="form-formel"><label for="formel" class="unsichtbar">Würfelformel</label><input type="text" id="formel" placeholder="z. B. 1W6+4" maxlength="10" spellcheck="false"><button type="submit" class="knopf klein">Würfeln</button></form>';
    if (freierWurf) {
      html += '<div class="frei-ergebnis status-' + freierWurf.status + '"><p class="eyebrow">' + esc(freierWurf.titel) + '</p><div class="wuerfelreihe klein" id="frei-wuerfel">';
      if (freierWurf.probe && freierWurf.probe.typ === 'talent') {
        html += freierWurf.probe.wuerfe.map((x, i) => '<span class="w-slot">' + w20(x, freierWurf.probe.eigenschaften[i].k) + '</span>').join('');
      } else if (freierWurf.probe) {
        html += '<span class="w-slot">' + w20(freierWurf.probe.wurf, freierWurf.probe.name) + '</span>';
      } else {
        html += freierWurf.wuerfe.map((d) => '<span class="w-slot">' + wuerfelGrafik(d.w, d.x) + '</span>').join('');
      }
      html += '</div><p class="klein">' + esc(freierWurf.text) + '</p>';
      if (freierWurf.probe && meister && meister.freitext && kannHandeln()) {
        html += '<button type="button" class="knopf klein" data-aktion="frei-melden">Dem Meister mitteilen</button>';
      }
      html += '</div>';
    }
    html += '</div>';

    html += '<div class="karte protokoll-karte"><div class="protokoll-kopf"><h2 class="panel-titel">Würfelprotokoll</h2><button type="button" class="knopf klein" data-aktion="kette">Kette prüfen</button></div>';
    if (ketteStatus) {
      html += '<p class="kette ' + (ketteStatus.ok ? 'ok' : 'bruch') + '" role="status">' +
        (ketteStatus.ok ? 'Kette intakt: ' + ketteStatus.anzahl + ' Einträge, keiner nachträglich verändert.' : 'Kette gebrochen bei Eintrag ' + ketteStatus.nr + ': Dieser Wurf wurde nachträglich verändert.') + '</p>';
    }
    const liste = protokoll.eintraege.slice(-80).reverse();
    if (!liste.length) {
      html += '<p class="leise klein">Noch keine Würfe. Jeder Wurf erscheint hier mit Uhrzeit und Prüfsumme.</p>';
    } else {
      html += '<ol class="protokoll">';
      liste.forEach((e) => {
        const zeit = new Date(e.zeit);
        const uhr = isNaN(zeit) ? '' : zeit.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        html +=
          '<li><div class="p-kopf"><span class="p-nr">#' + e.nr + '</span><span class="p-art">' + esc(e.art) + '</span><span class="p-zeit">' + uhr + '</span></div>' +
          '<p class="p-text">' + esc(e.text) + '</p>' +
          '<p class="p-wuerfe">' + e.wuerfe.map((w) => '<span>' + esc(w) + '</span>').join('') + '<span class="p-hash" title="' + esc(e.hash) + '">' + esc(e.hash.slice(0, 10)) + '…</span></p></li>';
      });
      html += '</ol>';
    }
    html += '</div>';

    html +=
      '<details class="karte erklaerung"><summary>Warum hier niemand schummeln kann</summary><ul>' +
      '<li><b>Zufall nur aus dem Programm.</b> Jeder Würfel kommt aus <code>crypto.getRandomValues</code>. Der Meister sieht Ergebnisse erst, wenn du sie ihm schickst.</li>' +
      '<li><b>Der Meister fordert an, er entscheidet nicht.</b> Er liefert Erzählung plus eine Anforderung in einem festen JSON-Format.</li>' +
      '<li><b>Der Regelwächter prüft jede Anforderung.</b> Unbekannte Talente, überzogene Erschwernisse oder unmögliche Gegnerwerte werden korrigiert oder verworfen – sichtbar unter der Erzählung.</li>' +
      '<li><b>Werte verwaltet nur der Spieltisch.</b> LeP, Schmerz, Schicksalspunkte, Kampf: alles gerechnet, nichts erzählt.</li>' +
      '<li><b>Das Protokoll ist verkettet.</b> Jeder Eintrag trägt den SHA-256-Hash seines Vorgängers. Eine nachträgliche Änderung bricht die Kette.</li>' +
      '</ul><p class="leise klein">Dasselbe Muster trägt jede KI-Integration: Das Modell formuliert und schlägt vor, deterministischer Code prüft, rechnet und führt aus.</p></details>';
    el.innerHTML = html;
  }

  // ---------- Kopf, Dialoge, Reiter ----------

  function renderKopf() {
    const knopf = $('#btn-meister');
    const name = meister ? meister.kurz : claudeAiStatus === 'pruefe' && z.backend === 'claudeai' ? 'verbinde …' : 'keiner';
    $('#meister-name').textContent = name;
    knopf.dataset.bereit = meister ? 'ja' : 'nein';
    knopf.title = meister ? meister.name : 'Meister wählen';
  }

  function render() {
    renderKopf();
    renderHeld();
    renderErzaehlung();
    renderAktion();
    renderWuerfeltisch();
    if (animieren) {
      const s = animieren;
      animieren = null;
      flackern(s);
    }
  }

  function zeigeReiter(name) {
    $('.spielflaeche').dataset.aktiv = name;
    document.querySelectorAll('.reiter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.reiter === name)));
  }

  function oeffneMeisterDialog() {
    const dlg = $('#dlg-meister');
    const f = $('#form-meister');
    const status = $('#claudeai-status');
    const radio = f.querySelector('input[value="claudeai"]');
    if (claudeAiStatus === 'ja') {
      status.textContent = 'Läuft über dein Claude-Konto. Beim ersten Zug fragt claude.ai um Erlaubnis.';
      radio.disabled = false;
    } else if (claudeAiStatus === 'pruefe') {
      status.textContent = 'Wird geprüft …';
      radio.disabled = true;
    } else {
      status.textContent = 'Nur verfügbar, wenn der Spieltisch als Artifact in claude.ai geöffnet ist.';
      radio.disabled = true;
    }
    f.querySelectorAll('input[name="backend"]').forEach((r) => {
      r.checked = r.value === z.backend;
    });
    $('#claudeai-stufe').value = z.stufe;
    const sel = $('#api-modell');
    sel.innerHTML = DSA.MODELLE.map((m) => '<option value="' + m.id + '">' + esc(m.name) + ' – ' + esc(m.hinweis) + '</option>').join('');
    sel.value = z.modell;
    $('#api-schluessel').value = apiSchluessel;
    let gemerkt = false;
    try {
      gemerkt = !!localStorage.getItem(SCHLUESSEL_SPEICHER);
    } catch (e) {
      gemerkt = false;
    }
    $('#api-merken').checked = gemerkt;
    $('#meister-fehler').hidden = true;
    zeigeExtras();
    dlg.showModal();
  }

  function zeigeExtras() {
    const gewaehlt = ($('#form-meister').querySelector('input[name="backend"]:checked') || {}).value;
    document.querySelectorAll('#form-meister .wahl-extra').forEach((x) => {
      x.hidden = x.dataset.fuer !== gewaehlt;
    });
  }

  function uebernehmeMeisterDialog() {
    const f = $('#form-meister');
    const gewaehlt = (f.querySelector('input[name="backend"]:checked') || {}).value || 'solo';
    const meldung = $('#meister-fehler');
    if (gewaehlt === 'api') {
      const s = $('#api-schluessel').value.trim();
      if (!s) {
        meldung.textContent = 'Trage einen API-Schlüssel ein, um Claude über die API zu nutzen.';
        meldung.hidden = false;
        return false;
      }
      apiSchluessel = s;
      z.modell = $('#api-modell').value;
      try {
        if ($('#api-merken').checked) localStorage.setItem(SCHLUESSEL_SPEICHER, s);
        else localStorage.removeItem(SCHLUESSEL_SPEICHER);
      } catch (e) {
        /* ohne Speicher gilt der Schlüssel nur für diese Sitzung */
      }
    }
    if (gewaehlt === 'claudeai') z.stufe = $('#claudeai-stufe').value;
    const vorher = z.backend;
    z.backend = gewaehlt;
    meister = erzeugeMeister();
    if (fehler && fehler.dauerhaft) fehler = null;
    // Ein laufendes Abenteuer lässt sich zwischen Claude-Meistern weitergeben,
    // das Solo-Abenteuer hat aber seinen eigenen Handlungsfaden.
    if (z.gestartet && (vorher === 'solo') !== (z.backend === 'solo')) {
      z.verlauf.push({
        rolle: 'tisch',
        text: z.backend === 'solo'
          ? 'Der Meister wechselt zum Solo-Abenteuer. Starte ein neues Abenteuer, um es zu spielen.'
          : 'Ein neuer Meister übernimmt den Tisch und setzt die Geschichte fort.',
        status: 'neutral',
      });
      if (z.backend === 'solo') z.ende = true;
    }
    speichern();
    render();
    return true;
  }

  function oeffneNeuDialog() {
    const solo = !meister || !meister.freitext;
    $('#neu-hinweis').textContent = solo
      ? 'Der Solo-Meister kennt ein Abenteuer: „Das dunkle Leuchtfeuer“. Für eigene Aufhänger wähle Claude als Meister.'
      : 'Wähle einen Aufhänger oder schreibe deinen eigenen. ' + (meister ? meister.name : '') + ' übernimmt den Rest.';
    $('#neu-szenarien').innerHTML = solo
      ? ''
      : SZENARIEN.map(
          (s, i) =>
            '<label class="wahl-karte"><input type="radio" name="szenario" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span><b>' + esc(s.titel) + '</b><small>' + esc(s.text) + '</small></span></label>'
        ).join('');
    $('#neu-eigen').hidden = solo;
    $('#neu-eigen-label').hidden = solo;
    $('#neu-eigen').value = '';
    $('#dlg-neu').showModal();
  }

  function oeffneExport() {
    $('#export-text').value = JSON.stringify(z.held, null, 2);
    $('#export-meldung').textContent = '';
    $('#dlg-export').showModal();
  }

  // ---------- Ereignisse ----------

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-aktion]');
    if (!b || b.disabled) return;
    const a = b.dataset.aktion;
    switch (a) {
      case 'wuerfeln':
        wuerfleOffeneProbe();
        break;
      case 'schip':
        schicksalspunkt();
        break;
      case 'neuwurf-wahl': {
        const i = Number(b.dataset.i);
        if (neuwurfAuswahl.has(i)) neuwurfAuswahl.delete(i);
        else neuwurfAuswahl.add(i);
        renderAktion();
        break;
      }
      case 'senden':
        ergebnisSenden();
        break;
      case 'kampfrunde':
        kampfrundeWuerfeln();
        requestAnimationFrame(() => {
          const log = $('#kampf-log');
          if (log) log.scrollTop = log.scrollHeight;
          const knoepfe = $('#aktion .kampf-karte .knopfreihe');
          if (knoepfe) knoepfe.scrollIntoView({ block: 'nearest' });
        });
        break;
      case 'kampf-senden':
        kampfSenden();
        break;
      case 'ziel':
        if (z.kampf) z.kampf.ziel = Number(b.dataset.i);
        speichern();
        renderAktion();
        break;
      case 'verteidigung':
        if (z.kampf) z.kampf.verteidigung = b.dataset.v;
        speichern();
        renderAktion();
        break;
      case 'vorschlag':
        if (kannHandeln()) freiHandeln(b.dataset.text);
        break;
      case 'erneut':
        fehler = null;
        frageMeister();
        break;
      case 'stop':
        if (laufend) laufend.abort();
        break;
      case 'meister-dialog':
        oeffneMeisterDialog();
        break;
      case 'neu-dialog':
        oeffneNeuDialog();
        break;
      case 'start-solo':
        z.backend = 'solo';
        meister = erzeugeMeister();
        neuesAbenteuer('', true);
        break;
      case 'start-claude':
        z.backend = 'claudeai';
        meister = erzeugeMeister();
        oeffneNeuDialog();
        break;
      case 'bearbeiten':
        bearbeiten = true;
        renderHeld();
        break;
      case 'bearbeiten-abbrechen':
        bearbeiten = false;
        renderHeld();
        break;
      case 'standard-held': {
        const s = DSA.standardHeld();
        bearbeiten = false;
        z.held = s;
        speichern();
        render();
        break;
      }
      case 'sichern':
        oeffneExport();
        break;
      case 'rast':
        rasten();
        break;
      case 'frei-talent':
        freieProbe('talent', b.dataset.name);
        break;
      case 'frei-eig':
        freieProbe('eigenschaft', b.dataset.k);
        break;
      case 'frei-formel':
        freieProbe('formel', b.dataset.f);
        break;
      case 'frei-melden':
        freienWurfMelden();
        break;
      case 'kette':
        ketteStatus = protokoll.pruefen();
        renderWuerfeltisch();
        break;
    }
  });

  document.addEventListener('submit', (ev) => {
    const f = ev.target;
    if (f.id === 'form-eingabe') {
      ev.preventDefault();
      if (kannHandeln()) freiHandeln($('#eingabe').value);
    } else if (f.id === 'form-formel') {
      ev.preventDefault();
      const eingabe = $('#formel').value;
      if (DSA.parseFormel(eingabe)) freieProbe('formel', eingabe);
      else {
        $('#formel').setCustomValidity('Bitte eine Formel wie 1W20, 3W6 oder 1W6+4 eingeben.');
        $('#formel').reportValidity();
      }
    } else if (f.id === 'form-held') {
      ev.preventDefault();
      try {
        z.held = heldAusFormular();
        bearbeiten = false;
        speichern();
        render();
      } catch (e) {
        /* pruefeHeld korrigiert Werte selbst; ein Fehler hier heißt: Formular unvollständig */
      }
    } else if (f.id === 'form-meister') {
      ev.preventDefault();
      if (uebernehmeMeisterDialog()) $('#dlg-meister').close();
    } else if (f.id === 'form-neu') {
      ev.preventDefault();
      const eigen = $('#neu-eigen').value.trim();
      const r = f.querySelector('input[name="szenario"]:checked');
      const s = SZENARIEN[r ? Number(r.value) : 0];
      $('#dlg-neu').close();
      neuesAbenteuer(eigen || s.titel + ': ' + s.text, $('#neu-heilen').checked);
    }
  });

  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'eingabe') entwurf = ev.target.value;
    if (ev.target.id === 'formel') ev.target.setCustomValidity('');
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.target.id === 'eingabe' && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      if (kannHandeln()) freiHandeln(ev.target.value);
    }
  });

  document.addEventListener('change', (ev) => {
    if (ev.target.name === 'backend') zeigeExtras();
  });

  document.querySelectorAll('[data-schliessen]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('.reiter button').forEach((b) => b.addEventListener('click', () => zeigeReiter(b.dataset.reiter)));
  $('#btn-meister').addEventListener('click', oeffneMeisterDialog);
  $('#btn-neu').addEventListener('click', oeffneNeuDialog);

  $('#btn-kopieren').addEventListener('click', () => {
    const feld = $('#export-text');
    const meldung = $('#export-meldung');
    const fallback = () => {
      feld.focus();
      feld.select();
      meldung.textContent = 'Text ist markiert – kopiere ihn mit Strg+C bzw. ⌘+C.';
    };
    try {
      navigator.clipboard.writeText(feld.value).then(() => {
        meldung.textContent = 'Heldenbogen kopiert.';
      }, fallback);
    } catch (e) {
      fallback();
    }
  });

  $('#btn-import').addEventListener('click', () => {
    const meldung = $('#export-meldung');
    try {
      z.held = DSA.pruefeHeld(JSON.parse($('#export-text').value));
      speichern();
      render();
      meldung.textContent = 'Heldenbogen von ' + z.held.name + ' übernommen.';
    } catch (e) {
      meldung.textContent = 'Das ist kein gültiger Heldenbogen: ' + e.message;
    }
  });

  // ---------- Start ----------

  async function pruefeClaudeAi() {
    const c = window.claude;
    if (!c || typeof c.use !== 'function') {
      claudeAiStatus = 'nein';
    } else {
      try {
        sampleFn = await c.use('sample');
      } catch (e) {
        sampleFn = null;
      }
      claudeAiStatus = sampleFn ? 'ja' : 'nein';
    }
    if (claudeAiStatus === 'ja' && !hatteSpielstand) z.backend = 'claudeai';
    if (z.backend === 'claudeai' && claudeAiStatus === 'nein') {
      z.backend = 'solo';
      if (z.gestartet) {
        z.verlauf.push({ rolle: 'tisch', text: 'Claude ist hier nicht erreichbar. Wähle unter „Meister“ einen anderen Meister, um weiterzuspielen.', status: 'neutral' });
      }
    }
    meister = erzeugeMeister();
    speichern();
    render();
  }

  laden();
  meister = erzeugeMeister();
  render();
  pruefeClaudeAi();
})();
