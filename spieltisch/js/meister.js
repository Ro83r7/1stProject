/*
 * Der Meister: Protokoll zwischen Spieltisch-Programm und Sprachmodell.
 *
 * Das Muster:
 *   1. Das Modell erzählt und darf eine Probe, Schaden/Heilung oder Gegner
 *      *anfordern* – in einem festen JSON-Format.
 *   2. Der Regelwächter prüft jede Anforderung gegen die Regeln
 *      (gibt es das Talent? ist die Erschwernis plausibel? sind die
 *      Gegnerwerte im Rahmen?) und korrigiert oder verwirft sie.
 *   3. Das Programm würfelt, rechnet und verwaltet alle Werte.
 *   4. Das Ergebnis geht als verbindliche Nachricht zurück ans Modell,
 *      das nur noch die Folgen erzählt.
 *
 * Drei austauschbare Meister sprechen dasselbe Format:
 *   - ClaudeAiMeister: Claude über claude.ai (wenn die Seite dort als Artifact läuft)
 *   - ApiMeister:      Claude über die Anthropic API mit eigenem Schlüssel
 *   - DSA.SoloMeister: ein festes Offline-Abenteuer (solo.js)
 */
(function (root) {
  'use strict';
  const DSA = (root.DSA = root.DSA || {});

  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.129.0/+esm';

  const MODELLE = [
    { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', hinweis: 'beste Erzählqualität' },
    { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', hinweis: 'schneller, günstiger' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', hinweis: 'am schnellsten' },
  ];

  // ---------- Anweisungen an den Meister ----------

  function talentListe() {
    return DSA.TALENT_GRUPPEN.map(
      (g) => g + ': ' + DSA.TALENTE.filter((t) => t.gruppe === g).map((t) => t.name + ' (' + t.probe.join('/') + ')').join(', ')
    ).join('\n');
  }

  const REGELN = [
    'Du bist der Meister (die Spielleitung) einer Runde „Das Schwarze Auge“ (DSA, 5. Edition) in Aventurien. Am Tisch sitzt eine Person, die eine einzelne Heldin spielt.',
    '',
    'ARBEITSTEILUNG – die wichtigste Regel:',
    '- Du würfelst nie. Du erfindest keine Würfelergebnisse, keine Trefferpunkte, keinen Schaden und keine Änderungen an Lebenspunkten, Schicksalspunkten oder Werten. Alle Zufälle und Werte verwaltet das Spieltisch-Programm.',
    '- Ist der Ausgang einer Handlung ungewiss, forderst du im Feld "probe" eine Probe an und beendest die Erzählung im Moment vor dem Wurf. Verrate nicht, ob sie gelingt.',
    '- Nachrichten, die mit [Spieltisch] beginnen, stammen vom Programm und sind verbindlich. Erzähle die Folgen passend zum Ergebnis: Qualitätsstufe (QS 1 knapp … QS 6 meisterhaft), kritischer Erfolg, Patzer. Deute ein Ergebnis nie um.',
    '- Schaden außerhalb des Kampfes (Sturz, Feuer, Kälte, Gift) forderst du als probe mit typ "schaden" und einer Würfelformel an, z. B. "1W6+2". Heilung ebenso mit typ "heilung".',
    '- Einen Kampf beginnst du, indem du im Feld "kampf" Gegner mit Werten nennst (Richtwerte: Räuber LeP 25, AT 11, PA 5, RS 1, TP 1W6+2; Wolf LeP 20, AT 12, PA 0, RS 1, TP 1W6+3; erfahrene Kämpferin LeP 32, AT 14, PA 8, RS 3, TP 1W6+4). Die Kampfrunden würfelt das Programm, du erzählst sie. Während eines Kampfes forderst du keine Attacke- oder Paradeproben an.',
    '- Setze "kampf_beenden" auf true, wenn Gegner fliehen, sich ergeben oder der Kampf erzählerisch endet.',
    '- Höchstens eine Probe pro Antwort. Keine Probe für Selbstverständliches oder wenn ein Scheitern nichts Interessantes auslöst.',
    '- Nutze nur die Talentnamen aus der Liste unten. Erschwernis: positive Zahl = schwerer, negative = leichter. Üblich sind –3 bis +3, mehr nur in Ausnahmefällen (Grenze +5).',
    '- "ap": Abenteuerpunkte, nur für erreichte Etappen oder gute Ideen (0 bis 10, meist 0).',
    '- "inventar_neu": nur Gegenstände, die die Heldin gerade tatsächlich an sich nimmt.',
    '',
    'ERZÄHLSTIL:',
    '- Deutsch, lebendig und aventurisch: Götter (Praios, Rondra, Efferd, Travia, Boron, Hesinde, Firun, Tsa, Phex, Peraine, Ingerimm, Rahja; bei Thorwalern Swafnir), Orte, Währung (Dukaten, Silbertaler, Heller, Kreuzer), Zeitrechnung nach Bosparans Fall.',
    '- Sprich die Heldin in der zweiten Person an („du“). Zwei bis vier kurze Absätze. Entscheide nie für die Heldin, was sie tut oder sagt.',
    '- Nichtspielerfiguren haben eigene Ziele und eine Stimme. Lass Taten Folgen haben.',
    '- "vorschlaege": zwei bis vier kurze, unterschiedliche Handlungsmöglichkeiten aus Sicht der Heldin (je höchstens acht Wörter).',
    '- Setze "abenteuer_ende" erst auf true, wenn die Geschichte einen echten Abschluss gefunden hat.',
    '',
    'TALENTE (Probe auf drei Eigenschaften):',
    talentListe(),
    'Eigenschaften: MU Mut, KL Klugheit, IN Intuition, CH Charisma, FF Fingerfertigkeit, GE Gewandtheit, KO Konstitution, KK Körperkraft.',
  ].join('\n');

  const FORMAT_BEISPIEL = JSON.stringify(
    {
      szene: 'Kurzer Ortsname',
      erzaehlung: 'Zwei bis vier Absätze, getrennt durch Leerzeilen.',
      probe: { typ: 'talent', name: 'Klettern', erschwernis: 1, formel: '', grund: 'Nasser Fels' },
      kampf: null,
      kampf_beenden: false,
      vorschlaege: ['Erster Vorschlag', 'Zweiter Vorschlag'],
      inventar_neu: [],
      ap: 0,
      abenteuer_ende: false,
    },
    null,
    1
  );

  const FORMAT_REGEL =
    'ANTWORTFORMAT: Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor oder danach, genau mit diesen Feldern:\n' +
    FORMAT_BEISPIEL +
    '\n"probe" ist null oder ein Objekt: typ ist "talent", "eigenschaft", "schaden" oder "heilung"; name ist der Talentname bzw. das Eigenschaftskürzel (bei schaden/heilung ein leerer String); formel nur bei schaden/heilung (sonst leerer String). ' +
    '"kampf" ist null oder {"gegner": [{"name": "…", "lep": 25, "at": 11, "pa": 5, "rs": 1, "tp": "1W6+2"}]}.';

  // JSON-Schema für strukturierte Ausgaben der API.
  const GEGNER_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'lep', 'at', 'pa', 'rs', 'tp'],
    properties: {
      name: { type: 'string' },
      lep: { type: 'integer' },
      at: { type: 'integer' },
      pa: { type: 'integer' },
      rs: { type: 'integer' },
      tp: { type: 'string' },
    },
  };

  const ANTWORT_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['szene', 'erzaehlung', 'probe', 'kampf', 'kampf_beenden', 'vorschlaege', 'inventar_neu', 'ap', 'abenteuer_ende'],
    properties: {
      szene: { type: 'string' },
      erzaehlung: { type: 'string' },
      probe: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object',
            additionalProperties: false,
            required: ['typ', 'name', 'erschwernis', 'formel', 'grund'],
            properties: {
              typ: { type: 'string', enum: ['talent', 'eigenschaft', 'schaden', 'heilung'] },
              name: { type: 'string' },
              erschwernis: { type: 'integer' },
              formel: { type: 'string' },
              grund: { type: 'string' },
            },
          },
        ],
      },
      kampf: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object',
            additionalProperties: false,
            required: ['gegner'],
            properties: { gegner: { type: 'array', items: GEGNER_SCHEMA } },
          },
        ],
      },
      kampf_beenden: { type: 'boolean' },
      vorschlaege: { type: 'array', items: { type: 'string' } },
      inventar_neu: { type: 'array', items: { type: 'string' } },
      ap: { type: 'integer' },
      abenteuer_ende: { type: 'boolean' },
    },
  };

  // ---------- Zustand und Verlauf als Text ----------

  function zustandText(z) {
    const h = z.held;
    const schmerz = DSA.schmerzStufe(h);
    const talente = Object.keys(h.talente)
      .filter((n) => h.talente[n] > 0)
      .map((n) => n + ' ' + h.talente[n])
      .join(', ');
    const zeilen = [
      '[Spieltisch-Zustand – vom Programm verwaltet, verbindlich]',
      'Heldin: ' + h.name + (h.beschreibung ? ' – ' + h.beschreibung : ''),
      'LeP ' + h.lep.aktuell + '/' + h.lep.max +
        (schmerz ? ' (Schmerz ' + DSA.ROEMISCH[schmerz] + ': alle Proben –' + schmerz + ')' : '') +
        (h.lep.aktuell <= 0 ? ' – KAMPFUNFÄHIG' : '') +
        ' | Schicksalspunkte ' + h.schip.aktuell + '/' + h.schip.max + ' | AP ' + h.ap,
      'Waffe: ' + h.kampf.waffe + ' (AT ' + h.kampf.at + ', PA ' + h.kampf.pa + ', TP ' + h.kampf.tp + '), RS ' + h.kampf.rs + ', Ausweichen ' + h.kampf.aw,
      'Eigenschaften: ' + DSA.EIGENSCHAFTEN.map((e) => e.k + ' ' + h.eigenschaften[e.k]).join(', '),
      'Talente (FW): ' + (talente || 'keine'),
      'Inventar: ' + (h.inventar.join(', ') || 'nichts'),
    ];
    if (z.kampf) {
      zeilen.push(
        'KAMPF LÄUFT (Runde ' + (z.kampf.runde || 0) + '): ' +
          z.kampf.gegner.map((g) => g.name + ' ' + Math.max(0, g.lep) + '/' + g.lepMax + ' LeP' + (g.lep > 0 ? '' : ' (kampfunfähig)')).join(', ')
      );
    } else {
      zeilen.push('Kein Kampf.');
    }
    return zeilen.join('\n');
  }

  function meisterEintragText(e) {
    let t = e.text;
    const extra = [];
    if (e.probeText) extra.push('Angefordert: ' + e.probeText);
    if (e.kampfText) extra.push('Kampf begonnen: ' + e.kampfText);
    if (extra.length) t += '\n[' + extra.join(' | ') + ']';
    return t;
  }

  /**
   * Baut die Nachrichtenliste: alte Einträge, zusammengefasst zu abwechselnden
   * Rollen, der aktuelle Zustand hängt an der letzten Spieler-Nachricht.
   */
  function baueNachrichten(verlauf, zustand, maxEintraege) {
    const auswahl = verlauf.slice(-(maxEintraege || 40));
    const nachrichten = [];
    if (auswahl.length < verlauf.length) {
      nachrichten.push({ role: 'user', content: '[Spieltisch] Ältere Ereignisse wurden aus Platzgründen weggelassen.' });
    }
    auswahl.forEach((e) => {
      const role = e.rolle === 'meister' ? 'assistant' : 'user';
      let text;
      if (e.rolle === 'meister') text = meisterEintragText(e);
      else if (e.rolle === 'tisch') text = '[Spieltisch] ' + e.text;
      else text = '[Handlung der Heldin] ' + e.text;
      const letzte = nachrichten[nachrichten.length - 1];
      if (letzte && letzte.role === role) letzte.content += '\n\n' + text;
      else nachrichten.push({ role, content: text });
    });
    if (!nachrichten.length || nachrichten[0].role !== 'user') {
      nachrichten.unshift({ role: 'user', content: '[Spieltisch] Das Spiel beginnt.' });
    }
    const zustandBlock = zustandText(zustand);
    const letzte = nachrichten[nachrichten.length - 1];
    if (letzte.role === 'user') letzte.content += '\n\n' + zustandBlock;
    else nachrichten.push({ role: 'user', content: zustandBlock + '\n\nErzähle weiter.' });
    return nachrichten;
  }

  // ---------- Regelwächter ----------

  function text(x, max) {
    return typeof x === 'string' ? x.trim().slice(0, max) : '';
  }

  function ganz(x) {
    const n = Math.round(Number(x));
    return Number.isFinite(n) ? n : 0;
  }

  function begrenze(wert, min, max, bezeichnung, hinweise) {
    const n = ganz(wert);
    const k = Math.min(max, Math.max(min, n));
    if (k !== n) hinweise.push(bezeichnung + ' von ' + n + ' auf ' + k + ' begrenzt.');
    return k;
  }

  /**
   * Prüft eine Meister-Antwort. Gibt {antwort, hinweise} zurück; hinweise
   * erklären, was der Regelwächter korrigiert oder verworfen hat.
   */
  function pruefeAntwort(roh, zustand) {
    if (!roh || typeof roh !== 'object' || Array.isArray(roh)) {
      throw new Error('Der Meister hat keine lesbare Antwort geliefert.');
    }
    const hinweise = [];
    const a = {
      szene: text(roh.szene, 80),
      erzaehlung: text(roh.erzaehlung, 8000),
      probe: null,
      gegner: [],
      kampfBeenden: roh.kampf_beenden === true,
      vorschlaege: (Array.isArray(roh.vorschlaege) ? roh.vorschlaege : [])
        .map((s) => text(s, 100))
        .filter(Boolean)
        .slice(0, 4),
      inventarNeu: (Array.isArray(roh.inventar_neu) ? roh.inventar_neu : [])
        .map((s) => text(s, 80))
        .filter(Boolean)
        .slice(0, 5),
      ap: 0,
      ende: roh.abenteuer_ende === true,
    };
    if (!a.erzaehlung) throw new Error('Die Antwort des Meisters enthielt keine Erzählung.');
    a.ap = begrenze(roh.ap, 0, 10, 'AP-Vergabe', hinweise);

    const p = roh.probe;
    if (p && typeof p === 'object') {
      const typ = text(p.typ, 20).toLowerCase();
      const grund = text(p.grund, 160);
      if (typ === 'talent' || typ === 'eigenschaft') {
        const talent = typ === 'talent' ? DSA.findeTalent(p.name) : null;
        const eig = !talent ? DSA.findeEigenschaft(p.name) : null;
        const erschwernis = begrenze(p.erschwernis, -5, 5, 'Erschwernis', hinweise);
        if (talent) {
          if (DSA.normiere(talent.name) !== DSA.normiere(p.name)) {
            hinweise.push('Talent „' + text(p.name, 40) + '“ als „' + talent.name + '“ gewertet.');
          }
          a.probe = { typ: 'talent', name: talent.name, erschwernis, grund };
        } else if (eig) {
          a.probe = { typ: 'eigenschaft', name: eig, erschwernis, grund };
        } else if (typ === 'talent' && DSA.findeEigenschaft(p.name)) {
          a.probe = { typ: 'eigenschaft', name: DSA.findeEigenschaft(p.name), erschwernis, grund };
        } else {
          hinweise.push('Probe auf „' + text(p.name, 40) + '“ verworfen: Dieses Talent gibt es nicht.');
        }
      } else if (typ === 'schaden' || typ === 'heilung') {
        const f = DSA.parseFormel(p.formel);
        if (!f) {
          hinweise.push(typ + ' verworfen: Würfelformel „' + text(p.formel, 20) + '“ ist ungültig.');
        } else if (f.anzahl > 4 || f.anzahl * f.seiten + f.bonus > 40 || Math.abs(f.bonus) > 10) {
          hinweise.push(typ + ' mit „' + DSA.formelText(f) + '“ verworfen: zu hoch für ein einzelnes Ereignis.');
        } else {
          a.probe = { typ, name: '', formel: DSA.formelText(f), grund };
        }
      } else if (typ) {
        hinweise.push('Probe vom Typ „' + typ + '“ verworfen: Kampfwürfe übernimmt das Programm.');
      }
    }

    const liste = roh.kampf && Array.isArray(roh.kampf.gegner) ? roh.kampf.gegner : [];
    liste.slice(0, 5).forEach((g, i) => {
      if (!g || typeof g !== 'object') return;
      const name = text(g.name, 40) || 'Gegner ' + (i + 1);
      const tp = DSA.parseFormel(g.tp);
      const gHinweise = [];
      const gegner = {
        name,
        lep: begrenze(g.lep, 1, 80, name + ': LeP', gHinweise),
        at: begrenze(g.at, 4, 18, name + ': AT', gHinweise),
        pa: begrenze(g.pa, 0, 14, name + ': PA', gHinweise),
        rs: begrenze(g.rs, 0, 8, name + ': RS', gHinweise),
        tp: tp && tp.anzahl <= 3 && tp.anzahl * tp.seiten + tp.bonus <= 30 ? DSA.formelText(tp) : '1W6+2',
      };
      if (!tp || gegner.tp !== DSA.formelText(tp)) gHinweise.push(name + ': TP auf 1W6+2 gesetzt.');
      gegner.lepMax = gegner.lep;
      hinweise.push.apply(hinweise, gHinweise);
      a.gegner.push(gegner);
    });
    if (liste.length > 5) hinweise.push('Nur die ersten fünf Gegner übernommen.');

    if (a.probe && (a.gegner.length || (zustand.kampf && !a.kampfBeenden)) && a.probe.typ !== 'schaden' && a.probe.typ !== 'heilung') {
      hinweise.push('Probe zurückgestellt: Im Kampf entscheiden die Kampfrunden.');
      a.probe = null;
    }
    return { antwort: a, hinweise };
  }

  // ---------- Fehler ----------

  class MeisterFehler extends Error {
    constructor(nachricht, opts) {
      super(nachricht);
      this.name = 'MeisterFehler';
      this.dauerhaft = !!(opts && opts.dauerhaft);
      this.abgebrochen = !!(opts && opts.abgebrochen);
    }
  }

  // ---------- Claude über claude.ai (Artifact-Fähigkeit „sample“) ----------

  const SAMPLE_FEHLER = {
    not_granted: ['Du hast der Seite nicht erlaubt, Claude zu fragen. Wähle einen anderen Meister oder lade die Seite neu.', true],
    sampling_disabled: ['Claude ist für dieses Konto hier nicht verfügbar.', true],
    not_declared: ['Diese Version der Seite darf Claude nicht fragen.', true],
    capability_disabled: ['Claude ist in dieser Ansicht nicht nutzbar.', true],
    capability_removed: ['Diese Claude-App kennt die nötige Funktion noch nicht.', true],
    rate_limited: ['Zu viele Anfragen oder Nutzungslimit erreicht. Warte etwas und versuche es dann erneut.', false],
    session_expired: ['Deine Anmeldung ist abgelaufen. Melde dich bei Claude neu an.', false],
    refused: ['Claude möchte diese Szene so nicht erzählen. Versuche eine andere Handlung.', false],
    empty_completion: ['Der Meister hat nichts geantwortet. Versuche es erneut.', false],
    invalid_json: ['Die Antwort des Meisters war nicht lesbar. Versuche es erneut.', false],
    prompt_too_large: ['Das Abenteuer ist zu lang geworden. Starte ein neues Abenteuer.', false],
  };

  class ClaudeAiMeister {
    constructor(sample, stufe) {
      this.sample = sample;
      this.stufe = stufe || 'default';
      this.name = 'Claude (claude.ai)';
      this.kurz = 'Claude';
      this.freitext = true;
    }
    async zug({ verlauf, zustand, signal }) {
      const nachrichten = baueNachrichten(verlauf, zustand, 36);
      nachrichten[0].content = REGELN + '\n\n' + FORMAT_REGEL + '\n\n---\n\n' + nachrichten[0].content;
      try {
        return await this.sample.json(nachrichten, { signal, cache: false, modelTier: this.stufe });
      } catch (e) {
        const code = e && e.code;
        if (code === 'cancelled') throw new MeisterFehler('Abgebrochen.', { abgebrochen: true });
        const [nachricht, dauerhaft] = SAMPLE_FEHLER[code] || ['Verbindung zum Meister gestört. Versuche es erneut.', false];
        throw new MeisterFehler(nachricht, { dauerhaft });
      }
    }
  }

  // ---------- Claude über die Anthropic API (eigener Schlüssel) ----------

  let sdkVersprechen = null;
  function ladeSdk() {
    if (!sdkVersprechen) {
      sdkVersprechen = import(SDK_URL).then(
        (m) => m.default || m.Anthropic,
        (e) => {
          sdkVersprechen = null;
          throw e;
        }
      );
    }
    return sdkVersprechen;
  }

  class ApiMeister {
    constructor(schluessel, modell) {
      this.schluessel = schluessel;
      this.modell = modell || MODELLE[0].id;
      const m = MODELLE.find((x) => x.id === this.modell);
      this.name = (m ? m.name : this.modell) + ' (API)';
      this.kurz = m ? m.name : 'Claude';
      this.freitext = true;
    }
    async zug({ verlauf, zustand, signal }) {
      let Anthropic;
      try {
        Anthropic = await ladeSdk();
      } catch (e) {
        throw new MeisterFehler('Das Anthropic SDK konnte nicht geladen werden (keine Verbindung zu cdn.jsdelivr.net?).');
      }
      const client = new Anthropic({ apiKey: this.schluessel, dangerouslyAllowBrowser: true });
      const params = {
        model: this.modell,
        max_tokens: 16000,
        system: REGELN,
        cache_control: { type: 'ephemeral' },
        messages: baueNachrichten(verlauf, zustand, 40),
        output_config: { format: { type: 'json_schema', schema: ANTWORT_SCHEMA } },
      };
      // Haiku 4.5 kennt keinen effort-Parameter.
      if (this.modell !== 'claude-haiku-4-5') params.output_config.effort = 'medium';

      let antwort;
      try {
        if (this.modell === 'claude-opus-5-5' || this.modell === 'claude-sonnet-5-5') {
          // Bei einer Ablehnung übernimmt serverseitig ein passendes Ersatzmodell.
          antwort = await client.beta.messages.create(
            Object.assign({}, params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
            { signal }
          );
        } else {
          antwort = await client.messages.create(params, { signal });
        }
      } catch (e) {
        if (signal && signal.aborted) throw new MeisterFehler('Abgebrochen.', { abgebrochen: true });
        if (e instanceof Anthropic.AuthenticationError) throw new MeisterFehler('Der API-Schlüssel wurde abgelehnt. Prüfe ihn unter „Meister wählen“.', { dauerhaft: true });
        if (e instanceof Anthropic.PermissionDeniedError) throw new MeisterFehler('Dieser API-Schlüssel darf das gewählte Modell nicht nutzen.', { dauerhaft: true });
        if (e instanceof Anthropic.NotFoundError) throw new MeisterFehler('Das Modell „' + this.modell + '“ ist für diesen Schlüssel nicht verfügbar.', { dauerhaft: true });
        if (e instanceof Anthropic.RateLimitError) throw new MeisterFehler('Ratenlimit erreicht. Warte einen Moment und versuche es erneut.');
        if (e instanceof Anthropic.BadRequestError) throw new MeisterFehler('Die Anfrage wurde abgelehnt: ' + e.message);
        if (e instanceof Anthropic.APIConnectionError) throw new MeisterFehler('Keine Verbindung zur Anthropic API.');
        if (e instanceof Anthropic.APIError) throw new MeisterFehler('API-Fehler ' + e.status + '. Versuche es erneut.');
        throw new MeisterFehler('Unerwarteter Fehler: ' + (e && e.message ? e.message : e));
      }
      if (antwort.stop_reason === 'refusal') {
        throw new MeisterFehler('Claude möchte diese Szene so nicht erzählen. Versuche eine andere Handlung.');
      }
      if (antwort.stop_reason === 'max_tokens') {
        throw new MeisterFehler('Die Antwort wurde abgeschnitten. Versuche es erneut.');
      }
      const inhalt = antwort.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
      try {
        return JSON.parse(inhalt);
      } catch (e) {
        throw new MeisterFehler('Die Antwort des Meisters war nicht lesbar. Versuche es erneut.');
      }
    }
  }

  Object.assign(DSA, {
    MODELLE,
    REGELN,
    FORMAT_REGEL,
    ANTWORT_SCHEMA,
    zustandText,
    baueNachrichten,
    pruefeAntwort,
    MeisterFehler,
    ClaudeAiMeister,
    ApiMeister,
  });
})(typeof window !== 'undefined' ? window : globalThis);
