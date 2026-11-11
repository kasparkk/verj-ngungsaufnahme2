/* Der Sensor-Mitschnitt in der Oberfläche.

   Geprüft wird der ganze Weg: Sensorereignis → Aufnahme → Auswertung →
   Datei. Die Datei ist der eigentliche Zweck des Werkzeugs; käme sie leer
   oder unvollständig heraus, wäre der Gang nach draußen umsonst gewesen,
   und das merkt man erst hinterher.

   Dauert gut eine halbe Minute - die Aufnahme läuft in echt zehn Sekunden.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/mitschnitt.cjs                                          */
const { chromium } = require('playwright');
const fs = require('fs');
let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

const tippe = async (loc) => {
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await loc.click();
};

/* Das Handy liegt flach: beta 0. Die Ereignisse müssen weiterlaufen,
   solange aufgenommen wird - genau wie ein echter Sensor. */
const sensorLaeuft = (page, beta, ms) =>
  page.evaluate(([b, dauer]) => new Promise((fertig) => {
    const bis = Date.now() + dauer;
    const uhr = setInterval(() => {
      // Etwas Zittern, damit es nicht künstlich sauber aussieht.
      const wackeln = (Math.random() - 0.5) * 0.4;
      window.dispatchEvent(new (window.DeviceOrientationEvent || Event)('deviceorientation',
        { beta: b + wackeln, gamma: 0, alpha: 180 }));
      if (Date.now() > bis) { clearInterval(uhr); fertig(); }
    }, 50);
  }), [beta, ms]);

(async()=>{
  const b=await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-proxy-server']});
  const ctx=await b.newContext({viewport:{width:390,height:900},acceptDownloads:true});
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:200,body:'[]'}));
  await page.addInitScript(()=>localStorage.setItem('app:seite','verjuengung'));
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);

  console.log('\nDER KNOPF STEHT UNAUFFÄLLIG UNTEN');
  const knopf = page.getByRole('button',{name:'Sensor-Mitschnitt'});
  pruefe('Knopf da', await knopf.count(), 1);
  await tippe(knopf); await page.waitForTimeout(300);
  pruefe('Maske offen', await page.getByText(/Drei kurze Aufnahmen von je 10 Sekunden/).count(), 1);
  pruefe('drei Schritte', await page.getByRole('button',{name:/aufnehmen$/}).count(), 3);
  pruefe('Speichern noch gesperrt',
    await page.getByRole('button',{name:/Mitschnitt speichern/}).isDisabled(), true);
  pruefe('Zähler bei 0',
    await page.getByRole('button',{name:'Mitschnitt speichern (0 von 3)'}).count(), 1);

  console.log('\nOHNE SENSOR GEHT NICHTS');
  // Zwei Sekunden ohne Ereignis: die Maske stellt selbst fest, dass nichts kommt.
  await page.waitForTimeout(2200);
  pruefe('sagt es ehrlich',
    await page.getByText('Dieses Gerät liefert keine Neigung – hier lässt sich nichts aufnehmen.').count(), 1);
  pruefe('Aufnehmen gesperrt',
    await page.getByRole('button',{name:'Flach auf den Tisch aufnehmen'}).isDisabled(), true);

  console.log('\nMIT SENSOR: FLACH AUF DEM TISCH (beta 0 → −90°)');
  const laeuft = sensorLaeuft(page, 0, 14000);
  await page.waitForTimeout(400);
  pruefe('Live-Neigung steht da', await page.getByText('NEIGUNG JETZT').count(), 1);
  const jetzt = await page.getByText(/^-?\d+,\d°$/).first().textContent();
  pruefe('und zeigt −90°', jetzt.startsWith('-90') || jetzt.startsWith('-89'), true);

  await tippe(page.getByRole('button',{name:'Flach auf den Tisch aufnehmen'}));
  await page.waitForTimeout(600);
  pruefe('zählt herunter', await page.getByText(/Nimmt auf – noch \d+ s/).count(), 1);
  pruefe('die anderen Schritte sind derweil gesperrt',
    await page.getByRole('button',{name:'Frei in der Hand aufnehmen'}).isDisabled(), true);

  await page.waitForTimeout(10200);
  await laeuft;

  console.log('\nERGEBNIS DER AUFNAHME');
  pruefe('Mitte und Spanne stehen da', await page.getByText(/Mitte -90,0° · Spanne/).count(), 1);
  pruefe('Abweichung ist klein genug',
    await page.getByText(/✓ 0,0° daneben – die App deutet den Sensor richtig/).count(), 1);
  pruefe('Zähler steht auf 1',
    await page.getByRole('button',{name:'Mitschnitt speichern (1 von 3)'}).count(), 1);
  pruefe('Speichern jetzt frei',
    await page.getByRole('button',{name:/Mitschnitt speichern/}).isDisabled(), false);

  console.log('\nDIE DATEI');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    tippe(page.getByRole('button',{name:/Mitschnitt speichern/})),
  ]);
  pruefe('heißt nach Datum und Uhrzeit', /^Sensor_\d{4}-\d{2}-\d{2}_\d{4}\.json$/.test(download.suggestedFilename()), true);
  const pfad = await download.path();
  const daten = JSON.parse(fs.readFileSync(pfad, 'utf8'));
  pruefe('Art', daten.art, 'neigungssensor-mitschnitt');
  pruefe('ein Schritt drin', daten.schritte.length, 1);
  pruefe('und zwar der flache', daten.schritte[0].id, 'flach');
  pruefe('Sollwert dabei', daten.schritte[0].soll, -90);
  pruefe('Mitte rund −90°', Math.abs(daten.schritte[0].zusammenfassung.median + 90) < 0.3, true);
  pruefe('Rohwerte dabei (10 s bei 20/s)', daten.schritte[0].werte.length > 150, true);
  pruefe('jeder Rohwert hat Zeit und beta',
    daten.schritte[0].werte.every((w) => typeof w.t === 'number' && typeof w.beta === 'number'), true);
  pruefe('Gerätekennung dabei', typeof daten.geraet.kennung === 'string' && daten.geraet.kennung.length > 10, true);
  pruefe('kein Standort in der Datei', JSON.stringify(daten).includes('lat'), false);

  console.log('\nSCHLIESSEN RÄUMT AUF');
  await tippe(page.getByRole('button',{name:'Schließen'}));
  await page.waitForTimeout(300);
  await tippe(page.getByRole('button',{name:'Sensor-Mitschnitt'}));
  await page.waitForTimeout(300);
  pruefe('nichts bleibt hängen',
    await page.getByRole('button',{name:'Mitschnitt speichern (0 von 3)'}).count(), 1);

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
