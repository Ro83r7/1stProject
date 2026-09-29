/* Browser-Rauchtest: startet ein Spiel, klickt Karte und Konsole, spielt Runden.
   Aufruf: NODE_PATH=$(npm root -g) node tests/ui-smoke.js [ausgabeordner] */
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const out = process.argv[2] || path.join(__dirname, 'shots');
require('fs').mkdirSync(out, { recursive: true });
const url = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobil', width: 400, height: 860 }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on('pageerror', (e) => errors.push(vp.name + ': ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|ERR_CERT/.test(m.text())) errors.push(vp.name + ' console: ' + m.text()); });
    await page.goto(url);
    await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
    await page.reload();
    await page.waitForSelector('.race');
    await page.screenshot({ path: path.join(out, vp.name + '-1-intro.png') });
    await page.click('[data-act="intro-race"][data-arg="psilonen"]');
    await page.click('[data-act="start"]');
    await page.waitForSelector('text=Willkommen, Imperator');
    await page.click('[data-act="open"][data-arg="research"]');
    await page.click('[data-act="research"][data-arg="kon"]');
    // Flotte an der Heimatwelt per Kartenklick wählen
    const home = await page.evaluate(() => OL.debug.game().players[0].capital);
    const fid = await page.evaluate(() => OL.debug.game().fleets.find((f) => f.owner === 0).id);
    await page.locator('#map').scrollIntoViewIfNeeded();
    const canvasBox = await page.locator('#map').boundingBox();
    let hit = await page.evaluate((id) => OL.debug.fleetHit(id), fid);
    await page.mouse.click(canvasBox.x + hit.x, canvasBox.y + hit.y);
    await page.waitForSelector('text=Ausgewählte Flotte');
    // Nur einen Späher schicken: alle anderen Typen auf 0
    for (const t of ['colony', 'frigate']) {
      for (let i = 0; i < 3; i++) { const b = page.locator(`[data-act="send"][data-arg="${t}:-1"]`); if (await b.count()) await b.click(); }
    }
    await page.locator('[data-act="send"][data-arg="scout:-1"]').click();
    const target = await page.evaluate((h) => {
      const g = OL.debug.game();
      const s = g.stars.filter((x) => x.id !== h && OL.inRange(g, 0, x)).sort((a, b) => OL.dist(a, g.stars[h]) - OL.dist(b, g.stars[h]))[0];
      return s.id;
    }, home);
    const tp = await page.evaluate((id) => OL.debug.screenOf(id), target);
    await page.locator('#map').scrollIntoViewIfNeeded();
    Object.assign(canvasBox, await page.locator('#map').boundingBox());
    await page.mouse.click(canvasBox.x + tp.x, canvasBox.y + tp.y);
    const moving = await page.evaluate(() => OL.debug.game().fleets.filter((f) => f.owner === 0 && f.dest != null).length);
    if (moving !== 1) errors.push(vp.name + ': Flottenbefehl per Klick fehlgeschlagen (' + moving + ')');
    await page.screenshot({ path: path.join(out, vp.name + '-2-befehl.png'), fullPage: vp.name === 'mobil' });
    // Heimatwelt öffnen, Bauauftrag geben, Bürger verschieben
    await page.evaluate((h) => { OL.debug.ui.fleet = null; }, home);
    await page.click('[data-act="selstar"][data-arg="' + home + '"]').catch(() => {});
    await page.click('[data-tab="system"]');
    await page.evaluate((h) => { OL.debug.ui.star = h; }, home);
    await page.click('[data-tab="system"]');
    await page.click('[data-act="enqueue"][data-arg="ship:colony"]');
    await page.click('[data-act="job"][data-arg="s+"]');
    for (let t = 0; t < 25; t++) {
      if (await page.locator('#modal-back:not([hidden])').count()) await page.click('#modal [data-act="close"]').catch(() => {});
      await page.click('#btn-end');
    }
    await page.evaluate(() => { const b = document.querySelector('#modal-back'); if (b && !b.hidden) b.hidden = true; OL.debug.ui.modal = null; });
    await page.screenshot({ path: path.join(out, vp.name + '-3-runde40.png'), fullPage: vp.name === 'mobil' });
    for (const m of ['rules', 'research', 'diplo']) {
      await page.click(`[data-open="${m}"]`);
      await page.screenshot({ path: path.join(out, vp.name + '-4-' + m + '.png') });
      await page.click('#modal [data-act="close"]');
    }
    for (const tab of ['empire', 'fleets', 'log']) {
      await page.click(`[data-tab="${tab}"]`);
      await page.screenshot({ path: path.join(out, vp.name + '-5-' + tab + '.png'), fullPage: vp.name === 'mobil' });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) errors.push(vp.name + ': horizontaler Überlauf ' + overflow + 'px');
    const turn = await page.evaluate(() => OL.debug.game().turn);
    console.log(vp.name + ': Runde ' + turn + ' erreicht');
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('Keine Fehler.');
})();
