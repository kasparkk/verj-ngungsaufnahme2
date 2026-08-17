/* Baut die Aufnahme als Tabelle: eine Zeile je Probekreis, je Baumart zwei
   Spalten (verbissen / unverbissen). Kreise ohne jede Zahl bleiben weg. */

// Zeilen als Arrays - Zahlen bleiben Zahlen, damit Excel damit rechnen kann.
// Rueckgabe null heisst: noch nichts gezaehlt.
export function baueZeilen(kopf, arten, kreise) {
  const kopfzeile = [
    "Person",
    "Abteilung",
    "Datum",
    "Kreisflaeche_m2",
    "Kreis",
    "Lat",
    "Lon",
    "Genauigkeit_m",
  ];
  arten.forEach((art) => kopfzeile.push(`${art.name} verbissen`, `${art.name} unverbissen`));

  const zeilen = [kopfzeile];

  kreise.forEach((kreis) => {
    const hatWerte = arten.some((art) => {
      const zahl = kreis.counts[art.id] || { v: 0, u: 0 };
      return zahl.v || zahl.u;
    });
    if (!hatWerte) return;

    const zeile = [
      kopf.trupp,
      kopf.abteilung,
      kopf.datum,
      Number(String(kopf.radius).replace(",", ".")) || 100,
      kreis.nr,
      kreis.lat ?? "",
      kreis.lon ?? "",
      kreis.acc != null ? Math.round(kreis.acc) : "",
    ];
    arten.forEach((art) => {
      const zahl = kreis.counts[art.id] || { v: 0, u: 0 };
      zeile.push(zahl.v || 0, zahl.u || 0);
    });
    zeilen.push(zeile);
  });

  return zeilen.length === 1 ? null : zeilen;
}

/* Dieselben Zeilen als Text.
   trenner ";" -> CSV-Datei, trenner "\t" -> Zwischenablage (faellt in Excel
   direkt in die Spalten). */
export function baueTabelle(kopf, arten, kreise, trenner = ";") {
  const zeilen = baueZeilen(kopf, arten, kreise);
  if (!zeilen) return null;
  return zeilen.map((zeile) => zeile.join(trenner)).join("\n");
}
