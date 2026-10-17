/* Grenzstammpruefung in der Oberflaeche.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/grenzstamm.cjs
   (oder NODE_PATH auf das Verzeichnis setzen, in dem playwright liegt) */
const { chromium } = require('playwright');
let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

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

  const knopf = page.getByRole('button',{name:'Grenzstamm prüfen'});
  pruefe('Knopf da', await knopf.count(), 1);
  await knopf.click(); await page.waitForTimeout(400);
  pruefe('Zählfaktor genannt', await page.getByText(/Zählfaktor 4 m²\/ha/).count(), 1);
  pruefe('ohne BHD keine Zahl', await page.getByText('BHD eintragen').count(), 1);

  const bhd = page.getByLabel('BHD des Grenzstamms');
  const weite = page.getByLabel('Entfernung zum Grenzstamm');

  console.log('\nGRENZRADIUS BEI ZÄHLFAKTOR 4');
  await bhd.fill('30'); await page.waitForTimeout(300);
  pruefe('30 cm → 7,50 m', await page.getByText('7.50 m').count(), 1);

  console.log('\nZÄHLT ER?');
  await weite.fill('7,0'); await page.waitForTimeout(300);
  pruefe('7,0 m → zählt mit', await page.getByText(/zählt mit/).count(), 1);
  pruefe('Hinweis sagt es anders', await page.getByText(/innerhalb dieser Entfernung werden gezählt/).count(), 1);
  pruefe('Abstand zur Grenze', await page.getByText(/0\.50 m innerhalb/).count(), 1);
  await weite.fill('8,2'); await page.waitForTimeout(300);
  pruefe('8,2 m → zählt nicht', await page.getByText('zählt nicht').count(), 1);
  pruefe('Abstand zur Grenze', await page.getByText(/0\.70 m außerhalb/).count(), 1);
  await weite.fill('7,5'); await page.waitForTimeout(300);
  pruefe('genau auf der Grenze zählt mit', await page.getByText(/zählt mit/).count(), 1);
  await page.screenshot({path:'GRENZSTAMM.png'});

  console.log('\nZÄHLFAKTOR ÄNDERN RECHNET MIT');
  await page.getByRole('button',{name:'1',exact:true}).click(); await page.waitForTimeout(400);
  pruefe('k=1 → 15,00 m', await page.getByText('15.00 m').count(), 1);
  pruefe('derselbe Baum zählt jetzt', await page.getByText(/zählt mit/).count(), 1);
  await page.getByRole('button',{name:'2',exact:true}).click(); await page.waitForTimeout(400);
  pruefe('k=2 → 10,61 m', await page.getByText('10.61 m').count(), 1);
  await page.getByRole('button',{name:'4',exact:true}).click(); await page.waitForTimeout(400);

  console.log('\nZUKLAPPEN');
  await page.getByRole('button',{name:'Grenzstamm schließen'}).click(); await page.waitForTimeout(300);
  pruefe('zu', await page.getByLabel('BHD des Grenzstamms').count(), 0);
  pruefe('Zählen geht weiter', await page.locator('div[role="button"][aria-label="gezählt"]').first().isVisible(), 'true');

  console.log('\nBREITE');
  await page.getByRole('button',{name:'Grenzstamm prüfen'}).click(); await page.waitForTimeout(300);
  for (const w of [320, 390]) {
    await page.setViewportSize({width:w,height:900}); await page.waitForTimeout(300);
    const m=await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.clientWidth]);
    pruefe(`${w} px ohne Seitwärtsscrollen`, m[0]<=m[1], 'true');
  }

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close(); process.exit(schlecht?1:0);
})();
