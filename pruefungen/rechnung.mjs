/* Prueft die Rechnungen der Baummessung - ohne Browser, in einer Sekunde.

   Hier stehen die Formeln, bei denen ein Fehler still durchgeht: eine
   falsche Hoehe oder ein falscher Grenzradius sehen auf dem Bildschirm
   genauso aus wie ein richtiger. Die Oberflaeche kann man ansehen, eine
   Formel nicht.

   Aufruf:  node pruefungen/rechnung.mjs
*/
import { baumHoehe, neigungAusBeta, geglaettet, unruhe, waagerechteEntfernung } from "../src/baum/hoehe.js";
import { grenzRadius, zaehltMit, grundflaeche, volumen } from "../src/baum/berechnung.js";

let ok = 0;
let schlecht = 0;
const pruefe = (name, ist, soll) => {
  const gut = String(ist) === String(soll);
  gut ? ok++ : schlecht++;
  console.log(`   ${gut ? "✓" : "✗ FEHLER"}  ${name}: ${ist}${gut ? "" : `  (erwartet ${soll})`}`);
};
const r = (x, n = 3) => (x == null ? null : Math.round(x * 10 ** n) / 10 ** n);
const titel = (t) => console.log(`\n${t}`);

titel("BAUMHÖHE aus zwei Winkeln");
pruefe("20 m, +45°/−10° von Hand nachgerechnet", r(baumHoehe(20, -10, 45)), 23.527);
pruefe("Fuß waagerecht → d·tan(oben)", r(baumHoehe(15, 0, 30)), r(15 * Math.tan(Math.PI / 6)));
pruefe("25 m, ±45° → 2 × 25 m", r(baumHoehe(25, -45, 45)), 50);
pruefe("linear in der Entfernung", r(baumHoehe(22, -10, 45) / baumHoehe(20, -10, 45), 4), 1.1);
pruefe("Entfernung 0", baumHoehe(0, -10, 45), null);
pruefe("Spitze unter dem Fuß", baumHoehe(20, 45, -10), null);
pruefe("senkrecht nach oben", baumHoehe(20, -10, 90), null);
pruefe("Text statt Winkel", baumHoehe(20, "abc", 45), null);

titel("NEIGUNG aus der Gerätelage (beta − 90 = Kameraachse)");
pruefe("senkrecht gehalten = waagerecht", neigungAusBeta(90), 0);
pruefe("nach oben gekippt", neigungAusBeta(135), 45);
pruefe("flach hingelegt", neigungAusBeta(0), -90);
pruefe("kein Wert", neigungAusBeta(undefined), null);

titel("GLÄTTEN – Median, nicht Mittelwert");
const J = 10000;
const w = (...v) => v.map((x, i) => ({ zeit: J - i * 50, wert: x }));
pruefe("ruhige Werte", geglaettet(w(30, 30.2, 29.8, 30.1, 29.9), J), 30);
pruefe("ein Ausreißer zieht nicht mit", geglaettet(w(30, 30.1, 29.9, 30.2, 70), J), 30.1);
pruefe("  (Mittelwert wäre)", r((30 + 30.1 + 29.9 + 30.2 + 70) / 5, 1), 38);
pruefe("alte Werte fallen aus dem Fenster",
  geglaettet([{ zeit: J - 5000, wert: 80 }, { zeit: J - 100, wert: 12 }, { zeit: J - 200, wert: 12 }], J), 12);
pruefe("nichts Frisches", geglaettet([{ zeit: J - 9000, wert: 5 }], J), null);
pruefe("Unruhe ist die Spanne", unruhe(w(20, 35), J), 15);

titel("WAAGERECHTE ENTFERNUNG (AR) – Höhe geht NICHT ein");
pruefe("3-4-5 in der Ebene", r(waagerechteEntfernung({ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 4 })), 5);
pruefe("4 m Höhenunterschied ändern nichts",
  r(waagerechteEntfernung({ x: 0, y: 0, z: 0 }, { x: 3, y: -4, z: 4 })), 5);
pruefe("  (Schrägstrecke wäre)", r(Math.sqrt(9 + 16 + 16)), 6.403);
pruefe("ohne Punkt", waagerechteEntfernung(null, { x: 1, y: 0, z: 1 }), null);

titel("GRENZSTAMM – gegen die bekannten Zählstäbe");
pruefe("k=4, BHD 30 cm → 7,50 m", r(grenzRadius(30, 4), 2), 7.5);
pruefe("k=1 ergibt Spaltverhältnis 1:50", r(grenzRadius(30, 1) / 0.3, 2), 50);
pruefe("k=4 ergibt Spaltverhältnis 1:25", r(grenzRadius(30, 4) / 0.3, 2), 25);
for (const k of [1, 2, 4]) {
  const rad = grenzRadius(30, k);
  pruefe(`Rückrechnung k=${k}`, r((2500 * 0.09) / (rad * rad), 4), k);
}
pruefe("doppelter BHD = doppelter Radius", r(grenzRadius(60, 4) / grenzRadius(30, 4), 2), 2);
pruefe("näher als die Grenze zählt", zaehltMit(30, 4, 7.0), true);
pruefe("weiter weg zählt nicht", zaehltMit(30, 4, 8.0), false);
pruefe("genau auf der Grenze zählt mit", zaehltMit(30, 4, 7.5), true);
pruefe("ohne Entfernung keine Aussage", zaehltMit(30, 4, null), null);

titel("GRUNDFLÄCHE UND VOLUMEN");
pruefe("BHD 30 cm → π/4·0,3²", r(grundflaeche(30), 5), r(Math.PI / 4 * 0.09, 5));
pruefe("Volumen = g · h · f", r(volumen(30, 25, 0.5), 4), r(Math.PI / 4 * 0.09 * 25 * 0.5, 4));

console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
