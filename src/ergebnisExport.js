/* Excel-Datei zur Auswertung ueber alle Personen.

   Die Ansicht zeigt drei verschiedene Dinge - die zusammengefasste
   Auswertung, die Einzelzaehlungen und die abgelaufenen Probekreise. In eine
   einzige Tabelle gehoeren die nicht: sie haben verschiedene Zeilenarten.
   Deshalb bekommt jedes sein eigenes Blatt.

   Zuerst kommen die Zaehlungen, denn nur dort steht, aus welchem Probekreis
   eine Zahl stammt. Die Auswertung fasst ueber alle Kreise zusammen und
   kann den Probekreis gar nicht nennen - stand sie vorn, sah die Datei aus,
   als fehle die Angabe. */

import { baueXlsxMehrblatt } from "./xlsx.js";
import { nachUtm33 } from "./utm33.js";
import { normDatum } from "./datum.js";

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

/* Was in die Datei gehoert: nur der eine Aufnahmetag in der einen
   Abteilung.

   Die Ansicht kann mehr zeigen - ohne gesetztes Datum holt sie alle Tage
   der Abteilung, damit man sich einen Ueberblick verschaffen kann. Fuer
   eine Datei, die weitergegeben und ausgewertet wird, ist das aber falsch:
   dort stuenden Zahlen verschiedener Tage untereinander, ohne dass es beim
   Weiterrechnen jemandem auffiele.

   Ohne Datum gibt es keinen "gleichen Tag" - dann wird nichts ausgegeben,
   sondern nachgefragt. */
export function eingegrenzt(auswertung, zeilen, kopf) {
  const abteilung = (kopf?.abteilung ?? "").trim();
  const datum = normDatum((kopf?.datum ?? "").trim());
  if (!datum) return { datum: null, abteilung, auswertung: [], zeilen: [], weggelassen: 0 };

  const passt = (z) =>
    z.aufnahmedatum === datum && (z.abteilung ?? "") === abteilung;

  const gefiltert = zeilen.filter(passt);
  return {
    datum,
    abteilung,
    auswertung: auswertung.filter(passt),
    zeilen: gefiltert,
    weggelassen: zeilen.length - gefiltert.length,
  };
}

/* Was jede Person an diesem Tag gezaehlt hat.

   Die Auswertung fasst ueber alle Personen zusammen - fuer die Frage, ob
   sich zwei Truppen bei derselben Baumart einig sind, hilft das nicht. Hier
   wird deshalb je Person aufgeschluesselt, mit den Baumarten darunter.

   Ansicht und Excel-Datei rechnen ueber dieselbe Funktion, damit auf dem
   Bildschirm nichts anderes steht als in der Datei. */
export function jePerson(zeilen) {
  const personen = new Map();

  for (const z of zeilen) {
    const name = z.trupp ?? "";
    if (!personen.has(name)) {
      personen.set(name, {
        name,
        kreise: new Set(),
        verbissen: 0,
        unverbissen: 0,
        arten: new Map(),
      });
    }
    const p = personen.get(name);
    const verbissen = Number(z.verbissen) || 0;
    const unverbissen = Number(z.unverbissen) || 0;

    p.kreise.add(z.kreis);
    p.verbissen += verbissen;
    p.unverbissen += unverbissen;

    if (!p.arten.has(z.baumart)) {
      p.arten.set(z.baumart, { baumart: z.baumart, verbissen: 0, unverbissen: 0, kreise: new Set() });
    }
    const a = p.arten.get(z.baumart);
    a.verbissen += verbissen;
    a.unverbissen += unverbissen;
    a.kreise.add(z.kreis);
  }

  const anteil = (verbissen, gesamt) => (gesamt > 0 ? rund((verbissen / gesamt) * 100, 1) : null);

  return [...personen.values()]
    .map((p) => {
      const gesamt = p.verbissen + p.unverbissen;
      return {
        name: p.name,
        kreise: p.kreise.size,
        verbissen: p.verbissen,
        unverbissen: p.unverbissen,
        gesamt,
        anteil: anteil(p.verbissen, gesamt),
        arten: [...p.arten.values()]
          .map((a) => ({
            baumart: a.baumart,
            kreise: a.kreise.size,
            verbissen: a.verbissen,
            unverbissen: a.unverbissen,
            gesamt: a.verbissen + a.unverbissen,
            anteil: anteil(a.verbissen, a.verbissen + a.unverbissen),
          }))
          .sort((x, y) => y.gesamt - x.gesamt),
      };
    })
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
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

  /* Je Probekreis und Baumart eine Zeile - die Ebene, auf der im Gelaende
     gezaehlt wird. Summe und Verbissanteil stehen gleich daneben, damit man
     einen auffaelligen Kreis findet, ohne selbst zu rechnen. */
  const blattZaehlungen = [
    ["Person", "Abteilung", "Datum", "Probekreis", "Kreisflaeche_m2", "Baumart",
     "verbissen", "unverbissen", "gesamt", "Verbiss_Prozent",
     "Breite", "Laenge", "Genauigkeit_m", "X_UTM33", "Y_UTM33"],
    ...zeilen.map((z) => {
      const utm = z.lat != null && z.lon != null ? nachUtm33(Number(z.lat), Number(z.lon)) : null;
      const verbissen = Number(z.verbissen) || 0;
      const unverbissen = Number(z.unverbissen) || 0;
      const gesamt = verbissen + unverbissen;
      return [
        z.trupp ?? "",
        z.abteilung ?? "",
        z.aufnahmedatum ?? "",
        z.kreis,
        Number(z.kreisflaeche) || "",
        z.baumart,
        verbissen,
        unverbissen,
        gesamt,
        gesamt > 0 ? rund((verbissen / gesamt) * 100, 1) : "",
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
     "verbissen", "unverbissen", "gesamt", "Verbiss_Prozent",
     "Breite", "Laenge", "Genauigkeit_m", "X_UTM33", "Y_UTM33", "Karte"],
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
        k.verbissen + k.unverbissen > 0
          ? rund((k.verbissen / (k.verbissen + k.unverbissen)) * 100, 1)
          : "",
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

  /* Je Person zuerst die Zusammenfassung, darunter ihre Baumarten. Eine
     Zeilenart, zwei Ebenen - die Spalte "Baumart" bleibt bei der
     Zusammenfassung leer, damit sich beides filtern laesst. */
  const blattPersonen = [
    ["Person", "Baumart", "Probekreise", "verbissen", "unverbissen", "gesamt", "Verbiss_Prozent"],
    ...jePerson(zeilen).flatMap((p) => [
      [p.name, "— alle Baumarten —", p.kreise, p.verbissen, p.unverbissen, p.gesamt, p.anteil ?? ""],
      ...p.arten.map((a) => [
        p.name, a.baumart, a.kreise, a.verbissen, a.unverbissen, a.gesamt, a.anteil ?? "",
      ]),
    ]),
  ];

  return baueXlsxMehrblatt([
    { name: "Zählungen", zeilen: blattZaehlungen },
    { name: "Je Person", zeilen: blattPersonen },
    { name: "Probekreise", zeilen: blattKreise },
    { name: "Auswertung", zeilen: blattAuswertung },
  ]);
}

export const ergebnisDateiname = (kopf) => {
  const teil = (kopf?.abteilung || "").trim().replace(/[^\wäöüÄÖÜß -]/g, "") || "Aufnahme";
  const datum = (kopf?.datum || "").trim();
  return `Verjuengung_${teil}${datum ? "_" + datum : ""}.xlsx`;
};
