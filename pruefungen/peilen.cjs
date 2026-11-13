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
  await page.addInitScript(()=>{
    localStorage.setItem('app:seite','verjuengung');
    /* vibrate() sitzt auf dem Prototyp - schlichtes Zuweisen geht ins
       Leere, deshalb defineProperty. (Dieselbe Falle wie bei navigator.xr.) */
    window.__stupse = [];
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (m) => { window.__stupse.push(String(m)); return true; },
    });
  });
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  await tippe(page.getByRole('button',{name:'Einzelbäume'})); await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'HÖHE messen'}));
  // Sofort Ereignisse schicken, damit der Messer nicht auf Eintippen umstellt.
  await neige(page, 0);
  await page.waitForTimeout(400);
  /* exact: true - sonst findet ein schlichtes getByText('NEIGUNG') auch
     die Zeile "... aus der Neigung schätzen": Playwright sucht bei einem
     String ohne exact nach Teilstrings, und das ohne Rücksicht auf
     Groß- und Kleinschreibung. */
  pruefe('der Sensor gilt als da',
    await page.getByText('NEIGUNG',{exact:true}).count(), 1);
  pruefe('die Peilknöpfe sind da', await page.getByRole('button',{name:'Fuß festhalten'}).count(), 1);

  /* Gemeldet aus dem Feldtest: "immer wenn man auf den Knopf drückt,
     bewegt sich der Bildschirm nach unten". Ursache war die
     Entfernungsschätzung, die beim Festhalten des Fußes von selbst
     aufklappte - 127 px, genau unter dem Daumen. */
  const knopfY = () =>
    page.getByRole('button',{name:'Fuß festhalten'}).evaluate(
      (el) => Math.round(el.getBoundingClientRect().top));

  console.log('\nSCHRITT 1: DIE SPITZE');
  /* Erst die Spitze, dann der Fuss - so gewuenscht. Rechnerisch ist die
     Reihenfolge gleichgueltig, fuer die Fuehrung nicht: Der
     hervorgehobene Knopf muss der sein, der dran ist. */
  pruefe('sagt, was dran ist', await page.getByText('1 · Spitze anpeilen').count(), 1);
  pruefe('Spitze steht auf "anpeilen"',
    (await page.getByRole('button',{name:'Spitze festhalten'}).innerText()).includes('anpeilen'), true);

  console.log('\nDIE SCHÄTZUNG RECHNET MIT, OHNE DASS MAN ETWAS ANTIPPT');
  /* Gewuenscht: "auto enable tilt thing". Wer das Fadenkreuz auf den
     Stammfuss haelt, soll die Entfernung sehen, bevor er irgendetwas
     antippt. 1,50 m / tan(25°) = 3,2 m. */
  await neige(page, -25);
  pruefe('sie läuft mit', await page.getByText(/läuft mit/).count(), 1);
  pruefe('und nennt schon eine Entfernung',
    await page.getByText('≈ 3,2 m',{exact:true}).count(), 1);
  pruefe('Übernehmen ist frei, ohne dass der Fuß festgehalten wäre',
    await page.getByRole('button',{name:'Schätzung übernehmen'}).isDisabled(), false);

  console.log('\nSCHRITT 2: DER FUSS');
  const stupse = () => page.evaluate(() => window.__stupse.slice());
  await neige(page, 45);
  const vorSpitze = await knopfY();
  await tippe(page.getByRole('button',{name:'Spitze festhalten'}));
  await page.waitForTimeout(200);
  pruefe('jetzt der Fuß', await page.getByText('2 · Stammfuß anpeilen').count(), 1);
  pruefe('die Spitze ist abgehakt',
    (await page.getByRole('button',{name:'Spitze festhalten'}).innerText()).includes('✓ 45,0°'), true);
  pruefe('Schritt 1 steht nicht mehr da', await page.getByText('1 · Spitze anpeilen').count(), 0);
  pruefe('es hat gestupst', (await stupse()).join(" | "), '40');
  pruefe('und nichts ist unter dem Daumen weggerutscht', (await knopfY()) - vorSpitze, 0);

  console.log('\nDANACH FEHLT DIE ENTFERNUNG - UND DAS STEHT AUCH DA');
  await neige(page, -10);
  const vorFuss = await knopfY();
  await tippe(page.getByRole('button',{name:'Fuß festhalten'}));
  await page.waitForTimeout(200);
  pruefe('auch beim zweiten Winkel bleibt alles stehen', (await knopfY()) - vorFuss, 0);
  pruefe('sagt, woran es liegt',
    await page.getByText('Jetzt fehlt nur noch die Entfernung oben').count(), 1);
  pruefe('Höhe steht noch nicht', await page.getByText(/^\d+,\d m$/).count(), 0);

  pruefe('zweiter Winkel: wieder ein kurzer Stups',
    (await stupse()).join(" | "), '40 | 40');

  console.log('\nMIT ENTFERNUNG IST ES FERTIG - UND DER SUCHER GEHT WEG');
  await page.getByLabel('Entfernung').fill('20'); await page.waitForTimeout(300);
  pruefe('meldet fertig',
    await page.getByText('✓ Fertig – zum Ändern einen der beiden antippen').count(), 1);
  // 20 · (tan 45° + tan 10°) = 23,53
  pruefe('und die Höhe stimmt', await page.getByText('23,5 m').count(), 1);
  pruefe('Übernehmen ist frei',
    await page.getByRole('button',{name:'Übernehmen',exact:true}).isDisabled(), false);
  // Zwei Stüße zum Schluss - das spürt man, ohne hinzusehen.
  pruefe('und zwei Stüße zum Fertigwerden',
    (await stupse()).join(" | "), '40 | 40 | 40,90,40');
  /* Gewuenscht: "when the measuring is done the whole thing showing the
     degree can go away". Danach stehen Hoehe und "Übernehmen" dort, wo
     vorher der Sucher war - der Weg fuer den Daumen wird kuerzer. */
  pruefe('die Neigung ist weg', await page.getByText('NEIGUNG',{exact:true}).count(), 0);
  pruefe('der Sucher auch', await page.getByLabel('Sucher').count(), 0);
  pruefe('die Peilknöpfe bleiben, mit ihren Werten',
    (await page.getByRole('button',{name:'Spitze festhalten'}).innerText()).includes('✓ 45,0°'), true);

  console.log('\nEINEN WINKEL ÄNDERN: ANTIPPEN HOLT DEN SUCHER ZURÜCK');
  await tippe(page.getByRole('button',{name:'Spitze festhalten'}));
  await page.waitForTimeout(250);
  pruefe('die Neigung steht wieder da', await page.getByText('NEIGUNG',{exact:true}).count(), 1);
  pruefe('und fragt nach der Spitze', await page.getByText('1 · Spitze anpeilen').count(), 1);
  pruefe('die Höhe ist erst einmal weg', await page.getByText(/^\d+,\d m$/).count(), 0);
  pruefe('der Fuß steht noch',
    (await page.getByRole('button',{name:'Fuß festhalten'}).innerText()).includes('✓ -10,0°'), true);
  await neige(page, 45);
  await tippe(page.getByRole('button',{name:'Spitze festhalten'}));
  await page.waitForTimeout(250);
  pruefe('und wieder fertig', await page.getByText('23,5 m').count(), 1);

  console.log('\nVERTAUSCHT: DIE APP SAGT ES, STATT STUMM ZU BLEIBEN');
  // Fuß neu anpeilen: einmal zum Freigeben, dann über der Spitze festhalten.
  await tippe(page.getByRole('button',{name:'Fuß festhalten'}));
  await page.waitForTimeout(250);
  await neige(page, 50);
  await tippe(page.getByRole('button',{name:'Fuß festhalten'}));   // Fuß über der Spitze
  await page.waitForTimeout(200);
  pruefe('nennt den Grund',
    await page.getByText('Die Spitze liegt unter dem Fuß – einen der beiden neu anpeilen').count(), 1);
  pruefe('keine Höhe', await page.getByText(/^\d+,\d m$/).count(), 0);
  pruefe('der Sucher bleibt - es ist ja noch nichts fertig',
    await page.getByText('NEIGUNG',{exact:true}).count(), 1);
  pruefe('Übernehmen gesperrt',
    await page.getByRole('button',{name:'Übernehmen',exact:true}).isDisabled(), true);

  console.log('\nNEU ANPEILEN HEILT ES');
  await neige(page, -8);
  await tippe(page.getByRole('button',{name:'Fuß festhalten'}));
  await page.waitForTimeout(200);
  pruefe('wieder fertig',
    await page.getByText('✓ Fertig – zum Ändern einen der beiden antippen').count(), 1);

  console.log('\nZURÜCKSETZEN FÄNGT VON VORNE AN');
  await tippe(page.getByRole('button',{name:'Zurücksetzen'}));
  await page.waitForTimeout(200);
  pruefe('wieder Schritt 1', await page.getByText('1 · Spitze anpeilen').count(), 1);
  pruefe('die Entfernung bleibt stehen',
    await page.getByLabel('Entfernung').inputValue(), '20');

  console.log('\nDER BILDSCHIRM HÄLT 60 WERTE JE SEKUNDE AUS');
  /* Gemeldet: "sometimes the thing kinda freezes when doing the angle
     thing". Ursache war, dass JEDES Sensorereignis den ganzen Messer neu
     gezeichnet hat - auf Android sind das etwa 60 je Sekunde, mitsamt
     Sucherbild. Nachgemessen: 103 Aktualisierungen in 1,5 s.

     Gesammelt wird weiter jeder Wert (der Median lebt davon), gezeichnet
     hoechstens zehnmal je Sekunde. Die Pruefung schickt 120 Ereignisse in
     1,2 s und zaehlt, wie oft sich die Zahl auf dem Bildschirm aendert. */
  const takt = await page.evaluate(async () => {
    const feld = [...document.querySelectorAll('div')].find(
      (d) => d.textContent.trim().endsWith('°') &&
             d.textContent.trim().length < 10 &&
             getComputedStyle(d).fontSize === '40px');
    if (!feld) return -1;
    let n = 0;
    const beo = new MutationObserver(() => { n++; });
    beo.observe(feld, { childList: true, characterData: true, subtree: true });
    for (let i = 0; i < 120; i++) {
      window.dispatchEvent(new (window.DeviceOrientationEvent || Event)('deviceorientation',
        { beta: 80 + Math.sin(i / 6) * 6, gamma: 0, alpha: 180 }));
      await new Promise((f) => setTimeout(f, 10));
    }
    await new Promise((f) => setTimeout(f, 300));
    beo.disconnect();
    return n;
  });
  pruefe(`${takt} Aktualisierungen statt 103 - hoechstens 25`, takt > 0 && takt <= 25, true);
  pruefe('aber es bleibt nicht stehen', takt >= 5, true);

  console.log('\nOHNE SUCHERBILD SAGT DIE APP ES UND BIETET EINEN ZWEITEN ANLAUF');
  /* Im Pruefbrowser gibt es keine Kamera - dasselbe, was ein Nutzer
     sieht, der die Freigabe ablehnt oder dessen Geraet die Kamera
     gerade nicht hergibt. */
  pruefe('sagt, dass es ohne Bild weitergeht',
    await page.getByText(/Kein Sucherbild/).count(), 1);
  pruefe('und bietet einen neuen Versuch an',
    await page.getByRole('button',{name:'Sucher erneut starten'}).count(), 1);
  /* Erst etwas festhalten - das Zurücksetzen oben hat beide Winkel
     geleert. Ein neuer Kameraversuch darf sie nicht noch einmal
     wegwerfen: Er laeuft durch denselben Effekt, der frueher beim
     Schliessen aufgeraeumt hat. */
  await neige(page, 40);
  await tippe(page.getByRole('button',{name:'Spitze festhalten'}));
  await page.waitForTimeout(250);
  await tippe(page.getByRole('button',{name:'Sucher erneut starten'}));
  await page.waitForTimeout(500);
  pruefe('der Versuch wirft die festgehaltenen Winkel nicht weg',
    (await page.getByRole('button',{name:'Spitze festhalten'}).innerText()).includes('✓ 40,0°'), true);

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
