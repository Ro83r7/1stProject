# Fallstudie: 🧭 KI-Reifegrad-Check für kleine und mittlere Unternehmen

**Projekt:** Entwicklung eines Beratungswerkzeugs für SANG Expert Consulting
**Rolle:** Konzeption, Methodik, Umsetzung, Pilotanwendung
**Zeitraum:** Lernroadmap, Woche 8 (Praxisprojekt / Fallstudie)
**Ergebnis:** Einsatzbereites Web-Tool (`index.html`) plus dokumentierte Methodik und Beispielauswertung

> **Hinweis zu den Daten:** Das Pilotunternehmen „Hansen Feinwerktechnik GmbH“ ist **fiktiv**. Es steht für ein typisches mittelständisches Zulieferunternehmen und dient dazu, Methodik und Ergebnis nachvollziehbar zu zeigen. Mit `[PLATZHALTER]` markierte Stellen sollten nach dem ersten echten Kundeneinsatz durch reale (anonymisierte) Daten ersetzt werden.

---

## 1. Kurzfassung

Viele KMU wissen, dass sie „etwas mit KI machen“ sollten, können aber nicht einschätzen, wo sie stehen und womit sie anfangen sollen. Vorhandene Reifegradmodelle großer Beratungen und Analysten sind für Konzerne gebaut: zu viele Dimensionen, zu abstrakt, zu teuer in der Durchführung.

Für SANG Expert Consulting habe ich deshalb einen **schlanken KI-Reifegrad-Check** entwickelt: 18 Fragen in 6 Dimensionen, etwa 10 Minuten Bearbeitungszeit, mit sofortiger Auswertung, Engpass-Analyse und einem konkreten **90-Tage-Plan**. Das Werkzeug läuft als einzelne HTML-Datei im Browser, speichert keine Daten auf Servern und kann sowohl als Selbsttest (Lead-Magnet) als auch moderiert im Erstgespräch eingesetzt werden.

Die Pilotanwendung am fiktiven Beispielunternehmen zeigt: Gesamtwert **2,1 von 5 (Stufe 2 „Entdecker“)**. Die Technik ist dabei nicht das Problem; der Engpass liegt bei **Governance (1,3)** sowie **Kompetenzen und Strategie (je 1,7)**. Genau diese Erkenntnis, dass KMU zuerst Regeln, Schulung und Ziele brauchen und erst danach mehr Tools, ist der Kern des Beratungsansatzes.

---

## 2. Ausgangslage und Problem

**Kontext:** SANG Expert Consulting berät kleine und mittlere Unternehmen bei der Einführung von KI. Typische Erstanfragen lauten: „Wir wollen KI nutzen, wissen aber nicht wo anfangen“ oder „Unsere Leute nutzen schon ChatGPT, dürfen die das?“

**Beobachtete Probleme im Markt:**

| Problem | Folge für KMU |
|---|---|
| Kein Überblick über den eigenen Stand | Investitionen in Tools, bevor Daten, Regeln und Kompetenzen da sind |
| Unkontrollierte „Schatten-KI“ (private Konten) | Datenschutz- und Vertraulichkeitsrisiken |
| Pflichten aus der EU-KI-Verordnung unbekannt | Art. 4 (KI-Kompetenz) gilt seit 2. Februar 2025 für alle Betreiber von KI-Systemen, also auch für KMU |
| Bestehende Reifegradmodelle zu komplex | Fragebögen mit 50+ Fragen werden abgebrochen oder gar nicht erst begonnen |

**Problem für die Beratung:** Ohne strukturierte Erstanalyse beginnt jedes Erstgespräch bei null, Ergebnisse sind nicht vergleichbar, und der Nutzen der Beratung ist für Kunden schwer greifbar.

---

## 3. Zielsetzung

1. **Standortbestimmung in unter 15 Minuten**, verständlich ohne KI-Vorwissen.
2. **Handlungsorientiert:** Ergebnis ist kein Punktwert allein, sondern ein priorisierter Plan.
3. **KMU-gerecht:** Sprache, Beispiele und Maßnahmen passen zu Unternehmen mit 10 bis 500 Mitarbeitenden.
4. **Rechtliche Pflichten sichtbar machen**, insbesondere DSGVO und EU-KI-Verordnung.
5. **Datensparsam:** keine Registrierung, keine Übertragung von Antworten.
6. **Wiederverwendbar** für SANG Expert Consulting als Lead-Magnet, Gesprächsleitfaden und Vorher-nachher-Messung.

---

## 4. Vorgehen

| Phase | Inhalt | Ergebnis |
|---|---|---|
| 1. Recherche | Sichtung gängiger Reifegradmodelle (z. B. 5-Stufen-Modelle von Analystenhäusern, acatech Industrie 4.0 Maturity Index, Angebote der Mittelstand-Digital Zentren) | Gemeinsame Kerndimensionen identifiziert |
| 2. Reduktion | Dimensionen auf das für KMU Entscheidende verdichtet | 6 Dimensionen × 3 Fragen |
| 3. Verankerung | Jede Antwortstufe als beobachtbares Verhalten formuliert statt als Skala „trifft zu / trifft nicht zu“ | 90 beschriebene Antwortoptionen |
| 4. Bewertungslogik | Durchschnittswerte, Stufengrenzen, Engpass-Regel, Pflichtenpriorisierung | Nachvollziehbares, erklärbares Scoring |
| 5. Umsetzung | Web-Tool als eine HTML-Datei, responsive, Hell/Dunkel-Modus | `index.html` |
| 6. Pilot | Anwendung am (fiktiven) Beispielunternehmen, Ableitung des 90-Tage-Plans | Abschnitt 6 dieser Fallstudie |

---

## 5. Das Modell

### 5.1 Sechs Dimensionen

| Dimension | Leitfrage |
|---|---|
| **Strategie & Führung** | Hat KI einen Platz in Zielen, Budget und Verantwortung der Geschäftsführung? |
| **Daten & Wissen** | Sind Geschäftsdaten und Dokumente zugänglich, sauber und für KI nutzbar? |
| **Technologie & Infrastruktur** | Welche Werkzeuge sind freigegeben, wie gut ist die IT-Basis vorbereitet? |
| **Menschen & Kompetenzen** | Können und wollen die Mitarbeitenden KI sicher nutzen? |
| **Prozesse & Anwendungsfälle** | Wo schafft KI messbaren Nutzen, wie kommen neue Anwendungsfälle in den Betrieb? |
| **Governance, Recht & Sicherheit** | Gibt es Regeln, und sind Pflichten aus DSGVO und KI-Verordnung bekannt? |

### 5.2 Fünf Reifestufen

| Stufe | Name | Beschreibung | Wertebereich |
|---|---|---|---|
| 1 | Einsteiger | KI ist noch kein Thema im Unternehmen | unter 1,8 |
| 2 | Entdecker | Erste Experimente, aber ohne Plan und Regeln | 1,8 bis unter 2,6 |
| 3 | Anwender | Gezielter Einsatz in einzelnen Bereichen | 2,6 bis unter 3,4 |
| 4 | Gestalter | Systematisch gesteuert und skaliert | 3,4 bis unter 4,2 |
| 5 | Vorreiter | KI prägt Prozesse, Angebot und Geschäftsmodell | ab 4,2 |

### 5.3 Bewertungslogik

- **Dimensionswert** = Durchschnitt der drei Fragen (1–5).
- **Gesamtwert** = Durchschnitt der sechs Dimensionen (gleich gewichtet).
- **Engpass-Regel:** Die Gesamtstufe liegt höchstens eine Stufe über der schwächsten Dimension. Begründung: Ein Unternehmen mit moderner Technik, aber ohne Regeln oder Schulung ist nicht reif für skalierten KI-Einsatz. Ein reiner Durchschnitt würde diese Schwäche verdecken.
- **Pflichten zuerst:** Liegt Governance unter 2,5 oder fehlen KI-Schulungen (Frage 4.2 ≤ 2), rücken diese Maßnahmen im 90-Tage-Plan nach vorn und werden als „Pflicht“ markiert.
- **Empfehlungen** sind je Dimension in drei Bändern hinterlegt (unter 2,5 / 2,5–3,4 / ab 3,5). Das Tool wählt die drei wichtigsten und verteilt sie auf Tag 1–30, 31–60 und 61–90.

### 5.4 Designentscheidungen

| Entscheidung | Begründung |
|---|---|
| Beschriebene Antwortstufen statt Likert-Skala | Reduziert Schönfärberei; „Wir haben eine schriftliche KI-Richtlinie“ ist überprüfbar, „trifft eher zu“ nicht |
| 18 statt 50+ Fragen | Abschlussquote vor Detailtiefe; Tiefe kommt im Workshop |
| Engpass-Regel | Macht den wichtigsten Beratungspunkt im Ergebnis sichtbar |
| Eine HTML-Datei ohne Server | DSGVO-freundlich, kostenlos zu hosten, offline nutzbar, kein Wartungsaufwand |
| Ergebnis als Text kopierbar | Direkt in E-Mail, Angebot oder Protokoll übernehmbar |

---

## 6. Pilotanwendung (fiktives Beispiel)

**Unternehmen:** Hansen Feinwerktechnik GmbH *(fiktiv)*, Maschinenbau-Zulieferer, 50–249 Mitarbeitende.
**Situation:** Einzelne Mitarbeitende nutzen ChatGPT privat für E-Mails und Übersetzungen. Die Geschäftsführung sieht Potenzial, befürchtet aber Datenschutzprobleme. ERP und DMS sind vorhanden, die IT betreut ein externer Dienstleister.

### 6.1 Ergebnis

| Dimension | Wert | Stufe |
|---|---|---|
| Strategie & Führung | 1,7 | 1 Einsteiger |
| Daten & Wissen | 2,7 | 3 Anwender |
| Technologie & Infrastruktur | 2,7 | 3 Anwender |
| Menschen & Kompetenzen | 1,7 | 1 Einsteiger |
| Prozesse & Anwendungsfälle | 2,3 | 2 Entdecker |
| Governance, Recht & Sicherheit | **1,3** | 1 Einsteiger (Engpass) |
| **Gesamt** | **2,1** | **Stufe 2 Entdecker** |

### 6.2 Interpretation

- **Das Fundament ist besser als gedacht.** Daten und Technik liegen auf Stufe 3. Das Unternehmen braucht keine neue Software, um anzufangen.
- **Der Engpass ist organisatorisch.** Es gibt weder Regeln (Governance 1,3) noch Schulungen (Frage 4.2 = 1) noch Ziele und Budget (Strategie 1,7).
- **Rechtliches Risiko:** Private KI-Konten mit Firmendaten, keine Richtlinie, keine dokumentierte KI-Kompetenz nach Art. 4 KI-Verordnung.
- **Typischer Fehler, der vermieden wird:** Ohne den Check hätte das Unternehmen vermutlich zuerst ein KI-Tool eingekauft. Der Check zeigt, dass Richtlinie und Schulung vorher kommen müssen, damit das Tool sicher und wirksam genutzt wird.

### 6.3 90-Tage-Plan

| Zeitraum | Dimension | Maßnahme |
|---|---|---|
| Tage 1–30 | Governance *(Pflicht)* | Einseitige KI-Richtlinie verabschieden: erlaubte Tools, verbotene Daten, Kennzeichnung von KI-Inhalten. Datenschutzbeauftragte einbinden. |
| Tage 31–60 | Menschen *(Pflicht Art. 4)* | Grundlagenschulung für alle Mitarbeitenden mit Übungen aus dem eigenen Arbeitsalltag, dokumentiert. |
| Tage 61–90 | Strategie | Halbtägiger KI-Workshop mit der Geschäftsführung: drei Geschäftsziele für KI, eine verantwortliche Person. |

**Anschlussangebot für SANG Expert Consulting:** Richtlinien-Vorlage und Schulung (Phase 1–2), Strategie-Workshop mit Auswahl von 2–3 Pilot-Anwendungsfällen (Phase 3), danach Wiederholung des Checks nach 6 Monaten als Wirkungsnachweis.

**Erwartete Wirkung nach 90 Tagen** *(Annahme, im echten Pilot zu messen)*: Governance von 1,3 auf 3,0, Menschen von 1,7 auf 3,0, Strategie von 1,7 auf 2,7. Gesamtwert damit etwa 2,7, also Stufe 3 „Anwender“. `[PLATZHALTER: reale Vorher-nachher-Werte]`

---

## 7. Nutzen für SANG Expert Consulting

| Einsatz | Nutzen |
|---|---|
| **Lead-Magnet** auf Website und LinkedIn | Interessenten erhalten sofort Mehrwert; das kopierte Ergebnis ist ein natürlicher Gesprächsanlass |
| **Leitfaden für das Erstgespräch** | 30 Minuten gemeinsam ausfüllen statt unstrukturiert fragen; vergleichbare Ergebnisse über Kunden hinweg |
| **Angebotsgrundlage** | Der 90-Tage-Plan übersetzt sich direkt in Leistungsbausteine (Richtlinie, Schulung, Workshop, Pilot) |
| **Wirkungsnachweis** | Wiederholung nach 6 bzw. 12 Monaten macht den Beratungserfolg messbar |
| **Marktwissen** | Mit genügend (anonymisierten) Ergebnissen entsteht ein Branchen-Benchmark |

**Leistungstreppe:** Check (kostenlos) → Auswertungsgespräch → Richtlinie & Schulung → Strategie-Workshop → Pilotbegleitung → Re-Check.

---

## 8. Grenzen und Risiken

- **Selbsteinschätzung:** Antworten können geschönt sein. Gegenmaßnahme: beschriebene Antwortstufen und moderierte Durchführung im Erstgespräch.
- **Nicht statistisch validiert:** Stufengrenzen und Gleichgewichtung sind fachlich begründet, aber noch nicht empirisch geprüft. Nach 20–30 Anwendungen überprüfen.
- **Keine Rechtsberatung:** Der Check macht Pflichten sichtbar, ersetzt aber keine juristische Prüfung.
- **Branchenunterschiede:** Ein Handwerksbetrieb und ein Softwarehaus werden gleich bewertet. Erweiterung um Branchenvergleichswerte möglich.

---

## 9. Lessons Learned

1. **Weniger ist mehr.** Die schwierigste Arbeit war das Streichen. Jede Frage musste eine Entscheidung im 90-Tage-Plan beeinflussen können, sonst flog sie raus.
2. **Durchschnitte lügen.** Erst die Engpass-Regel macht aus einem Punktwert eine Beratungsaussage.
3. **Pflichten sind ein guter Einstieg.** Die EU-KI-Verordnung ist für viele KMU der konkrete Anlass, jetzt zu handeln. Das Tool nutzt das, ohne Angst zu machen.
4. **Tools selbst bauen senkt die Hürde.** Eine HTML-Datei ohne Backend war in kurzer Zeit umsetzbar und ist sofort einsetzbar. KI-gestützte Entwicklung hat die Umsetzung stark beschleunigt.
5. `[PLATZHALTER: eigene Erkenntnis aus dem ersten echten Kundeneinsatz]`

---

## 10. Nächste Schritte

- [ ] Check mit 3 echten Pilotkunden durchführen, Feedback zu Verständlichkeit und Dauer einholen
- [ ] Fallstudie mit realen, anonymisierten Daten aktualisieren
- [ ] Tool auf der Website von SANG Expert Consulting einbinden
- [ ] Optional: Ergebnisse (mit Einwilligung) anonym sammeln, um einen Branchen-Benchmark aufzubauen
- [ ] Optional: PDF-Report im Corporate Design für die Auswertungsgespräche
- [ ] Re-Check nach 6 Monaten bei den Pilotkunden als Wirkungsnachweis

---

## Anhang: Kurzfassung für Portfolio / LinkedIn (STAR)

**Situation:** KMU wollen KI nutzen, wissen aber nicht, wo sie stehen. Bestehende Reifegradmodelle sind für Konzerne gebaut.
**Task:** Ein schlankes, rechtssicheres Werkzeug zur Standortbestimmung für SANG Expert Consulting entwickeln.
**Action:** 6-Dimensionen-Modell mit 18 verhaltensbasierten Fragen, Engpass-Regel und Pflichtenpriorisierung konzipiert und als datensparsames Web-Tool umgesetzt.
**Result:** In 10 Minuten zu Reifestufe, Engpass und konkretem 90-Tage-Plan. Einsetzbar als Lead-Magnet, Gesprächsleitfaden und Wirkungsnachweis.

> *Beispielpost:* „Die meisten KMU brauchen für den Einstieg in KI kein neues Tool, sondern eine Richtlinie, eine Schulung und drei klare Ziele. Das zeigt mein neuer KI-Reifegrad-Check: 18 Fragen, 10 Minuten, fertiger 90-Tage-Plan. Wo steht Ihr Unternehmen?“
