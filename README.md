# 1stProject

## Aventurischer Spieltisch

Ein DSA-Browserspiel („Das Schwarze Auge“, 5. Edition, vereinfacht) für eine Heldin: **Draana**, Thorwalerin aus Olport.
Das Programm würfelt und rechnet, der Meister erzählt nur. Claude kann Meister sein, darf aber nicht würfeln und kann deshalb nicht schummeln.

```
spieltisch/
├── index.html          Oberfläche (drei Bereiche: Heldenbogen · Abenteuer · Würfel & Protokoll)
├── css/spieltisch.css
├── js/wuerfel.js       Zufall (crypto.getRandomValues), Würfelformeln, SHA-256, Würfelprotokoll mit Hash-Kette
├── js/regeln.js        Talente, 3W20-Probe, QS, Schmerz, Kritisch/Patzer, Schicksalspunkte, Kampfrunde
├── js/held.js          Draanas Heldenbogen und Import-Prüfung
├── js/meister.js       Protokoll zum Meister, Regelwächter, Claude über claude.ai oder über die API
├── js/solo.js          Offline-Soloabenteuer „Das dunkle Leuchtfeuer“ (ohne KI)
├── js/app.js           Ablauf und Darstellung
└── test/regeln.test.js 27 Tests für Regeln, Regelwächter, Protokoll und Soloabenteuer
```

### Spielen

- **Lokal:** `npm start` und dann <http://localhost:8080> öffnen. Du kannst auch `spieltisch/index.html` direkt im Browser öffnen.
- **GitHub Pages:** Pages für den Branch aktivieren, dann liegt das Spiel unter `…/spieltisch/`.
- **In claude.ai:** Als Artifact veröffentlicht, fragt der Spieltisch Claude über dein Claude-Konto. Einen API-Schlüssel brauchst du dort nicht.

### Drei austauschbare Meister

| Meister | Wann | Wie |
|---|---|---|
| Claude über claude.ai | Seite läuft als Artifact | Artifact-Fähigkeit `sample`, abgerechnet über dein Claude-Konto |
| Claude über die API | lokal oder auf GitHub Pages | eigener API-Schlüssel, Anthropic SDK direkt im Browser, strukturierte Ausgabe per JSON-Schema. Standard ist Claude Opus 5.5, Sonnet 5.5 und Haiku 4.5 sind wählbar. |
| Solo-Abenteuer | immer, auch offline | fester Szenengraph, der dasselbe JSON-Format liefert |

Alle drei sprechen dasselbe Antwortformat. Deshalb laufen Regelwächter, Proben, Kampf und Protokoll bei jedem Meister gleich.

### Das Muster: Das Modell erzählt, der Code entscheidet

1. **Das Modell schlägt vor.** Claude antwortet mit Erzählung plus einer *Anforderung* im festen JSON-Format: eine Probe (`talent`, `eigenschaft`), Schaden oder Heilung per Würfelformel, oder Gegner mit Werten.
2. **Der Regelwächter prüft.** Gibt es das Talent? (Aliase wie „Wahrnehmung“ werden zu „Sinnesschärfe“.) Liegt die Erschwernis zwischen −5 und +5? Sind LeP, AT, PA, RS und TP der Gegner plausibel? Stimmt etwas nicht, wird es korrigiert oder verworfen, und der Hinweis steht sichtbar unter der Erzählung.
3. **Der Code führt aus.** Nur `wuerfel.js` erzeugt Zufall. LeP, Schmerz, Schicksalspunkte und Kampf verwaltet ausschließlich das Programm.
4. **Das Ergebnis ist verbindlich.** Es geht als `[Spieltisch]`-Nachricht an das Modell, das nur noch die Folgen erzählt.
5. **Alles ist prüfbar.** Jeder Wurf steht im Würfelprotokoll. Jeder Eintrag trägt den SHA-256-Hash seines Vorgängers, und „Kette prüfen“ findet nachträgliche Änderungen.

Dasselbe Muster passt auf jede KI-Integration für Kunden: Das Sprachmodell formuliert und schlägt vor. Deterministischer Code validiert, rechnet, führt aus und protokolliert.

### Regeln (DSA 5, vereinfacht)

- **Fertigkeitsprobe:** 3W20 gegen drei Eigenschaften. Überschreitungen werden vom FW abgezogen. QS = übrige FP / 3, aufgerundet, mindestens 1, höchstens 6. Erschwernisse senken alle drei Eigenschaften.
- **Kritisch und Patzer:** Doppel-1 ist ein kritischer Erfolg, Doppel-20 ein Patzer, dreifach ist spektakulär. Bei Einzelwürfen (Eigenschaft, AT, PA) wird eine 1 oder 20 bestätigt.
- **Schmerz:** Bei ≤ ¾, ≤ ½ und ≤ ¼ der LeP sowie bei ≤ 5 LeP gibt es je −1 auf alle Proben. Das Programm rechnet das automatisch ein.
- **Schicksalspunkt:** Gewählte Würfel werden neu geworfen, je Würfel zählt der bessere Wert.
- **Kampfrunde:** Die Heldin greift ihr Ziel an, dann greift jeder stehende Gegner an. Jede weitere Verteidigung in derselben Runde ist um 3 erschwert. Ein kritischer Treffer halbiert die Verteidigung und verdoppelt die TP. Ein Patzer bei der Attacke erschwert die eigenen Verteidigungen dieser Runde um 4 (Hausregel statt Patzertabelle).
- **Rast:** 1W6 LeP.

Draanas Werte sind Beispielwerte. Im Heldenbogen lässt sich alles bearbeiten. Mit „Sichern“ exportierst und importierst du den Bogen als JSON.

### Entwicklung

```bash
npm test     # node --test, keine Abhängigkeiten
npm start    # lokaler Server auf Port 8080
```

Fan-Projekt. DAS SCHWARZE AUGE und AVENTURIEN sind Marken der Ulisses Spiele GmbH.
