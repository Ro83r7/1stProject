/*
 * Solo-Abenteuer „Das dunkle Leuchtfeuer“ – ein Meister ohne KI.
 *
 * Er spricht dasselbe JSON-Format wie Claude. Dadurch läuft der ganze
 * Spieltisch (Regelwächter, Proben, Kampf, Protokoll) unverändert, und man
 * kann das Spiel auch ohne Verbindung spielen oder testen.
 */
(function (root) {
  'use strict';
  const DSA = (root.DSA = root.DSA || {});

  const RAEUBERWACHE = { name: 'Strandräuber-Wache', lep: 20, at: 11, pa: 5, rs: 1, tp: '1W6+2' };
  const ULFHILD = { name: 'Ulfhild „die Krähe“', lep: 26, at: 13, pa: 7, rs: 1, tp: '1W6+2' };
  const HJALMAR = { name: 'Hjalmar', lep: 30, at: 11, pa: 4, rs: 2, tp: '1W6+4' };

  const WEITER_ZUM_TURM = [['Weiter zum Leuchtturm', 'turm']];
  const AM_FUSS_DER_KLIPPE = [
    ['Leise den Pfad hinaufschleichen', 'pfad'],
    ['Die Felswand hinaufklettern', 'wand'],
  ];

  const KNOTEN = {
    start: {
      szene: 'Tjolmar, Hafenmole – Nacht',
      text:
        'Salzwind peitscht über die Mole von Tjolmar. Draußen auf der Sturmfels-Klippe, wo seit Menschengedenken ein Leuchtfeuer brennt, ist es heute Nacht dunkel.\n\n' +
        'Hetfrau Asleif packt dich am Arm. „Die *Seeadler* kommt heute Nacht aus Prem zurück. Ohne das Feuer läuft sie auf die Riffe. Swafnir sei uns gnädig – du bist die Einzige hier, die ein Ruder halten *und* eine Skraja führen kann.“\n\n' +
        'Am Steg dümpelt ein kleines Ruderboot. Unten am Strand liegt Tang, und im Mondlicht glaubst du frische Kielspuren im Sand zu sehen.',
      wahl: [
        ['Sofort mit dem Ruderboot übersetzen', 'boot'],
        ['Erst den Strand nach Spuren absuchen', 'strand'],
      ],
    },
    strand: {
      szene: 'Strand unter der Mole',
      text: 'Du stapfst durch nassen Sand und Tang. Die Laterne der Hetfrau wirft zitterndes Licht auf den Boden, Gischt sprüht dir ins Gesicht.',
      probe: { typ: 'talent', name: 'Sinnesschärfe', erschwernis: 1, grund: 'Dunkelheit und Gischt' },
      erfolg: 'strand_fund',
      misserfolg: 'strand_nichts',
    },
    strand_fund: {
      szene: 'Strand unter der Mole',
      text:
        'Zwischen den Steinen findest du die Kielspuren eines zweiten Bootes – und daneben ein zerbrochenes Fass mit frischem Teer. In die Dauben ist eine Krähe gebrannt.\n\n' +
        'Das Zeichen kennst du aus den Hafenschänken: Strandräuber. Wer das Feuer löscht, will, dass Schiffe stranden. Du steckst die Fassdaube ein. Sie ist ein Beweis – und vielleicht ein Druckmittel.',
      inventar: ['Fassdaube mit Krähen-Brandzeichen'],
      ap: 2,
      merke: 'beweis',
      wahl: [['Zum Ruderboot', 'boot']],
    },
    strand_nichts: {
      szene: 'Strand unter der Mole',
      text: 'Nur Tang, Muscheln und Möwendreck. Die Zeit drängt – draußen auf der See glaubst du bereits ein fernes Schiffslicht zu erkennen.',
      wahl: [['Zum Ruderboot', 'boot']],
    },
    boot: {
      szene: 'Zwischen Mole und Sturmfels',
      text: 'Du stößt das Boot ab und legst dich in die Riemen. Die Brandung zwischen Mole und Klippe ist tückisch, schwarze Felsen ragen wie Zähne aus dem Wasser.',
      probe: { typ: 'talent', name: 'Boote & Schiffe', erschwernis: 1, grund: 'Nacht und Brandung' },
      erfolg: 'anlegen',
      misserfolg: 'kentern',
    },
    kentern: {
      szene: 'Zwischen Mole und Sturmfels',
      text: 'Eine Welle hebt das Boot an und wirft es gegen einen Felsen. Holz splittert, eiskaltes Wasser schlägt über dir zusammen – und die Felsen sind scharf.',
      probe: { typ: 'schaden', formel: '1W6', grund: 'Felsen und Brandung' },
      weiter: 'schwimmen',
    },
    schwimmen: {
      szene: 'Im Wasser',
      text: 'Prustend tauchst du auf. Der Fuß der Klippe ist nah, aber die Strömung zerrt an deinem Umhang und will dich hinaus aufs offene Meer ziehen.',
      probe: { typ: 'talent', name: 'Schwimmen', erschwernis: 0, grund: 'Strömung und Kälte' },
      erfolg: 'anlegen_nass',
      misserfolg: 'abgetrieben',
    },
    abgetrieben: {
      szene: 'Im Wasser',
      text: 'Die Strömung schleudert dich gegen die Klippe, bevor du endlich einen Felsvorsprung zu fassen bekommst.',
      probe: { typ: 'schaden', formel: '1W6', grund: 'Aufprall am Fels' },
      weiter: 'anlegen_nass',
    },
    anlegen_nass: {
      szene: 'Am Fuß der Klippe',
      text:
        'Tropfnass und frierend ziehst du dich an Land. Das Ruderboot ist verloren, aber du bist hier.\n\n' +
        'Ein schmaler Pfad windet sich nach oben, dort flackert Fackellicht. Rechts davon steigt die Felswand steil und zerklüftet empor.',
      wahl: AM_FUSS_DER_KLIPPE,
    },
    anlegen: {
      szene: 'Am Fuß der Klippe',
      text:
        'Mit einem letzten Ruderschlag setzt du das Boot auf einen Kiesstreifen am Fuß der Klippe.\n\n' +
        'Ein schmaler Pfad windet sich nach oben, dort flackert Fackellicht. Rechts davon steigt die Felswand steil und zerklüftet empor.',
      wahl: AM_FUSS_DER_KLIPPE,
    },
    wand: {
      szene: 'Die Felswand',
      text: 'Du tastest nach dem ersten Griff. Der Fels ist nass von Gischt und mit glitschigem Tang bewachsen.',
      probe: { typ: 'talent', name: 'Klettern', erschwernis: 2, grund: 'nasser, glitschiger Fels' },
      erfolg: 'wand_oben',
      misserfolg: 'wand_sturz',
    },
    wand_sturz: {
      szene: 'Die Felswand',
      text: 'Auf halber Höhe bricht ein Griff aus dem Fels. Du rutschst ab und schlägst ein Stück tiefer hart auf einem Vorsprung auf.',
      probe: { typ: 'schaden', formel: '1W6+1', grund: 'Sturz' },
      weiter: 'wand_oben_muehsam',
    },
    wand_oben_muehsam: {
      szene: 'Oben auf dem Sturmfels',
      text: 'Mit zusammengebissenen Zähnen kletterst du den Rest der Wand hinauf und ziehst dich über die Kante – direkt hinter einen Holzstapel am Fuß des Leuchtturms. Niemand hat dich bemerkt.',
      wahl: WEITER_ZUM_TURM,
    },
    wand_oben: {
      szene: 'Oben auf dem Sturmfels',
      text: 'Griff um Griff arbeitest du dich hinauf und ziehst dich über die Kante – direkt hinter einen Holzstapel am Fuß des Leuchtturms. Niemand hat dich bemerkt.',
      ap: 1,
      wahl: WEITER_ZUM_TURM,
    },
    pfad: {
      szene: 'Der Klippenpfad',
      text: 'Du setzt einen Fuß vor den anderen. Kies knirscht unter deinen Stiefeln, oben flackert die Fackel.',
      probe: { typ: 'talent', name: 'Verbergen', erschwernis: 1, grund: 'knirschender Kies, Fackellicht' },
      erfolg: 'pfad_leise',
      misserfolg: 'pfad_alarm',
    },
    pfad_leise: {
      szene: 'Der Klippenpfad',
      text: 'Auf halber Höhe lehnt ein Wächter mit einem Säbel an einem Felsen und starrt aufs Meer hinaus. Er hat dich nicht gehört.',
      wahl: [
        ['Den Wächter überwältigen', 'wache_kampf'],
        ['Hinter ihm vorbeischleichen', 'vorbeischleichen'],
      ],
    },
    vorbeischleichen: {
      szene: 'Der Klippenpfad',
      text: 'Du drückst dich an den Fels. Nur zwei Schritt trennen dich von seinem Rücken.',
      probe: { typ: 'talent', name: 'Verbergen', erschwernis: 2, grund: 'direkt hinter dem Wächter' },
      erfolg: 'turm',
      misserfolg: 'pfad_alarm',
    },
    wache_kampf: {
      szene: 'Der Klippenpfad',
      text: 'Du springst vor. Der Wächter fährt herum, zu spät, um zu rufen, aber schnell genug, um den Säbel zu heben.',
      kampf: [Object.assign({}, RAEUBERWACHE, { lep: 16 })],
      sieg: 'pfad_sieg',
      niederlage: 'gefangen',
    },
    pfad_alarm: {
      szene: 'Der Klippenpfad',
      text: 'Ein Stein poltert den Hang hinab. „Wer da?!“ Ein Wächter springt mit gezücktem Säbel hinter einem Felsen hervor.',
      kampf: [RAEUBERWACHE],
      sieg: 'pfad_sieg',
      niederlage: 'gefangen',
    },
    pfad_sieg: {
      szene: 'Der Klippenpfad',
      text: 'Der Wächter sinkt zu Boden. Unter seinem Umhang trägt er ein Abzeichen aus schwarzem Eisen: eine Krähe.',
      inventar: ['Krähen-Abzeichen aus Eisen'],
      ap: 2,
      wahl: WEITER_ZUM_TURM,
    },
    turm: {
      szene: 'Leuchtturm auf dem Sturmfels',
      text:
        'Oben auf dem Plateau steht der gedrungene Leuchtturm. Die Feuerschale ist erloschen, nasse Planen liegen darüber.\n\n' +
        'Daneben stehen zwei Gestalten: ein bulliger Kerl mit Enterbeil und eine hagere Frau in einem Mantel aus schwarzen Federn. Ulfhild, genannt „die Krähe“. In den Hafenschänken erzählt man sich, sie habe schon ein Dutzend Schiffe auf die Riffe gelockt.\n\n' +
        'Draußen auf der See nähert sich ein Schiffslicht den Riffen.',
      wahl: [
        ['Sie auffordern aufzugeben', 'drohen'],
        ['Sofort angreifen', 'angriff'],
      ],
    },
    drohen: {
      szene: 'Leuchtturm auf dem Sturmfels',
      text: 'Du trittst ins Fackellicht, die Skraja in der Hand. „Das Spiel ist aus, Krähe. Tjolmar weiß, wer ihr seid.“',
      probe: (s) => ({
        typ: 'talent',
        name: 'Einschüchtern',
        erschwernis: s.beweis ? 0 : 2,
        grund: s.beweis ? 'Du hältst die Fassdaube mit dem Brandzeichen hoch' : 'Die Krähe ist abgebrüht',
      }),
      erfolg: 'drohen_erfolg',
      misserfolg: 'angriff',
    },
    drohen_erfolg: {
      szene: 'Leuchtturm auf dem Sturmfels',
      text: '„Bei Swafnirs Flosse, die meint es ernst!“ Hjalmar lässt das Enterbeil fallen und flieht den Pfad hinab. Ulfhild zieht fluchend zwei Dolche. „Dann eben allein.“',
      kampf: [ULFHILD],
      ap: 2,
      sieg: 'feuer',
      niederlage: 'gefangen',
    },
    angriff: {
      szene: 'Leuchtturm auf dem Sturmfels',
      text: 'Ulfhild lacht heiser. „Eine Thorwalerin, ganz allein? Hjalmar, schnapp sie dir!“',
      kampf: [ULFHILD, HJALMAR],
      sieg: 'feuer',
      niederlage: 'gefangen',
    },
    feuer: {
      szene: 'Die Feuerschale',
      text:
        'Die Strandräuber liegen am Boden. Das Schiffslicht ist bedrohlich nah!\n\n' +
        'Du reißt die nassen Planen von der Feuerschale. Das Holz darunter ist klamm, und der Wind pfeift über das Plateau.',
      probe: { typ: 'talent', name: 'Wildnisleben', erschwernis: 1, grund: 'nasses Holz, Sturmwind' },
      erfolg: 'ende_gut',
      misserfolg: 'feuer_zwei',
    },
    feuer_zwei: {
      szene: 'Die Feuerschale',
      text: 'Funken stieben auf und verlöschen im Wind. Im Turm findest du einen Krug Lampenöl und gießt ihn über das Holz. Noch ein Versuch!',
      probe: { typ: 'talent', name: 'Wildnisleben', erschwernis: -1, grund: 'mit Lampenöl' },
      erfolg: 'ende_gut',
      misserfolg: 'ende_knapp',
    },
    ende_gut: {
      szene: 'Das Leuchtfeuer brennt',
      text:
        'Mit einem Fauchen schlägt die Flamme empor und taucht die Klippe in rotgoldenes Licht. Draußen dreht die *Seeadler* bei und gleitet sicher an den Riffen vorbei.\n\n' +
        'Am Morgen feiert Tjolmar dich mit Met und Gesang, und Hetfrau Asleif schwört, die Krähen-Bande bis zum letzten Mann zu jagen.\n\n' +
        '**Ende des Abenteuers.**',
      ap: 10,
      ende: true,
    },
    ende_knapp: {
      szene: 'Das Leuchtfeuer brennt – spät',
      text:
        'Endlich fängt das Feuer, aber spät. Unten hörst du Holz ächzen: Die *Seeadler* schrammt am Riff entlang, kommt aber frei. Mit Leck und Schlagseite schleppt sie sich in den Hafen.\n\n' +
        'Niemand ist ertrunken. Swafnir hat heute Nacht ein Auge zugedrückt.\n\n**Ende des Abenteuers.**',
      ap: 6,
      ende: true,
    },
    gefangen: {
      szene: 'Schwärze',
      text:
        'Dir wird schwarz vor Augen. Als du wieder zu dir kommst, liegst du gefesselt im nassen Gras, und der Himmel ist voller Fackeln. Hetfrau Asleif und ihre Leute haben die Klippe gestürmt, als das Feuer ausblieb.\n\n' +
        'Asleif kniet neben dir und verbindet deine Wunden.',
      probe: { typ: 'heilung', formel: '1W6+2', grund: 'Asleif verbindet dich' },
      weiter: 'ende_gefangen',
    },
    ende_gefangen: {
      szene: 'Tjolmar, am Morgen',
      text:
        'Das Feuer brennt wieder, die *Seeadler* ist sicher im Hafen. Aber die Krähe ist in der Nacht entkommen, und irgendwo an der Küste wird sie wieder ein Licht löschen.\n\n**Ende des Abenteuers.**',
      ap: 3,
      ende: true,
    },
  };

  const KAMPF_ZWISCHENTEXTE = [
    'Stahl klirrt auf Stahl. Der Wind reißt an deinem Umhang, und der Fels unter deinen Füßen ist glitschig.',
    'Ihr umkreist einander. Irgendwo unter euch donnert die Brandung gegen die Klippe.',
    'Schweiß und Gischt brennen dir in den Augen. Noch steht der Kampf auf Messers Schneide.',
    'Ein Schrei, ein Schlag, ein Schritt zurück – und wieder geht es aufeinander los.',
  ];

  class SoloMeister {
    constructor() {
      this.name = 'Solo-Abenteuer (offline)';
      this.kurz = 'Solo';
      this.freitext = false;
    }

    /** Wandelt einen Knoten in eine Meister-Antwort im gemeinsamen JSON-Format. */
    antwortAus(id, solo, vorspann) {
      const k = KNOTEN[id];
      solo.knoten = id;
      if (k.merke) solo[k.merke] = true;
      const probe = typeof k.probe === 'function' ? k.probe(solo) : k.probe;
      return {
        szene: k.szene,
        erzaehlung: (vorspann ? vorspann + '\n\n' : '') + k.text,
        probe: probe
          ? { typ: probe.typ, name: probe.name || '', erschwernis: probe.erschwernis || 0, formel: probe.formel || '', grund: probe.grund || '' }
          : null,
        kampf: k.kampf ? { gegner: k.kampf.map((g) => Object.assign({}, g)) } : null,
        kampf_beenden: false,
        vorschlaege: (k.wahl || []).map((w) => w[0]),
        inventar_neu: k.inventar || [],
        ap: k.ap || 0,
        abenteuer_ende: !!k.ende,
      };
    }

    async zug({ zustand, ereignis }) {
      const solo = zustand.solo || (zustand.solo = { knoten: null });
      const k = KNOTEN[solo.knoten];
      if (!ereignis || ereignis.art === 'start' || !k) return this.antwortAus('start', solo);

      if (ereignis.art === 'aktion') {
        const wahl = (k.wahl || []).find((w) => w[0] === ereignis.text);
        if (wahl) return this.antwortAus(wahl[1], solo);
        return {
          szene: k.szene,
          erzaehlung: 'Im Solo-Abenteuer wählst du eine der angebotenen Möglichkeiten. Für freie Handlungen wähle Claude als Meister.',
          probe: null,
          kampf: null,
          kampf_beenden: false,
          vorschlaege: (k.wahl || []).map((w) => w[0]),
          inventar_neu: [],
          ap: 0,
          abenteuer_ende: false,
        };
      }
      if (ereignis.art === 'probe') {
        if (k.weiter) return this.antwortAus(k.weiter, solo);
        const ziel = ereignis.gelungen ? k.erfolg : k.misserfolg;
        let vorspann = '';
        if (ereignis.kritisch) vorspann = '*Ein Meisterstück – Swafnir selbst scheint deine Hand zu führen.*';
        else if (ereignis.patzer) vorspann = '*Ausgerechnet jetzt geht alles schief.*';
        return this.antwortAus(ziel, solo, vorspann);
      }
      if (ereignis.art === 'kampf') {
        if (ereignis.ergebnis === 'sieg') return this.antwortAus(k.sieg, solo);
        if (ereignis.ergebnis === 'niederlage') return this.antwortAus(k.niederlage, solo);
        const n = (zustand.kampf && zustand.kampf.runde) || 0;
        return {
          szene: k.szene,
          erzaehlung: KAMPF_ZWISCHENTEXTE[n % KAMPF_ZWISCHENTEXTE.length],
          probe: null,
          kampf: null,
          kampf_beenden: false,
          vorschlaege: [],
          inventar_neu: [],
          ap: 0,
          abenteuer_ende: false,
        };
      }
      return this.antwortAus(solo.knoten, solo);
    }
  }

  DSA.SoloMeister = SoloMeister;
  DSA.SOLO_KNOTEN = KNOTEN;
})(typeof window !== 'undefined' ? window : globalThis);
