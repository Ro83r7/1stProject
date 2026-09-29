# 1stProject

## 🛸 Orion Lite

Ein kleines Weltraum-Strategiespiel in Runden für den Browser, inspiriert von *Master of Orion 2*.
Die Computergegner spielen ausschließlich nach 15 Faustregeln aus MoO2. Im Spiel lässt sich unter
**KI-Regeln** jederzeit nachlesen, welche Regel welche Entscheidung ausgelöst hat.

### Spielen

- `orion-lite/index.html` im Browser öffnen (keine Installation, kein Server nötig), oder
- `node orion-lite/tools/build.js` ausführen und die Einzeldatei `orion-lite/dist/orion-lite.html` weitergeben.

Der Spielstand wird nach jeder Runde im Browser gespeichert.

### Spielprinzip

- **Völker:** Menschen, Psilonen, Sakkra, Klackonen, Bulrathi, Mrrshan, jeweils mit eigenen Stärken.
- **Kolonien:** Bürger arbeiten als Bauern, Arbeiter oder Forscher. Nahrung wird reichsweit geteilt.
  Jede Kolonie hat eine Bauliste mit Gebäuden, Schiffen, Wohnprojekten und Handelsgütern; Kaufen kostet Credits.
- **Forschung:** 7 Felder (Konstruktion, Biologie, Physik, Kraftfelder, Antrieb, Computer, Soziologie)
  mit je 6–7 Stufen.
- **Flotten:** Reichweite ab der nächsten eigenen Kolonie, automatische Raumkämpfe mit Waffen, Schilden
  und Panzerung, Invasionen mit Truppentransportern.
- **Diplomatie:** Frieden oder Krieg, Friedensangebote, 20 Runden Vertragsschutz.
- **Orion:** Im Zentrum wacht ein uralter Wächter über die beste Welt der Galaxis.
- **Sieg:** Alle Rivalen vernichten oder zwei Drittel aller Bewohner der Galaxis vereinen.

### Die 15 Faustregeln der KI

| # | Regel |
|---|---|
| 1 | Expansion schlägt alles |
| 2 | Nahrung zuerst, aber knapp |
| 3 | Arbeiter auf reiche, Forscher auf arme Welten |
| 4 | Neue Kolonie: Fabrik zuerst, Winzlinge wachsen lassen |
| 5 | Wirtschaft vor Waffen |
| 6 | Keine Lücken im Technologiebaum |
| 7 | Kein Militär ohne Bedrohung, aber nie wehrlos |
| 8 | Angreifen nur mit klarer Überlegenheit |
| 9 | Alles auf einen Stapel |
| 10 | Truppen folgen der Flotte |
| 11 | Rückzug bei Unterlegenheit |
| 12 | Krieg gegen den schwächsten Nachbarn, nie an zwei Fronten |
| 13 | Nie pleite, nie horten |
| 14 | Heimatverteidigung vor Angriff |
| 15 | Orion nur mit doppelter Übermacht |

Die ausführlichen Texte stehen in `orion-lite/js/data.js` (`OL.RULES`), die Umsetzung in `orion-lite/js/ai.js`.
Die KI kennt dieselben Regeln wie der Spieler; auf „Schwer“ erhält sie 30 % mehr Produktion und Forschung.

### Aufbau

| Datei | Inhalt |
|---|---|
| `orion-lite/js/data.js` | Planeten, Völker, Technologien, Gebäude, Schiffe, KI-Regeln |
| `orion-lite/js/engine.js` | Spiellogik ohne DOM (Galaxie, Wirtschaft, Kampf, Diplomatie) |
| `orion-lite/js/ai.js` | Computergegner |
| `orion-lite/js/ui.js` | Sternenkarte (Canvas), Konsole, Dialoge |
| `orion-lite/tests/sim.js` | Simuliert komplette KI-Partien und prüft Invarianten |
| `orion-lite/tests/ui-smoke.js` | Browser-Rauchtest mit Playwright |

```bash
node orion-lite/tests/sim.js 9 300                           # 9 KI-Partien à 300 Runden
NODE_PATH=$(npm root -g) node orion-lite/tests/ui-smoke.js   # benötigt Playwright
```
