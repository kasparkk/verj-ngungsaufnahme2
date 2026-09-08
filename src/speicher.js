import { SPEICHER_SCHLUESSEL, START_BAUMARTEN, leererKreis } from "./konfiguration.js";
import { normDatum } from "./datum.js";

/* Die Aufnahme liegt auf dem Geraet, getrennt nach Aufnahmetag UND Gebiet.

   Zuerst wurde nur eine einzige Aufnahme gespeichert; wer das Datum
   umstellte, schleppte die Zaehlung des Vortages mit. Dann bekam jeder Tag
   sein eigenes Blatt. Das reichte aber nicht: Wer an einem Tag zwei
   Abteilungen aufnimmt, hatte die Zahlen der ersten weiter vor sich, und
   beim Abgleich wanderte die ganze Tagesaufnahme in die zweite Abteilung.

   Ein Blatt gehoert deshalb jetzt zu einem Tag IN einem Gebiet. Gebiet
   umstellen heisst - wie Datum umstellen - neues Blatt; zurueckstellen holt
   das alte wieder hervor.

   Person und Probekreisflaeche bleiben geraeteweit, die aendern sich nicht
   von Blatt zu Blatt. */

export const heute = () => {
  const jetzt = new Date();
  const zweistellig = (n) => String(n).padStart(2, "0");
  return `${jetzt.getFullYear()}-${zweistellig(jetzt.getMonth() + 1)}-${zweistellig(jetzt.getDate())}`;
};

export const startBaumarten = () => START_BAUMARTEN.map((name, i) => ({ id: `a${i}`, name }));

/* Der Schluessel eines Blattes. Das Gebiet wird getrimmt, damit "4138 b1"
   und "4138 b1 " nicht zwei Blaetter ergeben; der senkrechte Strich trennt,
   und weil ein Datum immer zehn Zeichen hat, ist die Trennung eindeutig. */
export const blattSchluessel = (datum, abteilung) =>
  `${datum}|${String(abteilung ?? "").trim()}`;

export const leeresBlatt = (arten) => ({
  arten: arten?.length ? arten : startBaumarten(),
  kreise: [leererKreis(1)],
  aktiv: 0,
});

const blattAus = (roh, arten) => ({
  arten: roh?.arten?.length ? roh.arten : arten?.length ? arten : startBaumarten(),
  kreise: roh?.kreise?.length ? roh.kreise : [leererKreis(1)],
  aktiv: typeof roh?.aktiv === "number" ? roh.aktiv : 0,
});

export function ladeAlles() {
  const standard = { trupp: "", radius: "100", datum: heute(), abteilung: "", blaetter: {} };

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

  // Aktueller Stand: Blaetter nach Tag und Gebiet.
  if (daten?.version === 3 && daten.blaetter) {
    return {
      trupp: daten.trupp ?? "",
      radius: daten.radius ?? "100",
      datum: daten.datum || heute(),
      abteilung: daten.abteilung ?? "",
      blaetter: daten.blaetter,
    };
  }

  /* Stand mit Blaettern je Tag: das Gebiet lag im Blatt und wird jetzt Teil
     des Schluessels. Kein Datenverlust - jedes Blatt behaelt sein Gebiet. */
  if (daten?.version === 2 && daten.tage) {
    const datum = daten.datum || heute();
    const blaetter = {};
    for (const [tag, inhalt] of Object.entries(daten.tage)) {
      blaetter[blattSchluessel(tag, inhalt?.abteilung)] = blattAus(inhalt);
    }
    return {
      trupp: daten.trupp ?? "",
      radius: daten.radius ?? "100",
      datum,
      abteilung: (daten.tage[datum]?.abteilung ?? "").trim(),
      blaetter,
    };
  }

  // Aeltester Stand: eine einzelne Aufnahme ohne Blaetter.
  const kopf = daten?.kopf ?? {};
  const datum = normDatum(String(kopf.datum ?? "").trim()) || heute();
  const abteilung = String(kopf.abteilung ?? "").trim();
  return {
    trupp: kopf.trupp ?? "",
    radius: kopf.radius ?? "100",
    datum,
    abteilung,
    blaetter: { [blattSchluessel(datum, abteilung)]: blattAus(daten) },
  };
}

export function speichereAlles(stand) {
  localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify({ version: 3, ...stand }));
}
