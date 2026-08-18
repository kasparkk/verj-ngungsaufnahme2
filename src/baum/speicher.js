import { BAUMARTEN } from "./berechnung.js";

/* Eigener Speicherplatz, voellig getrennt von der Verjuengungsaufnahme -
   die beiden Seiten teilen sich nichts.

   Innerhalb der Baummessung liegen beide Verfahren zusammen, damit sie sich
   Ort und Formzahlen teilen: die gelten fuer den Bestand, nicht fuer das
   Verfahren. */
const SCHLUESSEL = "baummessung:aufnahme";

const WZP_START = ["Fichte", "Kiefer", "Buche", "Eiche"];

export const leereArt = (name) => ({ id: `w${name}`, name, anzahl: 0, hoehen: [], durchmesser: [] });

export const leererStand = () => ({
  modus: "wzp",
  ort: "",
  alter: "",
  formzahlen: Object.fromEntries(BAUMARTEN.map((a) => [a.name, String(a.formzahl)])),
  // Winkelzaehlprobe
  wzp: { zaehlfaktor: 4, arten: WZP_START.map(leereArt) },
  // Einzelbaeume
  flaeche: "500",
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
      modus: daten.modus === "einzel" ? "einzel" : "wzp",
      ort: daten.ort ?? "",
      alter: daten.alter ?? "",
      // Fehlende Arten aus den Voreinstellungen ergaenzen.
      formzahlen: { ...standard.formzahlen, ...(daten.formzahlen ?? {}) },
      wzp: {
        zaehlfaktor: daten.wzp?.zaehlfaktor ?? 4,
        // Fehlende Listen ergaenzen - aeltere Staende kannten die Durchmesser noch nicht.
        arten: (daten.wzp?.arten?.length ? daten.wzp.arten : standard.wzp.arten).map((a) => ({
          ...a,
          hoehen: a.hoehen ?? [],
          durchmesser: a.durchmesser ?? [],
        })),
      },
      flaeche: daten.flaeche ?? standard.flaeche,
      baeume: Array.isArray(daten.baeume) ? daten.baeume : [],
    };
  } catch {
    return leererStand();
  }
}

export function speichern(stand) {
  localStorage.setItem(SCHLUESSEL, JSON.stringify({ version: 2, ...stand }));
}
