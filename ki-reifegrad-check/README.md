# 🧭 KI-Reifegrad-Check

Werkzeug von SANG Expert Consulting zur Standortbestimmung beim KI-Einsatz in kleinen und mittleren Unternehmen.

- **`index.html`**: das Tool. Einfach im Browser öffnen, keine Installation, kein Server. Antworten bleiben im Browser (localStorage).
- **`FALLSTUDIE.md`**: Fallstudie (Lernroadmap Woche 8) mit Methodik, Designentscheidungen, Pilotanwendung am fiktiven Beispiel und nächsten Schritten.

## Modell auf einen Blick

- 6 Dimensionen × 3 Fragen, je 5 beschriebene Antwortstufen
- 5 Reifestufen: Einsteiger, Entdecker, Anwender, Gestalter, Vorreiter
- Engpass-Regel: Gesamtstufe höchstens eine Stufe über der schwächsten Dimension
- Pflichten (DSGVO, Art. 4 EU-KI-Verordnung) werden im 90-Tage-Plan vorgezogen

## Anpassen

Fragen, Antworttexte und Empfehlungen stehen im Array `DIMS` im Skript von `index.html`, die Stufengrenzen in `levelOf()`.
