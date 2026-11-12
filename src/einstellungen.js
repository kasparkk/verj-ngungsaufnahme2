import { useEffect, useState } from "react";

/* Zwei Schalter, die nichts mit der Aufnahme zu tun haben, sondern mit
   dem Geraet in der Hand:

     wach   Bildschirm bleibt an, solange die App offen ist
     stups  kurzes Ticken beim Zaehlen

   Beide kosten Akku, und Akku ist im Bestand knapp - deshalb sind sie
   abschaltbar und nicht fest eingebaut. Sie liegen hier und nicht in der
   Aufnahme: Sie gehoeren zum Geraet, nicht zum Blatt, und sollen beim
   Wechsel von Person oder Tag nicht mitwandern.

   Dasselbe Muster wie bei der Sprache: ein Wert im Modul, Horcher fuer
   die Oberflaeche. */

const SCHLUESSEL = "app:einstellungen";

const STANDARD = { wach: true, stups: true };

let aktuell = { ...STANDARD };
const horcher = new Set();

export function einstellungenLaden() {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "{}");
    aktuell = {
      wach: typeof roh.wach === "boolean" ? roh.wach : STANDARD.wach,
      stups: typeof roh.stups === "boolean" ? roh.stups : STANDARD.stups,
    };
  } catch {
    aktuell = { ...STANDARD };
  }
  return aktuell;
}

export function holeEinstellungen() {
  return aktuell;
}

export function setzeEinstellung(name, wert) {
  if (!(name in STANDARD)) return;
  aktuell = { ...aktuell, [name]: Boolean(wert) };
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(aktuell));
  } catch {
    // Nicht merken zu koennen ist kein Grund, den Schalter zu verweigern.
  }
  horcher.forEach((f) => f());
}

export function useEinstellungen() {
  const [, neu] = useState(0);
  useEffect(() => {
    const f = () => neu((n) => n + 1);
    horcher.add(f);
    return () => horcher.delete(f);
  }, []);
  return aktuell;
}

/* Bildschirm wachhalten.

   Beim Zaehlen schaut man zwischen Handy und Bestand hin und her; nach
   dreissig Sekunden ohne Beruehrung sperrt das Geraet, und man tippt
   jedes Mal erst wieder auf. Die Sperre gilt nur, solange die App vorne
   ist - das System gibt sie beim Wegschalten von selbst frei, deshalb
   wird sie beim Zurueckkommen neu geholt.

   Gibt es die Wachhalte-Sperre nicht (aelteres Geraet, kein sicherer
   Kontext), passiert schlicht nichts. */
export function useWachhalten(an) {
  useEffect(() => {
    if (!an) return;
    if (typeof navigator === "undefined" || !navigator.wakeLock?.request) return;

    let sperre = null;
    let beendet = false;

    const holen = async () => {
      if (beendet || document.visibilityState !== "visible") return;
      try {
        sperre = await navigator.wakeLock.request("screen");
        if (beendet) {
          sperre.release?.().catch(() => {});
          sperre = null;
        }
      } catch {
        /* Abgelehnt oder im Hintergrund angefragt - kein Grund fuer eine
           Meldung. Der Bildschirm geht dann eben aus wie bisher. */
      }
    };

    holen();
    const wieder = () => {
      if (document.visibilityState === "visible") holen();
    };
    document.addEventListener("visibilitychange", wieder);

    return () => {
      beendet = true;
      document.removeEventListener("visibilitychange", wieder);
      sperre?.release?.().catch(() => {});
      sperre = null;
    };
  }, [an]);
}
