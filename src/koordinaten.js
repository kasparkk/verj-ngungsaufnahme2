import { nachUtm33 } from "./utm33.js";

/* Koordinatenpaare am Stueck, wie sie in den Ausgaben stehen sollen.

   Getrennte Spalten sind zum Rechnen gut, zum Weitergeben nicht: In die
   Aufnahmemaske der Landesforst gehoert ein Rechts- und Hochwert am Stueck,
   und ein Kartenprogramm nimmt das Paar aus Breite und Laenge. Beides steht
   deshalb zusaetzlich als fertige Zeichenkette in der Datei - zum Anklicken,
   Kopieren, Weiterschicken.

   Punkt als Dezimaltrenner, weil das Komma bereits die beiden Werte trennt. */

export const utmPaar = (breite, laenge) => {
  if (breite == null || laenge == null) return "";
  const utm = nachUtm33(Number(breite), Number(laenge));
  return utm ? `${utm.x.toFixed(2)}, ${utm.y.toFixed(2)}` : "";
};

export const gradPaar = (breite, laenge) =>
  breite == null || laenge == null
    ? ""
    : `${Number(breite).toFixed(6)}, ${Number(laenge).toFixed(6)}`;
