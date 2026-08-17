/* Bringt das Datum auf JJJJ-MM-TT, das Format der Datenbank.

   Das Eingabefeld ist ein natives Datumsfeld und liefert bereits JJJJ-MM-TT.
   Die deutsche Schreibweise wird trotzdem weiter erkannt, damit aeltere,
   lokal gespeicherte Aufnahmen (fruher ein Textfeld) nicht verloren gehen.

   Rueckgabe null heisst: kein verwertbares Datum - dann wird beim Abruf
   bewusst nicht nach Datum gefiltert. */
export function normDatum(wert) {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const deutsch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

  if (iso.test(wert)) return wert;

  const treffer = deutsch.exec(wert);
  if (!treffer) return null;

  const [, tag, monat, jahr] = treffer;
  return `${jahr}-${monat.padStart(2, "0")}-${tag.padStart(2, "0")}`;
}
