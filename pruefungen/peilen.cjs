/* Der geführte Ablauf beim Peilen – mit nachgestelltem Sensor.

   Die übrigen Prüfungen des Höhenmessers laufen über den Weg ohne
   Sensor (Winkel eintippen). Der geführte Ablauf gehört aber genau zum
   anderen Weg: zwei Knöpfe, ein Fadenkreuz, kalte Hände. Deshalb hier
   ein Browser mit gefälschten Neigungsereignissen.

   Geprüft wird vor allem, dass die App in jeder Lage sagt, was dran ist –
   auch in den beiden Fällen, in denen vorher nur ein stummes "–" stand:
   Entfernung fehlt, und Spitze unter dem Fuß.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/peilen.cjs                                               */
const { chromium } = require('playwright');
let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

const tippe = async (loc) => {
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await loc.click();
};

/* Ruhig gehaltenes Gerät: fünf gleiche Werte über 600 ms, so wie es ein
   Mensch tut, der auf "ruhig" wartet. beta = Neigung + 90. */
const neige = async (page, grad) => {
  /* Erst warten, dann senden: Die App bildet den Median ueber die letzten
     500 ms. Kaemen die neuen Werte sofort nach den alten, stuende in der
     Mitte etwas, das nie gemessen wurde. Ein Mensch haelt auch still,
     bevor er tippt. */
  await page.waitForTimeout(600);
  await page.evaluate((b) => {
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new (window.DeviceOrientationEvent || Event)('deviceorientation',
        { beta: b, gamma: 0, alpha: 180 }));
    }
  }, grad + 90);
  await page.waitForTimeout(120);
};

(async()=>{
  const b=await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-proxy-server']});
  const ctx=await b.newContext({viewport:{width:390,height:900}});
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:200,body:'[]'}));
  await page.addInitScript(()=>localStorage.setItem('app:seite','verjuengung'));
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  await tippe(page.getByRole('button',{name:'Einzelbäume'})); await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'HÖHE messen'}));
  // Sofort Ereignisse schicken, damit der Messer nicht auf Eintippen umstellt.
  await neige(page, 0);
  await page.waitForTimeout(400);
  pruefe('der Sensor gilt als da', await page.getByText('NEIGUNG').count(), 1);
  pruefe('die Peilknöpfe sind da', await page.getByRole('button',{name:'Fuß festhalten'}).count(), 1);

  console.log('\nSCHRITT 1');
  pruefe('sagt, was dran ist', await page.getByText('1 · Stammfuß anpeilen').count(), 1);
  pruefe('Fuß steht auf "anpeilen"',
    (await page.getByRole('button',{name:'Fuß festhalten'}).innerText()).includes('anpeilen'), true);

  console.log('\nSCHRITT 2');
  await neige(page, -10);
  await tippe(page.getByRole('button',{name:'Fuß festhalten'}));
  await page.waitForTimeout(200);
  pruefe('jetzt die Spitze', await page.getByText('2 · Spitze anpeilen').count(), 1);
  pruefe('der Fuß ist abgehakt',
    (await page.getByRole('button',{name:'Fuß festhalten'}).innerText()).includes('✓ -10,0°'), true);
  pruefe('Schritt 1 steht nicht mehr da', await page.getByText('1 · Stammfuß anpeilen').count(), 0);

  console.log('\nDANACH FEHLT DIE ENTFERNUNG - UND DAS STEHT AUCH DA');
  await neige(page, 45);
  await tippe(page.getByRole('button',{name:'Spitze festhalten'}));
  await page.waitForTimeout(200);
  pruefe('sagt, woran es liegt',
    await page.getByText('Jetzt fehlt nur noch die Entfernung oben').count(), 1);
  pruefe('Höhe steht noch nicht', await page.getByText(/^\d+,\d m$/).count(), 0);

  console.log('\nMIT ENTFERNUNG IST ES FERTIG');
  await page.getByLabel('Entfernung').fill('20'); await page.waitForTimeout(300);
  pruefe('meldet fertig', await page.getByText('✓ Fertig – die Höhe steht unten').count(), 1);
  // 20 · (tan 45° + tan 10°) = 23,53
  pruefe('und die Höhe stimmt', await page.getByText('23,5 m').count(), 1);
  pruefe('Übernehmen ist frei',
    await page.getByRole('button',{name:'Übernehmen'}).isDisabled(), false);

  console.log('\nVERTAUSCHT: DIE APP SAGT ES, STATT STUMM ZU BLEIBEN');
  await neige(page, 50);
  await tippe(page.getByRole('button',{name:'Fuß festhalten'}));   // Fuß über der Spitze
  await page.waitForTimeout(200);
  pruefe('nennt den Grund',
    await page.getByText('Die Spitze liegt unter dem Fuß – einen der beiden neu anpeilen').count(), 1);
  pruefe('keine Höhe', await page.getByText(/^\d+,\d m$/).count(), 0);
  pruefe('Übernehmen gesperrt',
    await page.getByRole('button',{name:'Übernehmen'}).isDisabled(), true);

  console.log('\nNEU ANPEILEN HEILT ES');
  await neige(page, -8);
  await tippe(page.getByRole('button',{name:'Fuß festhalten'}));
  await page.waitForTimeout(200);
  pruefe('wieder fertig', await page.getByText('✓ Fertig – die Höhe steht unten').count(), 1);

  console.log('\nZURÜCKSETZEN FÄNGT VON VORNE AN');
  await tippe(page.getByRole('button',{name:'Zurücksetzen'}));
  await page.waitForTimeout(200);
  pruefe('wieder Schritt 1', await page.getByText('1 · Stammfuß anpeilen').count(), 1);
  pruefe('die Entfernung bleibt stehen',
    await page.getByLabel('Entfernung').inputValue(), '20');

  console.log('\nBREITE');
  for (const w of [320, 390]) {
    await page.setViewportSize({width:w,height:900}); await page.waitForTimeout(300);
    pruefe(`${w} px ohne Seitwärtsscrollen`,
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  }

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
