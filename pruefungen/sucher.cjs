/* Die Peilknöpfe müssen ohne Scrollen zu treffen sein.

   Gemeldet: "the buttons are not so low you have to scroll to click
   them – I meant the buttons for high and low." Der Sucher war 3:4 hoch,
   auf 390 px Breite also 483 px; damit endeten die Knöpfe bei 797 px.
   Auf einem Handy mit sichtbarer Adressleiste – 735 px Fenster und
   weniger – lagen sie unter dem Rand.

   Deshalb wird hier mit einer ECHTEN Kamera gemessen: Chromium bekommt
   ein Testbild (--use-fake-device-for-media-stream), sonst fällt der
   Sucher weg und die Prüfung bestünde, ohne irgendetwas zu zeigen. Und
   es wird auf vier Fensterhöhen gemessen, von großzügig bis knapp.

   Vorher bauen und ausliefern:
     npm run build && npx http-server dist -p 8919 -s &
   Dann:
     NODE_PATH=$(dirname $(dirname $(readlink -f $(which node))))/lib/node_modules \
       node pruefungen/sucher.cjs                                              */
const { chromium } = require('playwright');
let ok=0,schlecht=0;
const pruefe=(n,ist,soll)=>{const g=String(ist)===String(soll);g?ok++:schlecht++;
  console.log(`   ${g?'✓':'✗ FEHLER'}  ${n}: ${ist}${g?'':`  (erwartet ${soll})`}`);};

const neige = async (page, grad) => {
  await page.waitForTimeout(400);
  await page.evaluate((b) => {
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new (window.DeviceOrientationEvent || Event)('deviceorientation',
        { beta: b, gamma: 0, alpha: 180 }));
    }
  }, grad + 90);
  await page.waitForTimeout(200);
};

(async()=>{
  const b=await chromium.launch({
    executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--no-proxy-server','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'],
  });
  const ctx=await b.newContext({viewport:{width:390,height:844},permissions:['camera']});
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  await page.route('**/rest/v1/**',r=>r.fulfill({status:200,body:'[]'}));
  await page.goto('http://127.0.0.1:8919/index.html',{waitUntil:'load'});
  await page.waitForTimeout(800);
  await page.getByRole('button',{name:'Baummessung'}).click(); await page.waitForTimeout(400);
  await page.getByRole('button',{name:'Einzelbäume'}).click(); await page.waitForTimeout(300);
  await page.getByRole('button',{name:'HÖHE messen'}).click();
  await neige(page, 10);
  await page.waitForTimeout(1200);

  console.log('\nDER SUCHER LÄUFT WIRKLICH');
  /* Ohne diese Zeile wäre alles Folgende wertlos: Ein Messer ohne
     Kamerabild ist immer kurz genug. */
  pruefe('ein Bild liegt an',
    await page.evaluate(() => {
      const v = document.querySelector('video');
      return !!(v && v.srcObject && v.getBoundingClientRect().height > 100);
    }), true);

  const lage = () => page.evaluate(() => {
    const knopf = (name) => [...document.querySelectorAll('button')]
      .find((b) => (b.getAttribute('aria-label') || '') === name);
    const messer = [...document.querySelectorAll('div')]
      .find((d) => getComputedStyle(d).position === 'fixed' && d.scrollHeight > 0);
    const r = (el) => (el ? Math.round(el.getBoundingClientRect().bottom) : null);
    return {
      spitze: r(knopf('Spitze festhalten')),
      fuss: r(knopf('Fuß festhalten')),
      fenster: window.innerHeight,
      gescrollt: messer ? messer.scrollTop : 0,
      sucher: Math.round(document.querySelector('video')?.getBoundingClientRect().height ?? 0),
    };
  });

  for (const hoehe of [844, 735, 667, 600]) {
    await page.setViewportSize({ width: 390, height: hoehe });
    await page.waitForTimeout(400);
    const l = await lage();
    console.log(`\nFENSTER ${hoehe} px  (Sucher ${l.sucher} px)`);
    pruefe('nichts ist weggescrollt', l.gescrollt, 0);
    pruefe(`"Spitze" endet bei ${l.spitze} px`, l.spitze > 0 && l.spitze <= hoehe, true);
    pruefe(`"Fuß" endet bei ${l.fuss} px`, l.fuss > 0 && l.fuss <= hoehe, true);
    /* Nicht nur hineinpassen, sondern treffbar bleiben: Ein Knopf, der
       mit der Unterkante abschliesst, ist auf einem Handy mit
       Gestenleiste schon halb verdeckt. */
    pruefe('und zwanzig Pixel Luft darunter', hoehe - l.spitze >= 20, true);
  }

  console.log('\nAUF EINEM BREITEN BILDSCHIRM BLEIBT ER IN GRENZEN');
  // 90vw wuerde auf einem Tablet sonst den halben Bildschirm fuellen.
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.waitForTimeout(400);
  const breit = await lage();
  pruefe(`Sucher ${breit.sucher} px statt 738 px (90vw)`, breit.sucher <= 480, true);
  pruefe('Knöpfe weiterhin im Bild', breit.spitze <= 1180, true);

  console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
  await b.close();
  process.exit(schlecht?1:0);
})();
