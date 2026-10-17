/* Formzahlen in der Oberflaeche: Grundwert, Hoehenstufen, Speicher.

   Geprueft wird vor allem das, was still schiefgehen koennte: dass eine
   eingetragene Stufe wirklich in die Rechnung geht, dass sie nach dem
   Neuladen noch da ist, und dass ohne Eintrag alles genau so bleibt wie
   vorher.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/formzahlen.cjs                                          */
const { chromium } = require('playwright');
let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

/* Die Leiste am unteren Rand liegt fest ueber der Seite. Playwright rollt ein
   Element zwar in den Blick, aber genau dorthin - deshalb erst in die Mitte
   rollen, dann tippen. */
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

  console.log('\nOHNE STUFEN RECHNET ES WIE BISHER');
  // Fichte ist die erste Karte: 10 Stammzahl, eine Hoehe von 12 m.
  await tippe(page.getByRole('button',{name:'Fünf dazu'}).first());
  await tippe(page.getByRole('button',{name:'Fünf dazu'}).first());
  await page.getByPlaceholder('26').first().fill('12');
  await page.getByPlaceholder('26').first().press('Enter');
  await page.waitForTimeout(300);
  pruefe('40 m²/ha · 240 fm/ha mit Formzahl 0,50',
    await page.getByText('40 m²/ha · 240 fm/ha (Formzahl 0,50)').count(), 1);

  console.log('\nPANEL');
  await tippe(page.getByRole('button',{name:'Formzahlen anpassen'}));
  await page.waitForTimeout(300);
  pruefe('Grundwert der Fichte steht da',
    await page.getByLabel('Formzahl Fichte').inputValue(), '0.5');
  pruefe('Staffelung ist zugeklappt',
    await page.getByRole('button',{name:/Nach Höhe staffeln/}).count(), 1);
  pruefe('und noch keine Stufenfelder',
    await page.getByLabel('Stufe 1 bis Meter').count(), 0);

  await tippe(page.getByRole('button',{name:/Nach Höhe staffeln/}));
  await page.waitForTimeout(300);
  pruefe('sagt, dass sie leer ist',
    await page.getByText('Keine Stufen für Fichte – es gilt der Grundwert 0,50').count(), 1);
  pruefe('und bringt selbst keine Werte mit',
    await page.getByLabel('Stufe 1 bis Meter').count(), 0);

  console.log('\nEINE STUFE EINTRAGEN');
  await tippe(page.getByRole('button',{name:'+ Stufe'})); await page.waitForTimeout(250);
  pruefe('Zeile da', await page.getByLabel('Stufe 1 bis Meter').count(), 1);
  await page.getByLabel('Stufe 1 bis Meter').fill('15');
  await page.getByLabel('Stufe 1 Formzahl').fill('0,55');
  await page.waitForTimeout(300);
  pruefe('Gegenlesen: bis 15 m → 0,55',
    await page.getByText(/bis 15 m → 0,55/).count(), 1);
  pruefe('Gegenlesen: darüber der Grundwert',
    await page.getByText(/über 15 m → 0,50 \(Grundwert\)/).count(), 1);
  pruefe('Baumart ist in der Liste markiert',
    await page.getByText('· 1 Höhenstufe').count(), 1);

  console.log('\nGEHT SIE IN DIE RECHNUNG?');
  // Mittelhoehe ist 12 m, liegt also in der Stufe bis 15 m.
  pruefe('jetzt 264 fm/ha mit Formzahl 0,55',
    await page.getByText('40 m²/ha · 264 fm/ha (Formzahl 0,55)').count(), 1);

  console.log('\nÜBERLEBT SIE DAS NEULADEN?');
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(700);
  // Das Startskript setzt die Seite bei jedem Laden zurueck.
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  pruefe('Vorrat nach dem Neuladen',
    await page.getByText('40 m²/ha · 264 fm/ha (Formzahl 0,55)').count(), 1);
  await tippe(page.getByRole('button',{name:'Formzahlen anpassen'}));
  await tippe(page.getByRole('button',{name:/Nach Höhe staffeln/}));
  await page.waitForTimeout(300);
  pruefe('Stufe steht noch im Feld',
    await page.getByLabel('Stufe 1 bis Meter').inputValue(), '15');
  pruefe('Komma ist nicht verlorengegangen',
    await page.getByLabel('Stufe 1 Formzahl').inputValue(), '0,55');

  console.log('\nEINZELBÄUME NUTZEN DIE HÖHE DES BAUMS');
  await tippe(page.getByRole('button',{name:'Einzelbäume'})); await page.waitForTimeout(300);
  pruefe('ohne Höhe der Grundwert',
    await page.getByText(/Formzahl 0,50 für Fichte – Grundwert/).count(), 1);
  await page.getByPlaceholder('25').fill('12'); await page.waitForTimeout(300);
  pruefe('12 m → 0,55',
    await page.getByText('Formzahl 0,55 für Fichte – Höhenstufe bei 12 m').count(), 1);
  await page.getByPlaceholder('25').fill('30'); await page.waitForTimeout(300);
  pruefe('30 m → wieder Grundwert',
    await page.getByText('Formzahl 0,50 für Fichte – Höhenstufe bei 30 m').count(), 1);

  console.log('\nSTUFE WIEDER WEG');
  await tippe(page.getByRole('button',{name:'Winkelzählprobe'})); await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'Stufe 1 entfernen'})); await page.waitForTimeout(300);
  pruefe('Felder weg', await page.getByLabel('Stufe 1 bis Meter').count(), 0);
  pruefe('Markierung weg', await page.getByText('· 1 Höhenstufe').count(), 0);
  pruefe('und es rechnet wieder mit 0,50',
    await page.getByText('40 m²/ha · 240 fm/ha (Formzahl 0,50)').count(), 1);

  console.log('\nBREITE – auf dem kleinsten Handy');
  await tippe(page.getByRole('button',{name:'+ Stufe'}));
  await page.getByLabel('Stufe 1 bis Meter').fill('15');
  await page.getByLabel('Stufe 1 Formzahl').fill('0,55');
  for (const w of [320, 390]) {
    await page.setViewportSize({width:w,height:900}); await page.waitForTimeout(300);
    pruefe(`${w} px ohne Seitwärtsscrollen`,
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  }

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
