// Farben der Oberflaeche (dunkles Waldgruen, gut lesbar im Freien).
export const farben = {
  bg: "#12160F",
  surface: "#1E241A",
  surfaceHi: "#2A3225",
  line: "#3A4434",
  text: "#F2F0E6",
  /* Etwas heller als zuerst: Auf der Flaeche kam das alte #8A9280 nur auf
     4,9:1, und die kleinen Hinweise stehen genau darauf. Jetzt 6,7:1 -
     im Gegenlicht ist das der Unterschied zwischen lesen und raten. */
  muted: "#A3AC98",
  verb: "#E2574C",
  /* Bernstein fuer Hinweise. Bewusst nicht das Verbiss-Rot: einen alten
     Zettel nachzutragen ist richtig und soll nicht wie ein Fehler
     aussehen - auffallen muss es trotzdem. */
  warn: "#E8B44A",
  unverb: "#A8C24A",
};

// Schluessel, unter dem die laufende Aufnahme auf dem Geraet liegt.
export const SPEICHER_SCHLUESSEL = "verjuengung:aufnahme";

export const SUPABASE_URL = "https://xrrcuapiugwgqxxatkiq.supabase.co";
export const SUPABASE_KEY = "sb_publishable_kcP8-40mEnwPGuFwVGigKA_b5swelLm";

// Baumarten, die beim ersten Start schon dastehen.
export const START_BAUMARTEN = ["Kiefer", "Buche", "Eiche"];

// Vorschlaege zum Antippen, sobald eine Art noch nicht in der Liste ist.
export const BAUMART_VORSCHLAEGE = [
  "Kiefer",
  "Buche",
  "Buche Saat",
  "Buche alt",
  "Eiche Saat",
  "Eiche alt",
  "Trauben-Eiche",
  "Stiel-Eiche",
  "Sand-Birke",
  "Faulbaum",
  "Eberesche",
  "Zitterpappel",
  "Hainbuche",
  "Winter-Linde",
  "Spitz-Ahorn",
  "Berg-Ahorn",
  "Schwarz-Erle",
  "Douglasie",
  "Lärche",
  "Fichte",
  "Robinie",
  "Späte Traubenkirsche",
  "Weide",
  "Ulme",
];

export const leererKreis = (nr) => ({ nr, counts: {}, lat: null, lon: null, acc: null });
