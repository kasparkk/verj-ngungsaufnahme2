/* Rechnungen der Baummessung.

   Grundflaeche  g = pi * (d/2)^2   (d = BHD, auf Meter gebracht)
   Schaftvolumen V = g * h * f      (f = Formzahl)

   Die Formzahl beschreibt, wie stark sich der Stamm nach oben verjuengt -
   ein Baum ist eben kein Zylinder. Die Werte unten sind gaengige Richtwerte
   fuer Derbholz und in der App aenderbar: je nach Herkunft, Alter und
   Bonitaet weichen sie ab, und wer eigene Zahlen aus der Massentafel hat,
   soll sie eintragen koennen. Das Ergebnis ist eine Schaetzung, keine
   Massentafel-Genauigkeit. */

export const BAUMARTEN = [
  { name: "Fichte", formzahl: 0.5 },
  { name: "Kiefer", formzahl: 0.47 },
  { name: "Tanne", formzahl: 0.51 },
  { name: "Douglasie", formzahl: 0.48 },
  { name: "Lärche", formzahl: 0.46 },
  { name: "Buche", formzahl: 0.5 },
  { name: "Eiche", formzahl: 0.51 },
  { name: "Birke", formzahl: 0.45 },
  { name: "Erle", formzahl: 0.47 },
  { name: "Esche", formzahl: 0.48 },
  { name: "Ahorn", formzahl: 0.48 },
  { name: "Linde", formzahl: 0.47 },
  { name: "Pappel", formzahl: 0.44 },
];

export const STANDARD_FORMZAHL = 0.5;

// Nimmt Komma wie Punkt als Dezimaltrenner - im Feld tippt niemand Punkte.
export function zahl(wert) {
  const n = parseFloat(String(wert ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// BHD in Zentimetern -> Grundflaeche in Quadratmetern.
export function grundflaeche(bhdCm) {
  const d = zahl(bhdCm) / 100;
  return Math.PI * (d / 2) ** 2;
}

// Schaftvolumen in Kubikmetern (Festmeter).
export function volumen(bhdCm, hoeheM, formzahl) {
  return grundflaeche(bhdCm) * zahl(hoeheM) * (zahl(formzahl) || STANDARD_FORMZAHL);
}

/* Auswertung ueber alle eingetragenen Baeume.
   flaecheM2 = aufgenommene Flaeche; nur damit ist die Hochrechnung je Hektar
   moeglich. */
export function auswerten(baeume, flaecheM2) {
  const gueltig = baeume.filter((b) => zahl(b.bhd) > 0);
  const anzahl = gueltig.length;

  const summeG = gueltig.reduce((s, b) => s + grundflaeche(b.bhd), 0);
  const summeV = gueltig.reduce((s, b) => s + volumen(b.bhd, b.hoehe, b.formzahl), 0);

  const mittelHoehe = anzahl
    ? gueltig.reduce((s, b) => s + zahl(b.hoehe), 0) / anzahl
    : 0;

  /* Durchmesser des Grundflaechenmittelstamms: der Baum, der die
     durchschnittliche Grundflaeche hat. Forstlich ueblicher als das blosse
     Mittel der Durchmesser, weil die Grundflaeche quadratisch waechst. */
  const dg = anzahl ? Math.sqrt((4 * (summeG / anzahl)) / Math.PI) * 100 : 0;

  const flaeche = zahl(flaecheM2);
  const jeHektar = flaeche > 0 ? 10000 / flaeche : null;

  return {
    anzahl,
    summeG,
    summeV,
    mittelHoehe,
    dg,
    jeHektar: jeHektar && {
      staemme: anzahl * jeHektar,
      grundflaeche: summeG * jeHektar,
      vorrat: summeV * jeHektar,
    },
  };
}
