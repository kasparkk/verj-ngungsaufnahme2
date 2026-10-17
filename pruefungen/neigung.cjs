/* Entfernung aus der Neigung - in der Oberflaeche.

   Geprueft wird vor allem, dass die Schaetzung sich NICHT von selbst
   einträgt, dass sie ihre Spanne immer mitbringt und dass sie jenseits
   der Grenze keine Zahl mehr anbietet. Eine Zahl ohne Spanne waere hier
   schlimmer als gar keine - das ist der Teil, der still schiefgehen
   koennte.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/neigung.cjs                                            */
const { chromium } = require('playwright');
let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

const tippe = async (loc) => {
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await loc.click();
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
  // Ohne Sensor stellt der Messer nach zwei Sekunden auf Eintippen um.
  await page.waitForTimeout(2600);
  pruefe('Winkel lassen sich eintippen', await page.getByLabel('Winkel zum Fuß').count(), 1);

  console.log('\nOHNE FUSSWINKEL KEIN VORSCHLAG');
  pruefe('kein Kasten', await page.getByLabel('Handyhöhe über dem Boden').count(), 0);

  console.log('\nNAH DRAN: VORSCHLAG MIT SPANNE');
  await page.getByLabel('Winkel zum Fuß').fill('-17'); await page.waitForTimeout(300);
  pruefe('Handyhöhe steht voreingestellt da',
    await page.getByLabel('Handyhöhe über dem Boden').inputValue(), '1,50');
  // 1,50 / tan(17°) = 4,906...
  pruefe('4,9 m vorgeschlagen', await page.getByText('4,9 m',{exact:true}).count(), 1);
  // 1,50/tan(18°) = 4,62 und 1,50/tan(16°) = 5,23
  pruefe('Spanne dabei', await page.getByText(/4,6 – 5,2 m/).count(), 1);
  pruefe('Hangwarnung dabei', await page.getByText(/waagerechten Boden/).count(), 1);

  console.log('\nTRÄGT SICH NICHT VON SELBST EIN');
  pruefe('Entfernungsfeld unverändert',
    await page.getByLabel('Entfernung').inputValue(), '20');
  await tippe(page.getByRole('button',{name:'Als Entfernung übernehmen'}));
  await page.waitForTimeout(300);
  pruefe('erst auf Antippen', await page.getByLabel('Entfernung').inputValue(), '4,9');

  console.log('\nHANDYHÖHE GEHT IN DIE RECHNUNG');
  await page.getByLabel('Handyhöhe über dem Boden').fill('1,80'); await page.waitForTimeout(300);
  // 1,80 / tan(17°) = 5,888...
  pruefe('1,80 m → 5,9 m', await page.getByText('5,9 m',{exact:true}).count(), 1);

  console.log('\nWEIT WEG: KEINE ZAHL MEHR');
  await page.getByLabel('Winkel zum Fuß').fill('-4'); await page.waitForTimeout(300);
  pruefe('sagt, dass es zu flach ist',
    await page.getByText(/So\s+flach lässt sich die Entfernung nicht mehr schätzen/).count(), 1);
  pruefe('kein Übernehmen-Knopf',
    await page.getByRole('button',{name:'Als Entfernung übernehmen'}).count(), 0);
  // Handyhöhe steht hier auf 1,80: 1,80/tan(5°) = 20,6 und 1,80/tan(3°) = 34,3
  pruefe('aber die Spanne wird gezeigt', await page.getByText(/20,6 bis 34,3 m/).count(), 1);

  console.log('\nHANDYHÖHE ÜBERLEBT DAS NEULADEN');
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  await tippe(page.getByRole('button',{name:'HÖHE messen'})); await page.waitForTimeout(2600);
  await page.getByLabel('Winkel zum Fuß').fill('-17'); await page.waitForTimeout(300);
  pruefe('1,80 m steht noch da',
    await page.getByLabel('Handyhöhe über dem Boden').inputValue(), '1,80');

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
