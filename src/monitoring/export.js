/* Export des Monitorings.

   Die Spalten bis "Referenzbaum Abstand (m)" sind Reihenfolge und
   Benennung der Mastertabelle aus der Excel-Maske - unveraendert, damit die
   Datei ohne Nacharbeit weiterverwendet werden kann. Erst danach folgen die
   Angaben, die es in der Datei nicht gab und die erst durch das Geraet
   entstehen: Laenge und Breite, die GNSS-Genauigkeit, die Soll-Koordinate
   und der Bearbeitungsstand des Punktes. */

import { artNach } from "./stammdaten.js";
import { nachUtm33 } from "./utm33.js";
import {
  probekreisflaeche,
  zielProfil,
  aktiverBzt,
  schadensklasse,
  istVerbissen,
  verjuengungsfreundlich,
  rolleVon,
  zahl,
} from "./berechnung.js";

export const MASTER_SPALTEN = [
  "Datensatz aktiv", "Untersuchungsgebiet", "Punkt-ID", "Datum", "Monitorer/in",
  "Aktiver BZT", "X-Koordinate", "Y-Koordinate", "Radius (m)", "Fläche (m²)",
  "Kronenschluss", "Bodenvegetation (Stärke)", "Bodenvegetationstyp 1",
  "Bodenvegetationstyp 2", "Bodenvegetationstyp 3", "Hasenverbiss signifikant",
  "Zäune / Weisergatter", "Verjüngungsverteilung", "Bodengare",
  "Samenbäume vorhanden", "Randeffekte", "Bemerkungen",
  "Verjüngungsfreundlich (auto)", "Pflanze Nr.", "Punkt-ID Pflanze", "Kürzel",
  "Baumartenname", "Rolle", "HK", "Verbissschutz", "Winterverbiss",
  "Fegeschaden", "Trockenheit", "Frost", "Insektenfraß", "Schadensklasse",
  "Baumartennummer", "Typ (N/L)", "Verbiss (auto)", "Ziel-Mix",
  "Ziel-Schichtung", "Ziel-Struktur", "Ziel-Profil", "Verbissziel ZB1",
  "Verbissziel ZB2", "Referenzbaum Baumart", "Referenzbaum BHD (cm)",
  "Referenzbaum Winkel (gon)", "Referenzbaum Abstand (m)",
  // Ab hier ueber die Excel-Maske hinaus:
  "Breite (WGS84)", "Länge (WGS84)", "GNSS-Genauigkeit (m)", "Quelle Ist-Koordinate",
  "Soll-X", "Soll-Y", "Punkt verlegt", "Punkt abgeschlossen",
];

/* Welche Koordinate gilt: die gemessene, sonst die geplante. Ein verlegter
   Punkt liegt eben nicht mehr dort, wo er geplant war - deshalb steht die
   Soll-Lage zusaetzlich in eigenen Spalten und wird nicht ueberschrieben. */
function koordinaten(p) {
  const hatIst = p.lat != null && p.lon != null;
  const breite = hatIst ? p.lat : p.sollLat;
  const laenge = hatIst ? p.lon : p.sollLon;
  const utm = breite != null && laenge != null ? nachUtm33(breite, laenge) : null;
  const soll =
    p.sollLat != null && p.sollLon != null ? nachUtm33(p.sollLat, p.sollLon) : null;
  return { breite, laenge, utm, soll };
}

/* Eine Zeile je Pflanze. Ein Punkt ohne Pflanzen bekommt trotzdem eine
   Zeile, sonst faellt er aus dem Export heraus - und "am Punkt stand nichts"
   ist ein Ergebnis, kein fehlender Datensatz. */
export function masterZeilen(punkte) {
  const zeilen = [MASTER_SPALTEN];

  for (const p of punkte) {
    const { breite, laenge, utm, soll } = koordinaten(p);
    const kopf = [
      "JA",
      p.gebiet,
      p.nr,
      p.datum,
      p.monitorer,
      aktiverBzt(p.bzt, p.manZb1, p.manZb2),
      utm ? utm.x : "",
      utm ? utm.y : "",
      zahl(p.radius) || "",
      probekreisflaeche(p.radius) || "",
      p.beschreibung.kronenschluss,
      p.beschreibung.bodenvegetation,
      p.beschreibung.bvTyp[0] ?? "",
      p.beschreibung.bvTyp[1] ?? "",
      p.beschreibung.bvTyp[2] ?? "",
      p.beschreibung.hasenverbiss,
      p.beschreibung.zaeune,
      p.beschreibung.verteilung,
      p.beschreibung.bodengare,
      p.beschreibung.samenbaeume,
      p.beschreibung.randeffekte,
      p.beschreibung.bemerkungen,
      verjuengungsfreundlich(p.beschreibung),
    ];
    const fuss = [
      p.mix,
      p.schicht,
      p.struktur,
      zielProfil(p.mix, p.schicht, p.struktur),
      p.vzZb1,
      p.vzZb2,
      p.referenz.art,
      zahl(p.referenz.bhd) || "",
      zahl(p.referenz.winkel) || "",
      zahl(p.referenz.abstand) || "",
      breite != null ? Math.round(breite * 1e7) / 1e7 : "",
      laenge != null ? Math.round(laenge * 1e7) / 1e7 : "",
      p.genauigkeit != null ? Math.round(p.genauigkeit * 100) / 100 : "",
      { geraet: "Handy-GNSS", stab: "Messstab" }[p.quelle] ?? "",
      soll ? soll.x : "",
      soll ? soll.y : "",
      p.verlegt ? "JA" : "NEIN",
      p.abgeschlossen ? "JA" : "NEIN",
    ];

    const gefuellt = p.pflanzen.filter((pf) => pf.kuerzel);
    if (!gefuellt.length) {
      // 16 Felder des Pflanzenblocks, leer - der Punkt selbst bleibt im Export.
      const ohnePflanze = Array(16).fill("");
      ohnePflanze[1] = p.nr;
      zeilen.push([...kopf, ...ohnePflanze, ...fuss]);
      continue;
    }

    gefuellt.forEach((pf, i) => {
      const art = artNach(pf.kuerzel);
      zeilen.push([
        ...kopf,
        i + 1,
        p.nr,
        pf.kuerzel,
        art?.name ?? "",
        rolleVon(pf.kuerzel, p.arten),
        zahl(pf.hk) || "",
        pf.schutz ?? 0,
        pf.winter ?? 0,
        pf.fege ?? 0,
        pf.trocken ?? 0,
        pf.frost ?? 0,
        pf.insekt ?? 0,
        schadensklasse(pf),
        art?.nr ?? "",
        // Die Maske schreibt hier trotz Spaltenkopf "Nadel" bzw. "Laub" aus.
        art?.typ ?? "",
        istVerbissen(pf) ? "verbissen" : "unverbissen",
        ...fuss,
      ]);
    });
  }

  return zeilen;
}

/* CSV fuer den deutschen Excel-Import: Semikolon als Trenner, Komma als
   Dezimalzeichen, BOM voran, damit Umlaute nicht zerfallen. */
export function baueCsv(zeilen) {
  const feld = (wert) => {
    if (typeof wert === "number") return String(wert).replace(".", ",");
    const text = String(wert ?? "");
    return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + zeilen.map((z) => z.map(feld).join(";")).join("\r\n");
}

/* GeoJSON der Aufnahmepunkte - ein Punkt je Aufnahmepunkt, nicht je Pflanze.

   Bewusst in WGS84 (EPSG:4326): so schreibt es die GeoJSON-Festlegung vor,
   und so laesst sich die Datei ohne Angabe eines Bezugssystems in QGIS,
   Google Earth oder eine Karten-App ziehen. Die UTM-Werte stehen in den
   Eigenschaften daneben. */
export function baueGeoJson(punkte) {
  const merkmale = punkte
    .map((p) => {
      const { breite, laenge, utm, soll } = koordinaten(p);
      if (breite == null || laenge == null) return null;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [laenge, breite] },
        properties: {
          punkt: p.nr,
          gebiet: p.gebiet,
          datum: p.datum,
          monitorer: p.monitorer,
          bzt: aktiverBzt(p.bzt, p.manZb1, p.manZb2),
          zielprofil: zielProfil(p.mix, p.schicht, p.struktur),
          radius_m: zahl(p.radius) || null,
          x_utm33: utm?.x ?? null,
          y_utm33: utm?.y ?? null,
          soll_x_utm33: soll?.x ?? null,
          soll_y_utm33: soll?.y ?? null,
          genauigkeit_m: p.genauigkeit ?? null,
          quelle: p.quelle || null,
          verlegt: !!p.verlegt,
          abgeschlossen: !!p.abgeschlossen,
          pflanzen: p.pflanzen.filter((pf) => pf.kuerzel).length,
          verbissen: p.pflanzen.filter((pf) => pf.kuerzel && istVerbissen(pf)).length,
        },
      };
    })
    .filter(Boolean);

  return JSON.stringify({ type: "FeatureCollection", features: merkmale }, null, 2);
}
