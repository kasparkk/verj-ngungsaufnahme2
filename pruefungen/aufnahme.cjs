/* Neuer Bestand = neues Blatt.

   Gemeldet aus dem Feldtest: "wenn man den Namen vom Feld ändert, stehen
   immer noch die gleichen Daten drin." Genau so war es - der Name war
   eine Beschriftung, die Zahlen des vorigen Bestandes blieben stehen und
   wären unter dem neuen Namen in der Excel-Datei gelandet. Das ist die
   schlimmste Sorte Fehler: Sie sieht aus wie eine Aufnahme.

   Geprüft wird beides - dass gefragt wird, und dass nichts von selbst
   verschwindet:
     - umbenennen mit Daten  -> Frage
     - "Nur umbenennen"      -> alles bleibt, nur der Name ist neu
     - "Neu beginnen"        -> leeres Blatt, aber Formzahlen, eigene
                                Arten, Zählfaktor und Baumartenliste
                                bleiben (die gehören zur Arbeitsweise,
                                nicht zum Bestand)
     - "Zurückholen"         -> die alte Aufnahme steht wieder da
     - umbenennen ohne Daten -> keine Frage
     - Ort zum ersten Mal    -> keine Frage

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/aufnahme.cjs                                            */
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
  await page.waitForTimeout(800);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);

  const ort = page.getByLabel('ORT / BESTAND');
  const frage = () => page.getByText(/Neue Aufnahme für/).count();
  /* Die Zählbox der ersten Baumart (Fichte). Sie heisst schlicht
     "gezählt" - die Baumart steht als Überschrift darüber. */
  const box = () => page.getByRole('button',{name:'gezählt'}).first();
  const gezaehlt = async () => (await box().innerText()).split('\n')[1];
  /* Umbenennen heisst: hineintippen, ändern, wieder heraus. Erst beim
     Verlassen wird verglichen - nicht bei jedem Buchstaben. */
  const umbenennen = async (name) => {
    await ort.click();
    await ort.fill(name);
    await page.getByLabel('ALTER Jahre').click();
    await page.waitForTimeout(350);
  };

  console.log('\nDER ERSTE NAME IST KEINE UMBENENNUNG');
  await umbenennen('4138 b1');
  pruefe('keine Frage', await frage(), 0);

  console.log('\nOHNE DATEN WIRD AUCH NICHT GEFRAGT');
  await umbenennen('4138 b2');
  pruefe('keine Frage', await frage(), 0);
  pruefe('der Name steht da', await ort.inputValue(), '4138 b2');

  console.log('\nMIT DATEN WIRD GEFRAGT');
  await tippe(page.getByRole('button',{name:'Fünf dazu'}).first());
  await page.waitForTimeout(250);
  pruefe('fünf Fichten gezählt', await gezaehlt(), '5');
  await umbenennen('4139 a2');
  pruefe('jetzt kommt die Frage', await frage(), 1);
  pruefe('sie nennt beide Bestände',
    await page.getByText(/„4139 a2“.*„4138 b2“/).count(), 1);
  pruefe('und hat noch nichts geleert', await gezaehlt(), '5');

  console.log('\n"NUR UMBENENNEN" LÄSST ALLES STEHEN');
  await tippe(page.getByRole('button',{name:'Nur umbenennen'}));
  await page.waitForTimeout(300);
  pruefe('Frage weg', await frage(), 0);
  pruefe('Zahlen stehen', await gezaehlt(), '5');
  pruefe('Name ist neu', await ort.inputValue(), '4139 a2');

  console.log('\n"NEU BEGINNEN" GIBT EIN LEERES BLATT');
  // Etwas mehr hineinlegen, damit sich zeigt, was bleibt und was geht.
  await page.getByLabel('ALTER Jahre').fill('80');
  const h = page.getByLabel('HÖHEN m eintragen').first();
  await h.fill('28,5'); await h.press('Enter'); await page.waitForTimeout(250);
  await tippe(page.getByRole('button',{name:'2',exact:true}));   // Zählfaktor 2
  await page.waitForTimeout(250);
  await umbenennen('4140 c1');
  await tippe(page.getByRole('button',{name:'Neu beginnen'}));
  await page.waitForTimeout(400);
  pruefe('Zähler auf 0', await gezaehlt(), '0');
  pruefe('keine Höhen mehr', await page.getByRole('button',{name:'28,5 ×'}).count(), 0);
  pruefe('Alter leer', await page.getByLabel('ALTER Jahre').inputValue(), '');
  pruefe('neuer Name steht', await ort.inputValue(), '4140 c1');
  // Was zur Arbeitsweise gehoert, bleibt - sonst stellt man es zehnmal am Tag neu ein.
  pruefe('Zählfaktor 2 bleibt',
    await page.getByRole('button',{name:'2',exact:true}).getAttribute('aria-pressed'), 'true');
  pruefe('die Baumarten stehen noch da',
    (await page.getByText('Fichte',{exact:true}).count()) >= 1, true);

  console.log('\nUND SIE LÄSST SICH ZURÜCKHOLEN');
  pruefe('der Weg zurück steht da',
    await page.getByRole('button',{name:'Zurückholen'}).count(), 1);
  await tippe(page.getByRole('button',{name:'Zurückholen'}));
  await page.waitForTimeout(400);
  pruefe('die fünf Fichten sind wieder da', await gezaehlt(), '5');
  pruefe('die Höhe auch', await page.getByRole('button',{name:'28,5 ×'}).count(), 1);
  pruefe('mit dem alten Namen', await ort.inputValue(), '4139 a2');
  pruefe('Alter wieder da', await page.getByLabel('ALTER Jahre').inputValue(), '80');
  pruefe('und der Weg zurück ist weg',
    await page.getByRole('button',{name:'Zurückholen'}).count(), 0);

  console.log('\nDAS NEUE BLATT ÜBERLEBT DAS NEULADEN');
  await umbenennen('4141 d3');
  await tippe(page.getByRole('button',{name:'Neu beginnen'}));
  await page.waitForTimeout(400);
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(800);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  pruefe('leer geblieben', await gezaehlt(), '0');
  pruefe('und der Name steht', await page.getByLabel('ORT / BESTAND').inputValue(), '4141 d3');

  console.log('\nBREITE');
  await page.getByLabel('ORT / BESTAND').click();
  await page.getByLabel('ORT / BESTAND').fill('4142 e1');
  await page.getByLabel('ALTER Jahre').click();
  await page.waitForTimeout(300);
  for (const w of [320, 390]) {
    await page.setViewportSize({width:w,height:900}); await page.waitForTimeout(300);
    pruefe(`${w} px ohne Seitwärtsscrollen`,
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
  }

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
