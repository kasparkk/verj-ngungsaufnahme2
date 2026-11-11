/* Prueft die Uebersetzung - ohne Browser.

   Eine fehlende Uebersetzung faellt im Betrieb kaum auf: Es erscheint
   einfach der deutsche Text mitten im englischen Bildschirm. Genau das
   soll diese Pruefung finden, und zwar vollstaendig: Sie liest ALLE
   t()-Aufrufe aus dem Quelltext und vergleicht sie mit dem Woerterbuch.

   Aufruf:  node pruefungen/sprache.mjs
*/
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { WOERTER, WERTE, ARTEN } from "../src/woerterbuch.js";
import { BAUMARTEN } from "../src/baum/berechnung.js";
import { START_BAUMARTEN, BAUMART_VORSCHLAEGE } from "../src/konfiguration.js";
import {
  BAUMARTEN as MONITORING_ARTEN,
  VERTEILUNG,
  KRONENSCHLUSS,
  BODENVEGETATION,
  BODENVEGETATIONSTYP,
  BODENGARE,
  MISCHUNG,
  SCHICHTUNG,
  STRUKTUR,
  MERKMALE,
} from "../src/monitoring/stammdaten.js";

const QUELLE = new URL("../src", import.meta.url).pathname;

function dateien(ordner) {
  const raus = [];
  for (const e of readdirSync(ordner, { withFileTypes: true })) {
    const p = join(ordner, e.name);
    if (e.isDirectory()) raus.push(...dateien(p));
    else if (/\.(js|jsx)$/.test(e.name)) raus.push(p);
  }
  return raus;
}

/* Kommentare weg, sonst zaehlt ein t("...") aus einem Beispiel mit. */
const ohneKommentare = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<![:"'`\\])\/\/[^\n]*/g, "");

const AUFRUF = /\bt\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
const VORLAGE = /\bt\(\s*`/g;

const benutzt = new Map(); // Text -> Dateien
const vorlagen = [];
for (const datei of dateien(QUELLE)) {
  const quelle = ohneKommentare(readFileSync(datei, "utf8"));
  const kurz = relative(QUELLE, datei);
  for (const m of quelle.matchAll(AUFRUF)) {
    const text = (m[1] ?? m[2]).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, "\n");
    if (!benutzt.has(text)) benutzt.set(text, new Set());
    benutzt.get(text).add(kurz);
  }
  if (VORLAGE.test(quelle)) vorlagen.push(kurz);
}

let fehler = 0;
const sage = (zeile) => console.log(zeile);

sage(`${benutzt.size} Texte im Quelltext, ${Object.keys(WOERTER).length} im Wörterbuch`);

const fehlt = [...benutzt.keys()].filter((k) => !(k in WOERTER));
if (fehlt.length) {
  fehler += fehlt.length;
  sage(`\n✗ ${fehlt.length} ohne englische Fassung:`);
  for (const k of fehlt) sage(`     "${k}"   (${[...benutzt.get(k)].join(", ")})`);
} else {
  sage("\n   ✓  jeder Text hat eine englische Fassung");
}

const uebrig = Object.keys(WOERTER).filter((k) => !benutzt.has(k));
if (uebrig.length) {
  /* Kein Fehler, aber ein Hinweis: Entweder ist der deutsche Text
     geaendert worden und der Eintrag zeigt ins Leere, oder er wird nur
     ueber eine Variable erreicht. */
  sage(`\n   ⚠  ${uebrig.length} Einträge werden nirgends aufgerufen:`);
  for (const k of uebrig) sage(`     "${k}"`);
}

if (vorlagen.length) {
  fehler += vorlagen.length;
  sage(`\n✗ Vorlagen-Zeichenketten in t() (dort gehören Platzhalter hin): ${vorlagen.join(", ")}`);
}

/* Platzhalter muessen auf beiden Seiten dieselben sein - sonst steht im
   Englischen "{n}" im Bildschirm oder eine Zahl fehlt ganz. */
const platzhalter = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const schief = Object.entries(WOERTER).filter(([de, en]) => platzhalter(de) !== platzhalter(en));
if (schief.length) {
  fehler += schief.length;
  sage(`\n✗ ${schief.length} mit unterschiedlichen Platzhaltern:`);
  for (const [de, en] of schief) sage(`     "${de}"  ->  "${en}"`);
} else {
  sage("   ✓  Platzhalter stimmen überein");
}

/* Baumarten: Jede Art, die in einer Liste der App steht, braucht einen
   Anzeigenamen - sonst steht mitten im englischen Bildschirm ein deutscher
   Baum. Gespeichert wird weiter der deutsche Name, geprueft wird nur die
   Anzeige. */
const artenImProgramm = [
  ...BAUMARTEN.map((a) => a.name),
  ...START_BAUMARTEN,
  ...BAUMART_VORSCHLAEGE,
  ...MONITORING_ARTEN.map((a) => a.name),
];
const ohneArt = [...new Set(artenImProgramm)].filter((a) => !(a in ARTEN));
if (ohneArt.length) {
  fehler += ohneArt.length;
  sage(`\n✗ ${ohneArt.length} Baumarten ohne englischen Namen:`);
  for (const a of ohneArt) sage(`     "${a}"`);
} else {
  sage(`   ✓  alle ${new Set(artenImProgramm).size} Baumarten haben einen englischen Namen`);
}

/* Fehlender Import: Der Build meldet nichts, und die Seite stirbt erst,
   wenn jemand sie oeffnet ("t is not defined"). Genau so ist es der
   Monitoring-Auswertung einmal ergangen - deshalb steht das hier. */
const ohneImport = [];
for (const datei of dateien(QUELLE)) {
  const quelle = ohneKommentare(readFileSync(datei, "utf8"));
  const kurz = relative(QUELLE, datei);
  if (kurz === "sprache.js" || kurz === "woerterbuch.js") continue;
  const braucht = [];
  if (/\bt\(\s*["'`]/.test(quelle)) braucht.push("t");
  if (/\buseT\(\)/.test(quelle)) braucht.push("useT");
  if (/\bartName\(/.test(quelle)) braucht.push("artName");
  if (/\bzahlOrt\(/.test(quelle)) braucht.push("zahlOrt");
  if (!braucht.length) continue;
  const einfuhr = quelle.match(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*sprache\.js["']/);
  const geholt = einfuhr ? einfuhr[1].split(",").map((x) => x.trim()) : [];
  // useT() liefert t - wer den Haken holt, hat t im Rumpf.
  const fehlende = braucht.filter(
    (name) => !geholt.includes(name) && !(name === "t" && geholt.includes("useT")),
  );
  if (fehlende.length) ohneImport.push(`${kurz}: ${fehlende.join(", ")}`);
}
if (ohneImport.length) {
  fehler += ohneImport.length;
  sage(`\n✗ ${ohneImport.length} Dateien benutzen die Übersetzung ohne Import:`);
  for (const z of ohneImport) sage(`     ${z}`);
} else {
  sage("   ✓  jede Datei, die übersetzt, holt sich die Übersetzung auch");
}

/* Die Werte des Aufnahmebogens werden ueber Variablen uebersetzt (t(w)),
   nicht woertlich - im Quelltext findet sie niemand. Geprueft wird deshalb
   gegen die Stammdaten selbst. Kuerzel (BZT, VZ1, Baumart-Kuerzel) sind
   Schluessel und bleiben aussen vor. */
const werteImBogen = [
  "Nadel", "Laub", "ja", "nein",
  ...VERTEILUNG, ...KRONENSCHLUSS, ...BODENVEGETATION, ...BODENVEGETATIONSTYP, ...BODENGARE,
  ...MISCHUNG.map((w) => w.text),
  ...SCHICHTUNG.map((w) => w.text),
  ...STRUKTUR.map((w) => w.text),
  ...MERKMALE.map((m) => m.kurz),
];
const ohneWert = [...new Set(werteImBogen)].filter((w) => !(w in WERTE));
if (ohneWert.length) {
  fehler += ohneWert.length;
  sage(`\n✗ ${ohneWert.length} Werte des Aufnahmebogens ohne englische Fassung:`);
  for (const w of ohneWert) sage(`     "${w}"`);
} else {
  sage(`   ✓  alle ${new Set(werteImBogen).size} Werte des Aufnahmebogens sind übersetzt`);
}

const leer = Object.entries(WOERTER).filter(([, en]) => !String(en).trim());
if (leer.length) {
  fehler += leer.length;
  sage(`\n✗ ${leer.length} leere Übersetzungen`);
}

sage(`\nERGEBNIS: ${fehler ? `${fehler} Fehler` : "in Ordnung"}`);
process.exit(fehler ? 1 : 0);
