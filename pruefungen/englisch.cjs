/* Die englische Fassung in der Oberflaeche.

   Zwei Dinge koennen hier still schiefgehen, und beide werden geprueft:

   1. Eine Stelle, die den Sprachwechsel nicht mitbekommt und deutsch
      stehenbleibt (vergessener useT-Haken).
   2. Schlimmer: eine Spracheinstellung, die in die DATEN durchschlaegt.
      Gespeichert und exportiert werden muss immer der deutsche Name -
      sonst waeren dieselben Baeume je nach Handy zwei verschiedene Arten.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/englisch.cjs                                            */
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
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(700);

  console.log('\nDEUTSCH IST DIE VOREINSTELLUNG');
  pruefe('Reiter deutsch', await page.getByRole('button',{name:'Verjüngung',exact:true}).count(), 1);
  pruefe('html lang', await page.evaluate(() => document.documentElement.lang), 'de');
  pruefe('DE ist gedrückt',
    await page.getByRole('button',{name:'Deutsch'}).getAttribute('aria-pressed'), 'true');

  console.log('\nUMSCHALTEN');
  await page.getByRole('button',{name:'English'}).click(); await page.waitForTimeout(400);
  pruefe('html lang', await page.evaluate(() => document.documentElement.lang), 'en');
  pruefe('Reiter 1', await page.getByRole('button',{name:'Regeneration'}).count(), 1);
  pruefe('Reiter 2', await page.getByRole('button',{name:'Tree survey'}).count(), 1);
  pruefe('kein deutscher Reiter mehr',
    await page.getByRole('button',{name:'Verjüngung',exact:true}).count(), 0);

  console.log('\nVERJÜNGUNGSAUFNAHME AUF ENGLISCH');
  pruefe('PERSON', await page.getByText('PERSON',{exact:true}).count(), 1);
  pruefe('DATE', await page.getByText('DATE',{exact:true}).count(), 1);
  pruefe('COMPARTMENT', await page.getByText('COMPARTMENT',{exact:true}).count(), 1);
  pruefe('AREA m²', await page.getByText('AREA m²',{exact:true}).count(), 1);
  pruefe('SAMPLE PLOT', await page.getByText('SAMPLE PLOT',{exact:true}).count(), 1);
  // Drei Baumarten stehen voreingestellt da: je eine Box "browsed" und
  // "unbrowsed", und in jeder Box ein "+5".
  pruefe('Zählboxen', await page.getByRole('button',{name:'unbrowsed'}).count(), 3);
  pruefe('kleine Knöpfe', await page.getByRole('button',{name:'Add five'}).count(), 6);
  pruefe('Baumarten übersetzt', await page.getByText('Pine',{exact:true}).count(), 1);
  pruefe('und Buche auch', await page.getByText('Beech',{exact:true}).count(), 1);
  pruefe('Übersicht', await page.getByRole('button',{name:'Show overview'}).count(), 1);
  pruefe('Abgleichzeile',
    await page.getByText('Enter a person – then syncing happens automatically').count(), 1);

  console.log('\nABER DIE DATEN BLEIBEN DEUTSCH');
  // Eine Kiefer zählen und nachsehen, was gespeichert wurde.
  await page.getByRole('button',{name:'Chosen person'}).count();
  await tippe(page.getByRole('button',{name:'Next person'}));
  await tippe(page.getByRole('button',{name:'unbrowsed'}).first());
  await page.waitForTimeout(400);
  const gespeichert = await page.evaluate(() => localStorage.getItem('verjuengung:aufnahme'));
  const arten = JSON.parse(gespeichert).blaetter
    ? JSON.stringify(JSON.parse(gespeichert))
    : JSON.stringify(JSON.parse(gespeichert));
  pruefe('"Kiefer" steht im Speicher', arten.includes('Kiefer'), true);
  pruefe('"Pine" steht NICHT im Speicher', arten.includes('Pine'), false);

  console.log('\nBAUMMESSUNG AUF ENGLISCH');
  await tippe(page.getByRole('button',{name:'Tree survey'})); await page.waitForTimeout(400);
  pruefe('Verfahren 1', await page.getByRole('button',{name:'Angle count sampling'}).count(), 1);
  pruefe('Verfahren 2', await page.getByRole('button',{name:'Individual trees'}).count(), 1);
  pruefe('Zählfaktor heißt basal area factor',
    await page.getByText('BASAL AREA FACTOR m²/ha').count(), 1);
  pruefe('Grenzstamm', await page.getByRole('button',{name:'Check borderline tree'}).count(), 1);
  pruefe('Baumart Fichte → Spruce', await page.getByText('Spruce',{exact:true}).count(), 1);

  console.log('\nZAHLEN IM ENGLISCHEN FORMAT');
  await tippe(page.getByRole('button',{name:'Add five'}).first());
  await tippe(page.getByRole('button',{name:'Add five'}).first());
  await page.getByPlaceholder('26').first().fill('12');
  await page.getByPlaceholder('26').first().press('Enter');
  await page.waitForTimeout(300);
  // Deutsch wäre: 40 m²/ha · 240 fm/ha (Formzahl 0,50)
  pruefe('Punkt statt Komma, fm → m³',
    await page.getByText('40 m²/ha · 240 m³/ha (form factor 0.50)').count(), 1);

  console.log('\nMONITORING AUF ENGLISCH');
  await tippe(page.getByRole('button',{name:'Monitoring'})); await page.waitForTimeout(400);
  pruefe('Abschnitt A', await page.getByText('A — General survey data').count(), 1);
  pruefe('Punktleiste', await page.getByRole('button',{name:'New point'}).count(), 1);
  pruefe('Stammdaten der Landesforst bleiben deutsch (BZT)',
    await page.getByText('Main stand / BZT').count(), 1);
  pruefe('Reiter des Bogens', await page.getByRole('button',{name:'Summary'}).count(), 1);
  // Werte des Bogens: angezeigt englisch, gespeichert bleibt "geschlossen".
  pruefe('Kronenschluss übersetzt', await page.getByRole('button',{name:'with gaps'}).count(), 1);
  pruefe('Ja/Nein übersetzt', await page.getByRole('button',{name:'yes'}).count(), 4);
  pruefe('Baumart-Typ übersetzt', await page.getByText(/GKI · Conifer/).count(), 1);
  // Die Probekreisfläche rechnet die App aus: 5 m Radius -> 78.5 m²
  pruefe('Zahl im englischen Format',
    await page.getByText('78.5',{exact:true}).count(), 1);
  await page.getByRole('button',{name:'with gaps'}).click(); await page.waitForTimeout(300);
  const bogen = await page.evaluate(() => localStorage.getItem('monitoring:aufnahme'));
  pruefe('gespeichert wird "mit Lücken"', bogen.includes('mit Lücken'), true);
  pruefe('und nicht "with gaps"', bogen.includes('with gaps'), false);

  console.log('\nDIE WAHL ÜBERLEBT DAS NEULADEN');
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(700);
  pruefe('noch englisch', await page.getByRole('button',{name:'Regeneration'}).count(), 1);
  pruefe('html lang', await page.evaluate(() => document.documentElement.lang), 'en');

  console.log('\nUND ZURÜCK');
  await page.getByRole('button',{name:'Deutsch'}).click(); await page.waitForTimeout(400);
  pruefe('wieder deutsch',
    await page.getByRole('button',{name:'Verjüngung',exact:true}).count(), 1);
  pruefe('html lang', await page.evaluate(() => document.documentElement.lang), 'de');

  console.log('\nBREITE – die englischen Texte sind länger');
  for (const w of [320, 390]) {
    await page.getByRole('button',{name:'English'}).click();
    await page.setViewportSize({width:w,height:900}); await page.waitForTimeout(300);
    for (const reiter of ['Regeneration','Tree survey','Monitoring']) {
      await tippe(page.getByRole('button',{name:reiter}));
      await page.waitForTimeout(250);
      pruefe(`${reiter} bei ${w} px ohne Seitwärtsscrollen`,
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    }
  }

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
