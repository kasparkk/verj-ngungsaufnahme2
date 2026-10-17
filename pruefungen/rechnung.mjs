/* Prueft die Rechnungen der Baummessung - ohne Browser, in einer Sekunde.

   Hier stehen die Formeln, bei denen ein Fehler still durchgeht: eine
   falsche Hoehe oder ein falscher Grenzradius sehen auf dem Bildschirm
   genauso aus wie ein richtiger. Die Oberflaeche kann man ansehen, eine
   Formel nicht.

   Aufruf:  node pruefungen/rechnung.mjs
*/
import {
  baumHoehe, neigungAusBeta, geglaettet, unruhe, waagerechteEntfernung,
  entfernungAusNeigung, NEIGUNG_GRENZE_M,
} from "../src/baum/hoehe.js";
import { grenzRadius, zaehltMit, grundflaeche, volumen, formzahlFuer, wzpAuswerten } from "../src/baum/berechnung.js";

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

titel("ENTFERNUNG AUS DER NEIGUNG");
/* Gegenprobe: aus der Entfernung den Winkel rechnen, daraus wieder die
   Entfernung - es muss dasselbe herauskommen. */
const winkelFuer = (h, d) => -(Math.atan(h / d) * 180) / Math.PI;
for (const d of [3, 5, 7.5, 25]) {
  pruefe(`${d} m hin und zurück`, r(entfernungAusNeigung(1.6, winkelFuer(1.6, d)).d, 3), d);
}
pruefe("45° → genau die Handyhöhe", r(entfernungAusNeigung(1.6, -45).d, 4), 1.6);
pruefe("doppelte Handyhöhe = doppelte Entfernung",
  r(entfernungAusNeigung(3, -20).d / entfernungAusNeigung(1.5, -20).d, 4), 2);

/* Der Punkt, um den es geht: Nah dran eng, weit weg wertlos. Geht diese
   Prüfung kaputt, verspricht die App eine Genauigkeit, die es nicht gibt. */
const spanne = (d) => {
  const e = entfernungAusNeigung(1.6, winkelFuer(1.6, d));
  return Math.round(((e.max - e.min) / e.d) * 100);
};
pruefe("auf 5 m ist die Spanne 12 % breit", spanne(5), 12);
pruefe("auf 25 m sind es 59 %", spanne(25), 59);
pruefe("5 m gilt als brauchbar", entfernungAusNeigung(1.6, winkelFuer(1.6, 5)).brauchbar, true);
pruefe("25 m nicht mehr", entfernungAusNeigung(1.6, winkelFuer(1.6, 25)).brauchbar, false);
pruefe(`die Grenze liegt bei ${NEIGUNG_GRENZE_M} m`,
  entfernungAusNeigung(1.6, winkelFuer(1.6, NEIGUNG_GRENZE_M)).brauchbar, true);
pruefe("knapp darüber nicht",
  entfernungAusNeigung(1.6, winkelFuer(1.6, NEIGUNG_GRENZE_M + 0.2)).brauchbar, false);

pruefe("waagerecht gibt es nichts", entfernungAusNeigung(1.6, 0), null);
pruefe("nach oben gepeilt auch nicht", entfernungAusNeigung(1.6, 12), null);
pruefe("ohne Handyhöhe nichts", entfernungAusNeigung(0, -20), null);
pruefe("unsinnige Handyhöhe (4 m) nichts", entfernungAusNeigung(4, -20), null);
pruefe("sehr flach: nach oben offen", entfernungAusNeigung(1.6, -0.9).max, null);

titel("GRUNDFLÄCHE UND VOLUMEN");
pruefe("BHD 30 cm → π/4·0,3²", r(grundflaeche(30), 5), r(Math.PI / 4 * 0.09, 5));
pruefe("Volumen = g · h · f", r(volumen(30, 25, 0.5), 4), r(Math.PI / 4 * 0.09 * 25 * 0.5, 4));

titel("FORMZAHL nachschlagen");
const fz = { Fichte: "0.5", Buche: "0.52" };
const st = { Fichte: [{ bis: 15, wert: 0.55 }, { bis: 25, wert: 0.5 }] };
pruefe("ohne Stufen gilt der Grundwert", formzahlFuer("Fichte", 18, fz, {}), 0.5);
pruefe("ohne Höhe gilt der Grundwert", formzahlFuer("Fichte", null, fz, st), 0.5);
pruefe("12 m fällt in die erste Stufe", formzahlFuer("Fichte", 12, fz, st), 0.55);
pruefe("genau 15 m noch erste Stufe", formzahlFuer("Fichte", 15, fz, st), 0.55);
pruefe("15,1 m schon zweite", formzahlFuer("Fichte", 15.1, fz, st), 0.5);
pruefe("über allen Stufen: Grundwert", formzahlFuer("Fichte", 40, fz, st), 0.5);
pruefe("andere Art hat keine Stufen", formzahlFuer("Buche", 12, fz, st), 0.52);
pruefe("unbekannte Art → Standard", formzahlFuer("Robinie", 12, fz, st), 0.5);
pruefe("unsortierte Stufen werden sortiert",
  formzahlFuer("X", 12, {}, { X: [{ bis: 25, wert: 0.4 }, { bis: 15, wert: 0.6 }] }), 0.6);
pruefe("leere Zeilen werden übergangen",
  formzahlFuer("X", 12, { X: "0.5" }, { X: [{ bis: "", wert: "" }, { bis: 15, wert: 0.6 }] }), 0.6);
pruefe("nur Müll → Grundwert",
  formzahlFuer("X", 12, { X: "0.5" }, { X: [{ bis: "abc", wert: "x" }] }), 0.5);

pruefe("Komma im Feld wird gelesen",
  formzahlFuer("X", 12, {}, { X: [{ bis: "15", wert: "0,55" }] }), 0.55);

titel("WINKELZÄHLPROBE mit Höhenstufen");
const arten = [{ name: "Fichte", anzahl: 10, hoehen: [12, 12], durchmesser: [30] }];
const ohne = wzpAuswerten(arten, 4, { Fichte: "0.5" }, 60, {});
const mit = wzpAuswerten(arten, 4, { Fichte: "0.5" }, 60, { Fichte: [{ bis: 15, wert: 0.55 }] });
pruefe("ohne Stufen: 40 · 12 · 0,50", r(ohne.jeArt[0].vHa, 2), 240);
pruefe("mit Stufe:   40 · 12 · 0,55", r(mit.jeArt[0].vHa, 2), 264);
pruefe("Formzahl steht im Ergebnis (Export!)", mit.jeArt[0].formzahl, 0.55);
pruefe("Grundfläche bleibt unberührt", r(mit.jeArt[0].gHa, 2), 40);
/* Mittelhoehe 20 m liegt ueber der Stufe bis 15 m - dann gilt der Grundwert,
   nicht etwa die letzte Stufe. */
const drueber = wzpAuswerten(
  [{ name: "Fichte", anzahl: 10, hoehen: [20], durchmesser: [30] }],
  4, { Fichte: "0.5" }, 60, { Fichte: [{ bis: 15, wert: 0.55 }] },
);
pruefe("Mittelhöhe über der letzten Stufe", drueber.jeArt[0].formzahl, 0.5);

titel("SPEICHER – Höhenstufen überleben das Laden");
let roh = null;
globalThis.localStorage = { getItem: () => roh, setItem: () => {} };
const { laden } = await import("../src/baum/speicher.js");

roh = JSON.stringify({ version: 2, modus: "wzp", formzahlen: { Fichte: "0.5" } });
pruefe("alter Stand ohne Stufen", JSON.stringify(laden().formzahlStufen), "{}");

roh = JSON.stringify({ formzahlStufen: { Fichte: [{ bis: "15", wert: "0,55" }] } });
pruefe("eingetragene Stufen bleiben als Text",
  JSON.stringify(laden().formzahlStufen), '{"Fichte":[{"bis":"15","wert":"0,55"}]}');

roh = JSON.stringify({ formzahlStufen: { Fichte: [] } });
pruefe("leere Liste wird nicht behalten", JSON.stringify(laden().formzahlStufen), "{}");

roh = JSON.stringify({ formzahlStufen: 17 });
pruefe("Müll statt Stufen wirft nichts um", JSON.stringify(laden().formzahlStufen), "{}");

roh = JSON.stringify({ formzahlStufen: { Fichte: [null, 5, { bis: 15, wert: 0.55 }] } });
pruefe("kaputte Zeilen fallen heraus",
  JSON.stringify(laden().formzahlStufen), '{"Fichte":[{"bis":"15","wert":"0.55"}]}');

console.log(`\nERGEBNIS: ${ok} in Ordnung, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
