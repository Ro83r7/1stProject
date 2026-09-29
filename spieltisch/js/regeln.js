/*
 * Regelkern, angelehnt an DSA 5 (vereinfacht, siehe README).
 *
 * Alle Funktionen sind rein: Sie bekommen Werte und einen Würfelbecher und
 * liefern ein Ergebnisobjekt. Die Oberfläche zeigt es an, der Meister
 * bekommt es als Text – ändern kann er es nicht.
 */
(function (root) {
  'use strict';
  const DSA = (root.DSA = root.DSA || {});

  const EIGENSCHAFTEN = [
    { k: 'MU', name: 'Mut' },
    { k: 'KL', name: 'Klugheit' },
    { k: 'IN', name: 'Intuition' },
    { k: 'CH', name: 'Charisma' },
    { k: 'FF', name: 'Fingerfertigkeit' },
    { k: 'GE', name: 'Gewandtheit' },
    { k: 'KO', name: 'Konstitution' },
    { k: 'KK', name: 'Körperkraft' },
  ];

  // [Name, Gruppe, Probe]
  const TALENT_TABELLE = [
    ['Fliegen', 'Körper', 'MU/IN/GE'],
    ['Gaukeleien', 'Körper', 'MU/CH/FF'],
    ['Klettern', 'Körper', 'MU/GE/KK'],
    ['Körperbeherrschung', 'Körper', 'GE/GE/KO'],
    ['Kraftakt', 'Körper', 'KO/KK/KK'],
    ['Reiten', 'Körper', 'CH/GE/KK'],
    ['Schwimmen', 'Körper', 'GE/KO/KK'],
    ['Selbstbeherrschung', 'Körper', 'MU/MU/KO'],
    ['Singen', 'Körper', 'KL/CH/KO'],
    ['Sinnesschärfe', 'Körper', 'KL/IN/IN'],
    ['Tanzen', 'Körper', 'KL/CH/GE'],
    ['Taschendiebstahl', 'Körper', 'MU/FF/GE'],
    ['Verbergen', 'Körper', 'MU/IN/GE'],
    ['Zechen', 'Körper', 'KL/KO/KK'],
    ['Bekehren & Überzeugen', 'Gesellschaft', 'MU/KL/CH'],
    ['Betören', 'Gesellschaft', 'MU/CH/CH'],
    ['Einschüchtern', 'Gesellschaft', 'MU/IN/CH'],
    ['Etikette', 'Gesellschaft', 'KL/IN/CH'],
    ['Gassenwissen', 'Gesellschaft', 'KL/IN/CH'],
    ['Menschenkenntnis', 'Gesellschaft', 'KL/IN/CH'],
    ['Überreden', 'Gesellschaft', 'MU/IN/CH'],
    ['Verkleiden', 'Gesellschaft', 'IN/CH/GE'],
    ['Willenskraft', 'Gesellschaft', 'MU/IN/CH'],
    ['Fährtensuchen', 'Natur', 'MU/IN/GE'],
    ['Fesseln', 'Natur', 'KL/FF/KK'],
    ['Fischen & Angeln', 'Natur', 'FF/GE/KO'],
    ['Orientierung', 'Natur', 'KL/IN/IN'],
    ['Pflanzenkunde', 'Natur', 'KL/FF/KO'],
    ['Tierkunde', 'Natur', 'MU/MU/CH'],
    ['Wildnisleben', 'Natur', 'MU/GE/KO'],
    ['Brett- & Glücksspiel', 'Wissen', 'KL/KL/IN'],
    ['Geographie', 'Wissen', 'KL/KL/IN'],
    ['Geschichtswissen', 'Wissen', 'KL/KL/IN'],
    ['Götter & Kulte', 'Wissen', 'KL/KL/IN'],
    ['Kriegskunst', 'Wissen', 'MU/KL/IN'],
    ['Magiekunde', 'Wissen', 'KL/KL/IN'],
    ['Mechanik', 'Wissen', 'KL/KL/FF'],
    ['Rechnen', 'Wissen', 'KL/KL/IN'],
    ['Rechtskunde', 'Wissen', 'KL/KL/IN'],
    ['Sagen & Legenden', 'Wissen', 'KL/KL/IN'],
    ['Sphärenkunde', 'Wissen', 'KL/KL/IN'],
    ['Sternkunde', 'Wissen', 'KL/KL/IN'],
    ['Alchimie', 'Handwerk', 'MU/KL/FF'],
    ['Boote & Schiffe', 'Handwerk', 'FF/GE/KK'],
    ['Fahrzeuge', 'Handwerk', 'CH/FF/KO'],
    ['Handel', 'Handwerk', 'KL/IN/CH'],
    ['Heilkunde Gift', 'Handwerk', 'MU/KL/IN'],
    ['Heilkunde Krankheiten', 'Handwerk', 'MU/IN/KO'],
    ['Heilkunde Seele', 'Handwerk', 'IN/CH/KO'],
    ['Heilkunde Wunden', 'Handwerk', 'KL/FF/FF'],
    ['Holzbearbeitung', 'Handwerk', 'FF/GE/KK'],
    ['Lebensmittelbearbeitung', 'Handwerk', 'IN/FF/FF'],
    ['Lederbearbeitung', 'Handwerk', 'FF/GE/KO'],
    ['Malen & Zeichnen', 'Handwerk', 'IN/FF/FF'],
    ['Metallbearbeitung', 'Handwerk', 'FF/KO/KK'],
    ['Musizieren', 'Handwerk', 'CH/FF/KO'],
    ['Schlösserknacken', 'Handwerk', 'IN/FF/FF'],
    ['Steinbearbeitung', 'Handwerk', 'FF/FF/KK'],
    ['Stoffbearbeitung', 'Handwerk', 'KL/FF/FF'],
  ];

  const TALENTE = TALENT_TABELLE.map(([name, gruppe, probe]) => ({
    name,
    gruppe,
    probe: probe.split('/'),
  }));
  const TALENT_GRUPPEN = ['Körper', 'Gesellschaft', 'Natur', 'Wissen', 'Handwerk'];

  // Häufige Namen, die nicht im DSA5-Talentkanon stehen.
  const TALENT_ALIASE = {
    wahrnehmung: 'Sinnesschärfe',
    sinnesschaerfe: 'Sinnesschärfe',
    schleichen: 'Verbergen',
    sichverstecken: 'Verbergen',
    athletik: 'Körperbeherrschung',
    akrobatik: 'Körperbeherrschung',
    heilkunde: 'Heilkunde Wunden',
    ueberzeugen: 'Bekehren & Überzeugen',
    bekehren: 'Bekehren & Überzeugen',
    seefahrt: 'Boote & Schiffe',
    boote: 'Boote & Schiffe',
    segeln: 'Boote & Schiffe',
    rudern: 'Boote & Schiffe',
    spurensuche: 'Fährtensuchen',
    faehrtenlesen: 'Fährtensuchen',
    einschuechterung: 'Einschüchtern',
    gluecksspiel: 'Brett- & Glücksspiel',
    schloesseroeffnen: 'Schlösserknacken',
    fischen: 'Fischen & Angeln',
    angeln: 'Fischen & Angeln',
    sagen: 'Sagen & Legenden',
    legenden: 'Sagen & Legenden',
    goetter: 'Götter & Kulte',
    religion: 'Götter & Kulte',
    zeichnen: 'Malen & Zeichnen',
  };

  function normiere(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z]/g, '');
  }

  const TALENT_INDEX = {};
  TALENTE.forEach((t) => {
    TALENT_INDEX[normiere(t.name)] = t;
  });

  /** Findet ein Talent über Namen oder Alias; null, wenn es keins gibt. */
  function findeTalent(name) {
    const n = normiere(name);
    if (!n) return null;
    if (TALENT_INDEX[n]) return TALENT_INDEX[n];
    if (TALENT_ALIASE[n]) return TALENT_INDEX[normiere(TALENT_ALIASE[n])];
    return null;
  }

  /** "MU", "Mut", "mut" -> "MU"; sonst null. */
  function findeEigenschaft(name) {
    const n = normiere(name);
    for (const e of EIGENSCHAFTEN) {
      if (n === normiere(e.k) || n === normiere(e.name)) return e.k;
    }
    return null;
  }

  // ---------- Zustandswerte ----------

  /** Schmerzstufe nach DSA5: ≤¾, ≤½, ≤¼ der LeP und ≤5 LeP – je Stufe –1 auf Proben. */
  function schmerzStufe(held) {
    const max = held.lep.max;
    const lep = held.lep.aktuell;
    let stufe = 0;
    if (lep <= max * 0.75) stufe++;
    if (lep <= max * 0.5) stufe++;
    if (lep <= max * 0.25) stufe++;
    if (lep <= 5) stufe++;
    return Math.min(4, stufe);
  }

  const ROEMISCH = ['', 'I', 'II', 'III', 'IV'];

  function qsAusFP(fp) {
    return Math.min(6, Math.max(1, Math.ceil(fp / 3)));
  }

  // ---------- Fertigkeitsprobe (3W20) ----------

  /**
   * Wertet drei Würfe gegen drei (bereits modifizierte) Eigenschaftswerte aus.
   * Doppel-1 = kritischer Erfolg, Doppel-20 = Patzer, Dreifach = spektakulär.
   */
  function auswertenTalent(werte, fw, wuerfe) {
    const einsen = wuerfe.filter((w) => w === 1).length;
    const zwanziger = wuerfe.filter((w) => w === 20).length;
    const ueber = wuerfe.map((w, i) => Math.max(0, w - werte[i]));
    let fpRest = fw - ueber.reduce((a, b) => a + b, 0);
    let gelungen = fpRest >= 0;
    let kritisch = false;
    let patzer = false;
    let spektakulaer = false;
    if (zwanziger >= 2) {
      patzer = true;
      gelungen = false;
      spektakulaer = zwanziger === 3;
    } else if (einsen >= 2) {
      kritisch = true;
      gelungen = true;
      spektakulaer = einsen === 3;
      if (fpRest < 0) fpRest = 0;
    }
    return {
      wuerfe: wuerfe.slice(),
      ueber,
      fpRest,
      gelungen,
      qs: gelungen ? qsAusFP(fpRest) : 0,
      kritisch,
      patzer,
      spektakulaer,
    };
  }

  /**
   * Talentprobe für einen Helden. erschwernis > 0 macht die Probe schwerer,
   * < 0 leichter; Schmerz wird automatisch addiert.
   */
  function talentprobe(held, talentName, erschwernis, becher) {
    const talent = findeTalent(talentName);
    if (!talent) throw new Error('Unbekanntes Talent: ' + talentName);
    const fw = Math.max(0, Number(held.talente[talent.name]) || 0);
    const schmerz = schmerzStufe(held);
    const mod = (Number(erschwernis) || 0) + schmerz;
    const eig = talent.probe.map((k) => ({ k, basis: held.eigenschaften[k], wert: held.eigenschaften[k] - mod }));
    const wuerfe = [becher.w(20), becher.w(20), becher.w(20)];
    return Object.assign(
      {
        typ: 'talent',
        name: talent.name,
        eigenschaften: eig,
        fw,
        erschwernis: Number(erschwernis) || 0,
        schmerz,
      },
      auswertenTalent(
        eig.map((e) => e.wert),
        fw,
        wuerfe
      )
    );
  }

  /**
   * Schicksalspunkt: gewählte Würfel neu werfen, je Würfel zählt der bessere
   * (niedrigere) Wert. Gibt eine neue Auswertung zurück.
   */
  function talentNeuwurf(probe, indizes, becher) {
    const neu = probe.wuerfe.slice();
    const neuWuerfe = [];
    indizes.forEach((i) => {
      const x = becher.w(20);
      neuWuerfe.push({ i, x });
      neu[i] = Math.min(neu[i], x);
    });
    return Object.assign(
      {},
      probe,
      auswertenTalent(
        probe.eigenschaften.map((e) => e.wert),
        probe.fw,
        neu
      ),
      { neuwurf: neuWuerfe, vorNeuwurf: probe.wuerfe.slice() }
    );
  }

  // ---------- Einzelwürfe (Eigenschaft, Attacke, Parade) ----------

  /** 1W20 gegen einen Wert. Eine 1 bzw. 20 wird mit einem zweiten Wurf bestätigt. */
  function einzelwurf(wert, becher) {
    if (wert <= 0) {
      return { wurf: null, wert, gelungen: false, kritisch: false, patzer: false, bestaetigung: null, unmoeglich: true };
    }
    const wurf = becher.w(20);
    let gelungen = wurf <= wert && wurf !== 20;
    let kritisch = false;
    let patzer = false;
    let bestaetigung = null;
    if (wurf === 1) {
      gelungen = true;
      bestaetigung = becher.w(20);
      kritisch = bestaetigung <= wert;
    } else if (wurf === 20) {
      gelungen = false;
      bestaetigung = becher.w(20);
      patzer = bestaetigung > wert;
    }
    return { wurf, wert, gelungen, kritisch, patzer, bestaetigung };
  }

  function eigenschaftsprobe(held, kuerzel, erschwernis, becher) {
    const k = findeEigenschaft(kuerzel);
    if (!k) throw new Error('Unbekannte Eigenschaft: ' + kuerzel);
    const schmerz = schmerzStufe(held);
    const basis = held.eigenschaften[k];
    const wert = basis - (Number(erschwernis) || 0) - schmerz;
    return Object.assign(
      { typ: 'eigenschaft', name: k, basis, erschwernis: Number(erschwernis) || 0, schmerz },
      einzelwurf(wert, becher)
    );
  }

  function eigenschaftNeuwurf(probe, becher) {
    const x = becher.w(20);
    if (probe.wurf === null || x >= probe.wurf) {
      return Object.assign({}, probe, { neuwurf: [{ i: 0, x }], vorNeuwurf: [probe.wurf] });
    }
    // Der bessere Wurf zählt – bei 1 oder 20 wird neu bestätigt.
    const folge = [x];
    const quelle = {
      w: (s) => (folge.length ? folge.shift() : becher.w(s)),
    };
    return Object.assign({}, probe, einzelwurf(probe.wert, quelle), { neuwurf: [{ i: 0, x }], vorNeuwurf: [probe.wurf] });
  }

  // ---------- Kampf ----------

  function wurfText(r) {
    return 'Wurf ' + r.wurf + (r.bestaetigung ? ' (Bestätigung ' + r.bestaetigung + ')' : '');
  }

  function lebt(g) {
    return g.lep > 0;
  }

  function lepText(name, lep, max) {
    return name + ' ' + lep + '/' + max + ' LeP';
  }

  /**
   * Eine Kampfrunde (vereinfacht): Die Heldin greift ihr Ziel an, danach greift
   * jeder stehende Gegner die Heldin an. Jede weitere Verteidigung in derselben
   * Runde ist um 3 erschwert. Ein kritischer Treffer halbiert die Verteidigung
   * und verdoppelt die TP. Ein Patzer bei der Attacke erschwert die eigenen
   * Verteidigungen dieser Runde um 4 (Hausregel statt Patzertabelle).
   *
   * Verändert held.lep.aktuell und gegner[].lep; gibt die Ereignisse zurück.
   */
  function kampfrunde(held, kampf, becher) {
    const ereignisse = [];
    const schmerz = schmerzStufe(held);
    const name = held.name || 'Die Heldin';
    let zielIdx = kampf.ziel;
    if (!kampf.gegner[zielIdx] || !lebt(kampf.gegner[zielIdx])) {
      zielIdx = kampf.gegner.findIndex(lebt);
    }
    let eigeneVerteidigungMalus = 0;

    if (zielIdx >= 0 && held.lep.aktuell > 0) {
      const ziel = kampf.gegner[zielIdx];
      const at = einzelwurf(held.kampf.at - schmerz, becher);
      const teile = [name + ' greift ' + ziel.name + ' an: AT ' + at.wert + ', ' + wurfText(at)];
      if (at.kritisch) teile.push('KRITISCHER TREFFER');
      if (at.patzer) {
        teile.push('PATZER – ' + name + ' gerät aus dem Gleichgewicht (eigene Verteidigung diese Runde –4)');
        eigeneVerteidigungMalus = 4;
      }
      if (at.gelungen) {
        const paWert = at.kritisch ? Math.floor(ziel.pa / 2) : ziel.pa;
        const pa = einzelwurf(paWert, becher);
        if (pa.unmoeglich) teile.push(ziel.name + ' kann nicht parieren');
        else teile.push(ziel.name + ' pariert (PA ' + paWert + ', ' + wurfText(pa) + ')' + (pa.gelungen ? ' – abgewehrt' : ' – misslungen'));
        if (!pa.gelungen) {
          const tp = becher.wurf(held.kampf.tp);
          const tpGesamt = tp.summe * (at.kritisch ? 2 : 1);
          const sp = Math.max(0, tpGesamt - ziel.rs);
          ziel.lep -= sp;
          teile.push(
            'Schaden ' + tp.formel + ' = ' + tp.summe + (at.kritisch ? ' ×2' : '') + ', RS ' + ziel.rs + ' → ' + sp + ' SP'
          );
          if (!lebt(ziel)) teile.push(ziel.name + ' ist kampfunfähig');
        }
      } else if (!at.patzer) {
        teile.push('verfehlt');
      }
      ereignisse.push({ wer: 'held', text: teile.join('; ') + '.' });
    }

    let verteidigungen = 0;
    kampf.gegner.forEach((g) => {
      if (!lebt(g) || held.lep.aktuell <= 0) return;
      const at = einzelwurf(g.at, becher);
      const teile = [g.name + ' greift an: AT ' + g.at + ', ' + wurfText(at)];
      if (at.patzer) teile.push('PATZER – der Angriff geht ins Leere');
      if (at.kritisch) teile.push('KRITISCHER TREFFER');
      if (at.gelungen) {
        const art = kampf.verteidigung === 'ausweichen' ? 'Ausweichen' : 'Parade';
        const basis = art === 'Ausweichen' ? held.kampf.aw : held.kampf.pa;
        let wert = basis - schmerz - eigeneVerteidigungMalus - 3 * verteidigungen;
        if (at.kritisch) wert = Math.floor(wert / 2);
        verteidigungen++;
        const vt = einzelwurf(wert, becher);
        if (vt.unmoeglich) teile.push(name + ' kann sich nicht verteidigen (' + art + ' ' + wert + ')');
        else teile.push(name + ': ' + art + ' ' + wert + ', ' + wurfText(vt) + (vt.gelungen ? ' – abgewehrt' : ' – misslungen'));
        if (!vt.gelungen) {
          const tp = becher.wurf(g.tp);
          const tpGesamt = tp.summe * (at.kritisch ? 2 : 1);
          const sp = Math.max(0, tpGesamt - held.kampf.rs);
          held.lep.aktuell -= sp;
          teile.push(
            'Schaden ' + tp.formel + ' = ' + tp.summe + (at.kritisch ? ' ×2' : '') + ', RS ' + held.kampf.rs + ' → ' + sp + ' SP'
          );
          if (held.lep.aktuell <= 0) teile.push(name + ' bricht zusammen');
        }
      } else if (!at.patzer) {
        teile.push('verfehlt');
      }
      ereignisse.push({ wer: 'gegner', text: teile.join('; ') + '.' });
    });

    kampf.runde = (kampf.runde || 0) + 1;
    let ergebnis = null;
    if (held.lep.aktuell <= 0) ergebnis = 'niederlage';
    else if (!kampf.gegner.some(lebt)) ergebnis = 'sieg';

    const stand = [lepText(name, held.lep.aktuell, held.lep.max)]
      .concat(kampf.gegner.map((g) => lepText(g.name, Math.max(0, g.lep), g.lepMax) + (lebt(g) ? '' : ' (kampfunfähig)')))
      .join(', ');

    return { runde: kampf.runde, ereignisse, ergebnis, stand };
  }

  // ---------- Texte für den Meister ----------

  function vorzeichen(n) {
    return n > 0 ? '+' + n : String(n);
  }

  function probeText(p) {
    if (p.typ === 'talent') {
      const eig = p.eigenschaften.map((e) => e.k).join('/');
      const mods = [];
      if (p.erschwernis) mods.push((p.erschwernis > 0 ? 'erschwert um ' : 'erleichtert um ') + Math.abs(p.erschwernis));
      if (p.schmerz) mods.push('Schmerz ' + ROEMISCH[p.schmerz] + ' (–' + p.schmerz + ')');
      let urteil;
      if (p.patzer) urteil = p.spektakulaer ? 'SPEKTAKULÄRER PATZER (dreifach 20)' : 'PATZER (Doppel-20)';
      else if (p.kritisch) urteil = (p.spektakulaer ? 'SPEKTAKULÄRER ERFOLG (dreifach 1)' : 'KRITISCHER ERFOLG (Doppel-1)') + ', QS ' + p.qs;
      else if (p.gelungen) urteil = 'GELUNGEN mit QS ' + p.qs + ' (' + p.fpRest + ' FP übrig)';
      else urteil = 'MISSLUNGEN (' + Math.abs(p.fpRest) + ' Punkte zu wenig)';
      return (
        'Probe auf ' + p.name + ' (' + eig + ', FW ' + p.fw + ')' + (mods.length ? ', ' + mods.join(', ') : '') +
        ': Würfe ' + p.wuerfe.join('/') + ' gegen ' + p.eigenschaften.map((e) => e.wert).join('/') +
        (p.neuwurf ? ' (nach Schicksalspunkt)' : '') + ' → ' + urteil + '.'
      );
    }
    if (p.typ === 'eigenschaft') {
      let urteil = p.patzer ? 'PATZER' : p.kritisch ? 'KRITISCHER ERFOLG' : p.gelungen ? 'GELUNGEN' : 'MISSLUNGEN';
      if (p.unmoeglich) urteil = 'MISSLUNGEN (Wert unter 1)';
      const mods = [];
      if (p.erschwernis) mods.push('Mod. ' + vorzeichen(-p.erschwernis));
      if (p.schmerz) mods.push('Schmerz –' + p.schmerz);
      return (
        'Eigenschaftsprobe ' + p.name + ' ' + p.basis + (mods.length ? ' (' + mods.join(', ') + ' → ' + p.wert + ')' : '') +
        ': Wurf ' + p.wurf + (p.bestaetigung ? ', Bestätigung ' + p.bestaetigung : '') +
        (p.neuwurf ? ' (nach Schicksalspunkt)' : '') + ' → ' + urteil + '.'
      );
    }
    return '';
  }

  Object.assign(DSA, {
    EIGENSCHAFTEN,
    TALENTE,
    TALENT_GRUPPEN,
    ROEMISCH,
    normiere,
    findeTalent,
    findeEigenschaft,
    schmerzStufe,
    qsAusFP,
    auswertenTalent,
    talentprobe,
    talentNeuwurf,
    einzelwurf,
    eigenschaftsprobe,
    eigenschaftNeuwurf,
    kampfrunde,
    probeText,
  });
})(typeof window !== 'undefined' ? window : globalThis);
