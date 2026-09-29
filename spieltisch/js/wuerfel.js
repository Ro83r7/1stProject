/*
 * Würfel und Würfelprotokoll.
 *
 * Hier – und nur hier – entsteht Zufall. Weder der Meister (Claude) noch
 * die Oberfläche können Würfelergebnisse setzen. Jeder Wurf landet in einem
 * Protokoll, dessen Einträge per SHA-256 verkettet sind: Wer nachträglich
 * einen Wurf ändert, bricht die Kette, und „Kette prüfen“ zeigt die Stelle.
 */
(function (root) {
  'use strict';
  const DSA = (root.DSA = root.DSA || {});

  // ---------- Zufall ----------

  /** Gleichverteilte Zahl 1..seiten aus der Krypto-API (ohne Modulo-Verzerrung). */
  function kryptoZufall(seiten) {
    const c = root.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      const puffer = new Uint32Array(1);
      const grenze = Math.floor(0x100000000 / seiten) * seiten;
      let x;
      do {
        c.getRandomValues(puffer);
        x = puffer[0];
      } while (x >= grenze);
      return (x % seiten) + 1;
    }
    return Math.floor(Math.random() * seiten) + 1;
  }

  const ERLAUBTE_SEITEN = [2, 3, 4, 6, 8, 10, 12, 20, 100];

  /** "2W6+3", "W20", "1d6-1" -> {anzahl, seiten, bonus} oder null. */
  function parseFormel(text) {
    const m = String(text || '')
      .toUpperCase()
      .replace(/\s+/g, '')
      .match(/^(\d{0,2})[WD](\d{1,3})([+-]\d{1,3})?$/);
    if (!m) return null;
    const anzahl = m[1] ? parseInt(m[1], 10) : 1;
    const seiten = parseInt(m[2], 10);
    const bonus = m[3] ? parseInt(m[3], 10) : 0;
    if (anzahl < 1 || anzahl > 10 || !ERLAUBTE_SEITEN.includes(seiten)) return null;
    return { anzahl, seiten, bonus };
  }

  function formelText(f) {
    const b = f.bonus > 0 ? '+' + f.bonus : f.bonus < 0 ? String(f.bonus) : '';
    return f.anzahl + 'W' + f.seiten + b;
  }

  /**
   * Der Würfelbecher. `quelle(seiten)` liefert eine Zahl 1..seiten; in Tests
   * wird eine feste Folge eingesetzt. `mitschnitt(fn)` zeichnet alle Würfe
   * auf, die während fn fallen – daraus entsteht der Protokolleintrag.
   */
  class Becher {
    constructor(quelle) {
      this.quelle = quelle || kryptoZufall;
      this.aufzeichnung = null;
    }
    w(seiten) {
      const x = this.quelle(seiten);
      if (!Number.isInteger(x) || x < 1 || x > seiten) {
        throw new Error('Würfelquelle lieferte ungültigen Wert ' + x + ' für W' + seiten);
      }
      if (this.aufzeichnung) this.aufzeichnung.push({ w: seiten, x });
      return x;
    }
    wurf(formel) {
      const f = typeof formel === 'string' ? parseFormel(formel) : formel;
      if (!f) throw new Error('Unbekannte Würfelformel: ' + formel);
      const einzeln = [];
      for (let i = 0; i < f.anzahl; i++) einzeln.push(this.w(f.seiten));
      const summe = einzeln.reduce((a, b) => a + b, 0) + f.bonus;
      return { formel: formelText(f), einzeln, bonus: f.bonus, summe };
    }
    mitschnitt(fn) {
      const vorher = this.aufzeichnung;
      this.aufzeichnung = [];
      try {
        const ergebnis = fn();
        return { ergebnis, wuerfe: this.aufzeichnung };
      } finally {
        this.aufzeichnung = vorher;
      }
    }
  }

  /** Becher mit fester Wurffolge – für Tests und nachvollziehbare Beispiele. */
  function folgeBecher(folge) {
    let i = 0;
    return new Becher(function () {
      if (i >= folge.length) throw new Error('Testfolge erschöpft');
      return folge[i++];
    });
  }

  // ---------- SHA-256 (synchron, ohne Abhängigkeiten) ----------

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function sha256(text) {
    const daten = new TextEncoder().encode(String(text));
    const laenge = daten.length;
    const gesamt = ((laenge + 9 + 63) >> 6) << 6;
    const puffer = new Uint8Array(gesamt);
    puffer.set(daten);
    puffer[laenge] = 0x80;
    const dv = new DataView(puffer.buffer);
    const bits = laenge * 8;
    dv.setUint32(gesamt - 8, Math.floor(bits / 0x100000000));
    dv.setUint32(gesamt - 4, bits >>> 0);

    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    for (let off = 0; off < gesamt; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        hh = g;
        g = f;
        f = e;
        e = (d + t1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0;
      h[1] = (h[1] + b) >>> 0;
      h[2] = (h[2] + c) >>> 0;
      h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0;
      h[5] = (h[5] + f) >>> 0;
      h[6] = (h[6] + g) >>> 0;
      h[7] = (h[7] + hh) >>> 0;
    }
    return h.map((x) => x.toString(16).padStart(8, '0')).join('');
  }

  // ---------- Würfelprotokoll mit Hash-Kette ----------

  const ANFANG = '0'.repeat(64);

  function hashEintrag(e) {
    return sha256(JSON.stringify([e.nr, e.zeit, e.art, e.text, e.wuerfe, e.vorher]));
  }

  class Protokoll {
    constructor(eintraege) {
      this.eintraege = Array.isArray(eintraege) ? eintraege : [];
    }
    get letzterHash() {
      const n = this.eintraege.length;
      return n ? this.eintraege[n - 1].hash : ANFANG;
    }
    /** art: "Talentprobe", "Kampfrunde", …; wuerfe: [{w, x}] aus Becher.mitschnitt */
    eintragen(art, text, wuerfe) {
      const e = {
        nr: this.eintraege.length + 1,
        zeit: new Date().toISOString(),
        art: String(art),
        text: String(text),
        wuerfe: (wuerfe || []).map((d) => 'W' + d.w + ':' + d.x),
        vorher: this.letzterHash,
      };
      e.hash = hashEintrag(e);
      this.eintraege.push(e);
      return e;
    }
    pruefen() {
      let vorher = ANFANG;
      for (let i = 0; i < this.eintraege.length; i++) {
        const e = this.eintraege[i];
        if (e.nr !== i + 1 || e.vorher !== vorher || e.hash !== hashEintrag(e)) {
          return { ok: false, nr: e.nr || i + 1, anzahl: this.eintraege.length };
        }
        vorher = e.hash;
      }
      return { ok: true, anzahl: this.eintraege.length };
    }
  }

  Object.assign(DSA, {
    kryptoZufall,
    parseFormel,
    formelText,
    Becher,
    folgeBecher,
    sha256,
    Protokoll,
  });
})(typeof window !== 'undefined' ? window : globalThis);
