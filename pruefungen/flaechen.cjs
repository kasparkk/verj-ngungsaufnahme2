/* Mehrere Probeflächen bei den Einzelbäumen.

   Eine Einzelbaumaufnahme besteht im Bestand selten aus einer Fläche:
   Man steckt zwei oder drei ab und rechnet sie zusammen hoch. Dabei
   zählt genau eine Sache: Zusammengerechnet wird über die SUMME der
   Flächen, nicht als Mittel der einzelnen Hochrechnungen - sonst wiegt
   eine kleine Fläche mit drei Bäumen so schwer wie eine große mit
   dreißig. Hier steht die Rechnung mit Zahlen, die sich von Hand
   nachrechnen lassen.

   Dazu das, was still schiefgehen könnte:
     - die Bäume der einen Fläche landen in der anderen
     - eine Fläche ohne Größe verschwindet samt Bäumen aus der Rechnung,
       ohne dass es jemand merkt
     - eine ältere Aufnahme (eine Fläche, Stand vor dieser Änderung)
       geht beim Laden verloren

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/flaechen.cjs                                            */
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
  await tippe(page.getByRole('button',{name:'Einzelbäume'})); await page.waitForTimeout(400);

  const baeume = () => page.getByRole('button',{name:'Baum entfernen'}).count();
  const aufnehmen = async (bhd, hoehe) => {
    await page.getByLabel('BHD cm').fill(bhd);
    await page.getByLabel('HÖHE m',{exact:true}).fill(hoehe);
    await tippe(page.getByRole('button',{name:'+ Baum aufnehmen'}));
    await page.waitForTimeout(250);
  };

  console.log('\nAM ANFANG GIBT ES EINE FLÄCHE');
  pruefe('Fläche 1 ist da', await page.getByRole('button',{name:/^Fläche 1/}).count(), 1);
  pruefe('eine zweite nicht', await page.getByRole('button',{name:/^Fläche 2/}).count(), 0);
  pruefe('und kein Gesamtergebnis', await page.getByText(/ALLE FLÄCHEN/).count(), 0);

  await page.getByLabel('FLÄCHE m²').fill('500');
  await aufnehmen('34','27');
  // 500 m²: ein Baum mit 1,2257 fm -> 24,5 fm/ha
  pruefe('Fläche 1 rechnet für sich hoch', await page.getByText('24,5').count(), 1);
  pruefe('der Knopf zählt mit',
    (await page.getByRole('button',{name:/^Fläche 1/}).innerText()).replace(/\s+/g,' '), 'Fläche 1 · 1');

  console.log('\nEINE ZWEITE FLÄCHE DAZU');
  await tippe(page.getByRole('button',{name:'+ Fläche'})); await page.waitForTimeout(300);
  pruefe('Fläche 2 ist da und dran',
    await page.getByRole('button',{name:/^Fläche 2/}).getAttribute('aria-pressed'), 'true');
  pruefe('sie fängt leer an', await baeume(), 0);
  // Die Größe der vorigen steht schon da - meist sind die Flächen gleich groß.
  pruefe('die Größe ist vorbelegt', await page.getByLabel('FLÄCHE m²').inputValue(), '500');

  await aufnehmen('41','29');
  pruefe('ein Baum auf Fläche 2', await baeume(), 1);

  console.log('\nJEDE FLÄCHE HÄLT IHRE EIGENEN BÄUME');
  await tippe(page.getByRole('button',{name:/^Fläche 1/})); await page.waitForTimeout(300);
  pruefe('Fläche 1 hat weiter genau einen', await baeume(), 1);
  pruefe('und es ist ihrer',
    await page.getByText('34 cm · 27 m').count(), 1);
  pruefe('nicht der von Fläche 2',
    await page.getByText('41 cm · 29 m').count(), 0);

  console.log('\nZUSAMMENGERECHNET WIRD ÜBER DIE SUMME DER FLÄCHEN');
  /* 1,225692 fm + 1,914369 fm = 3,140061 fm auf 1000 m² -> 31,4 fm/ha.
     Der Mittelwert der beiden Einzelhochrechnungen wäre 31,4 ebenfalls -
     weil beide Flächen gleich groß sind. Deshalb steht unten noch eine
     Probe mit ungleichen Flächen. */
  pruefe('Überschrift nennt Bäume und Fläche',
    await page.getByText('ALLE FLÄCHEN · 2 Bäume auf 1.000 m²').count(), 1);
  /* Im Kasten "ALLE FLÄCHEN" nachsehen, nicht auf der ganzen Seite: Die
     Fläche darüber zeigt bei gleich grossen Flächen dieselbe Stammzahl,
     und ein Treffer dort sagt nichts über den Gesamtkasten. */
  const gesamt = page.getByText(/ALLE FLÄCHEN/).locator('xpath=..');
  pruefe('31,4 fm/ha', await gesamt.getByText('31,4',{exact:true}).count(), 1);
  pruefe('2,2 m²/ha', await gesamt.getByText('2,2',{exact:true}).count(), 1);
  pruefe('20 Stämme/ha', await gesamt.getByText('20',{exact:true}).count(), 1);

  console.log('\nUNGLEICH GROSSE FLÄCHEN: DIE GRÖSSERE WIEGT SCHWERER');
  /* Fläche 2 auf 1500 m² -> zusammen 3,140061 fm auf 2000 m² = 15,7 fm/ha.
     Das Mittel der Einzelwerte wäre (24,5 + 12,8)/2 = 18,7 - also eine
     ganz andere Zahl. Genau diese Verwechslung prüft die Zeile. */
  await tippe(page.getByRole('button',{name:/^Fläche 2/})); await page.waitForTimeout(300);
  await page.getByLabel('FLÄCHE m²').fill('1500'); await page.waitForTimeout(300);
  pruefe('15,7 fm/ha, nicht 18,7',
    await page.getByText('ALLE FLÄCHEN · 2 Bäume auf 2.000 m²').count(), 1);
  pruefe('und die Zahl steht da', await gesamt.getByText('15,7',{exact:true}).count(), 1);

  console.log('\nEINE FLÄCHE OHNE GRÖSSE SAGT ES');
  await page.getByLabel('FLÄCHE m²').fill(''); await page.waitForTimeout(300);
  pruefe('sie bleibt draußen - und das steht da',
    await page.getByText(/Eine Fläche hat keine Größe/).count(), 1);
  pruefe('gerechnet wird mit der einen übrigen',
    await page.getByText('ALLE FLÄCHEN · 1 Baum auf 500 m²').count(), 1);
  await page.getByLabel('FLÄCHE m²').fill('1500'); await page.waitForTimeout(300);
  pruefe('und der Hinweis geht wieder weg',
    await page.getByText(/Eine Fläche hat keine Größe/).count(), 0);

  console.log('\nHERAUSNEHMEN NUR, SOLANGE KEIN BAUM DARAUF STEHT');
  pruefe('mit Baum kein Knopf',
    await page.getByRole('button',{name:'Diese Fläche entfernen'}).count(), 0);
  await tippe(page.getByRole('button',{name:'Baum entfernen'}));
  await page.waitForTimeout(300);
  pruefe('ohne Baum schon',
    await page.getByRole('button',{name:'Diese Fläche entfernen'}).count(), 1);
  await tippe(page.getByRole('button',{name:'Diese Fläche entfernen'}));
  await page.waitForTimeout(300);
  pruefe('Fläche 2 ist weg', await page.getByRole('button',{name:/^Fläche 2/}).count(), 0);
  pruefe('Fläche 1 ist wieder dran', await baeume(), 1);

  console.log('\nDAS ÜBERLEBT DAS NEULADEN');
  await tippe(page.getByRole('button',{name:'+ Fläche'})); await page.waitForTimeout(300);
  await page.getByLabel('FLÄCHE m²').fill('800');
  await aufnehmen('28','24');
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(800);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  await tippe(page.getByRole('button',{name:'Einzelbäume'})); await page.waitForTimeout(400);
  pruefe('beide Flächen stehen wieder da',
    (await page.getByRole('button',{name:/^Fläche \d/}).allInnerTexts())
      .map((s) => s.replace(/\s+/g,' ')).join(' | '), 'Fläche 1 · 1 | Fläche 2 · 1');

  console.log('\nEINE ÄLTERE AUFNAHME GEHT NICHT VERLOREN');
  /* Vor dieser Änderung hielt die App EINE Fläche (flaeche + baeume).
     So ein Stand muss zur ersten Fläche werden - sonst steht jemand nach
     dem Aktualisieren vor einer leeren Aufnahme. */
  await page.evaluate(() => {
    localStorage.setItem('baummessung:aufnahme', JSON.stringify({
      version: 2, modus: 'einzel', ort: '4138 b1', flaeche: '400',
      baeume: [{ id: 'alt1', art: 'Kiefer', bhd: '30', hoehe: '25', formzahl: '0.5' }],
    }));
  });
  await page.reload({waitUntil:'load'}); await page.waitForTimeout(800);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  pruefe('sie steht als Fläche 1 da',
    (await page.getByRole('button',{name:/^Fläche 1/}).innerText()).replace(/\s+/g,' '), 'Fläche 1 · 1');
  pruefe('mit ihrer Größe', await page.getByLabel('FLÄCHE m²').inputValue(), '400');
  pruefe('und ihrem Baum', await page.getByText('30 cm · 25 m').count(), 1);

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
