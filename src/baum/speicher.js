import { BAUMARTEN } from "./berechnung.js";

/* Eigener Speicherplatz, voellig getrennt von der Verjuengungsaufnahme -
   die beiden Seiten teilen sich nichts.

   Innerhalb der Baummessung liegen beide Verfahren zusammen, damit sie sich
   Ort und Formzahlen teilen: die gelten fuer den Bestand, nicht fuer das
   Verfahren. */
const SCHLUESSEL = "baummessung:aufnahme";

const WZP_START = ["Fichte", "Kiefer", "Buche", "Eiche"];

export const leereArt = (name) => ({
  id: `w${name}`,
  name,
  anzahl: 0,
  hoehen: [],
  durchmesser: [],
  // Leer heisst: das Bestandesalter oben gilt.
  alter: "",
});

export const leererStand = () => ({
  modus: "wzp",
  ort: "",
  alter: "",
  /* Standort der Messung. Eine Winkelzaehlprobe wird an EINEM Standpunkt
     gemacht, eine Einzelbaumflaeche hat EINE Mitte - deshalb gehoert die
     Koordinate zum Bestand und nicht zum Verfahren, genau wie Ort und
     Formzahlen. Bleibt leer, bis jemand den Knopf antippt. */
  lat: null,
  lon: null,
  genauigkeit: null,
  formzahlen: Object.fromEntries(BAUMARTEN.map((a) => [a.name, String(a.formzahl)])),
  /* Selbst eingetragene Baumarten. Sie gelten fuer beide Verfahren und
     ueberdauern die Messung - wer einmal "Robinie" braucht, braucht sie
     meist wieder. */
  eigeneArten: [],
  /* Hoehenstufen der Formzahl, je Baumart. Absichtlich leer: Werte dafuer
     kommen aus der Ertragstafel oder der Anweisung des Betriebs, nicht aus
     der App. Solange hier nichts steht, gilt der Grundwert oben. */
  formzahlStufen: {},
  // Winkelzaehlprobe
  wzp: { zaehlfaktor: 4, arten: WZP_START.map(leereArt) },
  /* Einzelbaeume: mehrere Flaechen nebeneinander.

     Eine Aufnahme besteht im Bestand selten aus einer einzigen
     Probeflaeche - man steckt zwei, drei ab und rechnet sie zusammen
     hoch. Jede haelt ihre eigene Groesse und ihre eigenen Baeume; einen
     Namen bekommt sie nicht, sie heisst nach ihrer Stelle in der Liste
     ("Fläche 1"). So bleibt der Name uebersetzbar und muss nicht
     mitgespeichert werden. */
  flaechen: [leereFlaeche()],
  flaecheAktiv: 0,
});

export const leereFlaeche = (groesse = "500") => ({
  id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  groesse,
  baeume: [],
});

/* Aeltere Staende kannten nur EINE Flaeche (flaeche + baeume). Sie wird
   zur ersten Flaeche der Liste - niemand soll eine Aufnahme verlieren,
   weil die App dazugelernt hat. */
function flaechenLaden(daten) {
  const roh = Array.isArray(daten.flaechen) ? daten.flaechen : null;
  if (roh && roh.length) {
    return roh.map((f, i) => ({
      id: String(f?.id ?? `f${i}`),
      groesse: String(f?.groesse ?? "500"),
      baeume: Array.isArray(f?.baeume) ? f.baeume : [],
    }));
  }
  return [
    {
      id: "f1",
      groesse: String(daten.flaeche ?? "500"),
      baeume: Array.isArray(daten.baeume) ? daten.baeume : [],
    },
  ];
}

/* Hoehenstufen aus dem Speicher holen.

   Gehalten werden sie als getippter Text, genau wie die Grundwerte: wer
   "0," eintippt, soll nicht zusehen, wie das Feld dazwischenfunkt.
   Gerechnet wird erst in formzahlFuer(). Hier wird nur die Form
   geradegezogen, damit ein kaputter Eintrag die Seite nicht umwirft. */
function stufenLaden(roh) {
  if (!roh || typeof roh !== "object") return {};
  const raus = {};
  for (const [art, liste] of Object.entries(roh)) {
    if (!Array.isArray(liste)) continue;
    const zeilen = liste
      .filter((s) => s && typeof s === "object")
      .map((s) => ({ bis: String(s.bis ?? ""), wert: String(s.wert ?? "") }));
    if (zeilen.length) raus[art] = zeilen;
  }
  return raus;
}

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
      // Aeltere Staende kannten den Standort noch nicht.
      lat: typeof daten.lat === "number" ? daten.lat : null,
      lon: typeof daten.lon === "number" ? daten.lon : null,
      genauigkeit: typeof daten.genauigkeit === "number" ? daten.genauigkeit : null,
      // Fehlende Arten aus den Voreinstellungen ergaenzen.
      formzahlen: { ...standard.formzahlen, ...(daten.formzahlen ?? {}) },
      // Aeltere Staende kannten die Hoehenstufen noch nicht.
      formzahlStufen: stufenLaden(daten.formzahlStufen),
      eigeneArten: Array.isArray(daten.eigeneArten)
        ? daten.eigeneArten.map((a) => String(a ?? "").trim()).filter(Boolean)
        : [],
      wzp: {
        zaehlfaktor: daten.wzp?.zaehlfaktor ?? 4,
        // Fehlende Listen ergaenzen - aeltere Staende kannten die Durchmesser noch nicht.
        arten: (daten.wzp?.arten?.length ? daten.wzp.arten : standard.wzp.arten).map((a) => ({
          ...a,
          hoehen: a.hoehen ?? [],
          durchmesser: a.durchmesser ?? [],
          alter: a.alter ?? "",
        })),
      },
      flaechen: flaechenLaden(daten),
      flaecheAktiv: 0,
    };
  } catch {
    return leererStand();
  }
}

export function speichern(stand) {
  localStorage.setItem(SCHLUESSEL, JSON.stringify({ version: 3, ...stand }));
}
