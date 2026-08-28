/* Auswertung aus Einzelzeilen.

   Dieselbe Rechnung wird an zwei Stellen gebraucht: beim Abruf einer
   einzelnen Person aus der Datenbank und beim Umschalten auf eine Person in
   der Ergebnisansicht, wo die Zeilen schon geladen sind. Sie steht deshalb
   hier und nicht zweimal nebeneinander - sonst zeigen beide Wege
   frueher oder spaeter verschiedene Zahlen. */

export function auswertenAusZeilen(zeilen) {
  const kreiseGesamt = new Set(zeilen.map((z) => z.kreis)).size;
  // Die Probekreisflaeche ist innerhalb einer Aufnahme gleich; ohne Zeilen
  // gilt der uebliche Standardwert.
  const flaeche = zeilen.length ? Number(zeilen[0].kreisflaeche) || 100 : 100;

  const jeBaumart = new Map();
  for (const z of zeilen) {
    const eintrag = jeBaumart.get(z.baumart) || { baumart: z.baumart, verbissen: 0, unverbissen: 0 };
    eintrag.verbissen += Number(z.verbissen) || 0;
    eintrag.unverbissen += Number(z.unverbissen) || 0;
    jeBaumart.set(z.baumart, eintrag);
  }

  const auswertung = [...jeBaumart.values()]
    .map((eintrag) => {
      const gesamt = eintrag.verbissen + eintrag.unverbissen;
      return {
        ...eintrag,
        gesamt,
        verbiss_prozent: gesamt ? Math.round((eintrag.verbissen / gesamt) * 1000) / 10 : null,
        kreise_gesamt: kreiseGesamt,
        stueck_je_ha:
          kreiseGesamt && flaeche ? Math.round((gesamt * 10000) / (kreiseGesamt * flaeche)) : null,
      };
    })
    .sort((a, b) => b.gesamt - a.gesamt);

  return { auswertung, kreiseGesamt };
}
