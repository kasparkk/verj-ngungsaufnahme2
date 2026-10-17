/* Hoehe, in der das Handy beim Peilen gehalten wird.

   Eigener Speicherplatz, bewusst getrennt von der Aufnahme: Die Zahl
   gehoert zur Person und zum Geraet, nicht zum Bestand. Wer sie einmal
   gemessen hat, hat sie im naechsten Bestand noch.

   Voreingestellt ist nichts Gemessenes, sondern ein Anhaltspunkt - 1,50 m
   ist ungefaehr Brusthoehe bei ausgestrecktem Arm. Gemessen werden muss
   sie trotzdem: 10 cm Irrtum sind 6 Prozent Fehler in der Entfernung. */
const SCHLUESSEL = "baummessung:handyhoehe";

export const STANDARD_HANDYHOEHE = "1,50";

export function handyhoeheLaden() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    return roh == null || roh === "" ? STANDARD_HANDYHOEHE : roh;
  } catch {
    return STANDARD_HANDYHOEHE;
  }
}

export function handyhoeheSpeichern(wert) {
  try {
    localStorage.setItem(SCHLUESSEL, String(wert));
  } catch {
    // Kein Speicher, kein Drama - dann gilt sie nur fuer diese Messung.
  }
}
