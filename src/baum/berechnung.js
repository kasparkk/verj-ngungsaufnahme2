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

/* --- Winkelzaehlprobe (Bitterlich) -------------------------------------

   Man dreht sich am Standpunkt einmal im Kreis und zaehlt jeden Baum, der in
   Brusthoehe breiter erscheint als der Spalt am Zaehlstab. Die Flaeche muss
   dabei nicht abgesteckt werden - das ist der Witz des Verfahrens:

       Grundflaeche je Hektar = gezaehlte Baeume * Zaehlfaktor

   Mit der mittleren Hoehe und der Formzahl daraus der Vorrat:

       Vorrat je Hektar = G/ha * Hoehe * Formzahl                           */

export const ZAEHLFAKTOREN = [1, 2, 4];

// Mittelwert der eingetragenen Hoehen; leere Felder zaehlen nicht mit.
export function mittel(werte) {
  const zahlen = (werte ?? []).map(zahl).filter((n) => n > 0);
  if (!zahlen.length) return 0;
  return zahlen.reduce((s, n) => s + n, 0) / zahlen.length;
}

export function wzpAuswerten(arten, zaehlfaktor, formzahlen) {
  const k = zahl(zaehlfaktor) || 4;

  const jeArt = arten.map((a) => {
    const anzahl = Math.max(0, Math.round(zahl(a.anzahl)));
    const mittelHoehe = mittel(a.hoehen);
    const formzahl = zahl(formzahlen?.[a.name]) || STANDARD_FORMZAHL;
    const gHa = anzahl * k;

    /* Mittelstamm aus den gemessenen Durchmessern: nicht das schlichte Mittel,
       sondern der Grundflaechenmittelstamm - der Baum mit der mittleren
       Grundflaeche. Weil die Grundflaeche quadratisch mit dem Durchmesser
       waechst, liegt er ueber dem arithmetischen Mittel (30 und 40 cm ergeben
       35,4 statt 35,0 cm). Mit ihm laesst sich die Grundflaeche je Hektar in
       eine Stammzahl umrechnen. */
    const dm = (a.durchmesser ?? []).map(zahl).filter((d) => d > 0);
    const dg = dm.length ? Math.sqrt(dm.reduce((s, d) => s + d * d, 0) / dm.length) : 0;
    const gMittelstamm = dg > 0 ? grundflaeche(dg) : 0;
    const nHa = gMittelstamm > 0 ? gHa / gMittelstamm : 0;
    const vMittelstamm = gMittelstamm * mittelHoehe * formzahl;

    return {
      ...a,
      anzahl,
      mittelHoehe,
      formzahl,
      gHa,
      vHa: gHa * mittelHoehe * formzahl,
      dg,
      gMittelstamm,
      nHa,
      vMittelstamm,
    };
  });

  return {
    jeArt,
    gesamt: {
      anzahl: jeArt.reduce((s, a) => s + a.anzahl, 0),
      gHa: jeArt.reduce((s, a) => s + a.gHa, 0),
      vHa: jeArt.reduce((s, a) => s + a.vHa, 0),
      nHa: jeArt.reduce((s, a) => s + a.nHa, 0),
    },
  };
}
