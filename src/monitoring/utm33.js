/* Umrechnung WGS84 (das, was das Handy liefert) nach ETRS89 / UTM Zone 33N,
   EPSG:25833 - das Koordinatensystem der Aufnahmemaske.

   Warum ueberhaupt: Die Excel-Maske traegt X- und Y-Koordinate in EPSG:25833
   ein, das Handy kennt aber nur Laenge und Breite. Damit die exportierten
   Punkte ohne Nacharbeit in QGIS oder in die vorhandenen Datenbestaende
   passen, rechnet die App beides mit und schreibt beides in den Export.

   ETRS89 und WGS84 unterscheiden sich in Mitteleuropa um wenige Zentimeter,
   weil ETRS89 mit der eurasischen Platte mitwandert. Gegenueber der
   GNSS-Genauigkeit eines Handys (im Bestand eher 5-15 m) faellt das nicht
   ins Gewicht; die Umrechnung behandelt beide Bezugssysteme daher als
   gleich. Fuer zentimetergenaue Arbeit waere ein echter Datumsuebergang
   noetig.

   Gerechnet wird die uebliche Reihenentwicklung der transversalen
   Mercator-Abbildung (Snyder, Map Projections - A Working Manual) auf dem
   GRS80-Ellipsoid. */

const a = 6378137.0; // grosse Halbachse GRS80
const f = 1 / 298.257222101; // Abplattung GRS80
const k0 = 0.9996; // Massstabsfaktor der UTM-Abbildung
const LON0 = (15 * Math.PI) / 180; // Mittelmeridian der Zone 33
const FE = 500000; // Ostwert des Mittelmeridians

const e2 = f * (2 - f);
const ep2 = e2 / (1 - e2);

const bogen = (grad) => (grad * Math.PI) / 180;

/* Meridianbogenlaenge vom Aequator bis zur Breite phi. */
function meridianbogen(phi) {
  return (
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 * e2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi))
  );
}

/* Laenge/Breite in Grad -> { x, y } in Metern (EPSG:25833).
   Ausserhalb eines sinnvollen Bereichs um die Zone 33 wird null geliefert:
   eine Zahl auszugeben, die dort niemand mehr verwenden kann, waere
   irrefuehrender als gar keine. */
export function nachUtm33(breiteGrad, laengeGrad) {
  if (!Number.isFinite(breiteGrad) || !Number.isFinite(laengeGrad)) return null;
  if (breiteGrad < -80 || breiteGrad > 84) return null;
  if (laengeGrad < 3 || laengeGrad > 27) return null;

  const phi = bogen(breiteGrad);
  const dl = bogen(laengeGrad) - LON0;

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);

  const N = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T = tanPhi * tanPhi;
  const C = ep2 * cosPhi * cosPhi;
  const A = dl * cosPhi;
  const M = meridianbogen(phi);

  const x =
    FE +
    k0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120);

  const y =
    k0 *
    (M +
      N *
        tanPhi *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));

  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

/* Rueckweg: EPSG:25833 -> Laenge/Breite in Grad. Wird gebraucht, wenn
   Soll-Koordinaten als Rechts-/Hochwert eingegeben werden, die Karte und die
   Entfernungsanzeige aber Laenge und Breite brauchen. */
export function ausUtm33(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const M = y / k0;
  const mu =
    M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const C1 = ep2 * cosPhi1 * cosPhi1;
  const T1 = tanPhi1 * tanPhi1;
  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const R1 = (a * (1 - e2)) / (1 - e2 * sinPhi1 * sinPhi1) ** 1.5;
  const D = (x - FE) / (N1 * k0);

  const phi =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);

  const lam =
    LON0 +
    (D -
      ((1 + 2 * T1 + C1) * D ** 3) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) /
      cosPhi1;

  return { breite: (phi * 180) / Math.PI, laenge: (lam * 180) / Math.PI };
}

/* Entfernung zweier Punkte in Metern (Haversine, Erde als Kugel).
   Auf den Entfernungen einer Untersuchungsflaeche liegt der Fehler
   gegenueber der Ellipsoidrechnung im Zentimeterbereich - unerheblich
   neben der GNSS-Genauigkeit. */
export function entfernung(breite1, laenge1, breite2, laenge2) {
  const R = 6371008.8;
  const dPhi = bogen(breite2 - breite1);
  const dLam = bogen(laenge2 - laenge1);
  const s =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(bogen(breite1)) * Math.cos(bogen(breite2)) * Math.sin(dLam / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* Rechtweisende Peilung von Punkt 1 nach Punkt 2, in Grad ab Nord. */
export function peilung(breite1, laenge1, breite2, laenge2) {
  const p1 = bogen(breite1);
  const p2 = bogen(breite2);
  const dl = bogen(laenge2 - laenge1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const HIMMELSRICHTUNGEN = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];

export const himmelsrichtung = (grad) =>
  HIMMELSRICHTUNGEN[Math.round((((grad % 360) + 360) % 360) / 45) % 8];
