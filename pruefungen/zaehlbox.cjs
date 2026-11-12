/* Die Zählbox der Verjüngungsaufnahme – Daumen statt Feinmotorik.

   Die ganze Box ist der Plus-Knopf. Darin sitzen drei kleine Knöpfe, und
   aus dem Feldtest kam: Man kommt beim Zählen zu leicht auf den Stift.
   Er saß als innerster der drei am nächsten zur Mitte der Box – also
   genau dort, wo ein Tipp zum Zählen landet.

   Geprüft wird deshalb die Geometrie, nicht nur das Verhalten: Der Stift
   gehört in die andere Ecke, weg vom Daumenweg, und er soll der kleinste
   der drei sein. Eine Prüfung auf "fühlt sich besser an" gibt es nicht –
   aber auf "steht nicht mehr im Weg" schon.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/zaehlbox.cjs                                              */
const { chromium } = require('playwright');
let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

(async()=>{
  const b=await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-proxy-server']});
  const ctx=await b.newContext({viewport:{width:390,height:900}});
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:200,body:'[]'}));
  await page.addInitScript(()=>{
    /* vibrate() und wakeLock sitzen auf dem Prototyp - schlichtes Zuweisen
       ginge ins Leere, deshalb defineProperty. */
    window.__stupse = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (m) => { window.__stupse.push(String(m)); return true; },
    });
    window.__wach = 0;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => { window.__wach++; return { release: async () => {} }; } },
    });
  });
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(800);

  /* WICHTIG: die kleinen Knoepfe INNERHALB der Box suchen. Nebenan steht
     die zweite Box, und ein schlichtes .first() greift sonst quer ueber
     beide - dann vergleicht man Knoepfe, die gar nicht zusammengehoeren.
     (Genau das ist mir beim Schreiben dieser Pruefung passiert.) */
  const box   = page.getByRole('button',{name:'unverbissen'}).first();
  const stift = box.getByRole('button',{name:'Zahl eingeben'});
  const minus = box.getByRole('button',{name:'Eins abziehen'});
  const fuenf = box.getByRole('button',{name:'Fünf dazu'});
  const masse = async (l) => await l.boundingBox();
  // Die Zahl steht in der zweiten Zeile der Box.
  const stand = async () => (await box.innerText()).split("\n")[1];

  console.log('\nWO DER STIFT SITZT');
  const [bBox, sBox, mBox, fBox] = await Promise.all([masse(box), masse(stift), masse(minus), masse(fuenf)]);
  pruefe('Stift links von "−"', sBox.x + sBox.width <= mBox.x, true);
  pruefe('und links von "+5"', sBox.x + sBox.width <= fBox.x, true);
  pruefe('er steht am linken Rand der Box', Math.round(sBox.x - bBox.x) <= 16, true);
  pruefe('die beiden anderen am rechten',
    Math.round(bBox.x + bBox.width - (fBox.x + fBox.width)) <= 16, true);
  pruefe('er ist der kleinste der drei',
    sBox.width < mBox.width && sBox.width < fBox.width, true);
  // 22 px plus Rahmen; vorher waren es 26 plus Rahmen.
  pruefe('und kleiner als früher', sBox.width <= 24, true);

  console.log('\nABSTAND ZUM DAUMENWEG');
  /* Die Luecke ist der eigentliche Schutz, nicht die Groesse: Vorher sass
     der Stift 6 px neben dem Minus, mitten in der Knopfgruppe. */
  const luecke = Math.round(mBox.x - (sBox.x + sBox.width));
  pruefe(`Lücke ${luecke} px statt vorher 6`, luecke >= 30, true);

  console.log('\nER ZÄHLT NICHTS MIT');
  pruefe('Zähler steht auf 0', await stand(), '0');
  await stift.click(); await page.waitForTimeout(200);
  pruefe('Stift öffnet das Zahlenfeld', await box.locator('input[type="number"]').count(), 1);
  await box.locator('input[type="number"]').fill('3');
  await box.locator('input[type="number"]').press('Enter');
  await page.waitForTimeout(250);
  pruefe('eingetippte 3 steht drin', await stand(), '3');

  console.log('\nDIE BOX ZÄHLT WEITER WIE BISHER');
  await box.click({position:{x:60,y:40}}); await page.waitForTimeout(200);
  pruefe('ein Tipp auf die Fläche: 4', await stand(), '4');
  await fuenf.click(); await page.waitForTimeout(250);
  pruefe('"+5" legt fünf drauf: 9', await stand(), '9');
  await minus.click(); await page.waitForTimeout(250);
  pruefe('"−" zieht eins ab: 8', await stand(), '8');

  console.log('\nUND DIE NACHBARBOX BLEIBT UNBERÜHRT');
  const verbissen = page.getByRole('button',{name:'verbissen',exact:true}).first();
  pruefe('daneben steht weiter 0', (await verbissen.innerText()).split("\n")[1], '0');

  console.log('\nSTUPS BEIM ZÄHLEN');
  const stupse = () => page.evaluate(() => window.__stupse.slice());
  await page.evaluate(() => { window.__stupse.length = 0; });
  await box.click({position:{x:60,y:40}}); await page.waitForTimeout(200);
  pruefe('ein Ticken je Pflanze', (await stupse()).join("|"), '15');
  await fuenf.click(); await page.waitForTimeout(200);
  pruefe('auch bei "+5"', (await stupse()).join("|"), '15|15');

  console.log('\nBILDSCHIRM WACHHALTEN');
  pruefe('die Sperre wurde geholt', await page.evaluate(() => window.__wach) >= 1, true);

  console.log('\nBEIDES LÄSST SICH ABSCHALTEN');
  await page.getByRole('button',{name:'Einstellungen'}).click(); await page.waitForTimeout(300);
  const schalter = page.getByRole('switch');
  pruefe('zwei Schalter', await schalter.count(), 2);
  pruefe('beide stehen auf an',
    (await schalter.nth(0).getAttribute('aria-checked')) + "/" +
    (await schalter.nth(1).getAttribute('aria-checked')), 'true/true');
  await schalter.nth(1).click(); await page.waitForTimeout(300);
  pruefe('Stups ist aus', await schalter.nth(1).getAttribute('aria-checked'), 'false');
  await page.evaluate(() => { window.__stupse.length = 0; });
  await box.click({position:{x:60,y:40}}); await page.waitForTimeout(200);
  pruefe('und es tickt nicht mehr', (await stupse()).length, 0);
  pruefe('gezählt wird trotzdem', await stand(), '15');

  console.log('\nDIE WAHL ÜBERLEBT DAS NEULADEN');
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(800);
  await page.getByRole('button',{name:'Einstellungen'}).click(); await page.waitForTimeout(300);
  pruefe('Stups immer noch aus',
    await page.getByRole('switch').nth(1).getAttribute('aria-checked'), 'false');

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
