import { neigungAusBeta } from "./hoehe.js";

/* Mitschnitt der Rohwerte des Neigungssensors.

   Warum es das gibt: Alle Pruefungen des Hoehenmessers fuettern den Sensor
   mit Zahlen, die nach DERSELBEN Regel gerechnet sind, nach der die App sie
   auswertet (Neigung = beta - 90). Damit pruefe ich meine eigene Annahme
   gegen sich selbst. Waere die Regel auf einem echten Geraet falsch - und
   genau dort lag schon einmal ein Fehler von 90 Grad -, liefe jede Pruefung
   trotzdem gruen durch.

   Ein einziger echter Mitschnitt bricht diesen Kreis auf. Danach lassen
   sich echte Sensordaten in jeder Pruefung abspielen.

   Die beiden ersten Schritte brauchen kein Messgeraet und haben trotzdem
   einen bekannten Sollwert - das ist der Witz daran:

     flach  Handy auf den Tisch, Bildschirm nach oben.
            Die Rueckkamera zeigt senkrecht nach unten: -90 Grad.
     wand   Handy senkrecht an eine Wand, Bildschirm zum Gesicht.
            Die Rueckkamera zeigt waagerecht: 0 Grad.

   Weicht die App dort ab, stimmt ihre Annahme auf diesem Geraet nicht -
   und das waere ein Fehler, den keine gerechnete Pruefung je gefunden
   haette.

   Der dritte Schritt hat keinen Sollwert. Er liefert, was sich nicht
   rechnen laesst: wie ruhig eine echte Hand ein Handy haelt. */

export const AUFNAHME_MS = 10000;

export const SCHRITTE = [
  {
    id: "flach",
    titel: "Flach auf den Tisch",
    anleitung: "Handy flach hinlegen, Bildschirm nach oben. Liegen lassen, nicht festhalten.",
    soll: -90,
  },
  {
    id: "wand",
    titel: "Senkrecht an die Wand",
    anleitung: "Handy senkrecht an eine Wand oder einen Türrahmen halten, Bildschirm zu dir.",
    soll: 0,
  },
  {
    id: "hand",
    titel: "Frei in der Hand",
    anleitung:
      "Auf etwas Hohes peilen – Dachfirst, Baumspitze, Laterne – und ruhig halten, wie beim Messen.",
    soll: null,
  },
];

const median = (zahlen) => {
  if (!zahlen.length) return null;
  const s = [...zahlen].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* Was ein Schritt hergibt: Mitte, Spanne und - wo es einen Sollwert gibt -
   die Abweichung davon. Gerechnet wird mit der Neigung, die die APP aus
   beta macht, nicht mit beta selbst: Geprueft werden soll ja genau diese
   Umrechnung. */
export function fasseZusammen(werte, soll) {
  const neigungen = (werte ?? [])
    .map((w) => neigungAusBeta(w?.beta))
    .filter((n) => n != null && Number.isFinite(n));

  if (!neigungen.length) return null;

  const mitte = median(neigungen);
  const min = Math.min(...neigungen);
  const max = Math.max(...neigungen);

  return {
    anzahl: neigungen.length,
    median: mitte,
    min,
    max,
    spanne: max - min,
    abweichung: soll == null ? null : mitte - soll,
  };
}

/* Wie oft der Sensor gemeldet hat, je Sekunde. Sagt mir beim Abspielen,
   wie dicht ich die Ereignisse setzen muss. */
export function rate(werte) {
  if (!werte || werte.length < 2) return null;
  const dauer = werte[werte.length - 1].t - werte[0].t;
  return dauer > 0 ? Math.round((werte.length - 1) / (dauer / 1000)) : null;
}

/* Die Datei. Bewusst roh: alle Einzelwerte, nichts geglaettet, nichts
   weggelassen. Zusammenfassen kann ich hinterher, die Rohwerte bekomme
   ich nie wieder. */
export function baueMitschnitt(aufnahmen, geraet) {
  return {
    art: "neigungssensor-mitschnitt",
    version: 1,
    zeit: new Date().toISOString(),
    geraet,
    schritte: SCHRITTE.filter((s) => aufnahmen[s.id]?.length).map((s) => ({
      id: s.id,
      titel: s.titel,
      soll: s.soll,
      zusammenfassung: fasseZusammen(aufnahmen[s.id], s.soll),
      rate: rate(aufnahmen[s.id]),
      werte: aufnahmen[s.id],
    })),
  };
}

export function mitschnittDateiname() {
  const jetzt = new Date();
  const zwei = (n) => String(n).padStart(2, "0");
  return (
    `Sensor_${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}` +
    `_${zwei(jetzt.getHours())}${zwei(jetzt.getMinutes())}.json`
  );
}

/* Was vom Geraet mitgeschrieben wird. Keine Ortung, kein Name - nur, was
   ich brauche, um den Mitschnitt einordnen zu koennen. */
export function geraetAngaben() {
  if (typeof navigator === "undefined") return {};
  return {
    kennung: navigator.userAgent ?? "",
    bildschirm:
      typeof window !== "undefined" ? `${window.screen?.width}x${window.screen?.height}` : "",
    pixelverhaeltnis: typeof window !== "undefined" ? window.devicePixelRatio ?? null : null,
  };
}
