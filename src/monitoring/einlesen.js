/* Sollpunkte aus einem Geoprogramm einlesen.

   Welches Programm die Punkte erzeugt hat, muss die App nicht wissen - sie
   erkennt das Format am Inhalt der Datei. Abgedeckt sind die vier Wege, die
   praktisch jedes GIS anbietet: GeoJSON, CSV mit Rechts-/Hochwert, GPX und
   KML. Das ist verlaesslicher, als sich auf ein Format festzulegen und den
   Nutzer den Umweg ueber einen Konverter laufen zu lassen.

   Ebenso wird das Bezugssystem erkannt statt erfragt: Werte im Bereich
   weniger Grad sind Laenge und Breite, sechs- bzw. siebenstellige Werte sind
   Rechts- und Hochwert in UTM 33N. Dazwischen gibt es in Brandenburg nichts,
   was zu verwechseln waere. */

import { ausUtm33 } from "../utm33.js";

const zahlVon = (roh) => {
  const n = parseFloat(String(roh ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/* Aus einem Zahlenpaar Laenge und Breite machen - unabhaengig davon, ob es
   als Grad oder als UTM 33N geliefert wurde. */
function alsGrad(a, b) {
  if (a == null || b == null) return null;

  // Grad: Breite bis 90, Laenge bis 180, in Brandenburg klein und zweistellig.
  if (Math.abs(a) <= 180 && Math.abs(b) <= 90) return { laenge: a, breite: b };
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { laenge: b, breite: a };

  // UTM 33N: Rechtswert sechsstellig, Hochwert siebenstellig.
  const rechts = a > b ? b : a;
  const hoch = a > b ? a : b;
  if (rechts > 1e5 && rechts < 1e6 && hoch > 5e6 && hoch < 7e6) {
    const g = ausUtm33(rechts, hoch);
    return g ? { laenge: g.laenge, breite: g.breite } : null;
  }
  return null;
}

const nummerVon = (roh, ersatz) => {
  const treffer = String(roh ?? "").match(/\d+/);
  return treffer ? Number(treffer[0]) : ersatz;
};

function ausGeoJson(text) {
  const daten = JSON.parse(text);
  const merkmale = daten.type === "FeatureCollection" ? daten.features : [daten];
  return (merkmale ?? [])
    .map((f, i) => {
      const g = f.geometry ?? f;
      if (g?.type !== "Point" || !Array.isArray(g.coordinates)) return null;
      const ort = alsGrad(g.coordinates[0], g.coordinates[1]);
      if (!ort) return null;
      const e = f.properties ?? {};
      return {
        nr: nummerVon(e.punkt ?? e.Punkt ?? e.id ?? e.ID ?? e.name ?? e.Name ?? e.nr, i + 1),
        ...ort,
      };
    })
    .filter(Boolean);
}

function ausGpx(text) {
  const punkte = [];
  const wpt = /<(?:wpt|trkpt)[^>]*\blat="([-\d.]+)"[^>]*\blon="([-\d.]+)"[^>]*>([\s\S]*?)<\/(?:wpt|trkpt)>/gi;
  const einzeln = /<(?:wpt|trkpt)[^>]*\blat="([-\d.]+)"[^>]*\blon="([-\d.]+)"[^>]*\/>/gi;
  let t;
  while ((t = wpt.exec(text))) {
    const name = /<name>([\s\S]*?)<\/name>/i.exec(t[3]);
    punkte.push({
      nr: nummerVon(name?.[1], punkte.length + 1),
      breite: Number(t[1]),
      laenge: Number(t[2]),
    });
  }
  while ((t = einzeln.exec(text))) {
    punkte.push({ nr: punkte.length + 1, breite: Number(t[1]), laenge: Number(t[2]) });
  }
  return punkte;
}

function ausKml(text) {
  const punkte = [];
  const marke = /<Placemark[^>]*>([\s\S]*?)<\/Placemark>/gi;
  let t;
  while ((t = marke.exec(text))) {
    const koord = /<coordinates>([\s\S]*?)<\/coordinates>/i.exec(t[1]);
    if (!koord) continue;
    const [x, y] = koord[1].trim().split(/[\s,]+/).map(zahlVon);
    const ort = alsGrad(x, y);
    if (!ort) continue;
    const name = /<name>([\s\S]*?)<\/name>/i.exec(t[1]);
    punkte.push({ nr: nummerVon(name?.[1], punkte.length + 1), ...ort });
  }
  return punkte;
}

/* CSV: Spalten werden ueber die Kopfzeile gefunden, in den Schreibweisen,
   die die gaengigen Programme ausgeben. Fehlt eine Kopfzeile, gelten die
   ersten drei Spalten als Nummer, Rechts- und Hochwert. */
const SPALTEN = {
  nr: ["punkt", "punkt-id", "punkt_id", "punktnr", "id", "nr", "name", "nummer", "fid"],
  x: ["x", "rechtswert", "rechts", "east", "easting", "utm_x", "lon", "long", "länge", "laenge", "longitude"],
  y: ["y", "hochwert", "hoch", "north", "northing", "utm_y", "lat", "breite", "latitude"],
};

function ausCsv(text) {
  const zeilen = text.split(/\r?\n/).filter((z) => z.trim());
  if (!zeilen.length) return [];

  const trenner = (zeilen[0].match(/;/g)?.length ?? 0) >= (zeilen[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const teile = (z) => z.split(trenner).map((f) => f.trim().replace(/^"|"$/g, ""));

  const kopf = teile(zeilen[0]).map((f) => f.toLowerCase());
  const finde = (namen) => kopf.findIndex((f) => namen.includes(f));
  let iNr = finde(SPALTEN.nr);
  let iX = finde(SPALTEN.x);
  let iY = finde(SPALTEN.y);

  const hatKopf = iX >= 0 && iY >= 0;
  if (!hatKopf) {
    iNr = 0;
    iX = 1;
    iY = 2;
  }

  return zeilen
    .slice(hatKopf ? 1 : 0)
    .map((z, i) => {
      const f = teile(z);
      const ort = alsGrad(zahlVon(f[iX]), zahlVon(f[iY]));
      if (!ort) return null;
      return { nr: nummerVon(iNr >= 0 ? f[iNr] : null, i + 1), ...ort };
    })
    .filter(Boolean);
}

/* Erkennt das Format am Inhalt, nicht an der Dateiendung - Dateien werden
   umbenannt, Inhalte nicht. */
export function sollpunkteLesen(text) {
  const anfang = text.trimStart().slice(0, 400).toLowerCase();
  let punkte = [];
  let format = "";

  try {
    if (anfang.startsWith("{") || anfang.startsWith("[")) {
      punkte = ausGeoJson(text);
      format = "GeoJSON";
    } else if (anfang.includes("<gpx") || anfang.includes("<wpt")) {
      punkte = ausGpx(text);
      format = "GPX";
    } else if (anfang.includes("<kml") || anfang.includes("<placemark")) {
      punkte = ausKml(text);
      format = "KML";
    } else {
      punkte = ausCsv(text);
      format = "CSV";
    }
  } catch {
    return { punkte: [], format: "", grund: "Datei nicht lesbar" };
  }

  if (!punkte.length) {
    return {
      punkte: [],
      format,
      grund: format
        ? `Keine Punkte in der ${format}-Datei gefunden`
        : "Format nicht erkannt",
    };
  }

  /* Doppelte Nummern kommen vor, wenn die Quelldatei keine fuehrt. Dann
     wird durchnummeriert, statt Punkte stillschweigend zu verschmelzen. */
  const nummern = new Set();
  punkte.forEach((p, i) => {
    if (nummern.has(p.nr)) p.nr = i + 1;
    nummern.add(p.nr);
  });

  return { punkte: punkte.sort((a, b) => a.nr - b.nr), format, grund: "" };
}
