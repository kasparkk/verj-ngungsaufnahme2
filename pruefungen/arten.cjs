/* Eigene Baumart in der Baummessung.

   Die feste Liste deckt ab, was hier im Bestand steht - nicht mehr.
   Geprüft wird vor allem, dass eine eigene Art kein Sonderfall bleibt:
   Sie muss in beiden Verfahren auftauchen, in der Formzahl-Liste stehen
   und das Neuladen überleben. Und sie darf nicht verschwinden, während
   jemand mit ihr zählt - das wäre ein Datenverlust mit einem Fingertipp.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/arten.cjs                                                 */
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

  console.log('\nEINTRAGEN IN DER WINKELZÄHLPROBE');
  const feld = page.getByLabel('eigene Baumart');
  pruefe('Feld ist da', await feld.count(), 1);
  await feld.fill('Robinie');
  await tippe(page.getByRole('button',{name:'Hinzufügen'}));
  await page.waitForTimeout(400);
  pruefe('zählt gleich mit', await page.getByText('Robinie',{exact:true}).count(), 1);
  pruefe('das Feld ist wieder leer', await feld.inputValue(), '');

  console.log('\nSIE ZÄHLT WIE JEDE ANDERE');
  const karte = page.locator('div').filter({ hasText: /^Robinie/ }).last();
  await tippe(page.getByRole('button',{name:'Fünf dazu'}).last());
  await page.waitForTimeout(300);
  // 5 Stämme × Zählfaktor 4 = 20 m²/ha - einmal bei der Art, einmal in der Summe.
  pruefe('20 m²/ha nach fünf Stämmen bei k=4',
    await page.getByText(/^20 m²\/ha/).count(), 2);

  console.log('\nZWEIMAL GEHT NICHT');
  await feld.fill('robinie');
  await tippe(page.getByRole('button',{name:'Hinzufügen'}));
  await page.waitForTimeout(400);
  pruefe('sagt es', await page.getByText('robinie steht schon in der Liste').count(), 1);
  pruefe('und legt keine zweite an', await page.getByText('Robinie',{exact:true}).count(), 1);
  await feld.fill('');

  console.log('\nSIE STEHT AUCH BEI DEN FORMZAHLEN');
  await tippe(page.getByRole('button',{name:'Formzahlen anpassen'}));
  await page.waitForTimeout(300);
  pruefe('mit eigenem Feld', await page.getByLabel('Formzahl Robinie').count(), 1);
  pruefe('leer, aber mit 0,50 als Hinweis dahinter',
    await page.getByLabel('Formzahl Robinie').getAttribute('placeholder'), '0,50');
  pruefe('und mit einem × zum Herausnehmen',
    await page.getByRole('button',{name:'Robinie aus der Liste nehmen'}).count(), 1);
  pruefe('eine feste Art hat kein ×',
    await page.getByRole('button',{name:'Fichte aus der Liste nehmen'}).count(), 0);

  console.log('\nSOLANGE GEZÄHLT WIRD, BLEIBT SIE');
  await tippe(page.getByRole('button',{name:'Robinie aus der Liste nehmen'}));
  await page.waitForTimeout(300);
  pruefe('sagt, warum nicht',
    await page.getByText('Robinie wird gerade benutzt – erst dort entfernen').count(), 1);
  pruefe('und ist noch da', await page.getByLabel('Formzahl Robinie').count(), 1);

  console.log('\nSIE ÜBERLEBT DAS NEULADEN');
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  pruefe('immer noch da', await page.getByText('Robinie',{exact:true}).count(), 1);

  console.log('\nUND SIE IST AUCH BEI DEN EINZELBÄUMEN WÄHLBAR');
  await tippe(page.getByRole('button',{name:'Einzelbäume'})); await page.waitForTimeout(400);
  pruefe('als Knopf', await page.getByRole('button',{name:'Robinie'}).count(), 1);
  await tippe(page.getByRole('button',{name:'Robinie'}));
  await page.getByLabel('BHD cm').fill('30');
  await page.waitForTimeout(300);
  pruefe('mit der Standard-Formzahl',
    await page.getByText('Formzahl 0,50 für Robinie').count(), 1);

  console.log('\nHERAUSNEHMEN GEHT, SOBALD NIEMAND SIE BRAUCHT');
  await tippe(page.getByRole('button',{name:'Winkelzählprobe'})); await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'Eins abziehen'}).last());
  for (let i=0;i<4;i++) await tippe(page.getByRole('button',{name:'Eins abziehen'}).last());
  await page.waitForTimeout(200);
  await tippe(page.getByText('entfernen').last());   // aus der Zählliste nehmen
  await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'Formzahlen anpassen'}));
  await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'Robinie aus der Liste nehmen'}));
  await page.waitForTimeout(300);
  pruefe('jetzt ist sie weg', await page.getByLabel('Formzahl Robinie').count(), 0);

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
