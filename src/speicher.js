import { SPEICHER_SCHLUESSEL, START_BAUMARTEN, leererKreis } from "./konfiguration.js";
import { normDatum } from "./datum.js";

/* Die Aufnahme liegt auf dem Geraet, getrennt nach Aufnahmetag.

   Frueher wurde nur EINE Aufnahme gespeichert. Wer das Datum umstellte, hatte
   die Zaehlung des Vortages weiter vor sich und haette sie unter dem neuen
   Datum noch einmal hochgeladen. Jetzt gehoert jede Zaehlung zu ihrem Tag:
   neues Datum heisst leeres Blatt, zurueck auf einen frueheren Tag holt
   dessen Zahlen wieder hervor.

   Person und Probekreisflaeche bleiben geraeteweit - die aendern sich nicht
   von Tag zu Tag. */

export const heute = () => {
  const jetzt = new Date();
  const zweistellig = (n) => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${zweistellig(jetzt.getMonth() + 1)}-${zweistellig(jetzt.getDate())}`;
};

export const startBaumarten = () => START_BAUMARTEN.map((name, i) => ({ id: `a${i}`, name }));

export const leererTag = (arten) => ({
  abteilung: "",
  arten: arten?.length ? arten : startBaumarten(),
  kreise: [leererKreis(1)],
  aktiv: 0,
});

export function ladeAlles() {
  const standard = { trupp: "", radius: "100", datum: heute(), tage: {} };

  let roh;
  try {
    roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
  } catch {
    return standard;
  }
  if (!roh) return standard;

  let daten;
  try {
    daten = JSON.parse(roh);
  } catch {
    // Kaputter Speicherstand: lieber frisch anfangen als gar nicht starten.
    return standard;
  }

  if (daten?.version === 2 && daten.tage) {
    return {
      trupp: daten.trupp ?? "",
      radius: daten.radius ?? "100",
      datum: daten.datum || heute(),
      tage: daten.tage,
    };
  }

  // Alter Stand (eine einzelne Aufnahme) - unter seinem Datum einsortieren.
  const kopf = daten?.kopf ?? {};
  const datum = normDatum(String(kopf.datum ?? "").trim()) || heute();
  return {
    trupp: kopf.trupp ?? "",
    radius: kopf.radius ?? "100",
    datum,
    tage: {
      [datum]: {
        abteilung: kopf.abteilung ?? "",
        arten: daten?.arten?.length ? daten.arten : startBaumarten(),
        kreise: daten?.kreise?.length ? daten.kreise : [leererKreis(1)],
        aktiv: typeof daten?.aktiv === "number" ? daten.aktiv : 0,
      },
    },
  };
}

export function speichereAlles(stand) {
  localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({ version: 2, ...stand }));
}
