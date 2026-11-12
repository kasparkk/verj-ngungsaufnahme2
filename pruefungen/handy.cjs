/* Bedienbarkeit auf dem Handy – gemessen, nicht geschätzt.

   Die App wird im Bestand bedient: mit Handschuhen, im Gegenlicht, oft
   einhändig. Drei Dinge lassen sich dazu wirklich messen, und genau die
   stehen hier:

   1. KEIN EINGABEFELD UNTER 16 PX. Darunter zoomt iOS beim Antippen in
      das Feld hinein, und man steht erst einmal in einer vergrößerten
      Seite - mitten im Zählen.
   2. TRIFFBARE ZIELE. Was oft gebraucht wird, muss groß sein. Was selten
      und unwiderruflich ist (Stift, "entfernen"), darf ausdrücklich
      klein bleiben - das ist kein Versehen, sondern Schutz.
   3. NICHTS LÄUFT SEITWÄRTS AUS DEM BILD, auch nicht auf dem kleinsten
      Gerät.

   Dazu zwei Dinge, die man nur im Quelltext sehen kann: die Rückmeldung
   beim Antippen und der Zuschlag für die Gestenleiste unten.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/handy.cjs                                                 */
const { chromium } = require('playwright');
const fs = require('fs');
let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

/* Absichtlich klein: selten gebraucht, und ein Fehlgriff kostet mehr als
   ein verfehlter Treffer. Steht hier namentlich, damit niemand sie
   "aus Versehen" wieder vergrössert. */
const ABSICHTLICH_KLEIN = [
  'Zahl eingeben',    // der Stift - genau darum ging es im Feldtest
  'Eins abziehen',
  'Fünf dazu',
  'entfernen',        // nimmt eine Baumart aus dem Blatt
  'deaktivieren',     // nimmt eine Baumart aus der Monitoring-Aufnahme
  'Diesen Punkt löschen',
];

(async()=>{
  const b=await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-proxy-server']});
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:200,body:'[]'}));
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(800);

  const pruefeSeite = async (seite) => {
    await page.getByRole('button',{name:seite,exact:true}).click();
    await page.waitForTimeout(500);
    const bericht = await page.evaluate((klein) => {
      const zuKlein = [], zuFein = [];
      document.querySelectorAll('button,[role="button"],a,input,textarea,select').forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const name = (el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim();
        const stil = getComputedStyle(el);
        if (['INPUT','TEXTAREA','SELECT'].includes(el.tagName) && parseFloat(stil.fontSize) < 16)
          zuFein.push(`${stil.fontSize}  ${name.slice(0,30)}`);
        if (r.height < 32 && !klein.some((k) => name.includes(k)))
          zuKlein.push(`${Math.round(r.width)}x${Math.round(r.height)}  ${name.slice(0,30)}`);
      });
      return { zuKlein: [...new Set(zuKlein)], zuFein: [...new Set(zuFein)] };
    }, ABSICHTLICH_KLEIN);

    console.log(`\n${seite.toUpperCase()}`);
    pruefe('kein Eingabefeld unter 16 px', bericht.zuFein.join(" | ") || 'keins', 'keins');
    pruefe('kein Ziel unter 32 px hoch', bericht.zuKlein.join(" | ") || 'keins', 'keins');
    for (const breite of [320, 390]) {
      await page.setViewportSize({width:breite,height:844}); await page.waitForTimeout(250);
      pruefe(`${breite} px ohne Seitwärtsscrollen`,
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    }
    await page.setViewportSize({width:390,height:844}); await page.waitForTimeout(250);
  };

  await pruefeSeite('Verjüngung');
  await pruefeSeite('Baummessung');
  await pruefeSeite('Monitoring');

  console.log('\nWAS ABSICHTLICH KLEIN BLEIBT');
  await page.getByRole('button',{name:'Verjüngung',exact:true}).click(); await page.waitForTimeout(400);
  const stift = await page.getByRole('button',{name:'Zahl eingeben'}).first().boundingBox();
  pruefe('der Stift ist noch klein', stift.height <= 26, true);

  console.log('\nWAS NUR IM QUELLTEXT STEHT');
  const html = fs.readFileSync('index.html', 'utf8');
  pruefe('Rückmeldung beim Antippen', /\[role="button"\]:active/.test(html), true);
  pruefe('kein Doppeltipp-Zoom', /touch-action: manipulation/.test(html), true);
  const quellen = ['src/Verjuengung.jsx', 'src/Baummessung.jsx']
    .map((d) => fs.readFileSync(d, 'utf8'));
  pruefe('Zuschlag für die Gestenleiste in beiden festen Leisten',
    quellen.filter((q) => q.includes('env(safe-area-inset-bottom')).length, 2);

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
