/* Ein kurzer Stups, wenn ein Wert sitzt.

   Beim Peilen schaut man den Baum an, nicht den Bildschirm. Ein Haken,
   den man erst sieht, wenn man den Kopf senkt, kommt zu spaet - bis
   dahin hat man das Handy schon bewegt. Spueren kann man es, ohne
   wegzuschauen.

   Drei Muster, mehr nicht:
     GEZAEHLT      ein Ticken - die Pflanze ist drin
     FESTGEHALTEN  ein kurzer Stups - der Winkel ist drin
     FERTIG        zwei Stuepse - Hoehe steht, du kannst absetzen

   Es gibt das nicht ueberall: Auf dem iPhone kennt Safari vibrate()
   nicht. Deshalb ist der Stups nirgends die einzige Rueckmeldung,
   sondern kommt zu dem, was ohnehin auf dem Bildschirm steht. Faellt er
   weg, faellt nichts aus. */

export const FESTGEHALTEN = 30;
export const FERTIG = [30, 70, 30];
/* Beim Zaehlen deutlich kuerzer: ein Ticken, kein Brummen. Bei siebzig
   Kiefern im Probekreis ist das der Unterschied zwischen Bestaetigung
   und Belaestigung. */
export const GEZAEHLT = 15;

export function stups(muster) {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
    return navigator.vibrate(muster) !== false;
  } catch {
    /* Manche Browser werfen, wenn die Seite im Hintergrund liegt oder der
       Nutzer die Seite noch nie beruehrt hat. Ein nicht gespuerter Stups
       darf keine Messung abbrechen. */
    return false;
  }
}
