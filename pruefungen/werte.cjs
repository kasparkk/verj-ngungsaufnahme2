/* Werte eintragen, ohne auf + zu drücken.

   Gemeldet: "man muss das Plus drücken, um den Wert zu speichern". Auf
   dem Handy ist das kein Nebensächliches - eine Zahlentastatur hat keine
   Eingabetaste, das + war also der einzige Weg, und er kostet bei jedem
   Baum einen zusätzlichen Griff.

   Geprüft wird deshalb der Weg ohne +:
     - eintippen, woanders hintippen -> der Wert steht in der Liste
     - der Höhenmesser schreibt direkt in die Liste bzw. nimmt den Baum
       gleich auf, statt den Wert nur in ein Feld zu legen
     - und beides bleibt rückgängig zu machen

   Die alten Wege (+ und Eingabetaste) müssen weiter funktionieren: Wer
   sie gewohnt ist, soll nicht umlernen.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/werte.cjs                                               */
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
  await page.addInitScript(()=>{
    window.__stupse = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (m) => { window.__stupse.push(String(m)); return true; },
    });
  });
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(800);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(500);

  /* Die erste Baumart ist die Fichte; ihre beiden Wertefelder stehen
     nebeneinander. Gesucht wird über die Beschriftung, nicht über die
     Reihenfolge - sonst prüft man irgendwann die Kiefer. */
  const hoehenFeld = page.getByLabel('HÖHEN m eintragen').first();
  const bhdFeld    = page.getByLabel('BHD cm eintragen').first();
  const werte = async (feld) => {
    /* Die eingetragenen Werte stehen als Knöpfe "23,5 ×" unter dem Feld.
       Der Kasten um Feld und Werte ist das gemeinsame Elternteil. */
    const kasten = feld.locator('xpath=ancestor::div[1]/..');
    return (await kasten.locator('button').allInnerTexts())
      .filter((s) => /×/.test(s)).map((s) => s.replace(' ×','').trim()).join(' | ');
  };

  console.log('\nEINTIPPEN UND WOANDERS HINTIPPEN GENÜGT');
  await hoehenFeld.fill('28,5');
  await page.evaluate(() => { window.__stupse.length = 0; });
  // Woanders hintippen - genau das, was auf dem Handy als Nächstes passiert.
  await page.getByText('ZÄHLFAKTOR m²/ha').click();
  await page.waitForTimeout(300);
  pruefe('die Höhe steht in der Liste', await werte(hoehenFeld), '28,5');
  pruefe('das Feld ist wieder leer', await hoehenFeld.inputValue(), '');
  pruefe('und es hat getickt',
    (await page.evaluate(() => window.__stupse.slice())).join('|'), '25');

  console.log('\nDASSELBE BEIM BHD');
  await bhdFeld.fill('34');
  await page.getByText('ZÄHLFAKTOR m²/ha').click();
  await page.waitForTimeout(300);
  pruefe('der BHD steht in der Liste', await werte(bhdFeld), '34');

  console.log('\nLEERES FELD TRÄGT NICHTS EIN');
  await hoehenFeld.click();
  await page.getByText('ZÄHLFAKTOR m²/ha').click();
  await page.waitForTimeout(300);
  pruefe('immer noch nur ein Wert', await werte(hoehenFeld), '28,5');

  console.log('\nDIE ALTEN WEGE GELTEN WEITER');
  await hoehenFeld.fill('31');
  await hoehenFeld.press('Enter');
  await page.waitForTimeout(250);
  pruefe('Eingabetaste', await werte(hoehenFeld), '28,5 | 31');
  await hoehenFeld.fill('29');
  await tippe(page.getByLabel('HÖHEN m eintragen +').first());
  await page.waitForTimeout(250);
  pruefe('und das +', await werte(hoehenFeld), '28,5 | 31 | 29');

  console.log('\nEIN WERT LÄSST SICH WIEDER HERAUSNEHMEN');
  await tippe(page.getByRole('button',{name:'31 ×'}).first());
  await page.waitForTimeout(250);
  pruefe('die 31 ist weg', await werte(hoehenFeld), '28,5 | 29');

  console.log('\nDER HÖHENMESSER SCHREIBT DIREKT IN DIE LISTE');
  await tippe(page.getByLabel('HÖHEN messen').first());
  await page.waitForTimeout(2700);   // ohne Sensor: Winkel eintippen
  await page.getByLabel('Winkel zum Fuß').fill('-10');
  await page.getByLabel('Winkel zur Spitze').fill('45');
  await page.getByLabel('Entfernung',{exact:true}).fill('20');
  await page.waitForTimeout(300);
  pruefe('der Knopf sagt, wohin der Wert geht',
    await page.getByRole('button',{name:'Übernehmen & eintragen'}).count(), 1);
  await tippe(page.getByRole('button',{name:'Übernehmen & eintragen'}));
  await page.waitForTimeout(400);
  // 20 · (tan 45° + tan 10°) = 23,53 -> 23,5
  pruefe('23,5 steht in der Liste - ohne zweites Antippen',
    await werte(hoehenFeld), '28,5 | 29 | 23,5');
  pruefe('mit Komma, nicht mit Punkt',
    await page.getByRole('button',{name:'23.5 ×'}).count(), 0);
  pruefe('das Entwurfsfeld bleibt leer', await hoehenFeld.inputValue(), '');

  console.log('\nEINZELBÄUME: MIT BHD IST DER BAUM MIT DEM MESSEN FERTIG');
  await tippe(page.getByRole('button',{name:'Einzelbäume'})); await page.waitForTimeout(400);
  const liste = async () =>
    (await page.locator('div').filter({hasText:/^\d+$/}).count(),
     await page.getByRole('button',{name:'Baum entfernen'}).count());
  pruefe('noch kein Baum in der Liste', await liste(), 0);

  await page.getByLabel('BHD cm').fill('34');
  await tippe(page.getByRole('button',{name:'HÖHE messen'}));
  await page.waitForTimeout(2700);
  pruefe('der Knopf sagt, dass der Baum gleich steht',
    await page.getByRole('button',{name:'Übernehmen & aufnehmen'}).count(), 1);
  await page.getByLabel('Winkel zum Fuß').fill('-10');
  await page.getByLabel('Winkel zur Spitze').fill('45');
  await page.getByLabel('Entfernung',{exact:true}).fill('20');
  await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'Übernehmen & aufnehmen'}));
  await page.waitForTimeout(400);
  pruefe('der Baum steht in der Liste', await liste(), 1);
  pruefe('mit BHD und gemessener Höhe',
    await page.getByText('34 cm · 24 m').count(), 1);
  pruefe('die Felder sind wieder leer für den nächsten Baum',
    (await page.getByLabel('BHD cm').inputValue()) + '/' +
    (await page.getByLabel('HÖHE m',{exact:true}).inputValue()), '/');

  console.log('\nOHNE BHD BLEIBT ES BEIM ALTEN');
  await tippe(page.getByRole('button',{name:'HÖHE messen'}));
  await page.waitForTimeout(2700);
  pruefe('der Knopf heißt wieder schlicht "Übernehmen"',
    await page.getByRole('button',{name:'Übernehmen',exact:true}).count(), 1);
  await page.getByLabel('Winkel zum Fuß').fill('-10');
  await page.getByLabel('Winkel zur Spitze').fill('45');
  await page.getByLabel('Entfernung',{exact:true}).fill('20');
  await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'Übernehmen',exact:true}));
  await page.waitForTimeout(400);
  pruefe('kein zweiter Baum', await liste(), 1);
  pruefe('die Höhe steht im Feld',
    await page.getByLabel('HÖHE m',{exact:true}).inputValue(), '23,5');

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
