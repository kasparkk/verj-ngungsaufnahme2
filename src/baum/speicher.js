import { BAUMARTEN } from "./berechnung.js";

/* Eigener Speicherplatz, voellig getrennt von der Verjuengungsaufnahme -
   die beiden Seiten teilen sich nichts. */
const SCHLUESSEL = "baummessung:aufnahme";

export const leererStand = () => ({
  ort: "",
  flaeche: "500",
  formzahlen: Object.fromEntries(BAUMARTEN.map((a) => [a.name, String(a.formzahl)])),
  baeume: [],
});

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
    const standard = leererStand();
    return {
      ort: daten.ort ?? "",
      flaeche: daten.flaeche ?? standard.flaeche,
      // Fehlende Arten aus den Voreinstellungen ergaenzen.
      formzahlen: { ...standard.formzahlen, ...(daten.formzahlen ?? {}) },
      baeume: Array.isArray(daten.baeume) ? daten.baeume : [],
    };
  } catch {
    return leererStand();
  }
}

export function speichern(stand) {
  localStorage.setItem(SCHLUESSEL, JSON.stringify({ version: 1, ...stand }));
}
