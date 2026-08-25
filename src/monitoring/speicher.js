import { BAUMARTEN, MAX_PFLANZEN } from "./stammdaten.js";

/* Speicherplatz des Monitorings - getrennt von Verjuengungsaufnahme und
   Baummessung.

   Der wichtigste Unterschied zur Excel-Maske: dort ist eine Datei ein Punkt.
   Hier liegen alle Punkte einer Untersuchungsflaeche nebeneinander in einem
   Speicher. Genau das war der Anlass fuer die App - im Gelaende soll man
   weder Dateien anlegen noch riskieren, die falsche zu ueberschreiben.

   Jeder Punkt traegt trotzdem seinen vollstaendigen Kopf (BZT, Ziel-Profil,
   Baumartenrollen). Ein neuer Punkt uebernimmt ihn von der Vorlage, und wer
   ihn an einem Punkt aendert, aendert damit die Vorlage fuer die naechsten -
   aber nicht die bereits aufgenommenen. */
const SCHLUESSEL = "monitoring:aufnahme";

export const heute = () => {
  const jetzt = new Date();
  const zz = (n) => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${zz(jetzt.getMonth() + 1)}-${zz(jetzt.getDate())}`;
};

// Aktiv-Schalter und Rolle je Baumart, vorbelegt aus der gelieferten Maske.
export const startArten = () =>
  Object.fromEntries(BAUMARTEN.map((a) => [a.kuerzel, { aktiv: a.aktiv, rolle: a.rolle }]));

/* Der Teil des Kopfes, der fuer den ganzen Bestand gilt und deshalb an neue
   Punkte weitergereicht wird. */
export const leereVorlage = () => ({
  gebiet: "",
  monitorer: "",
  radius: "5",
  bzt: "",
  manZb1: "",
  manZb2: "",
  mix: "",
  schicht: "",
  struktur: "",
  vzZb1: "",
  vzZb2: "",
  arten: startArten(),
});

export const VORLAGE_FELDER = [
  "gebiet", "monitorer", "radius", "bzt", "manZb1", "manZb2",
  "mix", "schicht", "struktur", "vzZb1", "vzZb2", "arten",
];

export const leereBeschreibung = () => ({
  verteilung: "",
  kronenschluss: "",
  bodenvegetation: "",
  bvTyp: ["", "", ""],
  bodengare: "",
  samenbaeume: "",
  randeffekte: "",
  hasenverbiss: "",
  zaeune: "",
  bemerkungen: "",
});

export const leererReferenzbaum = () => ({ art: "", bhd: "", winkel: "", abstand: "" });

export function neuerPunkt(nr, vorlage) {
  const v = vorlage ?? leereVorlage();
  return {
    nr,
    datum: heute(),
    // Soll-Koordinate: geplante Lage aus der Rasterplanung, wenn vorhanden.
    sollLat: null,
    sollLon: null,
    // Ist-Koordinate: was das Geraet am Punkt gemessen hat.
    lat: null,
    lon: null,
    genauigkeit: null,
    verlegt: false,
    abgeschlossen: false,
    ...Object.fromEntries(VORLAGE_FELDER.map((f) => [f, structuredClone(v[f])])),
    referenz: leererReferenzbaum(),
    beschreibung: leereBeschreibung(),
    pflanzen: [],
  };
}

export const leerePflanze = () => ({
  kuerzel: "",
  hk: "",
  schutz: 0,
  winter: 0,
  fege: 0,
  trocken: 0,
  frost: 0,
  insekt: 0,
});

export function leererStand() {
  const vorlage = leereVorlage();
  return { vorlage, punkte: [neuerPunkt(1, vorlage)], aktiv: 0 };
}

/* Beim Laden wird jeder Punkt gegen die Standardform ergaenzt. Ein
   Speicherstand aus einer aelteren Fassung soll die App nicht mit einem
   fehlenden Feld zum Absturz bringen - im Gelaende waere das der schlimmste
   denkbare Zeitpunkt. */
export function laden() {
  let roh;
  try {
    roh = localStorage.getItem(SCHLUESSEL);
  } catch {
    return leererStand();
  }
  if (!roh) return leererStand();

  try {
    const daten = JSON.parse(roh);
    const vorlage = { ...leereVorlage(), ...(daten.vorlage ?? {}) };
    vorlage.arten = { ...startArten(), ...(daten.vorlage?.arten ?? {}) };

    const punkte = (Array.isArray(daten.punkte) ? daten.punkte : []).map((p, i) => {
      const standard = neuerPunkt(p.nr ?? i + 1, vorlage);
      return {
        ...standard,
        ...p,
        arten: { ...standard.arten, ...(p.arten ?? {}) },
        referenz: { ...standard.referenz, ...(p.referenz ?? {}) },
        beschreibung: {
          ...standard.beschreibung,
          ...(p.beschreibung ?? {}),
          bvTyp: p.beschreibung?.bvTyp ?? ["", "", ""],
        },
        pflanzen: (Array.isArray(p.pflanzen) ? p.pflanzen : [])
          .slice(0, MAX_PFLANZEN)
          .map((pf) => ({ ...leerePflanze(), ...pf })),
      };
    });

    if (!punkte.length) return leererStand();

    return {
      vorlage,
      punkte,
      aktiv: Math.min(Math.max(0, daten.aktiv ?? 0), punkte.length - 1),
    };
  } catch {
    return leererStand();
  }
}

export function speichern(stand) {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify({ version: 1, ...stand }));
  } catch {
    // Voller Speicher darf die laufende Aufnahme nicht abbrechen.
  }
}

// Naechste freie Punktnummer - Luecken werden nicht aufgefuellt.
export const naechsteNummer = (punkte) =>
  punkte.reduce((groesste, p) => Math.max(groesste, Number(p.nr) || 0), 0) + 1;
