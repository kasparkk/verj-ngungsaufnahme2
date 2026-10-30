import { useEffect, useState } from "react";
import { WOERTER, WERTE, ARTEN } from "./woerterbuch.js";

/* Sprache der Oberflaeche.

   Deutsch ist die Quellsprache: Im Code stehen die deutschen Texte, und
   t() gibt sie auf Deutsch unveraendert zurueck. Das ist Absicht und
   nicht Faulheit - die App wird im Wald benutzt, und eine Umstellung auf
   Schluessel ("hoehe.messen") haette jede deutsche Zeile aendern koennen,
   ohne dass es jemandem auffaellt. So ist der deutsche Zweig die
   Identitaet: Was vorher dastand, steht nachher da.

   Fehlt eine Uebersetzung, erscheint der deutsche Text. Lieber ein
   deutsches Wort im englischen Bildschirm als eine leere Stelle oder ein
   nackter Schluessel. Gefunden werden fehlende Eintraege nicht im Wald,
   sondern von pruefungen/sprache.mjs - die liest alle t()-Aufrufe aus dem
   Quelltext und meldet, was im Woerterbuch fehlt.

   NICHT uebersetzt werden Daten: Baumarten, Reviere, Abteilungen und
   Personen bleiben gespeichert, wie sie sind, und auch die Spalten der
   Excel- und GeoJSON-Dateien bleiben deutsch. Sonst haengen an einer
   Spracheinstellung plötzlich zwei verschiedene Dateiformate, und die
   Daten des Kollegen passen nicht mehr zu den eigenen. Baumartennamen
   werden nur fuer die ANZEIGE uebersetzt; gespeichert wird weiter
   "Fichte". */

const SCHLUESSEL = "app:sprache";
export const SPRACHEN = [
  { kuerzel: "de", name: "Deutsch" },
  { kuerzel: "en", name: "English" },
];

let aktuell = "de";
const horcher = new Set();

export function holeSprache() {
  return aktuell;
}

/* Einmal beim Start. Ohne gemerkte Wahl bleibt es bei Deutsch - die
   Browsersprache zu raten waere hier falsch: Das Geraet eines Foersters
   kann auf Englisch stehen, die Aufnahme ist trotzdem deutsch. */
export function spracheLaden() {
  try {
    const gemerkt = localStorage.getItem(SCHLUESSEL);
    if (SPRACHEN.some((s) => s.kuerzel === gemerkt)) aktuell = gemerkt;
  } catch {
    // Kein Speicher: Deutsch.
  }
  setzeHtmlSprache();
  return aktuell;
}

function setzeHtmlSprache() {
  try {
    document.documentElement.lang = aktuell;
  } catch {
    // Kein Dokument (Pruefung ohne Browser) - dann gibt es auch nichts zu setzen.
  }
}

export function setzeSprache(kuerzel) {
  if (!SPRACHEN.some((s) => s.kuerzel === kuerzel)) return;
  aktuell = kuerzel;
  try {
    localStorage.setItem(SCHLUESSEL, kuerzel);
  } catch {
    // Nicht merken zu koennen ist kein Grund, die Sprache nicht zu wechseln.
  }
  setzeHtmlSprache();
  horcher.forEach((f) => f());
}

/* Uebersetzen.

   Platzhalter in geschweiften Klammern: t("{n} Bäume", { n: 3 }). So
   bleibt die Wortstellung der jeweiligen Sprache erhalten - im Englischen
   steht die Zahl manchmal woanders. */
export function t(text, werte) {
  /* Erst die Oberflaechentexte, dann die Werte des Aufnahmebogens -
     beide nur fuer die Anzeige, gespeichert wird immer der deutsche Wert. */
  const roh = aktuell === "de" ? text : WOERTER[text] ?? WERTE[text] ?? text;
  if (!werte) return roh;
  return String(roh).replace(/\{(\w+)\}/g, (ganz, name) =>
    werte[name] == null ? ganz : String(werte[name]),
  );
}

/* Zahlenformat.

   Im Deutschen trennt das Komma die Dezimalen, im Englischen der Punkt -
   und beim Tausender ist es umgekehrt. "0,55" liest ein englischer Leser
   als 55, deshalb reicht es nicht, nur die Worte zu uebersetzen.

   Eingetippt werden darf weiter beides: zahl() in berechnung.js nimmt
   Komma wie Punkt. Nur die Anzeige folgt der Sprache. */
export function zahlOrt() {
  return aktuell === "en" ? "en-GB" : "de-DE";
}

/* Baumarten - nur fuer die Anzeige.

   Gespeichert und exportiert wird immer der deutsche Name: Er ist Teil
   des Schluessels in der Datenbank (trupp, datum, abteilung, kreis,
   BAUMART) und steht so in den Tabellen des Kollegen. Wuerde die
   Spracheinstellung den gespeicherten Wert aendern, waeren dieselben
   Baeume je nach Handy zwei verschiedene Arten. */
export function artName(name) {
  return aktuell === "de" ? name : ARTEN[name] ?? name;
}

/* Fuer Komponenten: holt t() und laesst neu zeichnen, wenn die Sprache
   wechselt. Ohne den Haken bliebe der alte Text stehen, bis die
   Komponente aus anderem Grund neu zeichnet. */
export function useT() {
  const [, neu] = useState(0);
  useEffect(() => {
    const f = () => neu((n) => n + 1);
    horcher.add(f);
    return () => horcher.delete(f);
  }, []);
  return t;
}
