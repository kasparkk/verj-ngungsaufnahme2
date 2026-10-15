/* Baumhoehe aus zwei Winkeln und der Entfernung.

   Das trigonometrische Verfahren, wie es jedes Hoehenmessgeraet benutzt:
   Vom Standort aus wird einmal zur Baumspitze und einmal zum Stammfuss
   angepeilt. Mit der waagerechten Entfernung d ergibt sich

       h = d * (tan(oben) - tan(unten))

   Beide Winkel zaehlen von der Waagerechten, nach oben positiv. Der Fuss
   liegt beim Messen fast immer UNTER der Waagerechten, sein Winkel ist
   also negativ - und aus dem Minus wird eine Summe. Genau deshalb braucht
   es zwei Winkel und nicht einen: so fallen Augenhoehe und Hangneigung von
   selbst heraus, ohne dass jemand seine Koerpergroesse eingeben muss.

   Entscheidend ist, dass d die WAAGERECHTE Entfernung ist. Am Hang ist die
   abgeschrittene Strecke laenger als die waagerechte; wer das verwechselt,
   misst zu hoch. */

export const GRAD = Math.PI / 180;

/* Rueckgabe null heisst: damit laesst sich nicht rechnen. Der Aufrufer
   zeigt dann nichts an, statt eine Scheinzahl auszugeben. */
export function baumHoehe(entfernung, winkelUnten, winkelOben) {
  const d = Number(entfernung);
  const u = Number(winkelUnten);
  const o = Number(winkelOben);

  if (!Number.isFinite(d) || d <= 0) return null;
  if (!Number.isFinite(u) || !Number.isFinite(o)) return null;
  // Bei 90 Grad laeuft der Tangens ins Unendliche - sinnlos und gefaehrlich.
  if (Math.abs(u) >= 89 || Math.abs(o) >= 89) return null;
  // Die Spitze muss ueber dem Fuss liegen, sonst wurde verwechselt.
  if (o <= u) return null;

  return d * (Math.tan(o * GRAD) - Math.tan(u * GRAD));
}

/* Wie stark wirkt sich ein Fehler in der Entfernung aus?

   Die Hoehe haengt linear an d: zehn Prozent zu weit geschaetzt heisst
   zehn Prozent zu hoch gemessen. Das ist der groesste Fehler in der
   Praxis, groesser als alles, was der Neigungssensor beitraegt - deshalb
   steht es in der Oberflaeche. */
export const fehlerDurchEntfernung = (hoehe, abweichungProzent) =>
  hoehe == null ? null : (hoehe * abweichungProzent) / 100;

/* Der Neigungswinkel aus der Lage des Geraetes.

   beta ist die Vorne-Hinten-Neigung: 0 heisst flach auf dem Tisch, 90
   heisst senkrecht aufgestellt. Haelt man das Handy senkrecht und peilt
   ueber die Oberkante, ist der Blick waagerecht - also beta - 90.

   Ueber Kopf (beta ueber 180) liefern manche Geraete Werte, die sonst
   umschlagen; der Fall wird hier zurueckgeholt. */
export function neigungAusBeta(beta) {
  if (!Number.isFinite(beta)) return null;
  let b = beta;
  if (b > 180) b -= 360;
  return b - 90;
}
