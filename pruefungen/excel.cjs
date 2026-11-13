/* Die Excel-Dateien in beiden Sprachen.

   Steht die App auf Englisch, soll auch die Datei englisch sein - sonst
   nützt sie dem nichts, der sie bekommt. Geprüft wird die fertige
   Datei, nicht der Quelltext: Eine .xlsx ist ein ZIP, die Texte stehen
   in den Blättern unter xl/worksheets/. Nur so sieht man, was wirklich
   herauskommt.

   Zwei Dinge, die dabei NICHT übersetzt werden dürfen:
     - die Mastertabelle des Monitorings (vorgegebene Excel-Maske; eine
       übersetzte Spalte macht die Datei unbrauchbar)
     - der deutsche Bildschirm (wer auf DE stellt, bekommt wieder Wort
       für Wort das Alte)

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/excel.cjs                                               */
const { chromium } = require('playwright');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

const tippe = async (loc) => {
  await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await loc.click();
};

const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-'));

/* Den Knopf antippen und die heruntergeladene Datei auspacken. Zurück
   kommt der reine Text aller Zellen - darin lässt sich nachsehen, was
   in der Datei steht. */
async function texteAus(page, knopf) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    tippe(knopf),
  ]);
  const datei = path.join(ordner, `${Date.now()}.xlsx`);
  await download.saveAs(datei);
  /* Die Texte stehen als inlineStr in den Blättern selbst, nicht in
     einer gemeinsamen Stringtabelle - deshalb alle Blätter auslesen. */
  return execSync(`unzip -p ${JSON.stringify(datei)} "xl/worksheets/*.xml"`).toString();
}

(async()=>{
  const b=await chromium.launch({executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-proxy-server']});
  const ctx=await b.newContext({viewport:{width:390,height:900},acceptDownloads:true});
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:200,body:'[]'}));
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(800);

  console.log('\nBAUMMESSUNG: WINKELZÄHLPROBE');
  await page.getByRole('button',{name:'Baummessung',exact:true}).click(); await page.waitForTimeout(400);
  await tippe(page.getByRole('button',{name:'Fünf dazu'}).first());
  const h = page.getByLabel('HÖHEN m eintragen').first();
  await h.fill('28,5'); await h.press('Enter');
  await page.waitForTimeout(300);

  const deWzp = await texteAus(page, page.getByRole('button',{name:'Excel'}));
  pruefe('deutsch: Grundflaeche_m2_ha', /Grundflaeche_m2_ha/.test(deWzp), true);
  pruefe('deutsch: Winkelzaehlprobe', /Winkelzaehlprobe/.test(deWzp), true);
  pruefe('deutsch: Fichte', /<t>Fichte<\/t>/.test(deWzp), true);

  await tippe(page.getByRole('button',{name:'English'})); await page.waitForTimeout(500);
  const enWzp = await texteAus(page, page.getByRole('button',{name:'Excel'}));
  pruefe('englisch: Basal_area_m2_ha', /Basal_area_m2_ha/.test(enWzp), true);
  pruefe('und nicht mehr deutsch', /Grundflaeche_m2_ha/.test(enWzp), false);
  pruefe('englisch: Angle_count_sampling', /Angle_count_sampling/.test(enWzp), true);
  pruefe('englisch: Spruce', /<t>Spruce<\/t>/.test(enWzp), true);
  pruefe('kein deutsches Wort mehr in der Kopfzeile',
    /Zaehlfaktor|Mittelhoehe_m|Staemme_ha/.test(enWzp), false);

  console.log('\nBAUMMESSUNG: EINZELBÄUME');
  await tippe(page.getByRole('button',{name:'Individual trees'})); await page.waitForTimeout(400);
  await page.getByLabel('AREA m²').fill('500');
  await page.getByLabel('DBH cm').fill('34');
  await page.getByLabel('HEIGHT m',{exact:true}).fill('27');
  await tippe(page.getByRole('button',{name:'+ Record this tree'}));
  await page.waitForTimeout(300);
  const enEinzel = await texteAus(page, page.getByRole('button',{name:'Excel'}));
  pruefe('englisch: Plot_no', /Plot_no/.test(enEinzel), true);
  pruefe('englisch: Single_trees', /Single_trees/.test(enEinzel), true);
  pruefe('englisch: Volume_m3', /Volume_m3/.test(enEinzel), true);

  console.log('\nVERJÜNGUNG');
  await tippe(page.getByRole('button',{name:'Regeneration',exact:true})); await page.waitForTimeout(600);
  // Eine Pflanze zählen, sonst gibt es nichts auszugeben.
  await tippe(page.getByRole('button',{name:/unbrowsed/}).first());
  await page.waitForTimeout(300);
  const enVerj = await texteAus(page, page.getByRole('button',{name:'Excel',exact:true}).first());
  pruefe('englisch: Compartment', /Compartment/.test(enVerj), true);
  pruefe('englisch: Plot_area_m2', /Plot_area_m2/.test(enVerj), true);
  pruefe('englisch: browsed/unbrowsed', /unbrowsed/.test(enVerj), true);
  pruefe('kein Kreisflaeche_m2 mehr', /Kreisflaeche_m2/.test(enVerj), false);

  console.log('\nDIE MASTERTABELLE DES MONITORINGS BLEIBT DEUTSCH');
  /* Sie bildet eine vorgegebene Excel-Maske nach. Eine uebersetzte
     Spaltenueberschrift macht die Datei fuer ihren Zweck unbrauchbar -
     deshalb gilt die Spracheinstellung hier ausdruecklich NICHT. */
  await tippe(page.getByRole('button',{name:'Monitoring',exact:true})); await page.waitForTimeout(600);
  const master = await texteAus(page, page.getByRole('button',{name:'Excel',exact:true}).first());
  pruefe('Untersuchungsgebiet steht da', /Untersuchungsgebiet/.test(master), true);
  pruefe('Bodenvegetation steht da', /Bodenvegetation/.test(master), true);
  pruefe('Referenzbaum steht da', /Referenzbaum/.test(master), true);

  console.log('\nAUF DEUTSCH IST WIEDER ALLES WIE VORHER');
  await tippe(page.getByRole('button',{name:'Deutsch'})); await page.waitForTimeout(500);
  await tippe(page.getByRole('button',{name:'Baummessung',exact:true})); await page.waitForTimeout(500);
  /* Die Baummessung steht hier noch auf Einzelbäumen - das ist die
     Datei mit den Flächen, nicht die der Winkelzählprobe. */
  const deWieder = await texteAus(page, page.getByRole('button',{name:'Excel'}));
  pruefe('wieder Flaeche_Nr', /Flaeche_Nr/.test(deWieder), true);
  pruefe('wieder Grundflaeche_m2', /Grundflaeche_m2/.test(deWieder), true);
  pruefe('wieder Einzelbaeume', /Einzelbaeume/.test(deWieder), true);
  pruefe('wieder Fichte', /<t>Fichte<\/t>/.test(deWieder), true);
  pruefe('und nichts Englisches mehr',
    /Plot_no|Basal_area|Single_trees|Spruce/.test(deWieder), false);

  fs.rmSync(ordner, { recursive: true, force: true });
  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
