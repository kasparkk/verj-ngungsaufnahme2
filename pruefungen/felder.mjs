/* Keine Beispielzahlen in leeren Feldern.

   Ein graues "30" in einem leeren BHD-Feld sieht auf dem Handy aus wie
   eine eingetragene 30 - im Bestand bei Sonne erst recht. Gemeldet wurde
   genau das: "da stehen so Fake-Zahlen im Hintergrund".

   Die Beschriftung ueber dem Feld sagt ohnehin, was hineingehoert
   ("BHD cm", "HÖHE m"), die Zahl darin sagt nichts dazu.

   Auch ein als Beispiel gekennzeichnetes "z. B. 4138 b1" faellt darunter.
   Es stand im Feld ORT / BESTAND und wurde genauso gemeldet: Was da grau
   steht, sieht aus wie ein Eintrag. Ein Platzhalter sagt, WAS
   hineingehoert ("Name oder Nummer eintragen"), nicht, wie ein Eintrag
   aussaehe.

   Aufruf:  node pruefungen/felder.mjs
*/
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const QUELLE = new URL("../src", import.meta.url).pathname;

function dateien(ordner) {
  const raus = [];
  for (const e of readdirSync(ordner, { withFileTypes: true })) {
    const p = join(ordner, e.name);
    if (e.isDirectory()) raus.push(...dateien(p));
    else if (/\.jsx?$/.test(e.name)) raus.push(p);
  }
  return raus;
}

/* Eine Zahl, auch mit Komma, Punkt, Vorzeichen oder Einheit dahinter:
   "30", "7,4", "-10", "0,55". */
const ZAHL = /^[-+]?[\d][\d.,\s]*$/;
const EIGENSCHAFT = /\b(?:placeholder|platzhalter)="([^"]*)"/g;

let fehler = 0;
let geprueft = 0;
const gefunden = [];

for (const datei of dateien(QUELLE)) {
  const quelle = readFileSync(datei, "utf8");
  const kurz = relative(QUELLE, datei);
  for (const m of quelle.matchAll(EIGENSCHAFT)) {
    geprueft += 1;
    const wert = m[1].trim();
    if (!wert) continue;
    if (ZAHL.test(wert)) {
      gefunden.push(`${kurz}: placeholder="${wert}"`);
    }
  }
}

/* Beispiele in Platzhaltern - gleich welcher Form. Die Zahl steht hier
   in einem Argument ("z. B. {was}", { was: "4138 b1" }) und ginge der
   Suche oben durch die Lappen. */
const BEISPIELE = [];
for (const datei of dateien(QUELLE)) {
  const quelle = readFileSync(datei, "utf8");
  const kurz = relative(QUELLE, datei);
  for (const m of quelle.matchAll(/(?:placeholder|platzhalter)=\{t\(\s*"([^"]*z\.\s?B\.[^"]*)"/g)) {
    BEISPIELE.push(`${kurz}: "${m[1]}"`);
  }
}
if (BEISPIELE.length) {
  fehler += BEISPIELE.length;
  console.log(`\n✗ ${BEISPIELE.length} Platzhalter zeigen ein Beispiel statt zu sagen, was hineingehört:`);
  for (const z of BEISPIELE) console.log(`     ${z}`);
} else {
  console.log("   ✓  kein Platzhalter zeigt einen Beispieleintrag");
}

console.log(`${geprueft} feste Platzhalter im Quelltext`);
if (gefunden.length) {
  fehler += gefunden.length;
  console.log(`\n✗ ${gefunden.length} Beispielzahlen in leeren Feldern:`);
  for (const z of gefunden) console.log(`     ${z}`);
  console.log(
    "\n   Statt einer Zahl: die Beschriftung über dem Feld sagt die Einheit," +
      "\n   und ein aria-label macht das Feld für die Prüfungen greifbar.",
  );
} else {
  console.log("   ✓  keine Beispielzahl steht in einem leeren Feld");
}

/* Der umgekehrte Fall: ein Feld ohne Beschriftung UND ohne aria-label ist
   weder bedienbar noch pruefbar. Geprueft wird nur, dass jedes Feld, dem
   die Beispielzahl genommen wurde, eine Bezeichnung behalten hat. */
const OHNE_NAMEN = [];
for (const datei of dateien(QUELLE)) {
  const quelle = readFileSync(datei, "utf8");
  const kurz = relative(QUELLE, datei);
  for (const m of quelle.matchAll(/<input\b[\s\S]{0,600}?\/>/g)) {
    const feld = m[0];
    if (feld.includes("type=\"file\"") || feld.includes('type="date"')) continue;
    if (feld.includes("aria-label") || feld.includes("placeholder")) continue;
    OHNE_NAMEN.push(`${kurz}: ${feld.split("\n")[0].trim()}`);
  }
}
if (OHNE_NAMEN.length) {
  fehler += OHNE_NAMEN.length;
  console.log(`\n✗ ${OHNE_NAMEN.length} Eingabefelder ohne Bezeichnung:`);
  for (const z of OHNE_NAMEN) console.log(`     ${z}`);
} else {
  console.log("   ✓  jedes Eingabefeld hat eine Bezeichnung");
}

console.log(`\nERGEBNIS: ${fehler ? `${fehler} Fehler` : "in Ordnung"}`);
process.exit(fehler ? 1 : 0);
