/* Die Messung als GeoJSON - ein Punkt, die Ergebnisse daran.

   Ein Standpunkt je Messung, nicht je Baumart: Zum Kartieren will man
   sehen, wie Grundflaeche und Vorrat ueber den Bestand verteilt sind. Die
   Aufschluesselung nach Baumart steht in der Excel-Datei, dort ist sie
   besser aufgehoben als in den Eigenschaften eines Punktes.

   GeoJSON verlangt WGS84 und die Reihenfolge Laenge, Breite - die haeufigste
   Falle. Die UTM-Werte stehen zusaetzlich in den Eigenschaften, weil in den
   Masken der Landesforst damit gearbeitet wird; als Geometrie taugen sie
   nicht. */
import { nachUtm33 } from "../utm33.js";

const rund = (wert, stellen) => {
  const f = 10 ** stellen;
  return wert == null || Number.isNaN(wert) ? null : Math.round(wert * f) / f;
};

export function baueGeoJsonMessung(stand, auswertung) {
  if (stand.lat == null || stand.lon == null) return null;
  const utm = nachUtm33(stand.lat, stand.lon);
  const wzp = stand.modus === "wzp";

  const eigenschaften = {
    ort: stand.ort || null,
    alter_jahre: stand.alter === "" ? null : Number(stand.alter) || null,
    verfahren: wzp ? "Winkelzaehlprobe" : "Einzelbaeume",
    genauigkeit_m: rund(stand.genauigkeit, 1),
    x_utm33: utm ? rund(utm.x, 2) : null,
    y_utm33: utm ? rund(utm.y, 2) : null,
  };

  if (wzp) {
    const mitZahlen = auswertung.jeArt.filter((a) => a.anzahl > 0);
    Object.assign(eigenschaften, {
      zaehlfaktor: auswertung.zaehlfaktor ?? null,
      baumarten: mitZahlen.map((a) => a.name).join(", ") || null,
      staemme_gezaehlt: auswertung.gesamt.anzahl,
      grundflaeche_m2_ha: rund(auswertung.gesamt.gHa, 1),
      vorrat_fm_ha: rund(auswertung.gesamt.vHa, 1),
      staemme_je_ha: rund(auswertung.gesamt.nHa, 0),
    });
  } else {
    Object.assign(eigenschaften, {
      flaeche_m2: auswertung.flaeche ?? null,
      baumarten: [...new Set(auswertung.baeume.map((b) => b.art).filter(Boolean))].join(", ") || null,
      baeume: auswertung.baeume.length,
      grundflaeche_m2: rund(auswertung.gGesamt, 4),
      volumen_m3: rund(auswertung.vGesamt, 3),
      grundflaeche_m2_ha: rund(auswertung.gHa, 1),
      vorrat_fm_ha: rund(auswertung.vHa, 1),
      staemme_je_ha: rund(auswertung.nHa, 0),
    });
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [stand.lon, stand.lat] },
        properties: eigenschaften,
      },
    ],
  };
}

export const geoDateiname = (stand) => {
  const teil = (stand?.ort || "").trim().replace(/[^\wäöüÄÖÜß -]/g, "") || "Messung";
  return `Baummessung_${teil}.geojson`;
};
