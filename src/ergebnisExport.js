/* Excel-Datei zur Auswertung ueber alle Personen.

   Die Ansicht zeigt drei verschiedene Dinge - die zusammengefasste
   Auswertung, die Einzeleintraege und die abgelaufenen Probekreise. In eine
   einzige Tabelle gehoeren die nicht: sie haben verschiedene Zeilenarten.
   Deshalb bekommt jedes sein eigenes Blatt. */

import { baueXlsxMehrblatt } from "./xlsx.js";
import { nachUtm33 } from "./utm33.js";

const rund = (wert, stellen) => {
  const n = Number(wert);
  if (!Number.isFinite(n)) return "";
  const faktor = 10 ** stellen;
  return Math.round(n * faktor) / faktor;
};

/* Ein Probekreis ist durch Person, Abteilung, Tag und Kreisnummer bestimmt.
   Die Koordinate steht in der Datenbank an jeder Zeile des Kreises - sie
   wird hier einmal je Kreis herausgezogen, statt sie zu wiederholen. */
export function probekreise(zeilen) {
  const kreise = new Map();

  for (const z of zeilen) {
    const schluessel = `${z.trupp}|${z.abteilung ?? ""}|${z.aufnahmedatum ?? ""}|${z.kreis}`;
    if (!kreise.has(schluessel)) {
      kreise.set(schluessel, {
        trupp: z.trupp,
        abteilung: z.abteilung ?? "",
        datum: z.aufnahmedatum ?? "",
        kreis: z.kreis,
        flaeche: Number(z.kreisflaeche) || null,
        lat: null,
        lon: null,
        genauigkeit: null,
        baumarten: 0,
        verbissen: 0,
        unverbissen: 0,
      });
    }
    const k = kreise.get(schluessel);
    k.baumarten += 1;
    k.verbissen += Number(z.verbissen) || 0;
    k.unverbissen += Number(z.unverbissen) || 0;
    // Die erste vorhandene Koordinate gilt; leere Zeilen ueberschreiben nichts.
    if (k.lat == null && z.lat != null && z.lon != null) {
      k.lat = Number(z.lat);
      k.lon = Number(z.lon);
      k.genauigkeit = z.genauigkeit_m == null ? null : Number(z.genauigkeit_m);
    }
  }

  return [...kreise.values()].sort(
    (a, b) =>
      String(a.datum).localeCompare(String(b.datum)) ||
      String(a.trupp).localeCompare(String(b.trupp)) ||
      a.kreis - b.kreis,
  );
}

export function baueErgebnisDatei(auswertung, zeilen, kopf) {
  const blattAuswertung = [
    ["Abteilung", "Datum", "Baumart", "verbissen", "unverbissen", "gesamt",
     "Verbiss_Prozent", "Kreise_gesamt", "Stueck_je_ha"],
    ...auswertung.map((a) => [
      a.abteilung ?? "",
      a.aufnahmedatum ?? "",
      a.baumart,
      Number(a.verbissen) || 0,
      Number(a.unverbissen) || 0,
      Number(a.gesamt) || 0,
      rund(a.verbiss_prozent, 1),
      Number(a.kreise_gesamt) || "",
      Number(a.stueck_je_ha) || "",
    ]),
  ];

  const blattEintraege = [
    ["Person", "Abteilung", "Datum", "Probekreis", "Kreisflaeche_m2", "Baumart",
     "verbissen", "unverbissen", "Breite", "Laenge", "Genauigkeit_m", "X_UTM33", "Y_UTM33"],
    ...zeilen.map((z) => {
      const utm = z.lat != null && z.lon != null ? nachUtm33(Number(z.lat), Number(z.lon)) : null;
      return [
        z.trupp ?? "",
        z.abteilung ?? "",
        z.aufnahmedatum ?? "",
        z.kreis,
        Number(z.kreisflaeche) || "",
        z.baumart,
        Number(z.verbissen) || 0,
        Number(z.unverbissen) || 0,
        z.lat == null ? "" : rund(z.lat, 7),
        z.lon == null ? "" : rund(z.lon, 7),
        z.genauigkeit_m == null ? "" : rund(z.genauigkeit_m, 1),
        utm ? utm.x : "",
        utm ? utm.y : "",
      ];
    }),
  ];

  const blattKreise = [
    ["Person", "Abteilung", "Datum", "Probekreis", "Kreisflaeche_m2", "Baumarten",
     "verbissen", "unverbissen", "gesamt", "Breite", "Laenge", "Genauigkeit_m",
     "X_UTM33", "Y_UTM33", "Karte"],
    ...probekreise(zeilen).map((k) => {
      const utm = k.lat != null ? nachUtm33(k.lat, k.lon) : null;
      return [
        k.trupp,
        k.abteilung,
        k.datum,
        k.kreis,
        k.flaeche ?? "",
        k.baumarten,
        k.verbissen,
        k.unverbissen,
        k.verbissen + k.unverbissen,
        k.lat == null ? "" : rund(k.lat, 7),
        k.lon == null ? "" : rund(k.lon, 7),
        k.genauigkeit == null ? "" : rund(k.genauigkeit, 1),
        utm ? utm.x : "",
        utm ? utm.y : "",
        // Antippbar in Excel: fuehrt direkt auf den Punkt in der Karte.
        k.lat == null ? "" : `https://www.google.com/maps?q=${rund(k.lat, 7)},${rund(k.lon, 7)}`,
      ];
    }),
  ];

  return baueXlsxMehrblatt([
    { name: "Auswertung", zeilen: blattAuswertung },
    { name: "Probekreise", zeilen: blattKreise },
    { name: "Einträge", zeilen: blattEintraege },
  ]);
}

export const ergebnisDateiname = (kopf) => {
  const teil = (kopf?.abteilung || "").trim().replace(/[^\wäöüÄÖÜß -]/g, "") || "Aufnahme";
  const datum = (kopf?.datum || "").trim();
  return `Verjuengung_${teil}${datum ? "_" + datum : ""}.xlsx`;
};
